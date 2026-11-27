import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchPage: vi.fn(),
  assert: vi.fn(),
  scrape: vi.fn(),
  search: vi.fn(),
  isAllowed: vi.fn(),
}));
vi.mock("../src/scraper/http", () => ({ fetchPage: mocks.fetchPage }));
vi.mock("../src/scraper/robots", async (orig) => ({
  ...(await orig<typeof import("../src/scraper/robots")>()),
  isAllowed: mocks.isAllowed,
}));
vi.mock("../src/scraper/agent/ssrf", async (orig) => ({
  ...(await orig<typeof import("../src/scraper/agent/ssrf")>()),
  assertPublicHttpUrl: mocks.assert,
}));
vi.mock("../src/scraper/firecrawl", async (orig) => ({
  ...(await orig<typeof import("../src/scraper/firecrawl")>()),
  firecrawlScrape: mocks.scrape,
  firecrawlSearch: mocks.search,
}));

import { BUDGET_EXHAUSTED, createBudget, createScraperTools } from "../src/scraper/agent/tools";

type Exec = (input: Record<string, string>, opts: unknown) => Promise<unknown>;
const call = (t: { execute?: unknown }, input: Record<string, string>) =>
  (t.execute as Exec)(input, { toolCallId: "t", messages: [] });

const anyTools = (t: object) => t as Record<string, { execute?: unknown }>;

const TEXT = "Promo ulang tahun gratis dari Firecrawl untuk member. ".repeat(10);

const shell = {
  url: "https://a.test/",
  finalUrl: "https://a.test/",
  status: 200,
  ok: true,
  blocked: false,
  blockReason: null,
  html: "<html><body>x</body></html>",
  text: "x",
  usedPlaywright: false,
};

describe("firecrawl agent tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("FIRECRAWL_API_KEY", "test-key");
    mocks.assert.mockImplementation(async (u: string) => new URL(u));
    mocks.isAllowed.mockResolvedValue(true);
    mocks.fetchPage.mockResolvedValue(shell);
    mocks.scrape.mockImplementation(async (url: string) => ({
      text: TEXT,
      markdown: `${TEXT} [x](https://a.test/next)`,
      title: "FC",
      url,
      tier: "firecrawl",
    }));
    mocks.search.mockResolvedValue([{ url: "https://b.test/p", title: "B", description: "" }]);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("registers Firecrawl tools only when enabled", () => {
    expect(Object.keys(createScraperTools(createBudget(), { allowFirecrawl: false }).tools)).toEqual([
      "fetchPage",
      "renderPage",
      "searchWeb",
    ]);
    expect(Object.keys(createScraperTools(createBudget(), { allowFirecrawl: true }).tools)).toEqual([
      "fetchPage",
      "renderPage",
      "searchWeb",
      "firecrawlScrape",
      "firecrawlSearch",
    ]);
  });

  it("renderPage falls back to Firecrawl for an empty shell and keeps evidence text", async () => {
    const { tools, state } = createScraperTools(createBudget(), { allowFirecrawl: true });
    const res = (await call(tools.renderPage, { url: "https://a.test/" })) as { text: string; links: string[] };
    expect(res.text).toContain("dari Firecrawl");
    expect(res.links).toEqual(["https://a.test/next"]);
    expect(state.fetchedTexts.get("https://a.test/")).toContain("dari Firecrawl");
  });

  it("firecrawl tools count toward the page budget", async () => {
    const budget = createBudget({ maxPages: 2 });
    const tools = anyTools(createScraperTools(budget, { allowFirecrawl: true }).tools);
    await call(tools.firecrawlSearch, { query: "promo ulang tahun" });
    await call(tools.firecrawlScrape, { url: "https://b.test/p" });
    expect(budget.pagesFetched).toBe(2);
    expect(await call(tools.firecrawlScrape, { url: "https://b.test/q" })).toBe(BUDGET_EXHAUSTED);
    expect(mocks.scrape).toHaveBeenCalledTimes(1);
  });

  it("firecrawlScrape respects robots.txt and the SSRF guard", async () => {
    const tools = anyTools(createScraperTools(createBudget(), { allowFirecrawl: true }).tools);
    mocks.isAllowed.mockResolvedValueOnce(false);
    expect(await call(tools.firecrawlScrape, { url: "https://a.test/x" })).toMatch(/robots/);
    mocks.assert.mockRejectedValueOnce(new Error("Alamat IP privat ditolak"));
    expect(await call(tools.firecrawlScrape, { url: "http://10.0.0.1/" })).toMatch(/ditolak/);
    expect(mocks.scrape).not.toHaveBeenCalled();
  });

  it("firecrawlSearch results become valid fetch starting points", async () => {
    const made = createScraperTools(createBudget(), {
      allowFirecrawl: true,
      seedUrls: ["https://seed.test/"],
    });
    const state = made.state;
    const tools = anyTools(made.tools);
    await call(tools.firecrawlSearch, { query: "promo ulang tahun" });
    expect(state.depthByUrl.get("https://b.test/p")).toBe(0);
  });
});
