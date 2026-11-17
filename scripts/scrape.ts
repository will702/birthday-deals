import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { runScraperPipeline } from "../src/scraper/runner";

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
  const runFreshness = !args.includes("--no-freshness");

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
}

main()
  .catch((err) => {
    console.error("[UltahID Scraper] Fatal error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
