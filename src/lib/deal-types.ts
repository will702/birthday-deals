export interface ProofDto {
  id: string;
  submitterName: string;
  proofImageUrl: string | null;
  proofLinkUrl: string | null;
  claimedDate: string | null;
  outletLocation: string | null;
  notes: string | null;
  createdAt: string;
}

export interface VerificationDto {
  id: string;
  voteType: "STILL_WORKS" | "EXPIRED_OR_CHANGED" | string;
  comment: string | null;
  proofImageUrl: string | null;
  proofLinkUrl: string | null;
  voterFingerprint: string | null;
  createdAt: string;
}

export interface DealSummaryDto {
  id: string;
  slug: string;
  brandName: string;
  brandLogoUrl: string | null;
  category: string;
  title: string;
  discountType: string;
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
  sourceUrl: string | null;
  sourceType: string;
  verificationStatus: string;
  validYear: number;
  stillWorksCount: number;
  expiredReportCount: number;
  freshnessScore: number;
  lastScrapedAt: string | null;
  lastVerifiedAt: string;
  createdAt: string;
  proofCount: number;
  verificationCount: number;
  latestProofImageUrl: string | null;
}

export interface DealDetailDto extends DealSummaryDto {
  proofs: ProofDto[];
  verifications: VerificationDto[];
}

export interface ScrapeRunDto {
  id: string;
  sourceName: string;
  status: string;
  dealsFound: number;
  dealsUpdated: number;
  dealsCreated: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export function getDiscountBadge(
  discountType: string,
  discountValue: number | null,
): {
  label: string;
  tone: "emerald" | "clay" | "neutral";
} {
  if (discountType === "FREE_100" || discountValue === 100) {
    return { label: "100% GRATIS", tone: "emerald" };
  }
  if (discountType === "DISCOUNT_PERCENT" && discountValue) {
    return { label: `DISKON ${discountValue}%`, tone: "clay" };
  }
  if (discountType === "BOGO") {
    return { label: "BELI 1 GRATIS 1", tone: "clay" };
  }
  if (discountType === "FREE_ITEM_WITH_PURCHASE") {
    return { label: "GRATIS + MIN. ORDER", tone: "neutral" };
  }
  if (discountType === "VOUCHER") {
    return { label: "VOUCHER ULTAH", tone: "neutral" };
  }
  return { label: "PROMO ULTAH", tone: "neutral" };
}

export function getVerificationMeta(status: string): {
  label: string;
  tone: "emerald" | "neutral" | "info" | "warn" | "danger";
} {
  switch (status) {
    case "ADMIN_VERIFIED":
      return { label: "Admin Verified", tone: "emerald" };
    case "SCRAPER_VERIFIED":
      return { label: "Scraper Aktif", tone: "neutral" };
    case "COMMUNITY_SUBMITTED":
      return { label: "Bukti Komunitas", tone: "info" };
    case "STALE":
      return { label: "Perlu Cek Ulang", tone: "warn" };
    case "EXPIRED":
      return { label: "Berakhir / Expired", tone: "danger" };
    default:
      return { label: status, tone: "neutral" };
  }
}

/** Typographic anchor shared by cards and the detail page:
 *  the deal's value becomes the headline. */
export function getValueHeadline(
  discountType: string,
  discountValue: number | null,
): {
  numeral: string;
  unit: string;
  tone: "emerald" | "clay" | "ink";
} {
  if (discountType === "FREE_100" || discountValue === 100) {
    return { numeral: "100%", unit: "gratis", tone: "emerald" };
  }
  if (discountType === "DISCOUNT_PERCENT" && discountValue) {
    return { numeral: `${discountValue}%`, unit: "diskon", tone: "clay" };
  }
  if (discountType === "BOGO") {
    return { numeral: "1+1", unit: "gratis satu", tone: "clay" };
  }
  if (discountType === "FREE_ITEM_WITH_PURCHASE") {
    return { numeral: "Gratis", unit: "+ min. order", tone: "ink" };
  }
  if (discountType === "VOUCHER") {
    return { numeral: "Voucher", unit: "ultah", tone: "ink" };
  }
  return { numeral: "Promo", unit: "ultah", tone: "ink" };
}

export function getSourceLabel(sourceType: string): string {
  switch (sourceType) {
    case "SCRAPER_BRAND":
      return "Situs Resmi Brand";
    case "SCRAPER_AGGREGATOR":
      return "Agregator Promo ID";
    case "SCRAPER_SEARCH":
      return "Web Discovery";
    case "COMMUNITY":
      return "Kontribusi Komunitas";
    default:
      return sourceType;
  }
}
