import { prisma } from "../lib/prisma";
import { agenticAdapter, createAgenticAdapter, type AgenticOptions } from "./adapters/agentic";
import { aggregatorsAdapter } from "./adapters/aggregators";
import { officialBrandsAdapter } from "./adapters/official-brands";
import { searchDiscoveryAdapter } from "./adapters/search-discovery";
import { runFreshnessChecker, type FreshnessSummary } from "./freshness-checker";
import { closeBrowser } from "./browser";
import { normalizeScrapedDeal } from "./normalizer";
import type { AdapterResult, ScraperAdapter } from "./types";

const ADAPTER_MAP: Record<string, ScraperAdapter> = {
  "official-brands": officialBrandsAdapter,
  aggregators: aggregatorsAdapter,
  "search-discovery": searchDiscoveryAdapter,
  agentic: agenticAdapter,
};

/** Adapters that only run when explicitly selected (cost money / need credentials). */
const OPT_IN_ADAPTERS = new Set(["agentic"]);

function brandRootKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bindonesia\b|\bgroup\b|\bboga\b|\bresto\b|\bcoffee\b|\bjuice\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

const STOPWORDS = new Set([
  "promo",
  "gratis",
  "free",
  "ulang",
  "tahun",
  "birthday",
  "dan",
  "di",
  "yang",
  "untuk",
  "dengan",
]);

function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t)),
  );
}

/** Token-overlap (Jaccard) check so a brand-root match only merges near-identical titles. */
export function titlesSimilar(a: string, b: string, threshold = 0.5): boolean {
  const ta = titleTokens(a);
  const tb = titleTokens(b);
  if (ta.size === 0 || tb.size === 0) return a.trim().toLowerCase() === b.trim().toLowerCase();
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap += 1;
  return overlap / (ta.size + tb.size - overlap) >= threshold;
}

export const RUN_LOCK_WINDOW_MS = 15 * 60 * 1000;

export class ScraperRunLockedError extends Error {
  constructor(message = "Scraper sedang berjalan. Coba lagi setelah proses sebelumnya selesai.") {
    super(message);
    this.name = "ScraperRunLockedError";
  }
}

function uniqueSlug(base: string, taken: Map<string, unknown>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

export interface ScraperRunOutput {
  runs: Array<{
    id: string;
    sourceName: string;
    status: string;
    dealsFound: number;
    dealsCreated: number;
    dealsUpdated: number;
    errorMessage: string | null;
    notes: string[];
  }>;
  freshness: FreshnessSummary | null;
}

export async function runScraperPipeline(options?: {
  sources?: string[];
  runFreshness?: boolean;
  /** Overrides for the opt-in agentic adapter (CLI --query / --seeds). */
  agent?: AgenticOptions;
}): Promise<ScraperRunOutput> {
  const running = await prisma.scrapeRun.findFirst({
    where: {
      status: "RUNNING",
      startedAt: { gte: new Date(Date.now() - RUN_LOCK_WINDOW_MS) },
    },
    select: { id: true },
  });
  if (running) throw new ScraperRunLockedError();

  try {
    return await executePipeline(options);
  } finally {
    await closeBrowser();
  }
}

async function executePipeline(options?: {
  sources?: string[];
  runFreshness?: boolean;
  /** Overrides for the opt-in agentic adapter (CLI --query / --seeds). */
  agent?: AgenticOptions;
}): Promise<ScraperRunOutput> {
  const selectedKeys =
    options?.sources && options.sources.length > 0
      ? options.sources.filter((k) => Boolean(ADAPTER_MAP[k]))
      : Object.keys(ADAPTER_MAP).filter((k) => !OPT_IN_ADAPTERS.has(k));

  const runResults: ScraperRunOutput["runs"] = [];
  const existingDeals = await prisma.deal.findMany({
    select: {
      id: true,
      slug: true,
      brandName: true,
      title: true,
      verificationStatus: true,
      sourceType: true,
    },
  });

  const existingBySlug = new Map(existingDeals.map((d) => [d.slug, d]));
  const existingByBrandRoot = new Map<string, Array<(typeof existingDeals)[number]>>();
  const addToBrandRoot = (key: string, d: (typeof existingDeals)[number]) => {
    if (key.length < 4) return;
    const list = existingByBrandRoot.get(key);
    if (list) list.push(d);
    else existingByBrandRoot.set(key, [d]);
  };
  for (const d of existingDeals) addToBrandRoot(brandRootKey(d.brandName), d);

  for (const key of selectedKeys) {
    const adapter =
      key === "agentic" && options?.agent ? createAgenticAdapter(options.agent) : ADAPTER_MAP[key];
    const startedAt = new Date();
    const runRecord = await prisma.scrapeRun.create({
      data: {
        sourceName: adapter.name,
        status: "RUNNING",
        startedAt,
      },
    });

    let result: AdapterResult;
    try {
      result = await adapter.run();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Adapter crashed";
      await prisma.scrapeRun.update({
        where: { id: runRecord.id },
        data: {
          status: "FAILED",
          errorMessage: msg,
          completedAt: new Date(),
        },
      });
      runResults.push({
        id: runRecord.id,
        sourceName: adapter.name,
        status: "FAILED",
        dealsFound: 0,
        dealsCreated: 0,
        dealsUpdated: 0,
        errorMessage: msg,
        notes: [],
      });
      continue;
    }

    let created = 0;
    let updated = 0;

    let failed = 0;
    const failureMessages: string[] = [];

    for (const raw of result.deals) {
      try {
        const normalized = normalizeScrapedDeal(raw);
        const rootKey = brandRootKey(normalized.brandName);

        const matched =
          existingBySlug.get(normalized.slug) ??
          (rootKey.length >= 4
            ? existingByBrandRoot
                .get(rootKey)
                ?.find((d) => titlesSimilar(d.title, normalized.title))
            : undefined);

        const now = new Date();

        if (matched) {
          // Preserve ADMIN_VERIFIED, COMMUNITY_SUBMITTED, and authoritative brand/aggregator records over sparse search snippets
          const shouldPreserveAuthoritative =
            matched.verificationStatus === "ADMIN_VERIFIED" ||
            matched.verificationStatus === "COMMUNITY_SUBMITTED" ||
            (matched.sourceType === "SCRAPER_BRAND" && normalized.sourceType !== "SCRAPER_BRAND") ||
            (matched.sourceType === "SCRAPER_AGGREGATOR" &&
              normalized.sourceType === "SCRAPER_SEARCH");

          await prisma.deal.update({
            where: { id: matched.id },
            data: {
              lastScrapedAt: now,
              lastVerifiedAt: raw.sourceVerifiedLive ? now : undefined,
              freshnessScore: Math.max(80, normalized.freshnessScore),
              ...(shouldPreserveAuthoritative
                ? {}
                : {
                    title: normalized.title,
                    description: normalized.description,
                    termsAndConditions: JSON.stringify(normalized.termsAndConditions),
                    discountType: normalized.discountType,
                    discountValue: normalized.discountValue,
                    claimWindow: normalized.claimWindow,
                    minPurchaseIdr: normalized.minPurchaseIdr,
                    requiresApp: normalized.requiresApp,
                    appName: normalized.appName,
                    requiresIdCard: normalized.requiresIdCard,
                    sourceUrl: normalized.sourceUrl,
                  }),
            },
          });
          updated += 1;
        } else {
          let slug = uniqueSlug(normalized.slug, existingBySlug);
          let createdDeal: Awaited<ReturnType<typeof prisma.deal.create>> | null = null;
          for (let attempt = 0; attempt < 5 && !createdDeal; attempt++) {
            try {
              createdDeal = await prisma.deal.create({
                data: {
                  slug,
                  brandName: normalized.brandName,
                  brandLogoUrl: normalized.brandLogoUrl,
                  category: normalized.category,
                  title: normalized.title,
                  discountType: normalized.discountType,
                  discountValue: normalized.discountValue,
                  description: normalized.description,
                  termsAndConditions: JSON.stringify(normalized.termsAndConditions),
                  claimWindow: normalized.claimWindow,
                  requiresApp: normalized.requiresApp,
                  appName: normalized.appName,
                  minRegistrationDays: normalized.minRegistrationDays,
                  requiresIdCard: normalized.requiresIdCard,
                  minPurchaseIdr: normalized.minPurchaseIdr,
                  locations: normalized.locations,
                  sourceUrl: normalized.sourceUrl,
                  sourceType: normalized.sourceType,
                  verificationStatus: normalized.verificationStatus,
                  validYear: normalized.validYear,
                  stillWorksCount: 1,
                  expiredReportCount: 0,
                  freshnessScore: normalized.freshnessScore,
                  lastScrapedAt: now,
                  lastVerifiedAt: now,
                  proofs: {
                    create: {
                      submitterName: "UltahID Scraper",
                      proofImageUrl: normalized.proofImageUrl,
                      proofLinkUrl: normalized.sourceUrl,
                      notes: normalized.proofNotes,
                      isApproved: true,
                    },
                  },
                },
              });
            } catch (err) {
              if (!isUniqueViolation(err)) throw err;
              // Slug taken by a row we have not seen (concurrent writer): try the next suffix.
              existingBySlug.set(slug, { slug } as never);
              slug = uniqueSlug(normalized.slug, existingBySlug);
            }
          }
          if (!createdDeal) throw new Error(`Slug bentrok untuk ${normalized.slug}`);
          existingBySlug.set(createdDeal.slug, createdDeal);
          addToBrandRoot(rootKey, createdDeal);
          created += 1;
        }
      } catch (err) {
        failed += 1;
        if (failureMessages.length < 3) {
          failureMessages.push(
            `${raw.title.slice(0, 40)}: ${err instanceof Error ? err.message.slice(0, 120) : "error"}`,
          );
        }
        console.error(`[scraper] gagal menyimpan deal "${raw.title}":`, err);
      }
    }

    const finalStatus = failed > 0 && result.status === "SUCCESS" ? "PARTIAL" : result.status;
    const outputErrors = [
      ...(failed > 0 ? [`${failed} deal gagal disimpan (${failureMessages.join("; ")})`] : []),
      ...result.errors,
    ];
    const combinedMessages = [...outputErrors, ...(result.notes ?? []).slice(0, 4)].join(" | ");

    await prisma.scrapeRun.update({
      where: { id: runRecord.id },
      data: {
        sourceName: result.sourceName,
        status: finalStatus,
        dealsFound: result.deals.length,
        dealsCreated: created,
        dealsUpdated: updated,
        errorMessage: combinedMessages ? combinedMessages.slice(0, 600) : null,
        completedAt: new Date(),
      },
    });

    runResults.push({
      id: runRecord.id,
      sourceName: result.sourceName,
      status: finalStatus,
      dealsFound: result.deals.length,
      dealsCreated: created,
      dealsUpdated: updated,
      errorMessage: outputErrors.length > 0 ? outputErrors.join("; ") : null,
      notes: result.notes ?? [],
    });
  }

  let freshness: FreshnessSummary | null = null;
  if (options?.runFreshness !== false) {
    freshness = await runFreshnessChecker();
  }

  return { runs: runResults, freshness };
}
