import { afterEach, describe, expect, it, vi } from "vitest";
import {
  escalationReason,
  fetchWithTiers,
  looksLikeChallengeText,
  type TierDeps,
} from "../src/scraper/fetch-tiers";
import type { FetchPageResult } from "../src/scraper/http";

const LONG = "Promo ulang tahun gratis untuk member. ".repeat(20);

function page(over: Partial<FetchPageResult> = {}): FetchPageResult {
  return {
    url: "https://a.test/",
    finalUrl: "https://a.test/",
    status: 200,
    ok: true,
    blocked: false,
    blockReason: null,
    html: `<html><head><title>Judul</title></head><body>${LONG}</body></html>`,
    text: LONG,
    usedPlaywright: false,
    ...over,
  };
}

function deps(over: Partial<TierDeps> = {}): TierDeps & {
  fetchPage: ReturnType<typeof vi.fn>;
  firecrawlScrape: ReturnType<typeof vi.fn>;
} {
  return {
    fetchPage: vi.fn(async () => page()),
    firecrawlScrape: vi.fn(async (url: string) => ({
      text: LONG,
      markdown: LONG,
      title: "FC",
      url,
      tier: "firecrawl" as const,
    })),
    isFirecrawlConfigured: () => true,
    ...over,
  } as never;
}

describe("escalationReason", () => {
  it("escalates on 403/429/503, challenge, empty shell", () => {
    expect(escalationReason(page({ status: 403, ok: false, blocked: true }))).toBe("HTTP 403");
    expect(escalationReason(page({ status: 429, ok: false }))).toBe("HTTP 429");
    expect(escalationReason(page({ status: 503, ok: false }))).toBe("HTTP 503");
    expect(escalationReason(page({ blocked: true, ok: false, blockReason: "captcha" }))).toBe("captcha");
    expect(escalationReason(page({ text: "Just a moment..." }))).toBe("challenge-text");
    expect(escalationReason(page({ text: "kosong" }))).toBe("spa-empty");
  });

  it("does not escalate on robots, 404, network failure or healthy pages", () => {
    expect(escalationReason(page({ skipReason: "robots-disallowed", blocked: true, ok: false, status: 0 }))).toBeNull();
    expect(escalationReason(page({ status: 404, ok: false }))).toBeNull();
    expect(escalationReason(page({ status: 0, ok: false }))).toBeNull();
    expect(escalationReason(page())).toBeNull();
  });

  it("recognises short challenge text only", () => {
    expect(looksLikeChallengeText("Please verify you are human")).toBe(true);
    expect(looksLikeChallengeText(`${LONG.repeat(5)} captcha verify you are human`)).toBe(false);
  });
});

describe("fetchWithTiers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the http tier when the page is fine and never calls Firecrawl", async () => {
    const d = deps();
    const res = await fetchWithTiers("https://a.test/", {}, d);
    expect(res.ok).toBe(true);
    expect(res.tier).toBe("http");
    expect(res.title).toBe("Judul");
    expect(d.firecrawlScrape).not.toHaveBeenCalled();
  });

  it("reports the playwright tier when fetchPage rendered the page", async () => {
    const d = deps({ fetchPage: vi.fn(async () => page({ usedPlaywright: true })) });
    const res = await fetchWithTiers("https://a.test/", { allowPlaywright: true }, d);
    expect(res.tier).toBe("playwright");
    expect(d.fetchPage).toHaveBeenCalledWith("https://a.test/", expect.objectContaining({ allowPlaywright: true }));
  });

  it("never enables Playwright on Vercel", async () => {
    vi.stubEnv("VERCEL", "1");
    const d = deps();
    await fetchWithTiers("https://a.test/", { allowPlaywright: true }, d);
    expect(d.fetchPage).toHaveBeenCalledWith("https://a.test/", expect.objectContaining({ allowPlaywright: false }));
  });

  it("escalates a 403 to Firecrawl", async () => {
    const d = deps({ fetchPage: vi.fn(async () => page({ status: 403, ok: false, blocked: true, html: "", text: "" })) });
    const res = await fetchWithTiers("https://a.test/", {}, d);
    expect(res.ok).toBe(true);
    expect(res.tier).toBe("firecrawl");
    expect(res.attempts.map((a) => `${a.tier}:${a.outcome}`)).toEqual(["http:escalate", "firecrawl:ok"]);
  });

  it("escalates an empty SPA shell and a blocked 503 to Firecrawl", async () => {
    const shell = deps({ fetchPage: vi.fn(async () => page({ text: "x", html: "<html></html>" })) });
    expect((await fetchWithTiers("https://a.test/", {}, shell)).tier).toBe("firecrawl");
    const e503 = deps({ fetchPage: vi.fn(async () => page({ status: 503, ok: false, html: "", text: "" })) });
    expect((await fetchWithTiers("https://a.test/", {}, e503)).tier).toBe("firecrawl");
  });

  it("escalates when requirePattern is missing from an otherwise fine page", async () => {
    const d = deps({ fetchPage: vi.fn(async () => page({ text: "Halaman ini panjang. ".repeat(40) })) });
    const res = await fetchWithTiers("https://a.test/", { requirePattern: /ulang tahun/i }, d);
    expect(res.tier).toBe("firecrawl");
  });

  it("respects robots: skips the URL and never escalates", async () => {
    const d = deps({
      fetchPage: vi.fn(async () =>
        page({ skipReason: "robots-disallowed", status: 0, ok: false, blocked: true, blockReason: "robots", html: "", text: "" }),
      ),
    });
    const res = await fetchWithTiers("https://a.test/", {}, d);
    expect(res.ok).toBe(false);
    expect(res.skipReason).toBe("robots-disallowed");
    expect(res.tier).toBeNull();
    expect(d.firecrawlScrape).not.toHaveBeenCalled();
  });

  it("fails cleanly when Firecrawl is unconfigured or errors", async () => {
    const blocked = page({ status: 403, ok: false, blocked: true, html: "", text: "" });
    const none = deps({ fetchPage: vi.fn(async () => blocked), isFirecrawlConfigured: () => false });
    const r1 = await fetchWithTiers("https://a.test/", {}, none);
    expect(r1.ok).toBe(false);
    expect(none.firecrawlScrape).not.toHaveBeenCalled();

    const boom = deps({
      fetchPage: vi.fn(async () => blocked),
      firecrawlScrape: vi.fn(async () => {
        throw new Error("budget habis");
      }),
    });
    const r2 = await fetchWithTiers("https://a.test/", {}, boom);
    expect(r2.ok).toBe(false);
    expect(r2.error).toMatch(/budget/);
  });

  it("keeps a thin SPA shell as usable result when no higher tier can help", async () => {
    const d = deps({
      fetchPage: vi.fn(async () => page({ text: "tipis", html: "<html><title>T</title></html>" })),
      isFirecrawlConfigured: () => false,
    });
    const res = await fetchWithTiers("https://a.test/", {}, d);
    expect(res.ok).toBe(true);
    expect(res.tier).toBe("http");
  });

  it("honours SCRAPER_TIERS and allowFirecrawl=false", async () => {
    const blocked = page({ status: 403, ok: false, blocked: true, html: "", text: "" });
    vi.stubEnv("SCRAPER_TIERS", "http");
    const d = deps({ fetchPage: vi.fn(async () => blocked) });
    expect((await fetchWithTiers("https://a.test/", {}, d)).ok).toBe(false);
    expect(d.firecrawlScrape).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
    const d2 = deps({ fetchPage: vi.fn(async () => blocked) });
    expect((await fetchWithTiers("https://a.test/", { allowFirecrawl: false }, d2)).ok).toBe(false);
    expect(d2.firecrawlScrape).not.toHaveBeenCalled();
  });
});
