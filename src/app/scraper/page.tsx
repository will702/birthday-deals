import { Suspense } from "react";
import { connection } from "next/server";
import { ScraperDashboard } from "@/components/ScraperDashboard";
import type { ScrapeRunDto } from "@/lib/deal-types";
import { prisma } from "@/lib/prisma";

function ScraperSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded bg-[#E4DDD3]" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border border-[#E4DDD3] bg-white" />
        ))}
      </div>
      <div className="h-64 rounded-lg border border-[#E4DDD3] bg-white" />
    </div>
  );
}

async function ScraperLoader() {
  await connection();

  const [runs, totalDeals, activeDeals, staleDeals, expiredDeals] = await Promise.all([
    prisma.scrapeRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 25,
    }),
    prisma.deal.count(),
    prisma.deal.count({ where: { verificationStatus: { not: "EXPIRED" } } }),
    prisma.deal.count({ where: { verificationStatus: "STALE" } }),
    prisma.deal.count({ where: { verificationStatus: "EXPIRED" } }),
  ]);

  const serializedRuns: ScrapeRunDto[] = runs.map((r) => ({
    id: r.id,
    sourceName: r.sourceName,
    status: r.status,
    dealsFound: r.dealsFound,
    dealsUpdated: r.dealsUpdated,
    dealsCreated: r.dealsCreated,
    errorMessage: r.errorMessage,
    startedAt: r.startedAt.toISOString(),
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
  }));

  return (
    <ScraperDashboard
      initialRuns={serializedRuns}
      initialSummary={{ totalDeals, activeDeals, staleDeals, expiredDeals }}
    />
  );
}

export default function ScraperPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
      <div className="border-b border-[#E4DDD3] pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#18181B]">
          Scraper Multi-Sumber &amp; Pengecekan Kesegaran
        </h1>
        <p className="mt-1.5 text-sm text-[#52525B] max-w-2xl">
          Pantau jalannya pengambilan data otomatis dari situs brand resmi Indonesia, agregator promo, web discovery, serta pengecekan kesehatan tautan agar daftar selalu mutakhir.
        </p>
      </div>

      <Suspense fallback={<ScraperSkeleton />}>
        <ScraperLoader />
      </Suspense>
    </div>
  );
}
