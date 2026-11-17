import { z } from "zod";

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

export const VERIFICATION_STATUSES = [
  "ADMIN_VERIFIED",
  "SCRAPER_VERIFIED",
  "COMMUNITY_SUBMITTED",
  "STALE",
  "EXPIRED",
] as const;

const optionalTrimmedUrl = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((val) => (val && val.length > 0 ? val : null))
  .refine(
    (val) => {
      if (!val) return true;
      if (val.startsWith("/uploads/") || val.startsWith("/api/uploads/")) return true;
      try {
        const parsed = new URL(val);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL bukti harus berupa http://, https://, atau path upload yang valid." }
  );

export const createDealSchema = z
  .object({
    brandName: z.string().trim().min(2, "Nama brand minimal 2 karakter").max(100),
    category: z.enum(DEAL_CATEGORIES),
    title: z.string().trim().min(4, "Judul promo minimal 4 karakter").max(140),
    discountType: z.enum(DISCOUNT_TYPES),
    discountValue: z.coerce.number().int().min(1).max(100).nullable().optional(),
    description: z.string().trim().min(10, "Deskripsi promo minimal 10 karakter").max(1200),
    termsAndConditions: z.array(z.string().trim().min(2)).min(1, "Minimal 1 syarat & ketentuan"),
    claimWindow: z.string().trim().min(2, "Periode klaim wajib diisi").max(100),
    requiresApp: z.boolean().default(false),
    appName: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
    minRegistrationDays: z.coerce.number().int().min(0).max(365).nullable().optional(),
    requiresIdCard: z.boolean().default(true),
    minPurchaseIdr: z.coerce.number().int().min(0).max(10_000_000).default(0),
    locations: z.string().trim().min(2).max(150).default("Nasional (Seluruh Indonesia)"),
    submitterName: z
      .string()
      .trim()
      .max(60)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : "Anonim")),
    proofImageUrl: optionalTrimmedUrl,
    proofLinkUrl: optionalTrimmedUrl,
    outletLocation: z
      .string()
      .trim()
      .max(120)
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
    claimedDate: z
      .string()
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
    proofNotes: z
      .string()
      .trim()
      .max(500)
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
  })
  .superRefine((data, ctx) => {
    if (!data.proofImageUrl && !data.proofLinkUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["proofImageUrl"],
        message:
          "Bukti wajib dilampirkan: unggah screenshot/struk atau sertakan tautan sumber resmi/sosmed.",
      });
    }
    if (data.requiresApp && !data.appName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["appName"],
        message: "Sebutkan nama aplikasi jika promo mewajibkan registrasi aplikasi.",
      });
    }
  });

export const verifyDealSchema = z.object({
  voteType: z.enum(["STILL_WORKS", "EXPIRED_OR_CHANGED"]),
  comment: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  submitterName: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : "Kontributor")),
  outletLocation: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  proofImageUrl: optionalTrimmedUrl,
  proofLinkUrl: optionalTrimmedUrl,
});

export const moderateDealSchema = z.object({
  verificationStatus: z.enum(VERIFICATION_STATUSES),
});

export function formatIdr(amount: number): string {
  if (amount <= 0) return "Rp0 (Tanpa Min. Belanja)";
  return `Rp${amount.toLocaleString("id-ID")}`;
}

export function parseTermsJson(termsJson: string): string[] {
  try {
    const parsed = JSON.parse(termsJson);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
    return [];
  } catch {
    return termsJson
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

export function formatRelativeDays(date: Date | string, now: Date = new Date()): string {
  const target = typeof date === "string" ? new Date(date) : date;
  const diffMs = Math.max(0, now.getTime() - target.getTime());
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Baru saja";
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1 hari lalu";
  if (diffDays < 30) return `${diffDays} hari lalu`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} bulan lalu`;
}
