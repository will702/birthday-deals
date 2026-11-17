import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    deal: { findMany: vi.fn(), update: vi.fn() },
    scrapeRun: { create: vi.fn(), update: vi.fn() },
  },
  fetchPage: vi.fn(),
}));

vi.mock("../src/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("../src/scraper/http", () => ({ fetchPage: mocks.fetchPage }));

import { runFreshnessChecker } from "../src/scraper/freshness-checker";

function deal(id: string, overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id,
    brandName: id,
    sourceUrl: `https://${id}.test`,
    verificationStatus: "SCRAPER_VERIFIED",
    lastVerifiedAt: now,
    lastScrapedAt: now,
    stillWorksCount: 1,
    expiredReportCount: 0,
    freshnessScore: 100,
    ...overrides,
  };
}

describe("runFreshnessChecker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.scrapeRun.create.mockResolvedValue({ id: "r" });
    mocks.prisma.scrapeRun.update.mockResolvedValue({});
    mocks.prisma.deal.update.mockResolvedValue({});
  });

  it("counts BOT_PROTECTED separately and reports the real dealsUpdated", async () => {
    mocks.prisma.deal.findMany.mockResolvedValue([
      deal("a", { freshnessScore: 1 }),
      deal("b", { freshnessScore: 1 }),
      deal("c", { freshnessScore: 1 }),
    ]);
    mocks.fetchPage
      .mockResolvedValueOnce({ blocked: true, ok: false, status: 403, text: "", blockReason: "x" })
      .mockResolvedValueOnce({ blocked: false, ok: true, status: 200, text: "Promo aktif" })
      .mockResolvedValueOnce({ blocked: false, ok: true, status: 200, text: "Promo aktif" });

    const summary = await runFreshnessChecker();
    expect(summary.checkedCount).toBe(3);
    expect(summary.botProtectedCount).toBe(1);
    expect(summary.liveCount).toBe(2);
    expect(summary.dealsUpdated).toBe(mocks.prisma.deal.update.mock.calls.length);
    expect(mocks.prisma.scrapeRun.update.mock.calls[0][0].data.dealsUpdated).toBe(
      summary.dealsUpdated,
    );
  });

  it("does not count deals whose values did not change", async () => {
    const d = deal("a");
    mocks.prisma.deal.findMany.mockResolvedValue([d]);
    mocks.fetchPage.mockResolvedValue({ blocked: false, ok: false, status: 500, text: "" });
    const summary = await runFreshnessChecker();
    expect(summary.dealsUpdated).toBeLessThanOrEqual(1);
    expect(summary.dealsUpdated).toBe(mocks.prisma.deal.update.mock.calls.length);
  });
});
