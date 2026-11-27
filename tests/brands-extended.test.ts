import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  applySourceDefaults,
  createBrandsExtendedAdapter,
  parseBrandPageHtml,
} from "../src/scraper/adapters/brands-extended";
import type { FetchWithTiersResult } from "../src/scraper/fetch-tiers";
import { BRAND_SOURCES, type BrandSource } from "../src/scraper/sources/brands";

const html = readFileSync(path.join(__dirname, "fixtures/brand-birthday.html"), "utf8");

const source: BrandSource = {
  brandName: "Bakmi GM",
  url: "https://www.bakmigm.com/birthday-reward",
  category: "F&B",
  locations: "Seluruh outlet Bakmi GM",
  selectors: { container: ".reward-card", title: "h3", body: ".desc" },
};

function pageResult(over: Partial<FetchWithTiersResult> = {}): FetchWithTiersResult {
  return {
    ok: true,
    tier: "http",
    url: source.url,
    finalUrl: source.url,
    status: 200,
    html,
    text: "Birthday Reward Khusus member yang ulang tahun, dapatkan e-voucher Bakmi Goreng Ayam gratis lewat aplikasi.",
    title: "Membership",
    error: null,
    attempts: [],
    ...over,
  };
}

describe("brand sources config", () => {
  it("only lists absolute https URLs with unique url", () => {
    const urls = BRAND_SOURCES.map((s) => s.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const u of urls) expect(u).toMatch(/^https:\/\//);
  });
});

describe("parseBrandPageHtml", () => {
  it("keeps only birthday blocks, dedupes and ignores script text", () => {
    const deals = parseBrandPageHtml(html, source);
    expect(deals).toHaveLength(1);
    expect(deals[0]).toMatchObject({
      brandName: "Bakmi GM",
      title: "Birthday Reward",
      sourceType: "SCRAPER_BRAND",
      sourceVerifiedLive: true,
      category: "F&B",
    });
    expect(deals[0].rawText).toContain("e-voucher Bakmi Goreng Ayam");
  });

  it("returns nothing without selectors (LLM path handles it)", () => {
    expect(parseBrandPageHtml(html, { ...source, selectors: undefined })).toEqual([]);
  });
});

describe("applySourceDefaults", () => {
  it("overrides model brand with the configured brand", () => {
    const [d] = applySourceDefaults(
      [{ brandName: "bakmi", title: "t", rawText: "r", sourceUrl: "u", sourceType: "SCRAPER_SEARCH" }],
      source,
    );
    expect(d).toMatchObject({ brandName: "Bakmi GM", sourceType: "SCRAPER_BRAND", locations: "Seluruh outlet Bakmi GM" });
  });
});

describe("brands-extended adapter", () => {
  it("uses selectors first, without the LLM", async () => {
    const extract = vi.fn();
    const res = await createBrandsExtendedAdapter({
      sources: [source],
      fetchTiers: vi.fn(async () => pageResult()),
      extract,
      useAi: true,
    }).run();
    expect(res.status).toBe("SUCCESS");
    expect(res.deals).toHaveLength(1);
    expect(extract).not.toHaveBeenCalled();
  });

  it("falls back to LLM extraction (evidence enforced) when there are no selectors", async () => {
    const text = "Birthday Reward Khusus member yang ulang tahun, dapatkan e-voucher Bakmi Goreng Ayam gratis lewat aplikasi.";
    const extract = vi.fn(async () => ({
      deals: [
        {
          brandName: "Model Brand",
          title: "E-voucher Bakmi Goreng Ayam",
          rawText: "Gratis saat ulang tahun",
          evidenceQuote: "Khusus member yang ulang tahun, dapatkan e-voucher Bakmi Goreng Ayam",
          sourceUrl: source.url,
        },
      ],
      droppedNoEvidence: 0,
    }));
    const res = await createBrandsExtendedAdapter({
      sources: [{ ...source, selectors: undefined }],
      fetchTiers: vi.fn(async () => pageResult({ html: "", text })),
      extract,
      useAi: true,
    }).run();
    expect(res.deals).toHaveLength(1);
    expect(res.deals[0].brandName).toBe("Bakmi GM");
    expect(res.deals[0].proofNotes).toContain("Kutipan bukti");
  });

  it("reports failures and robots skips without crashing", async () => {
    const tiers = vi
      .fn()
      .mockResolvedValueOnce(pageResult({ ok: false, tier: null, error: "HTTP 403", html: "", text: "" }))
      .mockResolvedValueOnce(pageResult({ ok: false, tier: null, skipReason: "robots-disallowed", html: "", text: "" }))
      .mockResolvedValueOnce(pageResult({ html: "<p>x</p>", text: "tidak relevan sama sekali" }));
    const res = await createBrandsExtendedAdapter({
      sources: [source, { ...source, brandName: "B" }, { ...source, brandName: "C" }],
      fetchTiers: tiers,
      useAi: false,
    }).run();
    expect(res.deals).toEqual([]);
    expect(res.errors.join(" ")).toMatch(/403/);
    expect((res.notes ?? []).join(" ")).toMatch(/robots/);
    expect((res.notes ?? []).join(" ")).toMatch(/tidak menyebut ulang tahun/);
  });
});
