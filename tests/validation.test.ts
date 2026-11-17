import { describe, expect, it } from "vitest";
import { createDealSchema, verifyDealSchema } from "../src/lib/validation";

describe("Community deal submission & proof validation", () => {
  const validBase = {
    brandName: "Boost Juice Indonesia",
    category: "Drink & Cafe",
    title: "Gratis 1 Original Smoothie",
    discountType: "FREE_100",
    discountValue: 100,
    description: "Gratis 1 minuman Boost Original untuk member Vibe Club di hari ulang tahun.",
    termsAndConditions: ["Tunjukkan KTP asli", "Daftar aplikasi MyBoost minimal H-7"],
    claimWindow: "H-2 s/d H+2",
    requiresApp: true,
    appName: "MyBoost",
    minRegistrationDays: 7,
    requiresIdCard: true,
    minPurchaseIdr: 0,
    locations: "Seluruh outlet Indonesia",
  };

  it("rejects community submission if both proofImageUrl and proofLinkUrl are missing", () => {
    const result = createDealSchema.safeParse(validBase);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("Bukti wajib"))).toBe(true);
    }
  });

  it("accepts submission with uploaded proofImageUrl", () => {
    const result = createDealSchema.safeParse({
      ...validBase,
      proofImageUrl: "/uploads/proofs/sample.png",
    });
    expect(result.success).toBe(true);
  });

  it("accepts submission with valid proofLinkUrl", () => {
    const result = createDealSchema.safeParse({
      ...validBase,
      proofLinkUrl: "https://www.boostjuicebars.co.id/vibe/",
    });
    expect(result.success).toBe(true);
  });

  it("rejects submission with invalid proofLinkUrl", () => {
    const result = createDealSchema.safeParse({
      ...validBase,
      proofLinkUrl: "not-a-valid-url",
    });
    expect(result.success).toBe(false);
  });

  it("validates community verification votes", () => {
    expect(
      verifyDealSchema.safeParse({
        voteType: "STILL_WORKS",
        comment: "Baru klaim di Kokas lancar!",
        outletLocation: "Kota Kasablanka",
      }).success
    ).toBe(true);

    expect(
      verifyDealSchema.safeParse({
        voteType: "INVALID_VOTE",
      }).success
    ).toBe(false);
  });
});
