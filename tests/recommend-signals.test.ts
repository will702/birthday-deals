import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));

import { buildPreferenceProfile, decayFactor } from "../src/lib/recommend/signals";

const now = new Date("2026-06-30T00:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe("decayFactor", () => {
  it("halves every 30 days", () => {
    expect(decayFactor(0)).toBe(1);
    expect(decayFactor(30)).toBeCloseTo(0.5);
    expect(decayFactor(60)).toBeCloseTo(0.25);
  });
});

describe("buildPreferenceProfile", () => {
  it("weights recent interactions above old ones", () => {
    const p = buildPreferenceProfile(
      null,
      [
        { dealId: "a", type: "SAVE", createdAt: daysAgo(1), category: "F&B", discountType: "FREE_100" },
        { dealId: "b", type: "SAVE", createdAt: daysAgo(90), category: "Beauty & Retail", discountType: "VOUCHER" },
      ],
      now,
    );
    expect(p.categoryWeights["F&B"]).toBeCloseTo(1);
    expect(p.categoryWeights["Beauty & Retail"]).toBeLessThan(0.2);
    expect(p.discountTypeAffinity["FREE_100"]).toBeGreaterThan(p.discountTypeAffinity["VOUCHER"]);
  });

  it("applies the weight table (CLAIMED > SAVE > CLICK > VIEW, DISMISS negative)", () => {
    const p = buildPreferenceProfile(
      null,
      [
        { dealId: "1", type: "CLAIMED", createdAt: now, category: "A" },
        { dealId: "2", type: "SAVE", createdAt: now, category: "B" },
        { dealId: "3", type: "CLICK_SOURCE", createdAt: now, category: "C" },
        { dealId: "4", type: "VIEW", createdAt: now, category: "D" },
        { dealId: "5", type: "DISMISS", createdAt: now, category: "E" },
      ],
      now,
    );
    const w = p.categoryWeights;
    expect(w.A).toBe(1);
    expect(w.A).toBeGreaterThan(w.B);
    expect(w.B).toBeGreaterThan(w.C);
    expect(w.C).toBeGreaterThan(w.D);
    expect(w.E).toBe(-1);
  });

  it("tracks liked and dismissed deals chronologically", () => {
    const p = buildPreferenceProfile(
      null,
      [
        { dealId: "a", type: "SAVE", createdAt: daysAgo(5) },
        { dealId: "a", type: "UNSAVE", createdAt: daysAgo(4) },
        { dealId: "b", type: "SAVE", createdAt: daysAgo(3) },
        { dealId: "c", type: "DISMISS", createdAt: daysAgo(2) },
        { dealId: "c", type: "SAVE", createdAt: daysAgo(1) },
        { dealId: "d", type: "SAVE", createdAt: daysAgo(3) },
        { dealId: "d", type: "DISMISS", createdAt: daysAgo(1) },
      ],
      now,
    );
    expect(p.likedDealIds.sort()).toEqual(["b", "c"]);
    expect(p.dismissedDealIds).toEqual(["d"]);
    expect(p.positiveDealIds).not.toContain("d");
  });

  it("seeds category weights from the profile and flags profile data", () => {
    const p = buildPreferenceProfile(
      { birthdayDay: 1, birthdayMonth: 0, city: "Jakarta", preferredCategories: ["F&B"], appOk: false },
      [],
      now,
    );
    expect(p.categoryWeights["F&B"]).toBe(1);
    expect(p.city).toBe("Jakarta");
    expect(p.appOk).toBe(false);
    expect(p.hasProfileData).toBe(true);
  });
});
