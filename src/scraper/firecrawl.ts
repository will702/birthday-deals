import Firecrawl from "@mendable/firecrawl-js";
import { assertPublicHttpUrl } from "./agent/ssrf";

/**
 * Thin, budgeted wrapper around the Firecrawl SDK (paid, last-resort fetch tier and search).
 * - The client is created lazily and only when FIRECRAWL_API_KEY is set.
 * - Every call is checked with assertPublicHttpUrl and counted against a per-run credit budget
 *   (FIRECRAWL_MAX_CREDITS, default 200). Call resetFirecrawlBudget() at the start of a run.
 * - No proxy/stealth options are ever requested: this is an infrastructure fallback, not evasion.
 */

export const DEFAULT_FIRECRAWL_MAX_CREDITS = 200;
const SCRAPE_CREDITS = 1;
const JSON_FORMAT_EXTRA_CREDITS = 4;
const SEARCH_CREDITS_PER_10 = 2;

export type FirecrawlErrorCode =
  | "not-configured"
  | "budget-exhausted"
  | "url-rejected"
  | "request-failed";

export class FirecrawlError extends Error {
  constructor(
    readonly code: FirecrawlErrorCode,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "FirecrawlError";
  }
}

export interface FirecrawlPage {
  /** Plain text (markdown with common markup stripped) used for evidence matching. */
  text: string;
  markdown: string;
  title: string;
  url: string;
  tier: "firecrawl";
  statusCode?: number;
  /** Present only when a json schema was requested. */
  json?: unknown;
}

export interface FirecrawlSearchHit {
  url: string;
  title: string;
  description: string;
}

export interface FirecrawlScrapeOptions {
  /** Request structured JSON extraction (costs extra credits). */
  jsonSchema?: Record<string, unknown>;
  jsonPrompt?: string;
  timeoutMs?: number;
}

export interface FirecrawlSearchOptions {
  limit?: number;
  /** ISO country code (default "id"). */
  country?: string;
  /** Accepted for API symmetry; the SDK has no language parameter, so queries should be written in the target language. */
  lang?: string;
}

/** Minimal client surface we use; lets tests inject a fake. */
export interface FirecrawlClientLike {
  scrape(
    url: string,
    options?: Record<string, unknown>,
  ): Promise<{
    markdown?: string;
    json?: unknown;
    metadata?: { title?: string; url?: string; sourceURL?: string; statusCode?: number };
  }>;
  search(
    query: string,
    options?: Record<string, unknown>,
  ): Promise<{ web?: Array<{ url?: string; title?: string; description?: string }> }>;
}

let client: FirecrawlClientLike | null = null;
let creditsUsed = 0;
let callCount = 0;

export function isFirecrawlConfigured(): boolean {
  return Boolean(process.env.FIRECRAWL_API_KEY?.trim());
}

export function getFirecrawlMaxCredits(): number {
  const n = Number(process.env.FIRECRAWL_MAX_CREDITS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_FIRECRAWL_MAX_CREDITS;
}

export function resetFirecrawlBudget(): void {
  creditsUsed = 0;
  callCount = 0;
}

export function getFirecrawlUsage(): { creditsUsed: number; calls: number; maxCredits: number } {
  return { creditsUsed, calls: callCount, maxCredits: getFirecrawlMaxCredits() };
}

/** Test hook: inject (or clear with null) a fake client. */
export function setFirecrawlClientForTests(c: FirecrawlClientLike | null): void {
  client = c;
}

function getClient(): FirecrawlClientLike {
  if (client) return client;
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) {
    throw new FirecrawlError("not-configured", "FIRECRAWL_API_KEY belum diatur.");
  }
  client = new Firecrawl({ apiKey }) as unknown as FirecrawlClientLike;
  return client;
}

function charge(cost: number): void {
  if (creditsUsed + cost > getFirecrawlMaxCredits()) {
    throw new FirecrawlError(
      "budget-exhausted",
      `Budget Firecrawl habis (${creditsUsed}/${getFirecrawlMaxCredits()} kredit).`,
    );
  }
  creditsUsed += cost;
  callCount += 1;
}

async function guardUrl(url: string): Promise<string> {
  try {
    return (await assertPublicHttpUrl(url)).toString();
  } catch (err) {
    throw new FirecrawlError(
      "url-rejected",
      `URL ditolak (${err instanceof Error ? err.message : "tidak aman"})`,
    );
  }
}

/** Strip the most common markdown markup so quotes copied by a model match the text. */
export function markdownToText(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<\/?[a-z][^>]*>/gi, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__|`)/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function firecrawlScrape(
  url: string,
  options: FirecrawlScrapeOptions = {},
): Promise<FirecrawlPage> {
  const c = getClient();
  const safeUrl = await guardUrl(url);
  charge(SCRAPE_CREDITS + (options.jsonSchema ? JSON_FORMAT_EXTRA_CREDITS : 0));

  const formats: unknown[] = ["markdown"];
  if (options.jsonSchema) {
    formats.push({
      type: "json",
      schema: options.jsonSchema,
      ...(options.jsonPrompt ? { prompt: options.jsonPrompt } : {}),
    });
  }

  let doc: Awaited<ReturnType<FirecrawlClientLike["scrape"]>>;
  try {
    doc = await c.scrape(safeUrl, {
      formats,
      onlyMainContent: true,
      timeout: options.timeoutMs ?? 30_000,
    });
  } catch (err) {
    throw new FirecrawlError(
      "request-failed",
      `Firecrawl scrape gagal: ${err instanceof Error ? err.message.slice(0, 160) : "error"}`,
      (err as { status?: number })?.status,
    );
  }

  const markdown = doc.markdown ?? "";
  const finalUrl = doc.metadata?.url || doc.metadata?.sourceURL || safeUrl;
  // Redirects must not land on an internal host.
  await guardUrl(finalUrl);
  return {
    text: markdownToText(markdown),
    markdown,
    title: doc.metadata?.title?.trim() ?? "",
    url: finalUrl,
    tier: "firecrawl",
    statusCode: doc.metadata?.statusCode,
    ...(doc.json !== undefined ? { json: doc.json } : {}),
  };
}

export async function firecrawlSearch(
  query: string,
  options: FirecrawlSearchOptions = {},
): Promise<FirecrawlSearchHit[]> {
  const c = getClient();
  const limit = Math.min(Math.max(options.limit ?? 5, 1), 20);
  charge(Math.ceil(limit / 10) * SEARCH_CREDITS_PER_10);

  let data: Awaited<ReturnType<FirecrawlClientLike["search"]>>;
  try {
    data = await c.search(query, {
      limit,
      country: (options.country ?? "id").toUpperCase(),
      sources: ["web"],
      timeout: 30_000,
    });
  } catch (err) {
    throw new FirecrawlError(
      "request-failed",
      `Firecrawl search gagal: ${err instanceof Error ? err.message.slice(0, 160) : "error"}`,
      (err as { status?: number })?.status,
    );
  }

  const hits: FirecrawlSearchHit[] = [];
  for (const r of data.web ?? []) {
    if (!r.url) continue;
    try {
      hits.push({
        url: (await assertPublicHttpUrl(r.url)).toString(),
        title: r.title?.trim() ?? "",
        description: r.description?.trim() ?? "",
      });
    } catch {
      // drop unsafe/malformed result URLs
    }
  }
  return hits;
}
