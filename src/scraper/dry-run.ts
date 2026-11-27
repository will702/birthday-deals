import { createAgenticAdapter, type AgenticOptions } from "./adapters/agentic";
import { closeBrowser } from "./browser";
import { getFirecrawlUsage, resetFirecrawlBudget } from "./firecrawl";
import { normalizeScrapedDeal } from "./normalizer";
import { ADAPTER_MAP, resolveAdapterKeys } from "./runner";
import type { AdapterResult } from "./types";

export interface DryRunSample {
  brandName: string;
  title: string;
  sourceType: string;
  verificationStatus: string;
  sourceUrl: string;
  evidence: string;
}

export interface DryRunAdapterOutput {
  key: string;
  status: AdapterResult["status"];
  dealsFound: number;
  normalizeFailures: number;
  samples: DryRunSample[];
  errors: string[];
  notes: string[];
}

/** Run adapters and normalise deals WITHOUT touching the database. */
export async function dryRunAdapters(options: {
  sources?: string[];
  agent?: AgenticOptions;
  sampleSize?: number;
}): Promise<{
  adapters: DryRunAdapterOutput[];
  firecrawl: ReturnType<typeof getFirecrawlUsage>;
}> {
  resetFirecrawlBudget();
  const outputs: DryRunAdapterOutput[] = [];
  try {
    for (const key of resolveAdapterKeys(options.sources)) {
      const adapter =
        key === "agentic" && options.agent ? createAgenticAdapter(options.agent) : ADAPTER_MAP[key];
      let result: AdapterResult;
      try {
        result = await adapter.run();
      } catch (err) {
        outputs.push({
          key,
          status: "FAILED",
          dealsFound: 0,
          normalizeFailures: 0,
          samples: [],
          errors: [err instanceof Error ? err.message : "Adapter crashed"],
          notes: [],
        });
        continue;
      }
      let failures = 0;
      const samples: DryRunSample[] = [];
      for (const raw of result.deals) {
        try {
          const n = normalizeScrapedDeal(raw);
          if (samples.length < (options.sampleSize ?? 3)) {
            samples.push({
              brandName: n.brandName,
              title: n.title,
              sourceType: n.sourceType,
              verificationStatus: n.verificationStatus,
              sourceUrl: n.sourceUrl,
              evidence: n.proofNotes.slice(0, 160),
            });
          }
        } catch {
          failures += 1;
        }
      }
      outputs.push({
        key,
        status: result.status,
        dealsFound: result.deals.length,
        normalizeFailures: failures,
        samples,
        errors: result.errors,
        notes: result.notes ?? [],
      });
    }
  } finally {
    await closeBrowser();
  }
  return { adapters: outputs, firecrawl: getFirecrawlUsage() };
}
