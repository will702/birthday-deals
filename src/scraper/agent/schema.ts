import { z } from "zod";
import type { RawScrapedDeal, SourceType } from "../types";

export const DEAL_CATEGORIES = [
  "F&B",
  "Drink & Cafe",
  "Cinema & Entertainment",
  "Beauty & Retail",
  "Other",
] as const;

export const DISCOUNT_TYPES = [
  "FREE_100",
  "DISCOUNT_PERCENT",
  "FREE_ITEM_WITH_PURCHASE",
  "VOUCHER",
  "BOGO",
] as const;

export const extractedDealSchema = z.object({
  brandName: z
    .string()
    .min(1)
    .describe("Brand or merchant name offering the deal"),
  title: z
    .string()
    .min(1)
    .describe("Short deal title, e.g. 'Gratis 1 Pizza saat Ulang Tahun'"),
  rawText: z
    .string()
    .min(1)
    .describe(
      "Short description of the offer, copied or condensed from the page",
    ),
  category: z.enum(DEAL_CATEGORIES).optional(),
  locations: z
    .string()
    .optional()
    .describe("Where the deal is valid, e.g. 'Seluruh Indonesia'"),
  termsList: z
    .array(z.string())
    .optional()
    .describe("Terms and conditions, one per item"),
  discountTypeHint: z.enum(DISCOUNT_TYPES).optional(),
  discountValueHint: z
    .number()
    .nullable()
    .optional()
    .describe("Percent or IDR value if stated"),
  minPurchaseIdrHint: z
    .number()
    .optional()
    .describe("Minimum purchase in IDR, 0 if none"),
  claimWindowHint: z
    .string()
    .nullable()
    .optional()
    .describe("When the deal can be claimed"),
  requiresIdCardHint: z.boolean().optional(),
  appNameHint: z.string().nullable().optional(),
  minRegistrationDaysHint: z.number().nullable().optional(),
  evidenceQuote: z
    .string()
    .min(20)
    .describe(
      "Verbatim snippet copied EXACTLY from the page text that supports this deal",
    ),
  sourceUrl: z.string().describe("URL of the page the deal was found on"),
});

export type ExtractedDeal = z.infer<typeof extractedDealSchema>;

export const extractedDealsSchema = z.object({
  deals: z.array(extractedDealSchema),
});

export function extractedDealToRaw(
  d: ExtractedDeal,
  opts: { sourceType: SourceType; sourceVerifiedLive: boolean },
): RawScrapedDeal {
  const raw: RawScrapedDeal = {
    brandName: d.brandName.trim(),
    title: d.title.trim(),
    rawText: d.rawText.trim(),
    sourceUrl: d.sourceUrl,
    sourceType: opts.sourceType,
    sourceVerifiedLive: opts.sourceVerifiedLive,
    proofNotes: `Kutipan bukti: "${d.evidenceQuote.trim().slice(0, 300)}"`,
  };
  if (d.category) raw.category = d.category;
  if (d.locations) raw.locations = d.locations;
  if (d.termsList?.length) raw.termsList = d.termsList;
  if (d.discountTypeHint) raw.discountTypeHint = d.discountTypeHint;
  if (d.discountValueHint !== undefined)
    raw.discountValueHint = d.discountValueHint;
  if (d.minPurchaseIdrHint !== undefined)
    raw.minPurchaseIdrHint = d.minPurchaseIdrHint;
  if (d.claimWindowHint !== undefined) raw.claimWindowHint = d.claimWindowHint;
  if (d.requiresIdCardHint !== undefined)
    raw.requiresIdCardHint = d.requiresIdCardHint;
  if (d.appNameHint !== undefined) raw.appNameHint = d.appNameHint;
  if (d.minRegistrationDaysHint !== undefined) {
    raw.minRegistrationDaysHint = d.minRegistrationDaysHint;
  }
  return raw;
}

/** Lowercase + collapse whitespace so quotes survive line-wrap differences. */
export function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** True when the quote appears verbatim (case/whitespace-normalised) in the text. */
export function quoteInText(quote: string, text: string): boolean {
  const q = normalizeForMatch(quote);
  return q.length > 0 && normalizeForMatch(text).includes(q);
}
