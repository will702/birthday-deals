import * as cheerio from "cheerio";
import {
  FirecrawlError,
  firecrawlScrape,
  isFirecrawlConfigured,
  type FirecrawlPage,
} from "./firecrawl";
import { fetchPage, type FetchPageOptions, type FetchPageResult } from "./http";

/**
 * Tiered fetch: plain HTTP -> Playwright render (SPA shells, local only) -> Firecrawl (paid).
 * robots.txt disallow is final: the URL is skipped and never escalated.
 */

export type FetchTier = "http" | "playwright" | "firecrawl";

export interface FetchWithTiersOptions extends FetchPageOptions {
  /** Allow the Playwright tier. Ignored on Vercel (no browser binary). */
  allowPlaywright?: boolean;
  /** Allow the Firecrawl tier (default true; still requires FIRECRAWL_API_KEY). */
  allowFirecrawl?: boolean;
  /** Visible-text length below which a 2xx page counts as an empty SPA shell (default 350). */
  minTextChars?: number;
  /**
   * Content the page must contain to count as a usable result (e.g. a birthday keyword). A 2xx
   * page missing it escalates to the next tier (SPA shells that render the content client-side).
   */
  requirePattern?: RegExp;
}

export interface TierAttempt {
  tier: FetchTier;
  outcome: "ok" | "escalate" | "failed" | "skipped";
  reason?: string;
}

export interface FetchWithTiersResult {
  ok: boolean;
  /** Tier that produced the returned content (null when everything failed or robots skipped). */
  tier: FetchTier | null;
  url: string;
  finalUrl: string;
  status: number;
  html: string;
  text: string;
  markdown?: string;
  title: string;
  skipReason?: "robots-disallowed";
  error: string | null;
  attempts: TierAttempt[];
}

export interface TierDeps {
  fetchPage: (url: string, options: FetchPageOptions) => Promise<FetchPageResult>;
  firecrawlScrape: (url: string) => Promise<FirecrawlPage>;
  isFirecrawlConfigured: () => boolean;
}

const DEFAULT_DEPS: TierDeps = {
  fetchPage,
  firecrawlScrape: (url) => firecrawlScrape(url),
  isFirecrawlConfigured,
};

const CHALLENGE_TEXT_PATTERNS = [
  /just a moment\.{0,3}/i,
  /verify you are (a )?human/i,
  /checking your browser/i,
  /enable javascript and cookies to continue/i,
  /(complete|solve) the (captcha|security check)/i,
  /access denied/i,
  /attention required/i,
];

export function looksLikeChallengeText(text: string): boolean {
  // Challenge interstitials are short; a long article mentioning "captcha" is not one.
  if (text.length > 1500) return false;
  return CHALLENGE_TEXT_PATTERNS.some((p) => p.test(text));
}

/** Reason to escalate to the next tier, or null when the result is good enough / final. */
export function escalationReason(res: FetchPageResult, minTextChars = 350): string | null {
  if (res.skipReason === "robots-disallowed") return null;
  if (res.status === 403 || res.status === 429 || res.status === 503) {
    return `HTTP ${res.status}`;
  }
  if (res.blocked) return res.blockReason ?? "blocked";
  if (res.status === 0) return null; // network failure/timeout: not worth paid credits
  if (!res.ok) return null; // 404 etc: genuinely missing
  if (looksLikeChallengeText(res.text)) return "challenge-text";
  if (res.text.length < minTextChars) return "spa-empty";
  return null;
}

function titleOf(html: string): string {
  if (!html) return "";
  return cheerio.load(html)("title").first().text().replace(/\s+/g, " ").trim();
}

/** SCRAPER_TIERS="http,playwright,firecrawl" (CLI --tiers=...) restricts which tiers may run. */
export function enabledTiers(): Set<FetchTier> {
  const raw = process.env.SCRAPER_TIERS?.trim();
  if (!raw) return new Set<FetchTier>(["http", "playwright", "firecrawl"]);
  return new Set(
    raw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t): t is FetchTier => t === "http" || t === "playwright" || t === "firecrawl"),
  );
}

export function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

export async function fetchWithTiers(
  url: string,
  options: FetchWithTiersOptions = {},
  deps: TierDeps = DEFAULT_DEPS,
): Promise<FetchWithTiersResult> {
  const tiers = enabledTiers();
  const { minTextChars = 350, requirePattern, ...pageOptions } = options;
  const allowFirecrawl = (options.allowFirecrawl ?? true) && tiers.has("firecrawl");
  const attempts: TierAttempt[] = [];
  const usePlaywright =
    Boolean(options.allowPlaywright) && tiers.has("playwright") && !isVercelRuntime();

  const first = await deps.fetchPage(url, { ...pageOptions, allowPlaywright: usePlaywright });
  const firstTier: FetchTier = first.usedPlaywright ? "playwright" : "http";

  if (first.skipReason === "robots-disallowed") {
    attempts.push({ tier: "http", outcome: "skipped", reason: "robots-disallowed" });
    return {
      ok: false,
      tier: null,
      url,
      finalUrl: first.finalUrl,
      status: 0,
      html: "",
      text: "",
      title: "",
      skipReason: "robots-disallowed",
      error: first.blockReason,
      attempts,
    };
  }

  let reason = escalationReason(first, minTextChars);
  if (reason === null && first.ok && requirePattern && !requirePattern.test(first.text)) {
    reason = "pattern-missing";
  }
  if (reason === null) {
    attempts.push({ tier: firstTier, outcome: first.ok ? "ok" : "failed", reason: first.blockReason ?? undefined });
    return {
      ok: first.ok,
      tier: first.ok ? firstTier : null,
      url,
      finalUrl: first.finalUrl,
      status: first.status,
      html: first.html,
      text: first.text,
      title: titleOf(first.html),
      error: first.ok ? null : (first.blockReason ?? `HTTP ${first.status}`),
      attempts,
    };
  }

  attempts.push({ tier: firstTier, outcome: "escalate", reason });

  const failedResult = (error: string): FetchWithTiersResult =>
    // A thin-but-real page (SPA shell that nothing could render) is still usable by callers.
    first.ok && !first.blocked && (reason === "spa-empty" || reason === "pattern-missing")
      ? {
          ok: true,
          tier: firstTier,
          url,
          finalUrl: first.finalUrl,
          status: first.status,
          html: first.html,
          text: first.text,
          title: titleOf(first.html),
          error: null,
          attempts,
        }
      : {
    ok: false,
    tier: null,
    url,
    finalUrl: first.finalUrl,
    status: first.status,
    html: "",
    text: "",
    title: "",
    error,
    attempts,
  };

  if (!allowFirecrawl || !deps.isFirecrawlConfigured()) {
    attempts.push({ tier: "firecrawl", outcome: "skipped", reason: "not-configured-or-disabled" });
    return failedResult(`${reason} (Firecrawl tidak tersedia)`);
  }

  try {
    const page = await deps.firecrawlScrape(url);
    if (page.text.length === 0 || looksLikeChallengeText(page.text)) {
      attempts.push({ tier: "firecrawl", outcome: "failed", reason: "empty-or-challenge" });
      return failedResult(`Firecrawl tidak mengembalikan konten (${reason})`);
    }
    attempts.push({ tier: "firecrawl", outcome: "ok" });
    return {
      ok: true,
      tier: "firecrawl",
      url,
      finalUrl: page.url,
      status: page.statusCode ?? 200,
      html: "",
      text: page.text,
      markdown: page.markdown,
      title: page.title,
      error: null,
      attempts,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Firecrawl error";
    attempts.push({
      tier: "firecrawl",
      outcome: "failed",
      reason: err instanceof FirecrawlError ? err.code : "error",
    });
    return failedResult(msg);
  }
}
