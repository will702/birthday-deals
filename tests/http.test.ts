import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPage } from "../src/scraper/http";
import { resetPoliteness } from "../src/scraper/politeness";

const URL_ = "https://example.test/promo";
const noSleep = vi.fn(async () => undefined);

function htmlResponse(body: string, status = 200, headers: Record<string, string> = {}) {
  return new Response(body, { status, headers });
}

const LONG_BODY = `<html><body>${"Promo ulang tahun gratis. ".repeat(30)}</body></html>`;
const base = { respectRobots: false, minHostDelayMs: 0, sleep: noSleep };

describe("fetchPage retry and timeout", () => {
  beforeEach(() => {
    resetPoliteness();
    noSleep.mockClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("retries 5xx and then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(htmlResponse("err", 503))
      .mockResolvedValueOnce(htmlResponse(LONG_BODY));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchPage(URL_, base);
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(noSleep).toHaveBeenCalledTimes(1);
  });

  it("retries network errors up to 3 attempts then reports the error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("ECONNRESET"));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchPage(URL_, base);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(res.status).toBe(0);
    expect(res.ok).toBe(false);
    expect(res.blockReason).toBe("ECONNRESET");
  });

  it("honours Retry-After on 429", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(htmlResponse("slow down", 429, { "retry-after": "2" }))
      .mockResolvedValueOnce(htmlResponse(LONG_BODY));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchPage(URL_, base);
    expect(res.ok).toBe(true);
    expect(noSleep).toHaveBeenCalledWith(2000);
  });

  it("does not retry 404", async () => {
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse("nope", 404));
    vi.stubGlobal("fetch", fetchMock);
    const res = await fetchPage(URL_, base);
    expect(res.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aborts when the body read exceeds the timeout", async () => {
    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      const body = new ReadableStream({
        start(controller) {
          init.signal?.addEventListener("abort", () => controller.error(new Error("aborted")));
        },
      });
      return Promise.resolve(new Response(body, { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchPage(URL_, { ...base, timeoutMs: 30, maxAttempts: 1 });
    expect(res.status).toBe(0);
    expect(res.blockReason).toMatch(/Timeout/);
  });

  it("sends an honest User-Agent with the contact URL", async () => {
    vi.stubEnv("SCRAPER_CONTACT_URL", "https://contact.example/bot");
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse(LONG_BODY));
    vi.stubGlobal("fetch", fetchMock);
    await fetchPage(URL_, base);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["User-Agent"]).toBe(
      "BirthdayDealsBot/1.0 (+https://contact.example/bot)",
    );
  });

  it("returns a robots-disallowed result without fetching the page", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) =>
      String(input).endsWith("/robots.txt")
        ? htmlResponse("User-agent: *\nDisallow: /promo")
        : htmlResponse(LONG_BODY),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { clearRobotsCache } = await import("../src/scraper/robots");
    clearRobotsCache();

    const res = await fetchPage("https://robots-block.test/promo", {
      minHostDelayMs: 0,
      sleep: noSleep,
    });
    expect(res.skipReason).toBe("robots-disallowed");
    expect(res.blocked).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
