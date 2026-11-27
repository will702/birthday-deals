import "dotenv/config";

/**
 * Usage:
 *   npm run scrape -- [--source=a,b] [--no-freshness] [--tiers=http,playwright,firecrawl] [--dry-run]
 *   Sources: official-brands, aggregators, search-discovery, agentic, brands-extended, blogs, social-public
 *   --dry-run runs the adapters and prints counts/samples without any database writes.
 */
async function main() {
  const args = process.argv.slice(2);
  const sourceArg = args.find((a) => a.startsWith("--source="));
  const sources = sourceArg ? sourceArg.replace("--source=", "").split(",") : undefined;
  const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const query = flag("query");
  const seeds = flag("seeds")
    ?.split(",")
    .map((u) => u.trim())
    .filter(Boolean);
  const tiers = flag("tiers");
  if (tiers) process.env.SCRAPER_TIERS = tiers;
  const runFreshness = !args.includes("--no-freshness");

  if (args.includes("--dry-run")) {
    const { dryRunAdapters } = await import("../src/scraper/dry-run");
    console.log("[UltahID Scraper] DRY RUN (tanpa tulis database)");
    const out = await dryRunAdapters({ sources, agent: { query, seeds } });
    for (const a of out.adapters) {
      console.log(
        ` - [${a.status}] ${a.key}: found=${a.dealsFound}, normalizeFailures=${a.normalizeFailures}`,
      );
      for (const s of a.samples) {
        console.log(`     sample: ${s.brandName} | ${s.title} | ${s.sourceType}/${s.verificationStatus}`);
        console.log(`             ${s.sourceUrl}\n             ${s.evidence}`);
      }
      for (const n of a.notes) console.log(`     note: ${n}`);
      for (const e of a.errors) console.log(`     err:  ${e}`);
    }
    console.log(
      `[Firecrawl] calls=${out.firecrawl.calls}, credits=${out.firecrawl.creditsUsed}/${out.firecrawl.maxCredits}`,
    );
    return;
  }

  const { prisma } = await import("../src/lib/prisma");
  const { runScraperPipeline } = await import("../src/scraper/runner");
  try {
    console.log("[UltahID Scraper] Memulai scraping promo ulang tahun Indonesia...");
    const result = await runScraperPipeline({ sources, runFreshness, agent: { query, seeds } });

    for (const run of result.runs) {
      console.log(
        ` - [${run.status}] ${run.sourceName}: found=${run.dealsFound}, created=${run.dealsCreated}, updated=${run.dealsUpdated}`
      );
      for (const note of run.notes) {
        console.log(`     note: ${note}`);
      }
      if (run.errorMessage) {
        console.log(`     err:  ${run.errorMessage}`);
      }
    }

    if (result.freshness) {
      console.log(
        ` - [FRESHNESS] checked=${result.freshness.checkedCount}, live=${result.freshness.liveCount}, stale=${result.freshness.staleMarked}, expired=${result.freshness.expiredMarked}`
      );
    }

    const totalDeals = await prisma.deal.count();
    console.log(`[UltahID Scraper] Total promo di database: ${totalDeals}`);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error("[UltahID Scraper] Fatal error:", err);
    process.exit(1);
  });
