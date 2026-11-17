import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    deal: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    scrapeRun: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
  adapterRun: vi.fn(),
  closeBrowser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("../src/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("../src/scraper/browser", () => ({ closeBrowser: mocks.closeBrowser }));
vi.mock("../src/scraper/freshness-checker", () => ({ runFreshnessChecker: vi.fn() }));
vi.mock("../src/scraper/adapters/aggregators", () => ({
  aggregatorsAdapter: { name: "agg", run: vi.fn() },
}));
vi.mock("../src/scraper/adapters/search-discovery", () => ({
  searchDiscoveryAdapter: { name: "search", run: vi.fn() },
}));
vi.mock("../src/scraper/adapters/official-brands", () => ({
  officialBrandsAdapter: { name: "Official", run: mocks.adapterRun },
}));

import { ScraperRunLockedError, runScraperPipeline, titlesSimilar } from "../src/scraper/runner";

function raw(title: string, brandName = "Sushi Tei") {
  return {
    brandName,
    title,
    rawText: `${title} untuk member yang berulang tahun dengan menunjukkan KTP.`,
    sourceUrl: "https://example.test/x",
    sourceType: "SCRAPER_BRAND" as const,
  };
}

describe("runScraperPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.scrapeRun.findFirst.mockResolvedValue(null);
    mocks.prisma.scrapeRun.create.mockResolvedValue({ id: "run1" });
    mocks.prisma.scrapeRun.update.mockResolvedValue({});
    mocks.prisma.deal.findMany.mockResolvedValue([]);
    mocks.prisma.deal.create.mockImplementation(async ({ data }) => ({
      id: `id-${data.slug}`,
      slug: data.slug,
      brandName: data.brandName,
      title: data.title,
      verificationStatus: data.verificationStatus,
      sourceType: data.sourceType,
    }));
  });

  it("refuses to start when a recent RUNNING run exists", async () => {
    mocks.prisma.scrapeRun.findFirst.mockResolvedValue({ id: "busy" });
    await expect(
      runScraperPipeline({ sources: ["official-brands"], runFreshness: false }),
    ).rejects.toBeInstanceOf(ScraperRunLockedError);
    expect(mocks.prisma.deal.findMany).not.toHaveBeenCalled();
  });

  it("isolates per-deal failures and marks the run PARTIAL", async () => {
    mocks.adapterRun.mockResolvedValue({
      sourceName: "Official",
      status: "SUCCESS",
      deals: [raw("Gratis Sushi Roll"), raw("Diskon 50% Ramen", "Ramen Ya")],
      errors: [],
    });
    mocks.prisma.deal.create
      .mockRejectedValueOnce(new Error("db down"))
      .mockImplementation(async ({ data }) => ({
        id: "ok",
        slug: data.slug,
        brandName: data.brandName,
        title: data.title,
      }));

    const out = await runScraperPipeline({ sources: ["official-brands"], runFreshness: false });
    expect(out.runs[0].status).toBe("PARTIAL");
    expect(out.runs[0].dealsCreated).toBe(1);
    expect(out.runs[0].errorMessage).toMatch(/1 deal gagal/);
    expect(mocks.closeBrowser).toHaveBeenCalledTimes(1);
  });

  it("retries with a suffix on a unique-constraint error", async () => {
    mocks.adapterRun.mockResolvedValue({
      sourceName: "Official",
      status: "SUCCESS",
      deals: [raw("Gratis Sushi Roll")],
      errors: [],
    });
    mocks.prisma.deal.create
      .mockRejectedValueOnce(Object.assign(new Error("unique"), { code: "P2002" }))
      .mockImplementation(async ({ data }) => ({
        id: "x",
        slug: data.slug,
        brandName: data.brandName,
        title: data.title,
      }));
    const out = await runScraperPipeline({ sources: ["official-brands"], runFreshness: false });
    const [first, second] = mocks.prisma.deal.create.mock.calls.map((c) => c[0].data.slug);
    expect(second).toBe(`${first}-2`);
    expect(out.runs[0].status).toBe("SUCCESS");
  });

  it("does not merge different deals of the same brand", async () => {
    mocks.prisma.deal.findMany.mockResolvedValue([
      {
        id: "e1",
        slug: "old-slug",
        brandName: "Sushi Tei",
        title: "Diskon 50% Ramen Spesial",
        verificationStatus: "SCRAPER_VERIFIED",
        sourceType: "SCRAPER_BRAND",
      },
    ]);
    mocks.adapterRun.mockResolvedValue({
      sourceName: "Official",
      status: "SUCCESS",
      deals: [raw("Gratis Cheesecake Dessert")],
      errors: [],
    });
    const out = await runScraperPipeline({ sources: ["official-brands"], runFreshness: false });
    expect(out.runs[0].dealsCreated).toBe(1);
    expect(mocks.prisma.deal.update).not.toHaveBeenCalled();
  });
});

describe("titlesSimilar", () => {
  it("matches near-identical titles and rejects different ones", () => {
    expect(titlesSimilar("Gratis Sushi Roll Birthday", "Sushi Roll gratis")).toBe(true);
    expect(titlesSimilar("Diskon 50% Ramen Spesial", "Gratis Cheesecake Dessert")).toBe(false);
  });
});
