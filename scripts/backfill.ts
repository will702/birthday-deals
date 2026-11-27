import "./load-env";
import { parseCities } from "../src/lib/cities";
import { prisma } from "../src/lib/prisma";
import { embedDeals, hasGatewayCredentials } from "../src/lib/recommend/embeddings";

/**
 * Usage: npx tsx scripts/backfill.ts [--cities] [--embed] [--all-embeddings]
 * Defaults to --cities --embed. --all-embeddings re-embeds every deal, otherwise only missing ones.
 */
async function backfillCities() {
  const deals = await prisma.deal.findMany({ select: { id: true, locations: true, cities: true } });
  let updated = 0;
  for (const d of deals) {
    const cities = parseCities(d.locations);
    if (cities.join("|") === d.cities.join("|")) continue;
    await prisma.deal.update({ where: { id: d.id }, data: { cities } });
    updated += 1;
  }
  console.log(`[backfill] cities: ${updated}/${deals.length} deal diperbarui`);
}

async function backfillEmbeddings(all: boolean) {
  if (!hasGatewayCredentials()) {
    console.log("[backfill] embeddings dilewati: kredensial AI Gateway tidak ada.");
    return;
  }
  const rows = all
    ? await prisma.deal.findMany({ select: { id: true } })
    : await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Deal" WHERE embedding IS NULL`;
  const ids = rows.map((r) => r.id);
  let written = 0;
  for (let i = 0; i < ids.length; i += 50) {
    written += await embedDeals(ids.slice(i, i + 50), { force: all });
  }
  console.log(`[backfill] embeddings: ${written}/${ids.length} deal di-embed`);
}

async function main() {
  const args = process.argv.slice(2);
  const only = args.includes("--cities") || args.includes("--embed");
  if (!only || args.includes("--cities")) await backfillCities();
  if (!only || args.includes("--embed")) await backfillEmbeddings(args.includes("--all-embeddings"));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
