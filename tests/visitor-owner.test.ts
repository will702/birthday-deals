import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));

import { canonicalCity } from "../src/lib/cities";
import { limitRequest, resetRateLimits } from "../src/lib/rate-limit";
import { newAnonCookie, ownerWhere, signAnonId, verifyAnonCookie } from "../src/lib/visitor";

describe("ownerWhere", () => {
  it("scopes anonymous viewers to unclaimed rows only", () => {
    expect(ownerWhere({ visitorId: "v1", userId: null })).toEqual({ visitorId: "v1", userId: null });
  });
  it("uses userId for signed-in viewers", () => {
    expect(ownerWhere({ visitorId: "v1", userId: "u1" })).toEqual({ userId: "u1" });
  });
});

describe("anon cookie", () => {
  it("round-trips and rejects tampering; rotation yields a new id", () => {
    const a = newAnonCookie();
    expect(verifyAnonCookie(a.value)).toBe(a.id);
    expect(verifyAnonCookie(`${a.id}.bad`)).toBeNull();
    expect(verifyAnonCookie(signAnonId("x"))).toBe("x");
    expect(newAnonCookie().id).not.toBe(a.id);
  });
});

describe("canonicalCity", () => {
  it("maps aliases case-insensitively", () => {
    expect(canonicalCity(" jogja ")).toBe("Yogyakarta");
    expect(canonicalCity("DENPASAR")).toBe("Bali");
    expect(canonicalCity("Kupang")).toBe("Kupang");
    expect(canonicalCity("  ")).toBeNull();
  });
});

describe("limitRequest", () => {
  it("limits by IP even when the visitor id changes", () => {
    resetRateLimits();
    const req = new Request("http://x.test", { headers: { "x-forwarded-for": "1.2.3.4" } });
    let allowed = 0;
    for (let i = 0; i < 20; i++) if (limitRequest(req, "t", `v${i}`, 3)) allowed += 1;
    expect(allowed).toBe(6); // IP cap = limit * 2
  });
});
