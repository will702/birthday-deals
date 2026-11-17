import { describe, expect, it } from "vitest";
import {
  computeFreshnessScore,
  detectExpirationSignals,
  extractBrandNameFromHeadline,
  isBrandAnniversaryPromo,
  isValidBrandHeading,
  normalizeScrapedDeal,
  parseClaimWindow,
  parseIndonesianDiscount,
  parseMinPurchaseIdr,
  parseRequirements,
} from "../src/scraper/normalizer";

describe("Indonesian promo normalizer", () => {
  it("parses 100% free / gratis smoothie without minimum spend", () => {
    const res = parseIndonesianDiscount(
      "Gratis 1 Original Boost Smoothie (100% discount) tanpa minimum transaksi"
    );
    expect(res.discountType).toBe("FREE_100");
    expect(res.discountValue).toBe(100);
    expect(parseMinPurchaseIdr("tanpa minimum transaksi")).toBe(0);
  });

  it("parses 50% discount and IDR minimum spend formats", () => {
    const res = parseIndonesianDiscount("Diskon 50% menu utama di Pepper Lunch");
    expect(res.discountType).toBe("DISCOUNT_PERCENT");
    expect(res.discountValue).toBe(50);

    expect(parseMinPurchaseIdr("minimal pembelian Rp150.000")).toBe(150000);
    expect(parseMinPurchaseIdr("min. transaksi 75rb")).toBe(75000);
    expect(parseMinPurchaseIdr("min spend 100k")).toBe(100000);
  });

  it("parses BOGO and conditional free items accurately", () => {
    const bogo = parseIndonesianDiscount("Beli 1 Gratis 1 Steak di hari ulang tahun");
    expect(bogo.discountType).toBe("BOGO");
    expect(bogo.discountValue).toBe(50);

    const conditional = parseIndonesianDiscount(
      "Gratis Es Teler di hari ulang tahun dengan min. transaksi Rp50.000"
    );
    expect(conditional.discountType).toBe("FREE_ITEM_WITH_PURCHASE");
  });

  it("extracts Indonesian claim window and app lead time", () => {
    const w1 = parseClaimWindow("Berlaku H-7 s/d H+7 dengan daftar aplikasi minimal 30 hari sebelum ultah");
    expect(w1.claimWindow).toBe("H-7 s/d H+7");
    expect(w1.minRegistrationDays).toBe(30);

    const w2 = parseClaimWindow("Berlaku sepanjang bulan ulang tahun, registrasi paling lambat H-7");
    expect(w2.claimWindow).toBe("Bulan Ulang Tahun");
    expect(w2.minRegistrationDays).toBe(7);
  });

  it("detects KTP and loyalty app requirements", () => {
    const req = parseRequirements("Tunjukkan KTP asli dan barcode MyBoost / Vibe Club");
    expect(req.requiresIdCard).toBe(true);
    expect(req.requiresApp).toBe(true);
    expect(req.appName).toBe("MyBoost / Vibe Club");
  });

  it("distinguishes customer birthday treats from company anniversary promos", () => {
    expect(
      isBrandAnniversaryPromo("Promo Es Teler 77 Ulang Tahun ke-44 Diskon 44%")
    ).toBe(true);
    expect(
      isBrandAnniversaryPromo("Promo Kopi Kenangan Ulang Tahun Ke-9 Beli 2 Minuman Rp29.000")
    ).toBe(true);
    expect(
      isBrandAnniversaryPromo("Promo Sushi Tei Birthday Treat Gratis Sushi Cake untuk yang berulang tahun")
    ).toBe(false);
  });

  it("does not mistake normal T&C exclusions ('tidak berlaku di weekend') for expiration", () => {
    const validTerms = detectExpirationSignals(
      "Promo hanya berlaku di weekdays, tidak berlaku di weekend dan tidak berlaku untuk menu paket.",
      2026
    );
    expect(validTerms.likelyExpired).toBe(false);

    const expired = detectExpirationSignals("Mohon maaf promo ini telah berakhir.", 2026);
    expect(expired.likelyExpired).toBe(true);
  });

  it("extracts clean brand names and filters editorial article subheadings", () => {
    expect(extractBrandNameFromHeadline("Promo Pepper Lunch Birthday Deals Diskon 50%")).toBe(
      "Pepper Lunch"
    );
    expect(
      extractBrandNameFromHeadline("Promo Ulang Tahun Jus Antara: Bayar Jus Kecil Dapat Jus Besar")
    ).toBe("Jus Antara");

    expect(isValidBrandHeading("Kenapa Promo Ulang Tahun Menarik?")).toBe(false);
    expect(isValidBrandHeading("Cara Baca Daftar Promo Ini Biar Nggak Salah Ekspektasi")).toBe(false);
    expect(isValidBrandHeading("1. Sushi Tei")).toBe(true);
  });

  it("computes freshness score decaying over time and responding to votes", () => {
    const now = new Date("2026-11-17T00:00:00Z");
    const fresh = computeFreshnessScore({
      lastVerifiedAt: new Date("2026-11-16T00:00:00Z"),
      stillWorksCount: 4,
      expiredReportCount: 0,
      sourceHealth: "LIVE",
      now,
    });
    expect(fresh).toBeGreaterThanOrEqual(95);

    const stale = computeFreshnessScore({
      lastVerifiedAt: new Date("2026-06-01T00:00:00Z"),
      stillWorksCount: 1,
      expiredReportCount: 2,
      sourceHealth: "NOT_FOUND",
      now,
    });
    expect(stale).toBeLessThan(30);
  });

  it("normalizes raw scraped deal into full NormalizedDealInput", () => {
    const normalized = normalizeScrapedDeal({
      brandName: "Boost Juice Indonesia",
      title: "Gratis 1 Original Boost Smoothie",
      rawText:
        "Member MyBoost mendapat 100% gratis smoothie pada H-2 s/d H+2 dengan menunjukkan KTP, daftar minimal 7 hari sebelumnya tanpa minimum transaksi.",
      sourceUrl: "https://www.boostjuicebars.co.id/vibe/",
      sourceType: "SCRAPER_BRAND",
      sourceVerifiedLive: true,
    }, { now: new Date("2026-06-15T00:00:00Z") });
    expect(normalized.validYear).toBe(2026);
    expect(normalized.discountType).toBe("FREE_100");
    expect(normalized.discountValue).toBe(100);
    expect(normalized.requiresIdCard).toBe(true);
    expect(normalized.requiresApp).toBe(true);
    expect(normalized.appName).toBe("MyBoost / Vibe Club");
    expect(normalized.minPurchaseIdr).toBe(0);
    expect(normalized.category).toBe("Drink & Cafe");
  });
});
