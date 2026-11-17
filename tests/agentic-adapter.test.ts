import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ runDealAgent: vi.fn() }));
vi.mock("../src/scraper/agent/deal-agent", () => ({
  DEFAULT_AGENT_QUERY: "promo ulang tahun gratis",
  runDealAgent: mocks.runDealAgent,
}));

import { createAgenticAdapter } from "../src/scraper/adapters/agentic";

describe("agentic adapter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("is skipped with a note when AI_GATEWAY_API_KEY is unset", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    const res = await createAgenticAdapter().run();
    expect(res.status).toBe("SKIPPED");
    expect(res.deals).toEqual([]);
    expect(res.notes?.[0]).toMatch(/AI_GATEWAY_API_KEY/);
    expect(mocks.runDealAgent).not.toHaveBeenCalled();
  });

  it("runs the agent with CLI overrides when the key is set", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "k");
    mocks.runDealAgent.mockResolvedValue({
      deals: [],
      stats: { steps: 1, pagesFetched: 0, droppedNoEvidence: 0 },
    });
    const res = await createAgenticAdapter({
      query: "q",
      seeds: ["https://a.test"],
    }).run();
    expect(res.status).toBe("SUCCESS");
    expect(mocks.runDealAgent).toHaveBeenCalledWith({
      query: "q",
      seedUrls: ["https://a.test"],
    });
  });
});
