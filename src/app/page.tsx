import { Suspense } from "react";
import { connection } from "next/server";
import { DealsExplorer } from "@/components/DealsExplorer";
import type { DealSummaryDto } from "@/lib/deal-types";
import { prisma } from "@/lib/prisma";
import { parseTermsJson } from "@/lib/validation";

function DirectorySkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="pt-10 sm:pt-14 pb-8 max-w-3xl space-y-4">
        <div className="h-12 w-[22rem] max-w-full rounded-lg skeleton" />
        <div className="h-4 w-2/3 rounded-md skeleton" />
        <div className="h-4 w-1/2 rounded-md skeleton" />
      </div>
      <div className="border-y border-hairline py-4 space-y-3">
        <div className="h-10 w-full rounded-lg skeleton" />
        <div className="h-8 w-2/3 rounded-full skeleton" />
      </div>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="h-[22rem] rounded-2xl border border-hairline bg-surface p-5 space-y-3"
          >
            <div className="flex justify-between">
              <div className="h-4 w-28 rounded-md skeleton" />
              <div className="h-4 w-20 rounded-md skeleton" />
            </div>
            <div className="h-10 w-24 rounded-md skeleton" />
            <div className="h-4 w-4/5 rounded-md skeleton" />
            <div className="h-4 w-3/5 rounded-md skeleton" />
            <div className="h-12 w-full rounded-md skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function DealsDirectoryLoader() {
  await connection();
  const now = new Date();

  const [deals, latestRun] = await Promise.all([
    prisma.deal.findMany({
      orderBy: [{ freshnessScore: "desc" }, { stillWorksCount: "desc" }],
      include: {
        _count: {
          select: { proofs: true, verifications: true },
        },
        proofs: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { proofImageUrl: true },
        },
      },
    }),
    prisma.scrapeRun.findFirst({
      where: { status: { in: ["SUCCESS", "PARTIAL"] } },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    }),
  ]);

  const serializedDeals: DealSummaryDto[] = deals.map((d) => ({
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
  }));

  return (
    <DealsExplorer
      initialDeals={serializedDeals}
      nowIso={now.toISOString()}
      lastScrapedIso={latestRun?.completedAt ? latestRun.completedAt.toISOString() : null}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<DirectorySkeleton />}>
      <DealsDirectoryLoader />
    </Suspense>
  );
}
