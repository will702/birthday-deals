import * as cheerio from "cheerio";
import pLimit from "p-limit";
import { extractPageDeals, isAiAvailable } from "../agent/page-extract";
import { fetchPage } from "../http";
import {
  detectExpirationSignals,
  extractBrandNameFromHeadline,
  isBrandAnniversaryPromo,
} from "../normalizer";
import type { AdapterResult, RawScrapedDeal, ScraperAdapter } from "../types";

const KATALOGPROMOSI_URL =
  "https://katalogpromosi.com/rekomendasi-promo/promo-birthday-treats/";
const FOODIERATE_URL = "https://www.foodierate.com/deal/food/birthday-offer";
const GILADISKON_URL = "https://www.giladiskon.com/search?q=ulang+tahun";

async function scrapeKatalogPromosiRules(): Promise<{
  deals: RawScrapedDeal[];
  errors: string[];
  notes: string[];
}> {
  const deals: RawScrapedDeal[] = [];
  const errors: string[] = [];
  const notes: string[] = [];

  const listing = await fetchPage(KATALOGPROMOSI_URL, { timeoutMs: 12_000 });
  if (listing.blocked) {
    notes.push(`Katalogpromosi diblokir anti-bot: ${listing.blockReason}`);
    return { deals, errors, notes };
  }
  if (!listing.ok) {
    errors.push(`Katalogpromosi HTTP ${listing.status}: ${listing.blockReason || "gagal dimuat"}`);
    return { deals, errors, notes };
  }

  const $ = cheerio.load(listing.html);
  const candidates: Array<{ title: string; url: string }> = [];
  const seenUrls = new Set<string>();

  $("article, .post, .td_module_wrap").each((_, el) => {
    const anchor = $(el).find("h2 a, h3 a, .entry-title a").first();
    const title = anchor.text().replace(/\s+/g, " ").trim();
    const href = anchor.attr("href")?.trim();
    if (!title || !href || seenUrls.has(href)) return;
    if (isBrandAnniversaryPromo(title)) return;
    seenUrls.add(href);
    candidates.push({ title, url: href });
  });

  const limit = pLimit(3);
  const topCandidates = candidates.slice(0, 12);

  await Promise.all(
    topCandidates.map((item) =>
      limit(async () => {
        const detail = await fetchPage(item.url, { timeoutMs: 10_000 });
        let rawText = item.title;
        let termsList: string[] = [];
        let proofImageUrl: string | null = null;

        if (detail.ok && !detail.blocked) {
          const $$ = cheerio.load(detail.html);
          const contentContainer = $$(".entry-content, article .td-post-content, main article").first();
          const paragraphs = contentContainer
            .find("p, li")
            .map((_, p) => $$(p).text().replace(/\s+/g, " ").trim())
            .get()
            .filter((txt) => txt.length >= 15 && txt.length <= 320);

          if (paragraphs.length > 0) {
            rawText = paragraphs.slice(0, 4).join(" ");
            termsList = paragraphs
              .filter((p) =>
                /syarat|ketentuan|berlaku|ktp|identitas|app|aplikasi|member|minimal|h-\d|h\+\d|ulang tahun/i.test(
                  p
                )
              )
              .slice(0, 6);
          }

          const ogImg = $$('meta[property="og:image"]').attr("content")?.trim();
          if (ogImg && ogImg.startsWith("http")) {
            proofImageUrl = ogImg;
          }
        }

        const exp = detectExpirationSignals(`${item.title} ${rawText}`);
        if (exp.likelyExpired) return;
        if (isBrandAnniversaryPromo(item.title, rawText)) return;

        const brandName = extractBrandNameFromHeadline(item.title);
        deals.push({
          brandName,
          title: item.title,
          rawText,
          sourceUrl: item.url,
          sourceType: "SCRAPER_AGGREGATOR",
          termsList,
          proofImageUrl,
          sourceVerifiedLive: detail.ok && !detail.blocked,
          proofNotes: `Hasil scrape live dari Katalogpromosi.com (${item.url})`,
        });
      })
    )
  );

  notes.push(`Katalogpromosi: menemukan ${candidates.length} kandidat, memproses ${deals.length} promo.`);
  return { deals, errors, notes };
}

async function scrapeFoodierateRules(): Promise<{
  deals: RawScrapedDeal[];
  errors: string[];
  notes: string[];
}> {
  const deals: RawScrapedDeal[] = [];
  const errors: string[] = [];
  const notes: string[] = [];

  const res = await fetchPage(FOODIERATE_URL, { timeoutMs: 12_000 });
  if (res.blocked) {
    notes.push(`Foodierate diblokir anti-bot: ${res.blockReason}`);
    return { deals, errors, notes };
  }
  if (!res.ok) {
    errors.push(`Foodierate HTTP ${res.status}: ${res.blockReason || "gagal dimuat"}`);
    return { deals, errors, notes };
  }

  const $ = cheerio.load(res.html);
  const seen = new Set<string>();

  $('a[href*="/deal/"]').each((_, el) => {
    const href = $(el).attr("href")?.trim();
    if (!href || seen.has(href)) return;
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length < 25 || text.length > 420) return;

    // Skip explicitly expired deals or brand anniversary promos
    if (/\bkedaluwarsa\b|\bexpired\b/i.test(text)) return;
    if (isBrandAnniversaryPromo(text, text)) return;
    if (!/(ulang tahun|birthday|ultah)/i.test(text)) return;

    seen.add(href);
    const fullUrl = href.startsWith("http") ? href : `https://www.foodierate.com${href}`;
    const heading =
      $(el).find("h2, h3, h4").first().text().replace(/\s+/g, " ").trim() ||
      text.split(/DISKON|Tanpa pembelian|Min\./i)[0].trim();

    const brandName = extractBrandNameFromHeadline(heading);
    deals.push({
      brandName,
      title: heading.slice(0, 120),
      rawText: text,
      sourceUrl: fullUrl,
      sourceType: "SCRAPER_AGGREGATOR",
      category: "F&B",
      sourceVerifiedLive: true,
      proofNotes: `Hasil scrape live dari Foodierate Birthday Offers (${fullUrl})`,
    });
  });

  notes.push(`Foodierate: mengekstrak ${deals.length} promo berlangsung.`);
  return { deals: deals.slice(0, 15), errors, notes };
}

async function scrapeGilaDiskonRules(): Promise<{
  deals: RawScrapedDeal[];
  errors: string[];
  notes: string[];
}> {
  const deals: RawScrapedDeal[] = [];
  const errors: string[] = [];
  const notes: string[] = [];

  const res = await fetchPage(GILADISKON_URL, { timeoutMs: 12_000 });
  if (res.blocked) {
    notes.push(`GilaDiskon diblokir anti-bot: ${res.blockReason}`);
    return { deals, errors, notes };
  }
  if (!res.ok) {
    errors.push(`GilaDiskon HTTP ${res.status}`);
    return { deals, errors, notes };
  }

  const $ = cheerio.load(res.html);
  const seen = new Set<string>();

  $('a[href*="/deals/"]').each((_, el) => {
    const href = $(el).attr("href")?.trim();
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (!href || seen.has(href)) return;
    if (text.length < 12) return;
    if (!/(ulang tahun|birthday|ultah)/i.test(text)) return;
    if (isBrandAnniversaryPromo(text, text)) return;

    seen.add(href);
    const fullUrl = href.startsWith("http") ? href : `https://www.giladiskon.com${href}`;
    deals.push({
      brandName: extractBrandNameFromHeadline(text),
      title: text.slice(0, 120),
      rawText: text,
      sourceUrl: fullUrl,
      sourceType: "SCRAPER_AGGREGATOR",
      sourceVerifiedLive: true,
      proofNotes: `Hasil scrape live dari GilaDiskon.com (${fullUrl})`,
    });
  });

  notes.push(`GilaDiskon: mengekstrak ${deals.length} promo relevan.`);
  return { deals: deals.slice(0, 10), errors, notes };
}

type ScrapeParts = { deals: RawScrapedDeal[]; errors: string[]; notes: string[] };

/**
 * Closes the "cheerio rules found nothing" gap: when the rule-based parse yields no deals and an
 * LLM is available, extract from the page text (fetched via http/Firecrawl tiers) with evidence.
 */
async function withLlmFallback(
  rules: () => Promise<ScrapeParts>,
  url: string,
  label: string,
): Promise<ScrapeParts> {
  const result = await rules();
  if (result.deals.length > 0 || !isAiAvailable()) return result;
  const fb = await extractPageDeals(url, {
    sourceType: "SCRAPER_AGGREGATOR",
    fetchOptions: { allowPlaywright: true, timeoutMs: 12_000 },
  });
  if (fb.deals.length === 0) {
    return { ...result, notes: [...result.notes, `${label} fallback AI: ${fb.note}`] };
  }
  return {
    deals: fb.deals.slice(0, 15),
    errors: [],
    notes: [...result.notes, `${label} fallback AI: ${fb.note}`],
  };
}

const scrapeKatalogPromosi = () =>
  withLlmFallback(scrapeKatalogPromosiRules, KATALOGPROMOSI_URL, "Katalogpromosi");
const scrapeFoodierate = () => withLlmFallback(scrapeFoodierateRules, FOODIERATE_URL, "Foodierate");
const scrapeGilaDiskon = () => withLlmFallback(scrapeGilaDiskonRules, GILADISKON_URL, "GilaDiskon");

export const aggregatorsAdapter: ScraperAdapter = {
  name: "aggregators",
  async run(): Promise<AdapterResult> {
    const [kp, fr, gd] = await Promise.all([
      scrapeKatalogPromosi(),
      scrapeFoodierate(),
      scrapeGilaDiskon(),
    ]);

    const deals = [...kp.deals, ...fr.deals, ...gd.deals];
    const errors = [...kp.errors, ...fr.errors, ...gd.errors];
    const notes = [...kp.notes, ...fr.notes, ...gd.notes];

    const status =
      errors.length === 0 ? "SUCCESS" : deals.length > 0 ? "PARTIAL" : "FAILED";

    return {
      sourceName: "Indonesian Promo Aggregators (Katalogpromosi, Foodierate, GilaDiskon)",
      status,
      deals,
      errors,
      notes,
    };
  },
};
