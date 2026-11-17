import * as cheerio from "cheerio";
import pLimit from "p-limit";
import { fetchPage } from "../http";
import {
  detectExpirationSignals,
  extractBrandNameFromHeadline,
  isBrandAnniversaryPromo,
  isValidBrandHeading,
} from "../normalizer";
import type { AdapterResult, RawScrapedDeal, ScraperAdapter } from "../types";

const SEARCH_QUERIES = [
  "promo ulang tahun gratis indonesia 2026",
  "birthday treat diskon 50 restoran indonesia",
];

function decodeDuckDuckGoHref(rawHref: string): string | null {
  try {
    const full = rawHref.startsWith("//") ? `https:${rawHref}` : rawHref;
    const parsed = new URL(full);
    const target = parsed.searchParams.get("uddg");
    if (target && (target.startsWith("http://") || target.startsWith("https://"))) {
      return target;
    }
    if (full.startsWith("http") && !full.includes("duckduckgo.com")) {
      return full;
    }
    return null;
  } catch {
    return null;
  }
}

export interface DuckDuckGoSearchResult {
  urls: string[];
  /** Set when robots/anti-bot blocked the search request. */
  blockReason?: string;
  /** Set on HTTP failure, e.g. "Search HTTP 500". */
  error?: string;
}

/** Query DuckDuckGo's HTML endpoint (through fetchPage: robots + politeness) and return result URLs. */
export async function searchDuckDuckGo(query: string): Promise<DuckDuckGoSearchResult> {
  const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetchPage(ddgUrl, { timeoutMs: 10_000 });
  if (res.blocked) return { urls: [], blockReason: res.blockReason ?? "blocked" };
  if (!res.ok) return { urls: [], error: `Search HTTP ${res.status}` };

  const $ = cheerio.load(res.html);
  const urls: string[] = [];
  $(".result__a").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const decoded = decodeDuckDuckGoHref(href);
    if (decoded) urls.push(decoded);
  });
  return { urls };
}

export const searchDiscoveryAdapter: ScraperAdapter = {
  name: "search-discovery",
  async run(): Promise<AdapterResult> {
    const deals: RawScrapedDeal[] = [];
    const errors: string[] = [];
    const notes: string[] = [];
    const discoveredUrls = new Set<string>();

    for (const query of SEARCH_QUERIES) {
      const found = await searchDuckDuckGo(query);
      if (found.blockReason) {
        notes.push(`Search engine diblokir untuk query "${query}": ${found.blockReason}`);
        continue;
      }
      if (found.error) {
        errors.push(`${found.error} untuk "${query}"`);
        continue;
      }
      for (const url of found.urls) {
        // Skip duplicate aggregator listings already covered directly
        if (url.includes("foodierate.com/deal/food/birthday-offer")) continue;
        discoveredUrls.add(url);
      }
    }

    const candidateUrls = Array.from(discoveredUrls).slice(0, 5);
    notes.push(`Search discovery menemukan ${candidateUrls.length} artikel/halaman kandidat.`);

    const limit = pLimit(2);
    const seenHeadlines = new Set<string>();

    await Promise.all(
      candidateUrls.map((url) =>
        limit(async () => {
          const page = await fetchPage(url, { timeoutMs: 10_000 });
          if (page.blocked || !page.ok) {
            notes.push(`Lewati ${url}: ${page.blockReason || `HTTP ${page.status}`}`);
            return;
          }

          const $ = cheerio.load(page.html);
          $("script, style, figcaption, .caption, .photo-caption").remove();
          $("h2, h3").each((_, headingEl) => {
            const heading = $(headingEl).text().replace(/\s+/g, " ").trim();
            if (!isValidBrandHeading(heading)) return;
            // Often numbered listicles: "1. Boost Juice", "2. Sushi Tei", "3. Pepper Lunch"
            if (!/^\d+[.)]\s+|promo\s+|birthday/i.test(heading)) return;

            const nextText = $(headingEl)
              .nextUntil("h2, h3")
              .map((__, sib) => $(sib).text().replace(/\s+/g, " ").trim())
              .get()
              .filter((t) => t.length > 0 && !/^potret\s+/i.test(t))
              .join(" ")
              .trim();

            if (nextText.length < 30) return;
            const combined = `${heading} ${nextText}`;
            if (!/(gratis|free|diskon|potongan|%|voucher|cake|smoothie|treat)/i.test(combined)) {
              return;
            }
            if (!/(ulang tahun|ultah|birthday|ktp|tanggal lahir)/i.test(combined)) {
              return;
            }
            if (isBrandAnniversaryPromo(heading, nextText)) return;
            if (detectExpirationSignals(combined).likelyExpired) return;

            const brandName = extractBrandNameFromHeadline(
              heading.replace(/^\d+[.)]\s*/, "")
            );
            if (!isValidBrandHeading(brandName)) return;
            const dedupeKey = brandName.toLowerCase();
            if (seenHeadlines.has(dedupeKey)) return;
            seenHeadlines.add(dedupeKey);

            const firstSentence = nextText.split(/[.!?]\s+/)[0]?.trim() || "";
            const hasDealKeyword = /(gratis|free|diskon|potongan|%|voucher|beli 1|buy 1)/i.test(
              firstSentence
            );
            const title =
              hasDealKeyword && firstSentence.length >= 12 && firstSentence.length <= 95
                ? firstSentence
                : `Promo Ulang Tahun ${brandName}`;

            deals.push({
              brandName,
              title,
              rawText: nextText.slice(0, 500),
              sourceUrl: url,
              sourceType: "SCRAPER_SEARCH",
              sourceVerifiedLive: true,
              proofNotes: `Ditemukan via web discovery pada ${url}`,
            });
          });
        })
      )
    );

    const status =
      errors.length === 0 ? "SUCCESS" : deals.length > 0 || notes.length > 0 ? "PARTIAL" : "FAILED";

    return {
      sourceName: "Web Search Discovery (Indonesian Birthday Roundups)",
      status,
      deals: deals.slice(0, 12),
      errors,
      notes,
    };
  },
};
