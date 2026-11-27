import { describe, expect, it } from "vitest";
import {
  brandKey,
  brandsMatch,
  cleanBrandName,
  dedupeBatch,
  isDuplicateDeal,
  titleCore,
} from "../src/scraper/dedupe";
import { isBrandAnniversaryPromo, isZodiacPromo, rejectionReason } from "../src/scraper/normalizer";

const d = (brandName: string, title: string, discountType?: string, discountValue?: number | null) => ({
  brandName,
  title,
  discountType,
  discountValue,
});

describe("brandKey / brandsMatch", () => {
  it("normalizes case, suffixes and diacritics", () => {
    expect(brandKey("GOCOCO")).toBe(brandKey("Gococo"));
    expect(brandKey("Cinépolis")).toBe("cinepolis");
    expect(brandKey("Starbucks Indonesia")).toBe("starbucks");
    expect(brandKey("Sushi Tei (Boga Group)")).toBe("sushi tei");
    expect(brandKey("Fore Coffee Official")).toBe("fore coffee");
  });

  it("matches prefix brands but not brands sharing only a generic word", () => {
    expect(brandsMatch("The Jungle Waterpark", "The Jungle")).toBe(true);
    expect(brandsMatch("Starbucks", "Starbucks Indonesia")).toBe(true);
    expect(brandsMatch("Sushi Tei", "Sushi Tei Indonesia")).toBe(true);
    expect(brandsMatch("The Jungle", "The Body Shop")).toBe(false);
    expect(brandsMatch("The Palace", "The")).toBe(false);
    expect(brandsMatch("Sushi Tei", "Sushi Groove")).toBe(false);
  });
});

describe("titleCore", () => {
  it("strips brand, filler and discount words with synonyms", () => {
    const { core, kinds } = titleCore("Promo IPPUDO Birthday Treats Gratis Dessert", ["Ippudo"]);
    expect([...core]).toEqual(["dessert"]);
    expect(kinds.has("gratis")).toBe(true);
    expect(titleCore("Free Birthday Sushi").kinds.has("gratis")).toBe(true);
    expect(titleCore("Buy 1 Get 1 Latte").kinds.has("bogo")).toBe(true);
    expect(titleCore("50% Off Latte").kinds.has("diskon")).toBe(true);
  });
});

describe("isDuplicateDeal", () => {
  it.each([
    ["Ippudo", "Gratis Dessert", "Ippudo", "Promo IPPUDO Birthday Treats Gratis Dessert"],
    ["Loaf Bun", "Diskon Hingga 50%", "Loaf Bun", "Promo Loaf Bun Birthday Treats Diskon Hingga 50%"],
    ["Sushi Tei", "Free Birthday Sushi", "Sushi Tei Indonesia", "Gratis 1 Birthday Sushi Cake (100% Off)"],
    ["Cinépolis", "Tiket dan Popcorn Gratis", "Cinepolis", "Promo Cinépolis Birthday Gift Tiket dan Popcorn"],
    ["GOCOCO", "Free Dessert", "Gococo", "Free Dessert"],
    ["Starbucks", "Free Birthday Drink", "Starbucks Indonesia", "Starbucks Indonesia Birthday Gratis Drink"],
    ["Sushi Tei", "Gratis Sushi Cake", "Sushi Tei Indonesia", "Gratis Sushi Cake"],
    ["The Jungle Waterpark", "Tiket Gratis", "The Jungle", "Promo Birthday Tiket Gratis"],
  ])("detects %s / %s vs %s / %s", (b1, t1, b2, t2) => {
    expect(isDuplicateDeal(d(b1, t1), d(b2, t2))).toBe(true);
  });

  it("same type: known values must match; unknown value only merges a generic title", () => {
    expect(isDuplicateDeal(d("Fore Coffee", "Kopi A", "FREE_100", 100), d("Fore Coffee", "Latte B", "FREE_100", null))).toBe(false);
    expect(isDuplicateDeal(d("Fore Coffee", "Kopi A", "FREE_100", 100), d("Fore Coffee", "Gratis Ulang Tahun", "FREE_100", null))).toBe(true);
    expect(isDuplicateDeal(d("Fore Coffee", "Kopi A", "DISCOUNT_PERCENT", 20), d("Fore Coffee", "Latte B", "DISCOUNT_PERCENT", 50))).toBe(false);
  });

  it("does not merge different deals", () => {
    expect(
      isDuplicateDeal(
        d("Bakmi GM", "Gratis Bakmi Goreng", "FREE_100", 100),
        d("Bakmi GM", "E-Voucher Krispi Chips", "VOUCHER", null),
      ),
    ).toBe(false);
    expect(isDuplicateDeal(d("Chadol Gujeolpan", "Diskon 15%"), d("Han Guksu", "Diskon 15%"))).toBe(false);
    expect(isDuplicateDeal(d("The Jungle", "Tiket Gratis"), d("The Body Shop", "Tiket Gratis"))).toBe(false);
  });
});

describe("dedupeBatch", () => {
  const item = (sourceType: string, description: string) => ({
    brandName: "Fore Coffee",
    title: "Gratis Kopi",
    discountType: "FREE_100",
    discountValue: 100,
    sourceType,
    description,
  });

  it("keeps the highest-priority source, then the longer description", () => {
    const out = dedupeBatch([
      item("SCRAPER_SEARCH", "x"),
      item("SCRAPER_BRAND", "short"),
      item("SCRAPER_AGGREGATOR", "much longer description"),
    ]);
    expect(out.kept).toHaveLength(1);
    expect(out.kept[0].sourceType).toBe("SCRAPER_BRAND");
    expect(out.dropped).toBe(2);
    const tie = dedupeBatch([item("SCRAPER_BRAND", "a"), item("SCRAPER_BRAND", "longer")]);
    expect(tie.kept[0].description).toBe("longer");
  });
});

describe("filters", () => {
  it("rejects zodiac promos unless tied to the user's own birthday date", () => {
    expect(isZodiacPromo("Sagitarius Menu Favorit Rp109.000", "Berlaku 22 Nov - 21 Des")).toBe(true);
    expect(isZodiacPromo("Scorpio Special", "")).toBe(true);
    expect(isZodiacPromo("Zodiac Leo Deal", "")).toBe(true);
    expect(isZodiacPromo("Capricorn Birthday Gift", "Tunjukkan KTP dengan tanggal lahir sesuai")).toBe(false);
    expect(isZodiacPromo("Gratis Sushi Cake", "untuk yang berulang tahun")).toBe(false);
    expect(
      rejectionReason({
        brandName: "Han Guksu",
        title: "Menu Favorit Rp99.000",
        rawText: "Zodiak Sagitarius",
        sourceUrl: "x",
        sourceType: "SCRAPER_SEARCH",
      }),
    ).toBe("promo zodiak");
  });

  it("rejects brand anniversary promos", () => {
    expect(isBrandAnniversaryPromo("Platinum Resto Anniversary Menu Serba Rp23.000")).toBe(true);
    expect(isBrandAnniversaryPromo("Promo HUT ke-17 Diskon 17%")).toBe(true);
    expect(isBrandAnniversaryPromo("Diskon", "Rayakan ulang tahun ke-12 kami")).toBe(true);
    expect(isBrandAnniversaryPromo("Birthday Treat Gratis Cake", "tunjukkan KTP")).toBe(false);
  });
});

describe("cleanBrandName", () => {
  it("truncates promo-polluted brand names", () => {
    expect(cleanBrandName("Chadol Gujeolpan Sagitarius Menu Favorit Rp109.000")).toBe("Chadol Gujeolpan");
    expect(cleanBrandName("Han Guksu Sagitarius Menu Favorit Rp99.000")).toBe("Han Guksu");
    expect(cleanBrandName("Promo Loaf Bun Birthday Treats Diskon 50%")).toBe("Loaf Bun");
    expect(cleanBrandName("Platinum Resto Anniversary Menu Serba Rp23.000")).toBe("Platinum Resto");
  });

  it("canonicalizes known brands", () => {
    expect(cleanBrandName("starbucks")).toBe("Starbucks Indonesia");
    expect(cleanBrandName("Ippudo", ["IPPUDO"])).toBe("IPPUDO");
    expect(cleanBrandName("Sushi Tei")).toBe("Sushi Tei");
  });
});

describe("same-type distinct items stay separate", () => {
  it("does not merge two different Bakmi GM freebies of the same type", async () => {
    const { isDuplicateDeal } = await import("../src/scraper/dedupe");
    expect(
      isDuplicateDeal(
        { brandName: "Bakmi GM", title: "Gratis Bakmi Goreng Ayam", discountType: "FREE_ITEM_WITH_PURCHASE", discountValue: null },
        { brandName: "Bakmi GM", title: "Gratis E-Voucher Krispi Chips Ulang Tahun", discountType: "FREE_ITEM_WITH_PURCHASE", discountValue: null },
      ),
    ).toBe(false);
  });
});
