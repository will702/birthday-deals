import * as cheerio from "cheerio";
import pLimit from "p-limit";
import { extractTextDeals, isAiAvailable } from "../agent/page-extract";
import { fetchWithTiers, type FetchWithTiersResult } from "../fetch-tiers";
import { detectExpirationSignals, isBrandAnniversaryPromo } from "../normalizer";
import { BRAND_SOURCES, type BrandSource } from "../sources/brands";
import type { AdapterResult, RawScrapedDeal, ScraperAdapter } from "../types";

const SOURCE_NAME = "Extended Official Brand Pages (Indonesia)";
export const BIRTHDAY_PATTERN = /(ulang tahun|ultah|birthday)/i;

/**
 * Deterministic parse for sources with configured selectors. Pure (no network).
 * A block counts only if its own text mentions a birthday benefit.
 */
export function parseBrandPageHtml(html: string, source: BrandSource): RawScrapedDeal[] {
  const sel = source.selectors;
  if (!sel) return [];
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  const deals: RawScrapedDeal[] = [];
  const seen = new Set<string>();

  $(sel.container).each((_, el) => {
    const block = $(el);
    const blockText = block.text().replace(/\s+/g, " ").trim();
    if (!BIRTHDAY_PATTERN.test(blockText)) return;
    const title =
      (sel.title ? block.find(sel.title).first().text() : "").replace(/\s+/g, " ").trim() ||
      `Promo Ulang Tahun ${source.brandName}`;
    const body =
      (sel.body ? block.find(sel.body).first().text() : "").replace(/\s+/g, " ").trim() || blockText;
    if (detectExpirationSignals(`${title} ${body}`).likelyExpired) return;
    if (isBrandAnniversaryPromo(title, body)) return;
    const key = `${title}|${body}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    deals.push({
      brandName: source.brandName,
      title: title.slice(0, 120),
      rawText: body.slice(0, 600),
      category: source.category,
      locations: source.locations,
      sourceUrl: source.url,
      sourceType: "SCRAPER_BRAND",
      sourceVerifiedLive: true,
      proofNotes: `Terdeteksi langsung di ${source.url}: "${blockText.slice(0, 200)}"`,
    });
  });
  return deals;
}

/** Brand/location are authoritative from config, not from the model. */
export function applySourceDefaults(deals: RawScrapedDeal[], source: BrandSource): RawScrapedDeal[] {
  return deals.map((d) => ({
    ...d,
    brandName: source.brandName,
    category: d.category ?? source.category,
    locations: d.locations ?? source.locations,
    sourceType: "SCRAPER_BRAND",
  }));
}

export interface BrandsExtendedOptions {
  sources?: BrandSource[];
  fetchTiers?: typeof fetchWithTiers;
  /** Injectable LLM extractor (tests). */
  extract?: Parameters<typeof extractTextDeals>[2]["extract"];
  /** Allow the LLM path (default: AI key present). */
  useAi?: boolean;
}

export function createBrandsExtendedAdapter(options: BrandsExtendedOptions = {}): ScraperAdapter {
  return {
    name: "brands-extended",
    async run(): Promise<AdapterResult> {
      const sources = options.sources ?? BRAND_SOURCES;
      const fetchTiers = options.fetchTiers ?? fetchWithTiers;
      const useAi = options.useAi ?? isAiAvailable();
      const deals: RawScrapedDeal[] = [];
      const errors: string[] = [];
      const notes: string[] = [];
      const limit = pLimit(2);

      await Promise.all(
        sources.map((source) =>
          limit(async () => {
            let page: FetchWithTiersResult;
            try {
              page = await fetchTiers(source.url, {
                allowPlaywright: true,
                timeoutMs: 12_000,
                requirePattern: BIRTHDAY_PATTERN,
              });
            } catch (err) {
              errors.push(`${source.brandName}: ${err instanceof Error ? err.message : "error"}`);
              return;
            }
            if (page.skipReason === "robots-disallowed") {
              notes.push(`${source.brandName}: dilewati (robots.txt).`);
              return;
            }
            if (!page.ok) {
              errors.push(`${source.brandName}: ${page.error ?? "gagal dimuat"} (${source.url})`);
              return;
            }
            if (!BIRTHDAY_PATTERN.test(page.text)) {
              notes.push(`${source.brandName}: halaman tidak menyebut ulang tahun (${page.tier}).`);
              return;
            }

            let found = page.html ? parseBrandPageHtml(page.html, source) : [];
            let via = "selector";
            if (found.length === 0 && useAi) {
              const ai = await extractTextDeals(source.url, page.text, {
                sourceType: "SCRAPER_BRAND",
                extract: options.extract,
              });
              if (ai.error) errors.push(`${source.brandName}: ekstraksi AI gagal (${ai.error})`);
              found = ai.deals;
              via = "AI";
            }
            if (found.length === 0) {
              notes.push(
                `${source.brandName}: tidak ada deal terekstrak via ${page.tier}${useAi ? "" : " (AI tidak tersedia, tanpa selector)"}.`,
              );
              return;
            }
            notes.push(`${source.brandName}: ${found.length} deal via ${page.tier}+${via}.`);
            deals.push(...applySourceDefaults(found, source));
          }),
        ),
      );

      const status =
        errors.length === 0 ? "SUCCESS" : deals.length > 0 ? "PARTIAL" : "FAILED";
      return { sourceName: SOURCE_NAME, status, deals, errors, notes };
    },
  };
}

export const brandsExtendedAdapter: ScraperAdapter = createBrandsExtendedAdapter();
