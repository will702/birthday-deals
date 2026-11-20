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

export interface CategoryMeta {
  shortLabel: string;
  barClass: string;
  badgeClass: string;
  avatarBgClass: string;
  avatarTextClass: string;
  iconColorClass: string;
}

export function getCategoryMeta(category: string): CategoryMeta {
  switch (category) {
    case "F&B":
      return {
        shortLabel: "Makan & Resto",
        barClass: "bg-[#FF5A26]",
        badgeClass: "bg-[#FFF1EC] text-[#C23111] border-[#FFD3C4]",
        avatarBgClass: "bg-[#FFF1EC]",
        avatarTextClass: "text-[#C23111]",
        iconColorClass: "text-[#E03E1A]",
      };
    case "Drink & Cafe":
      return {
        shortLabel: "Kopi & Minuman",
        barClass: "bg-[#D97706]",
        badgeClass: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]",
        avatarBgClass: "bg-[#FFFBEB]",
        avatarTextClass: "text-[#B45309]",
        iconColorClass: "text-[#D97706]",
      };
    case "Cinema & Entertainment":
      return {
        shortLabel: "Hiburan & Bioskop",
        barClass: "bg-[#2563EB]",
        badgeClass: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
        avatarBgClass: "bg-[#EFF6FF]",
        avatarTextClass: "text-[#1D4ED8]",
        iconColorClass: "text-[#2563EB]",
      };
    case "Beauty & Retail":
      return {
        shortLabel: "Belanja & Kecantikan",
        barClass: "bg-[#E11D48]",
        badgeClass: "bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]",
        avatarBgClass: "bg-[#FFF1F2]",
        avatarTextClass: "text-[#BE123C]",
        iconColorClass: "text-[#E11D48]",
      };
    default:
      return {
        shortLabel: "Lainnya",
        barClass: "bg-[#0F766E]",
        badgeClass: "bg-[#F0FDFA] text-[#0F766E] border-[#99F6E4]",
        avatarBgClass: "bg-[#F0FDFA]",
        avatarTextClass: "text-[#0F766E]",
        iconColorClass: "text-[#0F766E]",
      };
  }
}

export function getBrandInitials(brandName: string): string {
  const words = brandName
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "UL";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function cleanDealDescription(
  brandName: string,
  title: string,
  description: string,
): string {
  const raw = description.trim();
  if (!raw) return "";

  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let cleaned = raw;

  // Strip duplicated "BrandName Promo BrandName ..." prefixes common in aggregator scrapes
  if (brandName.trim()) {
    const b = escapeRe(brandName.trim());
    cleaned = cleaned.replace(
      new RegExp(`^${b}\\s+promo\\s+${b}\\s*[:\\-–]?\\s*`, "i"),
      "",
    );
    cleaned = cleaned.replace(new RegExp(`^${b}\\s+promo\\s+`, "i"), "");
  }

  if (title.trim()) {
    const t = escapeRe(title.trim());
    cleaned = cleaned.replace(new RegExp(`^${t}\\s*[:\\-–.]?\\s*`, "i"), "");
  }

  cleaned = cleaned.trim();
  if (cleaned.length < 18) return raw;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
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
      return { label: "Terverifikasi Admin", tone: "emerald" };
    case "SCRAPER_VERIFIED":
      return { label: "Terpantau", tone: "neutral" };
    case "COMMUNITY_SUBMITTED":
      return { label: "Bukti Komunitas", tone: "info" };
    case "STALE":
      return { label: "Perlu Cek Ulang", tone: "warn" };
    case "EXPIRED":
      return { label: "Kedaluwarsa", tone: "danger" };
    default:
      return { label: status, tone: "neutral" };
  }
}

export function getValueHeadline(
  discountType: string,
  discountValue: number | null,
  title?: string,
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
    return { numeral: "1+1", unit: "beli 1 gratis 1", tone: "clay" };
  }
  if (discountType === "FREE_ITEM_WITH_PURCHASE") {
    return { numeral: "Free Item", unit: "+ min. order", tone: "emerald" };
  }
  if (discountType === "VOUCHER") {
    return { numeral: "Voucher", unit: "spesial ultah", tone: "clay" };
  }
  const lower = (title ?? "").toLowerCase();
  if (lower.includes("upgrade") || lower.includes("upsize")) {
    return { numeral: "Upgrade", unit: "gratis ukuran", tone: "clay" };
  }
  if (lower.includes("cashback")) {
    return { numeral: "Cashback", unit: "spesial ultah", tone: "clay" };
  }
  if (lower.includes("gratis") || lower.includes("free")) {
    return { numeral: "Gratis", unit: "birthday treat", tone: "emerald" };
  }
  if (lower.includes("voucher") || lower.includes("poin") || lower.includes("point")) {
    return { numeral: "Bonus", unit: "voucher / poin", tone: "clay" };
  }
  return { numeral: "Spesial", unit: "birthday treat", tone: "ink" };
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
