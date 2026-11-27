/**
 * Scrape locally first, push to the remote (Neon) database later.
 *
 *   npm run db:local:pull            copy remote deals/proofs/runs into the local DB (so dedup sees them)
 *   npm run scrape:local -- ...      run the scraper against the local DB (same flags as `npm run scrape`)
 *   npm run db:local:push            preview what would be pushed to remote (no writes)
 *   npm run db:local:push -- --apply write it to remote
 *
 * Local URL comes from .env.scrape-local, remote URL from .env/.env.local (or REMOTE_DATABASE_URL).
 * Only scraper-owned data moves: Deal (+embedding), ProofSubmission of new deals, ScrapeRun.
 * Users, sessions, interactions and votes are never copied in either direction.
 */
import { readFileSync, existsSync } from "node:fs";
import { parse } from "dotenv";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Prisma, PrismaClient, type Deal } from "@prisma/client";
import ws from "ws";

const PULL_MARKER = "local-db:pull";

function envFile(path: string): Record<string, string> {
  return existsSync(path) ? parse(readFileSync(path)) : {};
}

function urls() {
  const local = envFile(".env.scrape-local").DATABASE_URL;
  const remoteEnv = { ...envFile(".env.local"), ...envFile(".env") };
  const remote = process.env.REMOTE_DATABASE_URL ?? remoteEnv.DATABASE_URL;
  if (!local) throw new Error("DATABASE_URL missing in .env.scrape-local");
  if (!/localhost|127\.0\.0\.1/.test(local)) throw new Error("Local URL is not a local database");
  if (!remote) throw new Error("Remote DATABASE_URL missing (.env or REMOTE_DATABASE_URL)");
  if (/localhost|127\.0\.0\.1/.test(remote)) throw new Error("Remote URL points at localhost");
  return { local, remote };
}

function clients() {
  const { local, remote } = urls();
  neonConfig.webSocketConstructor = ws;
  return {
    localDb: new PrismaClient({ datasourceUrl: local }),
    remoteDb: new PrismaClient({ adapter: new PrismaNeon({ connectionString: remote }) }),
  };
}

type EmbeddingRow = { id: string; embedding: string };

async function readEmbeddings(db: PrismaClient, ids?: string[]): Promise<Map<string, string>> {
  const rows = ids
    ? await db.$queryRaw<EmbeddingRow[]>`SELECT id, embedding::text AS embedding FROM "Deal"
        WHERE embedding IS NOT NULL AND id = ANY(${ids})`
    : await db.$queryRaw<EmbeddingRow[]>`SELECT id, embedding::text AS embedding FROM "Deal"
        WHERE embedding IS NOT NULL`;
  return new Map(rows.map((r) => [r.id, r.embedding]));
}

async function writeEmbedding(db: PrismaClient, id: string, embedding: string | null) {
  if (embedding === null) {
    await db.$executeRaw`UPDATE "Deal" SET embedding = NULL, "embeddingHash" = NULL,
      "embeddingUpdatedAt" = NULL WHERE id = ${id}`;
  } else {
    await db.$executeRaw`UPDATE "Deal" SET embedding = ${embedding}::vector WHERE id = ${id}`;
  }
}

async function lastPullAt(localDb: PrismaClient): Promise<Date | null> {
  const run = await localDb.scrapeRun.findFirst({
    where: { sourceName: PULL_MARKER },
    orderBy: { startedAt: "desc" },
  });
  return run?.startedAt ?? null;
}

/** Local deals changed since the last pull (by the scraper or freshness checker). */
async function unpushedLocalChanges(localDb: PrismaClient, since: Date | null) {
  if (!since) return 0;
  return localDb.deal.count({ where: { updatedAt: { gt: since } } });
}

async function pull(force: boolean) {
  const { localDb, remoteDb } = clients();
  try {
    const since = await lastPullAt(localDb);
    const pending = await unpushedLocalChanges(localDb, since);
    if (pending > 0 && !force) {
      throw new Error(
        `${pending} local deal(s) changed since the last pull and are not pushed yet. ` +
          "Run `npm run db:local:push` first, or pass --force to discard them.",
      );
    }

    const startedAt = new Date();
    const [deals, proofs, runs, embeddings] = await Promise.all([
      remoteDb.deal.findMany(),
      remoteDb.proofSubmission.findMany(),
      remoteDb.scrapeRun.findMany(),
      readEmbeddings(remoteDb),
    ]);

    // Replace the local snapshot. Deal delete cascades to proofs, votes, interactions, saves.
    await localDb.deal.deleteMany();
    await localDb.scrapeRun.deleteMany();
    await localDb.deal.createMany({ data: deals });
    await localDb.proofSubmission.createMany({ data: proofs });
    await localDb.scrapeRun.createMany({ data: runs });
    for (const [id, embedding] of embeddings) await writeEmbedding(localDb, id, embedding);
    await localDb.scrapeRun.create({
      data: { sourceName: PULL_MARKER, status: "SUCCESS", startedAt, completedAt: new Date() },
    });

    console.log(
      `[local-db] pulled ${deals.length} deals, ${proofs.length} proofs, ${runs.length} runs, ` +
        `${embeddings.size} embeddings`,
    );
  } finally {
    await Promise.all([localDb.$disconnect(), remoteDb.$disconnect()]);
  }
}

/** Fields the scraper runner and freshness checker write on an existing deal. */
const SCRAPER_FIELDS = [
  "title",
  "description",
  "termsAndConditions",
  "discountType",
  "discountValue",
  "claimWindow",
  "minPurchaseIdr",
  "requiresApp",
  "appName",
  "requiresIdCard",
  "sourceUrl",
  "lastScrapedAt",
  "lastVerifiedAt",
  "freshnessScore",
  "verificationStatus",
  "embeddingHash",
  "embeddingUpdatedAt",
  "updatedAt",
] as const satisfies readonly (keyof Deal)[];

function pick(deal: Deal) {
  return Object.fromEntries(SCRAPER_FIELDS.map((k) => [k, deal[k]])) as Prisma.DealUpdateInput;
}

async function push(apply: boolean) {
  const { localDb, remoteDb } = clients();
  try {
    const since = await lastPullAt(localDb);
    if (!since) throw new Error("No pull recorded locally. Run `npm run db:local:pull` first.");

    const [localDeals, remoteDeals, remoteRunIds] = await Promise.all([
      localDb.deal.findMany(),
      remoteDb.deal.findMany({ select: { id: true, slug: true, updatedAt: true } }),
      remoteDb.scrapeRun.findMany({ select: { id: true } }),
    ]);
    const remoteById = new Map(remoteDeals.map((d) => [d.id, d]));
    const remoteSlugs = new Set(remoteDeals.map((d) => d.slug));

    const created: Deal[] = [];
    const updated: Deal[] = [];
    const conflicts: string[] = [];
    for (const d of localDeals) {
      const r = remoteById.get(d.id);
      if (!r) {
        if (remoteSlugs.has(d.slug)) conflicts.push(`${d.slug} (slug already used on remote)`);
        else created.push(d);
      } else if (d.updatedAt > r.updatedAt) {
        // Remote edited after our pull (moderation, votes, admin tools): do not overwrite.
        if (r.updatedAt > since) conflicts.push(`${d.slug} (remote changed since pull)`);
        else updated.push(d);
      }
    }

    const knownRunIds = new Set(remoteRunIds.map((r) => r.id));
    const runs = (await localDb.scrapeRun.findMany({ where: { sourceName: { not: PULL_MARKER } } }))
      .filter((r) => !knownRunIds.has(r.id));

    console.log(`[local-db] last pull: ${since.toISOString()}`);
    console.log(`  new deals:     ${created.length}`);
    for (const d of created) console.log(`    + ${d.slug}  (${d.brandName}: ${d.title})`);
    console.log(`  updated deals: ${updated.length}`);
    for (const d of updated) console.log(`    ~ ${d.slug}  [${d.verificationStatus}]`);
    console.log(`  scrape runs:   ${runs.length}`);
    if (conflicts.length) {
      console.log(`  skipped (conflict): ${conflicts.length}`);
      for (const c of conflicts) console.log(`    ! ${c}`);
    }

    if (!apply) {
      console.log("\nPreview only. Re-run with --apply to write to the remote database.");
      return;
    }

    const touched = [...created, ...updated].map((d) => d.id);
    const embeddings = await readEmbeddings(localDb, touched);
    const proofs = await localDb.proofSubmission.findMany({
      where: { dealId: { in: created.map((d) => d.id) } },
    });

    if (created.length) await remoteDb.deal.createMany({ data: created });
    if (proofs.length) await remoteDb.proofSubmission.createMany({ data: proofs, skipDuplicates: true });
    for (const d of updated) await remoteDb.deal.update({ where: { id: d.id }, data: pick(d) });
    for (const id of touched) await writeEmbedding(remoteDb, id, embeddings.get(id) ?? null);
    if (runs.length) await remoteDb.scrapeRun.createMany({ data: runs, skipDuplicates: true });

    // Pushed state is now the baseline: record a fresh pull marker.
    await localDb.scrapeRun.create({
      data: { sourceName: PULL_MARKER, status: "SUCCESS", completedAt: new Date() },
    });

    const missing = touched.length - embeddings.size;
    console.log(
      `\n[local-db] pushed ${created.length} new, ${updated.length} updated, ${runs.length} runs.` +
        (missing > 0
          ? ` ${missing} deal(s) have no embedding; run \`npm run backfill -- --embed\` against remote.`
          : ""),
    );
  } finally {
    await Promise.all([localDb.$disconnect(), remoteDb.$disconnect()]);
  }
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === "pull") return pull(args.includes("--force"));
  if (cmd === "push") return push(args.includes("--apply"));
  console.error("Usage: tsx scripts/local-db.ts <pull [--force] | push [--apply]>");
  process.exit(1);
}

main().catch((err) => {
  console.error(`[local-db] ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
