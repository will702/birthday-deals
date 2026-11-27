import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));

import { scoreDealContent, type ScorableDeal } from "../src/lib/recommend/content";
import { buildPreferenceProfile, type PreferenceProfile } from "../src/lib/recommend/signals";

const now = new Date(2026, 5, 15);

function deal(over: Partial<ScorableDeal> = {}): ScorableDeal {
  return {
    id: "d1",
    category: "F&B",
    discountType: "FREE_100",
    cities: ["Nasional"],
    claimWindow: "Hari H Ulang Tahun",
    requiresApp: false,
    minRegistrationDays: null,
    freshnessScore: 80,
    stillWorksCount: 1,
    expiredReportCount: 0,
    verificationStatus: "SCRAPER_VERIFIED",
    ...over,
  };
}

function profile(over: Partial<PreferenceProfile> = {}): PreferenceProfile {
  return {
    ...buildPreferenceProfile(null, [], now),
    ...over,
  };
}

describe("scoreDealContent", () => {
  it("excludes dismissed deals", () => {
    const r = scoreDealContent(deal(), profile({ dismissedDealIds: ["d1"] }), now);
    expect(r.excluded).toBe(true);
  });

  it("rewards preferred category and city match with reasons", () => {
    const p = profile({
      city: "Jakarta",
      preferredCategories: ["F&B"],
      categoryWeights: { "F&B": 1 },
    });
    const match = scoreDealContent(deal({ cities: ["Jakarta"] }), p, now);
    const other = scoreDealContent(deal({ category: "Other", cities: ["Surabaya"] }), p, now);
    expect(match.score).toBeGreaterThan(other.score);
    expect(match.reasons).toContain("Cocok untuk kota kamu");
  });

  it("treats Nasional as a city match with lower weight", () => {
    const p = profile({ city: "Bandung" });
    const nat = scoreDealContent(deal(), p, now);
    const local = scoreDealContent(deal({ cities: ["Bandung"] }), p, now);
    const elsewhere = scoreDealContent(deal({ cities: ["Medan"] }), p, now);
    expect(local.score).toBeGreaterThan(nat.score);
    expect(nat.score).toBeGreaterThan(elsewhere.score);
  });

  it("adds a birthday-window reason when claimable on the birthday", () => {
    const p = profile({ birthdayDay: 15, birthdayMonth: 5 });
    const r = scoreDealContent(deal(), p, now);
    expect(r.reasons).toContain("Bisa diklaim di hari ulang tahunmu");
  });

  it("penalises EXPIRED and STALE and prefers community-confirmed deals", () => {
    const p = profile({ categoryWeights: { "F&B": 1 } });
    const ok = scoreDealContent(deal({ stillWorksCount: 6 }), p, now).score;
    const stale = scoreDealContent(deal({ verificationStatus: "STALE" }), p, now).score;
    const expired = scoreDealContent(deal({ verificationStatus: "EXPIRED" }), p, now).score;
    const reported = scoreDealContent(deal({ expiredReportCount: 5 }), p, now).score;
    expect(ok).toBeGreaterThan(stale);
    expect(stale).toBeGreaterThan(expired);
    expect(ok).toBeGreaterThan(reported);
  });

  it("penalises app-required deals when the user does not want apps", () => {
    const p = profile({ appOk: false });
    const app = scoreDealContent(deal({ requiresApp: true }), p, now).score;
    const walkIn = scoreDealContent(deal(), p, now).score;
    expect(walkIn).toBeGreaterThan(app);
  });
});
