import type { Prisma } from "@prisma/client";
import type { DealSummaryDto } from "@/lib/deal-types";
import { parseTermsJson } from "@/lib/validation";

/** Prisma `include` needed by toDealSummaryDto. */
export const dealSummaryInclude = {
  _count: { select: { proofs: true, verifications: true } },
  proofs: {
    take: 1,
    orderBy: { createdAt: "desc" },
    select: { proofImageUrl: true },
  },
} satisfies Prisma.DealInclude;

export type DealWithSummaryRelations = Prisma.DealGetPayload<{
  include: typeof dealSummaryInclude;
}>;

export function toDealSummaryDto(d: DealWithSummaryRelations): DealSummaryDto {
  return {
    id: d.id,
    slug: d.slug,
    brandName: d.brandName,
    brandLogoUrl: d.brandLogoUrl,
    category: d.category,
    title: d.title,
    discountType: d.discountType,
    discountValue: d.discountValue,
    description: d.description,
    termsAndConditions: parseTermsJson(d.termsAndConditions),
    claimWindow: d.claimWindow,
    requiresApp: d.requiresApp,
    appName: d.appName,
    minRegistrationDays: d.minRegistrationDays,
    requiresIdCard: d.requiresIdCard,
    minPurchaseIdr: d.minPurchaseIdr,
    locations: d.locations,
    sourceUrl: d.sourceUrl,
    sourceType: d.sourceType,
    verificationStatus: d.verificationStatus,
    validYear: d.validYear,
    stillWorksCount: d.stillWorksCount,
    expiredReportCount: d.expiredReportCount,
    freshnessScore: d.freshnessScore,
    lastScrapedAt: d.lastScrapedAt ? d.lastScrapedAt.toISOString() : null,
    lastVerifiedAt: d.lastVerifiedAt.toISOString(),
    createdAt: d.createdAt.toISOString(),
    proofCount: d._count.proofs,
    verificationCount: d._count.verifications,
    latestProofImageUrl: d.proofs[0]?.proofImageUrl ?? null,
  };
}
