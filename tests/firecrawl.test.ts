import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ assert: vi.fn() }));
vi.mock("../src/scraper/agent/ssrf", async (orig) => ({
  ...(await orig<typeof import("../src/scraper/agent/ssrf")>()),
  assertPublicHttpUrl: mocks.assert,
}));

import {
  FirecrawlError,
  type FirecrawlClientLike,
  firecrawlScrape,
  firecrawlSearch,
  getFirecrawlUsage,
  markdownToText,
  resetFirecrawlBudget,
  setFirecrawlClientForTests,
} from "../src/scraper/firecrawl";

function fakeClient() {
  return {
    scrape: vi.fn<FirecrawlClientLike["scrape"]>(async (url) => ({
      markdown: "# Judul\n\nPromo **ulang tahun** [klik](https://x.test/a) gratis",
      metadata: { title: " Judul ", url, statusCode: 200 },
    })),
    search: vi.fn(async () => ({
      web: [
        { url: "https://blog.test/a", title: "A", description: "d" },
        { url: "http://127.0.0.1/x", title: "bad" },
        { title: "no url" },
      ],
    })),
  };
}

describe("firecrawl wrapper", () => {
  beforeEach(() => {
    resetFirecrawlBudget();
    mocks.assert.mockImplementation(async (u: string) => {
      if (u.includes("127.0.0.1")) throw new Error("Alamat IP privat ditolak");
      return new URL(u);
    });
  });
  afterEach(() => {
    setFirecrawlClientForTests(null);
    vi.unstubAllEnvs();
  });

  it("throws not-configured without a key", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "");
    await expect(firecrawlScrape("https://a.test/")).rejects.toMatchObject({ code: "not-configured" });
  });

  it("scrapes to markdown + plain text and counts credits", async () => {
    const c = fakeClient();
    setFirecrawlClientForTests(c);
    const page = await firecrawlScrape("https://a.test/");
    expect(page.tier).toBe("firecrawl");
    expect(page.title).toBe("Judul");
    expect(page.text).toBe("Judul Promo ulang tahun klik gratis");
    expect(page.markdown).toContain("**ulang tahun**");
    expect(c.scrape).toHaveBeenCalledWith(
      "https://a.test/",
      expect.objectContaining({ formats: ["markdown"] }),
    );
    expect(getFirecrawlUsage().creditsUsed).toBe(1);
  });

  it("requests json format with extra credits", async () => {
    const c = fakeClient();
    setFirecrawlClientForTests(c);
    await firecrawlScrape("https://a.test/", { jsonSchema: { type: "object" } });
    const opts = c.scrape.mock.calls[0][1] as { formats: unknown[] };
    expect(opts.formats[1]).toMatchObject({ type: "json" });
    expect(getFirecrawlUsage().creditsUsed).toBe(5);
  });

  it("rejects unsafe URLs before any call or charge", async () => {
    const c = fakeClient();
    setFirecrawlClientForTests(c);
    await expect(firecrawlScrape("http://127.0.0.1/x")).rejects.toMatchObject({ code: "url-rejected" });
    expect(c.scrape).not.toHaveBeenCalled();
    expect(getFirecrawlUsage().creditsUsed).toBe(0);
  });

  it("enforces FIRECRAWL_MAX_CREDITS and can be reset", async () => {
    vi.stubEnv("FIRECRAWL_MAX_CREDITS", "2");
    const c = fakeClient();
    setFirecrawlClientForTests(c);
    await firecrawlScrape("https://a.test/1");
    await firecrawlScrape("https://a.test/2");
    await expect(firecrawlScrape("https://a.test/3")).rejects.toMatchObject({ code: "budget-exhausted" });
    expect(c.scrape).toHaveBeenCalledTimes(2);
    resetFirecrawlBudget();
    await expect(firecrawlScrape("https://a.test/3")).resolves.toBeDefined();
  });

  it("defaults the budget to 200", () => {
    vi.stubEnv("FIRECRAWL_MAX_CREDITS", "");
    expect(getFirecrawlUsage().maxCredits).toBe(200);
  });

  it("searches with country id and drops unsafe/empty result URLs", async () => {
    const c = fakeClient();
    setFirecrawlClientForTests(c);
    const hits = await firecrawlSearch("promo ulang tahun", { limit: 5, country: "id", lang: "id" });
    expect(hits).toEqual([{ url: "https://blog.test/a", title: "A", description: "d" }]);
    expect(c.search).toHaveBeenCalledWith(
      "promo ulang tahun",
      expect.objectContaining({ limit: 5, country: "ID" }),
    );
    expect(getFirecrawlUsage().creditsUsed).toBe(2);
  });

  it("wraps SDK failures in typed errors", async () => {
    setFirecrawlClientForTests({
      scrape: vi.fn(async () => {
        throw Object.assign(new Error("Rate limit"), { status: 429 });
      }),
      search: vi.fn(),
    });
    const err = await firecrawlScrape("https://a.test/").catch((e) => e);
    expect(err).toBeInstanceOf(FirecrawlError);
    expect(err).toMatchObject({ code: "request-failed", status: 429 });
  });

  it("markdownToText strips markup", () => {
    expect(markdownToText("## H\n- item **b** ![alt](u) [t](u)")).toBe("H item b alt t");
  });
});
