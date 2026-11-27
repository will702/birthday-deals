import { fetchWithTiers, type FetchWithTiersOptions, type FetchWithTiersResult } from "../fetch-tiers";
import { detectExpirationSignals, isBrandAnniversaryPromo } from "../normalizer";
import type { RawScrapedDeal, SourceType } from "../types";
import { extractDealsFromText, type ExtractDealsInput, type ExtractDealsResult } from "./extract";
import { extractedDealToRaw } from "./schema";

/** True when an LLM can be reached (AI Gateway key, or Vercel OIDC on Vercel). */
export function isAiAvailable(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim());
}

export interface ExtractPageOptions {
  sourceType: SourceType;
  /** Mark resulting deals low-trust (COMMUNITY_SUBMITTED, needs check). */
  lowTrust?: boolean;
  fetchOptions?: FetchWithTiersOptions;
  /** Max characters of page text sent to the model. */
  maxChars?: number;
  /** Injectable for tests. */
  fetchTiers?: (url: string, options?: FetchWithTiersOptions) => Promise<FetchWithTiersResult>;
  extract?: (input: ExtractDealsInput) => Promise<ExtractDealsResult>;
}

export interface ExtractPageResult {
  deals: RawScrapedDeal[];
  tier: FetchWithTiersResult["tier"];
  note: string;
}

/**
 * Convert LLM-extracted deals to RawScrapedDeal, dropping expired promos and brand anniversary
 * promos. Evidence (quote substring of fetched text) was already enforced by extractDealsFromText.
 */
export function extractedToRawDeals(
  result: ExtractDealsResult,
  opts: { sourceType: SourceType; lowTrust?: boolean },
): RawScrapedDeal[] {
  const out: RawScrapedDeal[] = [];
  for (const d of result.deals) {
    const combined = `${d.title} ${d.rawText} ${d.evidenceQuote}`;
    if (detectExpirationSignals(combined).likelyExpired) continue;
    if (isBrandAnniversaryPromo(d.title, d.rawText)) continue;
    const raw = extractedDealToRaw(d, { sourceType: opts.sourceType, sourceVerifiedLive: true });
    if (opts.lowTrust) raw.lowTrust = true;
    out.push(raw);
  }
  return out;
}

export interface ExtractTextOptions {
  sourceType: SourceType;
  lowTrust?: boolean;
  maxChars?: number;
  extract?: (input: ExtractDealsInput) => Promise<ExtractDealsResult>;
}

/** Extract deals from already-fetched (untrusted) text attributed to `url`. Never throws. */
export async function extractTextDeals(
  url: string,
  text: string,
  options: ExtractTextOptions,
): Promise<{ deals: RawScrapedDeal[]; dropped: number; error?: string }> {
  const extract = options.extract ?? extractDealsFromText;
  try {
    const result = await extract({ url, text: text.slice(0, options.maxChars ?? 30_000) });
    return { deals: extractedToRawDeals(result, options), dropped: result.droppedNoEvidence };
  } catch (err) {
    return {
      deals: [],
      dropped: 0,
      error: err instanceof Error ? err.message.slice(0, 100) : "error",
    };
  }
}

/**
 * Fetch `url` through the tiered fetcher and extract deals with the LLM. Never throws: failures
 * are reported through `note`. Page text is untrusted; see EXTRACTION_SYSTEM.
 */
export async function extractPageDeals(
  url: string,
  options: ExtractPageOptions,
): Promise<ExtractPageResult> {
  const fetchTiers = options.fetchTiers ?? fetchWithTiers;

  const page = await fetchTiers(url, options.fetchOptions);
  if (!page.ok) {
    return {
      deals: [],
      tier: page.tier,
      note: `${url}: tidak dimuat (${page.skipReason ?? page.error ?? "gagal"})`,
    };
  }

  const res = await extractTextDeals(url, page.text, options);
  if (res.error) {
    return { deals: [], tier: page.tier, note: `${url}: ekstraksi AI gagal (${res.error})` };
  }
  return {
    deals: res.deals,
    tier: page.tier,
    note: `${url}: ${res.deals.length} deal via ${page.tier} + AI (${res.dropped} dibuang tanpa bukti)`,
  };
}
