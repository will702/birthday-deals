import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));

import {
  blendScores,
  popularityScore,
  renormalizeWeights,
} from "../src/lib/recommend";

describe("renormalizeWeights", () => {
  it("keeps 0.5/0.3/0.2 when all components are available", () => {
    expect(renormalizeWeights({ content: true, embedding: true, cf: true })).toEqual({
      content: 0.5,
      embedding: 0.3,
      cf: 0.2,
    });
  });

  it("renormalises over available components", () => {
    const w = renormalizeWeights({ content: true, embedding: true, cf: false });
    expect(w.content).toBeCloseTo(0.625);
    expect(w.embedding).toBeCloseTo(0.375);
    expect(w.cf).toBe(0);
    expect(renormalizeWeights({ content: true })).toEqual({ content: 1, embedding: 0, cf: 0 });
  });

  it("returns all zeros when nothing is available", () => {
    expect(renormalizeWeights({})).toEqual({ content: 0, embedding: 0, cf: 0 });
  });
});

describe("blendScores", () => {
  it("blends with renormalised weights", () => {
    const out = blendScores({
      content: new Map([["a", 1], ["b", 0.5]]),
      embedding: new Map([["a", 0], ["b", 1]]),
      cf: null,
    });
    expect(out.get("a")).toBeCloseTo(0.625);
    expect(out.get("b")).toBeCloseTo(0.5 * 0.625 + 0.375);
  });

  it("includes deals found by only one component", () => {
    const out = blendScores({
      content: new Map([["a", 0.8]]),
      cf: new Map([["z", 1]]),
    });
    expect(out.get("z")).toBeCloseTo(0.2 / 0.7);
    expect(out.get("a")).toBeCloseTo((0.5 / 0.7) * 0.8);
  });
});

describe("popularityScore", () => {
  it("ranks fresh popular deals above stale ones and zeroes expired", () => {
    const base = { freshnessScore: 90, stillWorksCount: 5, expiredReportCount: 0, proofCount: 3, verificationStatus: "ADMIN_VERIFIED" };
    expect(popularityScore(base)).toBeGreaterThan(popularityScore({ ...base, verificationStatus: "STALE" }));
    expect(popularityScore({ ...base, verificationStatus: "EXPIRED" })).toBe(0);
  });
});
