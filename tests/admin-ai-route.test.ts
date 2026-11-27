import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const admin = vi.hoisted(() => ({ reviewQueue: vi.fn(), dedupeCandidates: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/ai/admin-tools", async (orig) => ({
  ...(await orig<typeof import("../src/ai/admin-tools")>()),
  ...admin,
}));

import { POST } from "../src/app/api/admin/ai/route";
import {
  brandRootKey,
  filterDuplicatePairs,
  titlesSimilar,
  trustReasons,
} from "../src/ai/admin-tools";
import { resetRateLimits } from "../src/lib/rate-limit";

function req(body: unknown, token?: string) {
  return new Request("http://localhost/api/admin/ai", {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { "x-admin-token": token } : {}) },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/ai", () => {
  const original = process.env.ADMIN_TOKEN;
  beforeEach(() => {
    process.env.ADMIN_TOKEN = "secret-token";
    resetRateLimits();
    vi.clearAllMocks();
  });
  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_TOKEN;
    else process.env.ADMIN_TOKEN = original;
  });

  it("rejects requests without a token", async () => {
    expect((await POST(req({ action: "queue" }))).status).toBe(401);
    expect((await POST(req({ action: "queue" }, "wrong"))).status).toBe(401);
    expect(admin.reviewQueue).not.toHaveBeenCalled();
  });

  it("rejects everything when ADMIN_TOKEN is unset", async () => {
    delete process.env.ADMIN_TOKEN;
    expect((await POST(req({ action: "queue" }, "anything"))).status).toBe(401);
  });

  it("validates the action payload", async () => {
    expect((await POST(req({ action: "nope" }, "secret-token"))).status).toBe(400);
    expect((await POST(req({ action: "review", id: "x", decision: "maybe" }, "secret-token"))).status).toBe(400);
  });

  it("runs the queue action with a valid token", async () => {
    admin.reviewQueue.mockResolvedValue({ items: [] });
    const res = await POST(req({ action: "queue" }, "secret-token"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
  });
});

describe("admin tool helpers", () => {
  it("matches brands and titles like the scraper", () => {
    expect(brandRootKey("Starbucks Coffee Indonesia")).toBe("starbucks");
    expect(titlesSimilar("Gratis minuman ulang tahun", "Promo minuman ulang tahun gratis")).toBe(true);
    expect(titlesSimilar("Gratis burger", "Diskon tiket bioskop")).toBe(false);
  });

  it("keeps duplicate pairs only for the same brand with similar titles", () => {
    const d = (id: string, brandName: string, title: string) => ({
      id, slug: id, brandName, title, verificationStatus: "SCRAPER_VERIFIED",
    });
    const deals = new Map([
      ["a", d("a", "Boost Juice", "Smoothie gratis ulang tahun")],
      ["b", d("b", "Boost Juice Indonesia", "Gratis smoothie ulang tahun")],
      ["c", d("c", "Sushi Tei", "Smoothie gratis ulang tahun")],
      ["e", d("e", "Boost Juice", "Voucher belanja merchandise")],
    ]);
    const pairs = filterDuplicatePairs(
      [
        { aId: "a", bId: "b", sim: 0.93 },
        { aId: "a", bId: "c", sim: 0.97 },
        { aId: "a", bId: "e", sim: 0.93 },
      ],
      deals,
    );
    expect(pairs.map((p) => `${p.a.id}-${p.b.id}`)).toEqual(["a-b"]);
  });

  it("explains why a deal is low trust", () => {
    expect(
      trustReasons({ verificationStatus: "STALE", sourceType: "SCRAPER_SEARCH", freshnessScore: 10 }),
    ).toHaveLength(3);
    expect(
      trustReasons({ verificationStatus: "SCRAPER_VERIFIED", sourceType: "SCRAPER_BRAND", freshnessScore: 90 }),
    ).toEqual([]);
  });
});
