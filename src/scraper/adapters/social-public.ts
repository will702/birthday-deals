import { extractTextDeals, isAiAvailable } from "../agent/page-extract";
import { firecrawlSearch, isFirecrawlConfigured, type FirecrawlSearchHit } from "../firecrawl";
import { SOCIAL_PUBLIC_HANDLES, SOCIAL_PUBLIC_QUERIES, type SocialHandle } from "../sources/social";
import type { AdapterResult, RawScrapedDeal, ScraperAdapter } from "../types";
import { extractSocialOrPageMetadata, type SocialMetadataResult } from "./social-metadata";

/**
 * PUBLIC social posts only. No login, no cookies, no evasion: we use search-engine snippets
 * (Firecrawl search) and the Open Graph metadata that public pages expose to link previews.
 * Resulting deals are low-trust (COMMUNITY_SUBMITTED = "needs check") and never overwrite
 * higher-trust records (see runner `lowTrust` handling).
 */

const SOURCE_NAME = "Public Social Posts (Instagram/TikTok, low trust)";
const SOCIAL_HOST = /(^|\.)(instagram\.com|tiktok\.com|facebook\.com|threads\.(com|net)|x\.com|twitter\.com)$/i;

export function isPublicSocialUrl(url: string): boolean {
  try {
    return SOCIAL_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Text the model may quote from: only what the public search snippet / OG tags exposed. */
export function snippetText(hit: Pick<FirecrawlSearchHit, "title" | "description">): string {
  return [hit.title, hit.description].filter(Boolean).join("\n").trim();
}

export function metadataText(meta: Pick<SocialMetadataResult, "title" | "description">): string {
  return [meta.title, meta.description].filter(Boolean).join("\n").trim();
}

const BIRTHDAY = /(ulang tahun|ultah|birthday|b'?day)/i;
export function mentionsBirthday(text: string): boolean {
  return BIRTHDAY.test(text);
}

export interface SocialPublicOptions {
  maxResults?: number;
  handles?: SocialHandle[];
  queries?: string[];
  maxSearches?: number;
  /** Injectable LLM extractor (tests). */
  extract?: Parameters<typeof extractTextDeals>[2]["extract"];
}

export function createSocialPublicAdapter(options: SocialPublicOptions = {}): ScraperAdapter {
  return {
    name: "social-public",
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

      const maxResults = options.maxResults ?? 8;
      const notes: string[] = [];
      const errors: string[] = [];
      const deals: RawScrapedDeal[] = [];
      const seenUrls = new Set<string>();
      const candidates: Array<{ url: string; text: string }> = [];

      if (isFirecrawlConfigured()) {
        for (const q of (options.queries ?? SOCIAL_PUBLIC_QUERIES).slice(0, options.maxSearches ?? 2)) {
          try {
            const hits = await firecrawlSearch(q, { limit: 6, country: "id", lang: "id" });
            for (const h of hits) {
              if (!isPublicSocialUrl(h.url) || seenUrls.has(h.url)) continue;
              const text = snippetText(h);
              if (!mentionsBirthday(text)) continue;
              seenUrls.add(h.url);
              candidates.push({ url: h.url, text });
            }
          } catch (err) {
            notes.push(`Firecrawl search gagal: ${err instanceof Error ? err.message : "error"}`);
            break;
          }
        }
      } else {
        notes.push("FIRECRAWL_API_KEY belum diatur: hanya metadata OG handle publik yang dicek.");
      }

      for (const handle of options.handles ?? SOCIAL_PUBLIC_HANDLES) {
        if (candidates.length >= maxResults) break;
        const meta = await extractSocialOrPageMetadata(handle.url);
        if (!meta.accessible) {
          notes.push(`${handle.brandName}: ${handle.url} tidak dapat diakses publik (${meta.blockedReason}).`);
          continue;
        }
        const text = metadataText(meta);
        if (!mentionsBirthday(text) || seenUrls.has(handle.url)) continue;
        seenUrls.add(handle.url);
        candidates.push({ url: handle.url, text });
      }

      for (const c of candidates.slice(0, maxResults)) {
        const res = await extractTextDeals(c.url, c.text, {
          sourceType: "SCRAPER_SEARCH",
          lowTrust: true,
          extract: options.extract,
        });
        if (res.error) {
          errors.push(`${c.url}: ${res.error}`);
          continue;
        }
        deals.push(...res.deals);
      }
      notes.push(`Social-public: ${candidates.length} postingan publik, ${deals.length} deal (needs-check).`);

      return {
        sourceName: SOURCE_NAME,
        status: errors.length > 0 ? "PARTIAL" : "SUCCESS",
        deals,
        errors,
        notes,
      };
    },
  };
}

export const socialPublicAdapter: ScraperAdapter = createSocialPublicAdapter();
