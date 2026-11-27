export type DealCategory =
  | "F&B"
  | "Drink & Cafe"
  | "Cinema & Entertainment"
  | "Beauty & Retail"
  | "Other";

export type DiscountType =
  | "FREE_100"
  | "DISCOUNT_PERCENT"
  | "FREE_ITEM_WITH_PURCHASE"
  | "VOUCHER"
  | "BOGO";

export type SourceType =
  | "SCRAPER_BRAND"
  | "SCRAPER_AGGREGATOR"
  | "SCRAPER_SEARCH"
  | "COMMUNITY";

export type VerificationStatus =
  | "ADMIN_VERIFIED"
  | "SCRAPER_VERIFIED"
  | "COMMUNITY_SUBMITTED"
  | "STALE"
  | "EXPIRED";

export type SourceHealth = "LIVE" | "NOT_FOUND" | "BOT_PROTECTED" | "EXPIRED_SIGNAL" | "UNKNOWN";

export interface RawScrapedDeal {
  brandName: string;
  title: string;
  rawText: string;
  category?: DealCategory;
  sourceUrl: string;
  sourceType: SourceType;
  locations?: string;
  termsList?: string[];
  brandLogoUrl?: string | null;
  proofNotes?: string;
  proofImageUrl?: string | null;
  appNameHint?: string | null;
  minRegistrationDaysHint?: number | null;
  claimWindowHint?: string | null;
  requiresIdCardHint?: boolean;
  minPurchaseIdrHint?: number;
  discountTypeHint?: DiscountType;
  discountValueHint?: number | null;
  sourceVerifiedLive?: boolean;
  /**
   * Low-trust marker (e.g. public social posts). Normalizes to COMMUNITY_SUBMITTED so the deal
   * shows as "needs check" and never overwrites higher-trust records or bumps freshness.
   */
  lowTrust?: boolean;
}

export interface NormalizedDealInput {
  slug: string;
  brandName: string;
  brandLogoUrl: string | null;
  category: DealCategory;
  title: string;
  discountType: DiscountType;
  discountValue: number | null;
  description: string;
  termsAndConditions: string[];
  claimWindow: string;
  requiresApp: boolean;
  appName: string | null;
  minRegistrationDays: number | null;
  requiresIdCard: boolean;
  minPurchaseIdr: number;
  locations: string;
  sourceUrl: string;
  sourceType: SourceType;
  verificationStatus: VerificationStatus;
  validYear: number;
  freshnessScore: number;
  proofNotes: string;
  proofImageUrl: string | null;
}

export interface AdapterResult {
  sourceName: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED" | "SKIPPED";
  deals: RawScrapedDeal[];
  errors: string[];
  notes?: string[];
}

export interface ScraperAdapter {
  name: string;
  run(): Promise<AdapterResult>;
}
