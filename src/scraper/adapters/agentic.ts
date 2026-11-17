import { DEFAULT_AGENT_QUERY, runDealAgent } from "../agent/deal-agent";
import type { AdapterResult, ScraperAdapter } from "../types";

const SOURCE_NAME = "Agentic Deal Agent (AI)";

export interface AgenticOptions {
  query?: string;
  seeds?: string[];
}

function parseSeeds(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function createAgenticAdapter(
  options: AgenticOptions = {},
): ScraperAdapter {
  return {
    name: "agentic",
    async run(): Promise<AdapterResult> {
      if (!process.env.AI_GATEWAY_API_KEY?.trim()) {
        return {
          sourceName: SOURCE_NAME,
          status: "SKIPPED",
          deals: [],
          errors: [],
          notes: ["Dilewati: AI_GATEWAY_API_KEY belum diatur."],
        };
      }

      const query =
        options.query ||
        process.env.SCRAPER_AGENT_QUERY?.trim() ||
        DEFAULT_AGENT_QUERY;
      const seedUrls = options.seeds?.length
        ? options.seeds
        : parseSeeds(process.env.SCRAPER_AGENT_SEEDS);

      try {
        const { deals, stats } = await runDealAgent({ query, seedUrls });
        return {
          sourceName: SOURCE_NAME,
          status: "SUCCESS",
          deals,
          errors: [],
          notes: [
            `Agent: ${stats.steps} langkah, ${stats.pagesFetched} halaman, ${stats.droppedNoEvidence} deal dibuang (tanpa bukti).`,
          ],
        };
      } catch (err) {
        return {
          sourceName: SOURCE_NAME,
          status: "FAILED",
          deals: [],
          errors: [err instanceof Error ? err.message : "Agent error"],
        };
      }
    },
  };
}

export const agenticAdapter: ScraperAdapter = createAgenticAdapter();
