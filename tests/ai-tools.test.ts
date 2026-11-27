import { beforeEach, describe, expect, it, vi } from "vitest";

const q = vi.hoisted(() => ({
  searchDealsCore: vi.fn(),
  getDealCore: vi.fn(),
  recommendCore: vi.fn(),
  similarCore: vi.fn(),
  planBirthdayCore: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock("@/ai/deal-queries", async (orig) => ({
  ...(await orig<typeof import("../src/ai/deal-queries")>()),
  ...q,
}));

import { buildDealWhere, keywordTerms, toCompactDeal, truncate } from "../src/ai/deal-queries";
import { createDealTools } from "../src/ai/tools";

const opts = { toolCallId: "t1", messages: [] } as never;
const viewer = { visitorId: "v1", userId: null };

describe("createDealTools", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exposes the five read-only tools", () => {
    expect(Object.keys(createDealTools(viewer)).sort()).toEqual(
      ["getDeal", "planBirthday", "recommendForMe", "searchDeals", "similarDeals"].sort(),
    );
  });

  it("searchDeals delegates to the core query", async () => {
    q.searchDealsCore.mockResolvedValue({ deals: [] });
    const tools = createDealTools(viewer);
    await tools.searchDeals.execute!({ query: "kopi", limit: 3 }, opts);
    expect(q.searchDealsCore).toHaveBeenCalledWith({ query: "kopi", limit: 3 });
  });

  it("searchDeals validates input (limit bounds, category enum)", () => {
    const schema = createDealTools(viewer).searchDeals.inputSchema as import("zod").ZodTypeAny;
    expect(schema.safeParse({ limit: 99 }).success).toBe(false);
    expect(schema.safeParse({ category: "Nope", limit: 3 }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("getDeal reports not found", async () => {
    q.getDealCore.mockResolvedValue({ deal: null });
    const res = await createDealTools(viewer).getDeal.execute!({ slug: "x" }, opts);
    expect(res).toEqual({ found: false, deals: [] });
  });

  it("recommendForMe passes the viewer", async () => {
    q.recommendCore.mockResolvedValue({ deals: [], personalized: false });
    await createDealTools(viewer).recommendForMe.execute!({ limit: 4 }, opts);
    expect(q.recommendCore).toHaveBeenCalledWith(viewer, 4);
  });

  it("planBirthday rejects impossible dates without querying", async () => {
    const res = await createDealTools(viewer).planBirthday.execute!(
      { birthdayDay: 31, birthdayMonth: 2 },
      opts,
    );
    expect(res).toEqual({ error: "Tanggal ulang tahun tidak valid." });
    expect(q.planBirthdayCore).not.toHaveBeenCalled();
  });

  it("planBirthday maps 1-12 month input", async () => {
    q.planBirthdayCore.mockResolvedValue({ days: [] });
    await createDealTools(viewer).planBirthday.execute!(
      { birthdayDay: 15, birthdayMonth: 8, city: "Jakarta" },
      opts,
    );
    expect(q.planBirthdayCore).toHaveBeenCalledWith({
      day: 15,
      month: 8,
      city: "Jakarta",
      categories: undefined,
    });
  });
});

describe("deal-queries helpers", () => {
  it("builds filters and always excludes expired deals", () => {
    expect(buildDealWhere({})).toEqual({ verificationStatus: { not: "EXPIRED" } });
    const w = buildDealWhere({ freeOnly: true, noMinPurchase: true, city: "Bandung", category: "F&B" });
    expect(w).toMatchObject({
      discountType: "FREE_100",
      minPurchaseIdr: 0,
      category: "F&B",
      OR: [{ cities: { hasSome: ["Bandung", "Nasional"] } }, { cities: { isEmpty: true } }],
    });
  });

  it("extracts keyword terms", () => {
    expect(keywordTerms("Kopi di Jakarta, ya!")).toEqual(["kopi", "jakarta"]);
  });

  it("truncates long text and compacts deals (no T&C wall)", () => {
    expect(truncate("a".repeat(500), 50).length).toBe(50);
    const c = toCompactDeal({
      slug: "s",
      brandName: "B",
      title: "T",
      category: "F&B",
      discountType: "FREE_100",
      discountValue: 100,
      description: "d".repeat(1000),
      claimWindow: "Hari H",
      requiresApp: false,
      appName: null,
      minRegistrationDays: null,
      requiresIdCard: true,
      minPurchaseIdr: 0,
      locations: "Jakarta",
      verificationStatus: "ADMIN_VERIFIED",
    });
    expect(c.summary.length).toBeLessThanOrEqual(200);
    expect(c.url).toBe("/deals/s");
    expect(c.discount).toBe("Gratis 100%");
    expect(c.cities).toEqual(["Jakarta"]);
  });
});
