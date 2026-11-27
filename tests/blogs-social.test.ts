import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ddg: vi.fn(),
  fcSearch: vi.fn(),
  fcConfigured: vi.fn(),
  meta: vi.fn(),
}));

vi.mock("../src/scraper/adapters/search-discovery", () => ({ searchDuckDuckGo: mocks.ddg }));
vi.mock("../src/scraper/adapters/social-metadata", () => ({
  extractSocialOrPageMetadata: mocks.meta,
}));
vi.mock("../src/scraper/firecrawl", async (orig) => ({
  ...(await orig<typeof import("../src/scraper/firecrawl")>()),
  firecrawlSearch: mocks.fcSearch,
  isFirecrawlConfigured: mocks.fcConfigured,
}));

import { buildBlogQueries, createBlogsAdapter, dedupeCandidateUrls } from "../src/scraper/adapters/blogs";
import {
  isPublicSocialUrl,
  mentionsBirthday,
  snippetText,
  createSocialPublicAdapter,
} from "../src/scraper/adapters/social-public";
import { extractedToRawDeals } from "../src/scraper/agent/page-extract";
import { filterByEvidence } from "../src/scraper/agent/extract";
import { normalizeScrapedDeal } from "../src/scraper/normalizer";

const fx = (f: string) => readFileSync(path.join(__dirname, "fixtures", f), "utf8");
const article = fx("blog-article.txt");
const snippets = JSON.parse(fx("social-snippets.json")) as Array<{ url: string; title: string; description: string }>;

const modelDeal = (over: Record<string, unknown> = {}) => ({
  brandName: "Janji Jiwa",
  title: "Diskon 50% Birthday Treat",
  rawText: "Diskon 50 persen maksimal Rp50.000 saat ulang tahun",
  evidenceQuote: "Kamu bisa mendapatkan diskon 50 persen dengan maksimal potongan Rp50.000 saat ulang tahun",
  sourceUrl: "https://blog.test/a",
  ...over,
});

describe("blog helpers", () => {
  it("builds year and category queries", () => {
    const q = buildBlogQueries(2026);
    expect(q[0]).toBe("promo ulang tahun 2026");
    expect(q[1]).toBe("birthday treat gratis 2026 Indonesia");
    expect(q.some((x) => x.startsWith("promo ultah gratis "))).toBe(true);
  });

  it("dedupes canonical URLs and drops social/invalid", () => {
    const out = dedupeCandidateUrls([
      "https://www.blog.test/post/?utm_source=x#frag",
      "https://blog.test/post",
      "https://www.instagram.com/p/abc/",
      "ftp://blog.test/x",
      "not a url",
      "https://other.test/a?id=1",
    ]);
    expect(out).toEqual(["https://www.blog.test/post/", "https://other.test/a?id=1"]);
  });
});

describe("evidence handling on blog text", () => {
  it("keeps deals whose quote is in the article and drops invented ones", () => {
    const good = modelDeal();
    const bad = modelDeal({ evidenceQuote: "Gratis seumur hidup untuk semua pelanggan restoran ini" });
    const { kept, dropped } = filterByEvidence([good, bad], article);
    expect(kept).toHaveLength(1);
    expect(dropped).toBe(1);
    const raw = extractedToRawDeals({ deals: kept, droppedNoEvidence: dropped }, { sourceType: "SCRAPER_AGGREGATOR" });
    expect(raw[0]).toMatchObject({ sourceType: "SCRAPER_AGGREGATOR", sourceVerifiedLive: true });
    expect(raw[0].lowTrust).toBeUndefined();
  });

  it("drops expired and anniversary promos", () => {
    const expired = modelDeal({ title: "Promo Ultah", rawText: "Promo ini sudah berakhir", evidenceQuote: "x".repeat(25) });
    const out = extractedToRawDeals({ deals: [expired], droppedNoEvidence: 0 }, { sourceType: "SCRAPER_AGGREGATOR" });
    expect(out).toEqual([]);
  });
});

describe("blogs adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fcConfigured.mockReturnValue(false);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("is skipped without an AI key", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("VERCEL_OIDC_TOKEN", "");
    const res = await createBlogsAdapter().run();
    expect(res.status).toBe("SKIPPED");
    expect(mocks.ddg).not.toHaveBeenCalled();
  });

  it("discovers via DuckDuckGo + Firecrawl, caps pages and dedupes", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "k");
    vi.stubEnv("VERCEL_OIDC_TOKEN", "");
    mocks.fcConfigured.mockReturnValue(true);
    mocks.ddg.mockResolvedValue({ urls: ["https://a.test/1", "https://a.test/1/", "https://b.test/2"] });
    mocks.fcSearch.mockResolvedValue([
      { url: "https://c.test/3", title: "", description: "" },
      { url: "https://d.test/4", title: "", description: "" },
    ]);
    const extractPage = vi.fn(async (url: string) => ({
      deals: [
        { brandName: "X", title: `T ${url}`, rawText: "r", sourceUrl: url, sourceType: "SCRAPER_AGGREGATOR" as const },
      ],
      tier: "http" as const,
      note: `${url}: ok`,
    }));
    const res = await createBlogsAdapter({ maxPages: 3, extractPage }).run();
    expect(extractPage).toHaveBeenCalledTimes(3);
    expect(extractPage.mock.calls.map((c) => c[0])).toEqual([
      "https://a.test/1",
      "https://b.test/2",
      "https://c.test/3",
    ]);
    expect(res.deals).toHaveLength(3);
    expect((res.notes ?? []).join(" ")).toMatch(/3 diproses/);
    expect(mocks.fcSearch).toHaveBeenCalledTimes(2);
  });
});

describe("social-public helpers", () => {
  it("detects public social hosts and birthday mentions", () => {
    expect(isPublicSocialUrl("https://www.instagram.com/p/x/")).toBe(true);
    expect(isPublicSocialUrl("https://www.tiktok.com/@a/video/1")).toBe(true);
    expect(isPublicSocialUrl("https://example-blog.test/post")).toBe(false);
    expect(mentionsBirthday("Birthday Pizza gratis")).toBe(true);
    expect(mentionsBirthday("Flash sale voucher")).toBe(false);
  });
});

describe("social-public adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AI_GATEWAY_API_KEY", "k");
    mocks.fcConfigured.mockReturnValue(true);
    mocks.meta.mockResolvedValue({ accessible: false, blockedReason: "login wall" });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("is skipped without an AI key", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("VERCEL_OIDC_TOKEN", "");
    expect((await createSocialPublicAdapter().run()).status).toBe("SKIPPED");
  });

  it("only sends social posts that mention a birthday and marks results low-trust", async () => {
    mocks.fcSearch.mockResolvedValue(snippets.map((s) => ({ ...s })));
    const target = snippets[0];
    const text = snippetText(target);
    const extractSpy = vi.fn();
    const extract = vi.fn(async ({ url, text: t }: { url: string; text: string }) => {
      extractSpy(url, t);
      return {
        deals: [
          modelDeal({
            brandName: "Pizza Hut Indonesia",
            title: "Birthday Pizza Gratis",
            rawText: "Dine-in tunjukkan KTP",
            evidenceQuote: "Dine-in di Pizza Hut dengan nunjukkin tanggal lahir kamu yang ada di KTP/ID Card",
            sourceUrl: url,
          }),
        ],
        droppedNoEvidence: 0,
      };
    });
    const res = await createSocialPublicAdapter({ handles: [], maxSearches: 1, extract }).run();

    expect(extractSpy).toHaveBeenCalledTimes(1);
    expect(extractSpy).toHaveBeenCalledWith(target.url, text);
    expect(res.deals).toHaveLength(1);
    expect(res.deals[0]).toMatchObject({ sourceType: "SCRAPER_SEARCH", lowTrust: true });
  });
});

describe("lowTrust normalization", () => {
  it("normalizes lowTrust deals to COMMUNITY_SUBMITTED and others to SCRAPER_VERIFIED", () => {
    const base = {
      brandName: "Pizza Hut",
      title: "Birthday Pizza Gratis",
      rawText: "Gratis pizza saat ulang tahun dengan KTP",
      sourceUrl: "https://www.instagram.com/p/x/",
      sourceType: "SCRAPER_SEARCH" as const,
    };
    expect(normalizeScrapedDeal({ ...base, lowTrust: true }).verificationStatus).toBe("COMMUNITY_SUBMITTED");
    expect(normalizeScrapedDeal(base).verificationStatus).toBe("SCRAPER_VERIFIED");
  });
});
