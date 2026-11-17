import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchPage: vi.fn(), assert: vi.fn() }));
vi.mock("../src/scraper/http", () => ({ fetchPage: mocks.fetchPage }));
vi.mock("../src/scraper/agent/ssrf", async (orig) => ({
  ...(await orig<typeof import("../src/scraper/agent/ssrf")>()),
  assertPublicHttpUrl: mocks.assert,
}));

import {
  BUDGET_EXHAUSTED,
  createBudget,
  createScraperTools,
} from "../src/scraper/agent/tools";

type Exec = (input: { url: string }, opts: unknown) => Promise<unknown>;
const run = (t: { execute?: unknown }, url: string) =>
  (t.execute as Exec)({ url }, { toolCallId: "t", messages: [] });

function page(url: string, body = "Promo ulang tahun gratis. ".repeat(10)) {
  return {
    url,
    finalUrl: url,
    status: 200,
    ok: true,
    blocked: false,
    blockReason: null,
    html: `<html><head><title>T</title></head><body>${body}<a href="/b">b</a><a href="https://other.test/x">o</a></body></html>`,
    text: body,
    usedPlaywright: false,
  };
}

describe("createScraperTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assert.mockImplementation(async (u: string) => new URL(u));
    mocks.fetchPage.mockImplementation(async (u: string) => page(u));
  });

  it("enforces maxPages and returns a budget-exhausted string", async () => {
    const budget = createBudget({ maxPages: 2 });
    const { tools } = createScraperTools(budget);
    await run(tools.fetchPage, "https://a.test/1");
    await run(tools.fetchPage, "https://a.test/2");
    const third = await run(tools.fetchPage, "https://a.test/3");
    expect(third).toBe(BUDGET_EXHAUSTED);
    expect(mocks.fetchPage).toHaveBeenCalledTimes(2);
    expect(budget.pagesFetched).toBe(2);
  });

  it("returns same-origin links, truncates text and records fetched text", async () => {
    mocks.fetchPage.mockResolvedValueOnce(
      page("https://a.test/", "x".repeat(20_000)),
    );
    const { tools, state } = createScraperTools(createBudget());
    const res = (await run(tools.fetchPage, "https://a.test/")) as {
      text: string;
      links: string[];
      truncated: boolean;
    };
    expect(res.text.length).toBe(12_000);
    expect(res.truncated).toBe(true);
    expect(res.links).toEqual(["https://a.test/b"]);
    expect(state.fetchedTexts.get("https://a.test/")).toHaveLength(12_000);
  });

  it("rejects URLs refused by the SSRF guard without fetching", async () => {
    mocks.assert.mockRejectedValueOnce(new Error("Alamat IP privat ditolak"));
    const budget = createBudget();
    const { tools } = createScraperTools(budget);
    const res = await run(tools.fetchPage, "http://127.0.0.1/");
    expect(String(res)).toMatch(/ditolak/);
    expect(mocks.fetchPage).not.toHaveBeenCalled();
    expect(budget.pagesFetched).toBe(0);
  });

  it("keeps fetches on seed hosts", async () => {
    const { tools } = createScraperTools(createBudget(), {
      seedUrls: ["https://a.test/"],
    });
    expect(String(await run(tools.fetchPage, "https://evil.test/"))).toMatch(
      /luar domain/,
    );
    expect(mocks.fetchPage).not.toHaveBeenCalled();
    await run(tools.fetchPage, "https://a.test/promo");
    expect(mocks.fetchPage).toHaveBeenCalledTimes(1);
  });
});
