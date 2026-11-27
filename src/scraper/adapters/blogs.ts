import pLimit from "p-limit";
import { extractPageDeals, isAiAvailable } from "../agent/page-extract";
import { firecrawlSearch, isFirecrawlConfigured } from "../firecrawl";
import { getCurrentYear } from "../normalizer";
import type { AdapterResult, RawScrapedDeal, ScraperAdapter } from "../types";
import { searchDuckDuckGo } from "./search-discovery";

const SOURCE_NAME = "Indonesian Promo Blogs & Articles (AI extraction)";
const CATEGORY_QUERY_WORDS = ["makanan", "kopi minuman", "bioskop", "skincare kecantikan"];
const SOCIAL_HOSTS = /(^|\.)(instagram|tiktok|facebook|x|twitter|threads|youtube|pinterest)\.com$/i;
const TRACKING_PARAMS = /^(utm_|fbclid|gclid|srsltid|hl$|ref$)/i;

export interface BlogsOptions {
  /** Max article pages fetched + sent to the model (default BLOGS_MAX_PAGES or 6). */
  maxPages?: number;
  /** Max Firecrawl search calls (default BLOGS_MAX_FIRECRAWL_SEARCHES or 2). */
  maxFirecrawlSearches?: number;
  year?: number;
  /** Injectable page extractor (tests). */
  extractPage?: typeof extractPageDeals;
}

/** Discovery queries; category variants make the web search less repetitive. */
export function buildBlogQueries(year: number = getCurrentYear()): string[] {
  return [
    `promo ulang tahun ${year}`,
    `birthday treat gratis ${year} Indonesia`,
    ...CATEGORY_QUERY_WORDS.map((c) => `promo ultah gratis ${c}`),
  ];
}

/** Canonicalise (drop hash/tracking params/trailing slash), drop social + non-http, dedupe. */
export function dedupeCandidateUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      continue;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") continue;
    if (SOCIAL_HOSTS.test(u.hostname)) continue;
    u.hash = "";
    for (const key of Array.from(u.searchParams.keys())) {
      if (TRACKING_PARAMS.test(key)) u.searchParams.delete(key);
    }
    const key = `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}${u.search}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u.toString());
  }
  return out;
}

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function createBlogsAdapter(options: BlogsOptions = {}): ScraperAdapter {
  return {
    name: "blogs",
    async run(): Promise<AdapterResult> {
      if (!isAiAvailable()) {
        return {
          sourceName: SOURCE_NAME,
          status: "SKIPPED",
          deals: [],
          errors: [],
          notes: ["Dilewati: AI_GATEWAY_API_KEY belum diatur."],
        };
      }

      const maxPages = options.maxPages ?? envInt("BLOGS_MAX_PAGES", 6);
      const maxFcSearches = options.maxFirecrawlSearches ?? envInt("BLOGS_MAX_FIRECRAWL_SEARCHES", 2);
      const queries = buildBlogQueries(options.year);
      const notes: string[] = [];
      const errors: string[] = [];
      const discovered: string[] = [];

      let ddgBlocked = 0;
      for (const q of queries.slice(0, 3)) {
        const found = await searchDuckDuckGo(q);
        if (found.blockReason || found.error) ddgBlocked += 1;
        discovered.push(...found.urls);
      }
      if (ddgBlocked > 0) notes.push(`DuckDuckGo gagal/diblokir untuk ${ddgBlocked} query.`);

      if (isFirecrawlConfigured()) {
        for (const q of queries.slice(0, maxFcSearches)) {
          try {
            const hits = await firecrawlSearch(q, { limit: 6, country: "id", lang: "id" });
            discovered.push(...hits.map((h) => h.url));
          } catch (err) {
            notes.push(`Firecrawl search gagal: ${err instanceof Error ? err.message : "error"}`);
            break;
          }
        }
      }

      const candidates = dedupeCandidateUrls(discovered).slice(0, maxPages);
      notes.push(`Blogs: ${discovered.length} URL ditemukan, ${candidates.length} diproses.`);

      const limit = pLimit(2);
      const deals: RawScrapedDeal[] = [];
      const seenBrandTitle = new Set<string>();
      await Promise.all(
        candidates.map((url) =>
          limit(async () => {
            const res = await (options.extractPage ?? extractPageDeals)(url, {
              sourceType: "SCRAPER_AGGREGATOR",
              fetchOptions: { allowPlaywright: true, timeoutMs: 12_000 },
            });
            notes.push(res.note);
            for (const d of res.deals) {
              const key = `${d.brandName}|${d.title}`.toLowerCase();
              if (seenBrandTitle.has(key)) continue;
              seenBrandTitle.add(key);
              deals.push(d);
            }
          }),
        ),
      );

      return {
        sourceName: SOURCE_NAME,
        status: errors.length > 0 ? "PARTIAL" : "SUCCESS",
        deals,
        errors,
        notes: notes.slice(0, 20),
      };
    },
  };
}

export const blogsAdapter: ScraperAdapter = createBlogsAdapter();
