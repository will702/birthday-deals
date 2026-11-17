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

export function getDiscountBadge(discountType: string, discountValue: number | null): {
  label: string;
  tone: "emerald" | "vermilion" | "neutral";
} {
  if (discountType === "FREE_100" || discountValue === 100) {
    return { label: "100% GRATIS", tone: "emerald" };
  }
  if (discountType === "DISCOUNT_PERCENT" && discountValue) {
    return { label: `DISKON ${discountValue}%`, tone: "vermilion" };
  }
  if (discountType === "BOGO") {
    return { label: "BELI 1 GRATIS 1", tone: "vermilion" };
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
  className: string;
} {
  switch (status) {
    case "ADMIN_VERIFIED":
      return {
        label: "Admin Verified",
        className: "bg-[#ECFDF3] text-[#146C43] border-[#BCE3CE]",
      };
    case "SCRAPER_VERIFIED":
      return {
        label: "Scraper Aktif",
        className: "bg-[#F3EDE3] text-[#18181B] border-[#D3C8B8]",
      };
    case "COMMUNITY_SUBMITTED":
      return {
        label: "Bukti Komunitas",
        className: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
      };
    case "STALE":
      return {
        label: "Perlu Cek Ulang",
        className: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]",
      };
    case "EXPIRED":
      return {
        label: "Berakhir / Expired",
        className: "bg-[#FEF2F2] text-[#C83228] border-[#FECACA]",
      };
    default:
      return {
        label: status,
        className: "bg-[#F3EDE3] text-[#52525B] border-[#E4DDD3]",
      };
  }
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
