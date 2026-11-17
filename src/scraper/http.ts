import * as cheerio from "cheerio";
import { getSharedBrowser } from "./browser";
import { withHostPoliteness } from "./politeness";
import { SCRAPER_PRODUCT_TOKEN, isAllowed } from "./robots";

export interface FetchPageResult {
  url: string;
  finalUrl: string;
  status: number;
  ok: boolean;
  blocked: boolean;
  blockReason: string | null;
  html: string;
  text: string;
  usedPlaywright: boolean;
  /** Set when the page was intentionally not fetched. */
  skipReason?: "robots-disallowed";
  /** Playwright render error, when rendering failed and the static result was used. */
  renderError?: string | null;
}

export interface FetchPageOptions {
  allowPlaywright?: boolean;
  timeoutMs?: number;
  /** Max attempts for network errors, 5xx and 429 (default 3). */
  maxAttempts?: number;
  /** Injectable sleep, used for backoff and politeness delays (tests). */
  sleep?: (ms: number) => Promise<void>;
  /** Minimum delay between requests to the same host (default 1000ms or SCRAPER_MIN_DELAY_MS). */
  minHostDelayMs?: number;
  /** Check robots.txt before fetching (default true). */
  respectRobots?: boolean;
}

const DEFAULT_SLEEP = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const BACKOFF_BASE_MS = 500;
const MAX_RETRY_AFTER_MS = 30_000;

export function getUserAgent(): string {
  const contact = process.env.SCRAPER_CONTACT_URL?.trim();
  return `${SCRAPER_PRODUCT_TOKEN}/1.0 (+${contact || "https://github.com/birthday-deals/contact"})`;
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.min(Math.max(seconds, 0) * 1000, MAX_RETRY_AFTER_MS);
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.min(Math.max(date - Date.now(), 0), MAX_RETRY_AFTER_MS);
  return null;
}

const BOT_PROTECTION_PATTERNS = [
  /cf-turnstile/i,
  /g-recaptcha/i,
  /hcaptcha/i,
  /just a moment\.\.\./i,
  /attention required!\s*\|\s*cloudflare/i,
  /verify you are human/i,
  /checking your browser before accessing/i,
  /ddos-guard/i,
];

export function hasAntiBotChallenge(html: string, status: number): {
  blocked: boolean;
  reason: string | null;
} {
  if (status === 403 || status === 429) {
    return { blocked: true, reason: `HTTP ${status} (Rate-limit / Access restricted)` };
  }
  for (const pattern of BOT_PROTECTION_PATTERNS) {
    if (pattern.test(html)) {
      return { blocked: true, reason: "Anti-bot / CAPTCHA gate detected (skipped per policy)" };
    }
  }
  return { blocked: false, reason: null };
}

export function extractVisibleText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

interface RawResponse {
  status: number;
  finalUrl: string;
  html: string;
}

async function fetchWithRetry(
  url: string,
  timeoutMs: number,
  maxAttempts: number,
  sleep: (ms: number) => Promise<void>
): Promise<RawResponse | { error: string }> {
  let lastError = "Network error";
  let last: RawResponse | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // One timer covers headers AND the full body read.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let retryAfterMs: number | null = null;
    let retryable = false;

    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": getUserAgent(),
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      });
      const html = await res.text();
      last = { status: res.status, finalUrl: res.url || url, html };
      retryable = res.status === 429 || res.status >= 500;
      if (!retryable) return last;
      retryAfterMs = parseRetryAfterMs(res.headers?.get("retry-after") ?? null);
    } catch (err) {
      lastError = controller.signal.aborted
        ? `Timeout after ${timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : "Network error";
      last = null;
      retryable = true;
    } finally {
      clearTimeout(timer);
    }

    if (retryable && attempt < maxAttempts) {
      const backoff = BACKOFF_BASE_MS * 2 ** (attempt - 1);
      const jitter = Math.random() * backoff * 0.5;
      await sleep(retryAfterMs ?? backoff + jitter);
    }
  }

  return last ?? { error: lastError };
}

export async function fetchPage(
  url: string,
  options: FetchPageOptions = {}
): Promise<FetchPageResult> {
  const timeoutMs = options.timeoutMs ?? 12_000;
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const sleep = options.sleep ?? DEFAULT_SLEEP;

  if (options.respectRobots !== false && !(await isAllowed(url, SCRAPER_PRODUCT_TOKEN))) {
    return {
      url,
      finalUrl: url,
      status: 0,
      ok: false,
      blocked: true,
      blockReason: "Dilewati: robots.txt melarang akses ke URL ini",
      html: "",
      text: "",
      usedPlaywright: false,
      skipReason: "robots-disallowed",
    };
  }

  const raw = await withHostPoliteness(
    url,
    () => fetchWithRetry(url, timeoutMs, maxAttempts, sleep),
    { minDelayMs: options.minHostDelayMs, sleep }
  );

  if ("error" in raw) {
    return {
      url,
      finalUrl: url,
      status: 0,
      ok: false,
      blocked: false,
      blockReason: raw.error,
      html: "",
      text: "",
      usedPlaywright: false,
    };
  }

  const { status, finalUrl, html } = raw;
  const challenge = hasAntiBotChallenge(html, status);
  if (challenge.blocked) {
    return {
      url,
      finalUrl,
      status,
      ok: false,
      blocked: true,
      blockReason: challenge.reason,
      html: "",
      text: "",
      usedPlaywright: false,
    };
  }

  const text = extractVisibleText(html);
  const looksLikeSpaShell = status >= 200 && status < 400 && text.length < 350;
  let renderError: string | null = null;

  if (options.allowPlaywright && looksLikeSpaShell) {
    const browser = await getSharedBrowser();
    if (!browser) {
      renderError = "Playwright browser tidak tersedia";
      console.warn(`[scraper] ${renderError} (${url})`);
    } else {
      let context: Awaited<ReturnType<typeof browser.newContext>> | null = null;
      try {
        context = await browser.newContext({ locale: "id-ID", userAgent: getUserAgent() });
        const page = await context.newPage();
        await page.route("**/*", (route) => {
          const type = route.request().resourceType();
          if (type === "image" || type === "media" || type === "font") {
            return route.abort();
          }
          return route.continue();
        });
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
        await page.waitForLoadState("networkidle", { timeout: Math.min(5_000, timeoutMs) }).catch(() => {
          // Pages with long-polling never go idle; continue with what has rendered.
        });
        const renderedStatus = response?.status() ?? status;
        const renderedHtml = await page.content();
        const renderedUrl = page.url();
        const renderedChallenge = hasAntiBotChallenge(renderedHtml, renderedStatus);

        if (renderedChallenge.blocked) {
          return {
            url,
            finalUrl: renderedUrl,
            status: renderedStatus,
            ok: false,
            blocked: true,
            blockReason: renderedChallenge.reason,
            html: "",
            text: "",
            usedPlaywright: true,
          };
        }

        return {
          url,
          finalUrl: renderedUrl,
          status: renderedStatus,
          ok: renderedStatus >= 200 && renderedStatus < 400,
          blocked: false,
          blockReason: null,
          html: renderedHtml,
          text: extractVisibleText(renderedHtml),
          usedPlaywright: true,
        };
      } catch (err) {
        renderError = err instanceof Error ? err.message : "Playwright render error";
        console.warn(`[scraper] Playwright render failed for ${url}: ${renderError}`);
        // Fall back to static result below
      } finally {
        await context?.close().catch(() => undefined);
      }
    }
  }

  return {
    url,
    finalUrl,
    status,
    ok: status >= 200 && status < 400,
    blocked: false,
    blockReason: null,
    html,
    text,
    usedPlaywright: false,
    ...(renderError ? { renderError } : {}),
  };
}
