import { describe, expect, it, vi } from "vitest";
import { MockLanguageModelV4 } from "ai/test";

const mocks = vi.hoisted(() => ({ fetchPage: vi.fn() }));
vi.mock("../src/scraper/http", () => ({ fetchPage: mocks.fetchPage }));
vi.mock("../src/scraper/agent/ssrf", async (orig) => ({
  ...(await orig<typeof import("../src/scraper/agent/ssrf")>()),
  assertPublicHttpUrl: async (u: string) => new URL(u),
}));

import { runDealAgent } from "../src/scraper/agent/deal-agent";

const usage = {
  inputTokens: {
    total: 1,
    noCache: 1,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};
const TEXT =
  "Kopi Kita memberi gratis 1 minuuman saat ulang tahun dengan menunjukkan KTP asli.";

const toolCall = (toolName: string, input: unknown) => ({
  content: [
    {
      type: "tool-call" as const,
      toolCallId: `c-${toolName}`,
      toolName,
      input: JSON.stringify(input),
    },
  ],
  finishReason: { unified: "tool-calls" as const, raw: undefined },
  usage,
  warnings: [],
});

describe("runDealAgent", () => {
  it("fetches, submits deals and drops those without evidence in fetched text", async () => {
    mocks.fetchPage.mockResolvedValue({
      url: "https://a.test/",
      finalUrl: "https://a.test/",
      status: 200,
      ok: true,
      blocked: false,
      blockReason: null,
      html: `<html><body>${TEXT}</body></html>`,
      text: TEXT,
      usedPlaywright: false,
    });
    const base = {
      brandName: "Kopi Kita",
      title: "Gratis minuman",
      rawText: "Gratis 1 minuman",
      sourceUrl: "https://a.test/",
    };
    const responses = [
      toolCall("fetchPage", { url: "https://a.test/" }),
      toolCall("submitDeals", {
        deals: [
          {
            ...base,
            evidenceQuote:
              "gratis 1 minuuman saat ulang tahun dengan menunjukkan KTP",
          },
          {
            ...base,
            brandName: "Fake",
            evidenceQuote: "kutipan karangan yang tidak ada di halaman",
          },
        ],
      }),
    ];
    let i = 0;
    const model = new MockLanguageModelV4({
      doGenerate: async () => responses[i++],
    });

    const res = await runDealAgent({
      seedUrls: ["https://a.test/"],
      model,
      maxSteps: 5,
    });
    expect(res.deals).toHaveLength(1);
    expect(res.deals[0]).toMatchObject({
      brandName: "Kopi Kita",
      sourceType: "SCRAPER_SEARCH",
      sourceVerifiedLive: true,
    });
    expect(res.stats).toEqual({
      steps: 2,
      pagesFetched: 1,
      droppedNoEvidence: 1,
    });
    expect(JSON.stringify(model.doGenerateCalls[0].prompt)).toMatch(
      /UNTRUSTED DATA/,
    );
  });
});
