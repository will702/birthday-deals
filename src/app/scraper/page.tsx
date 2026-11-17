import { Suspense } from "react";
import { connection } from "next/server";
import { ScraperDashboard } from "@/components/ScraperDashboard";
import type { ScrapeRunDto } from "@/lib/deal-types";
import { prisma } from "@/lib/prisma";

function ScraperSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-hairline skeleton" />
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-hairline skeleton" />
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
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="font-serif text-display-lg text-ink">
          Scraper multi-sumber &amp; pengecekan kesegaran
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2">
          Pantau jalannya pengambilan data otomatis dari situs brand resmi
          Indonesia, agregator promo, web discovery, serta pengecekan kesehatan
          tautan agar daftar selalu mutakhir.
        </p>
      </div>

      <Suspense fallback={<ScraperSkeleton />}>
        <ScraperLoader />
      </Suspense>
    </div>
  );
}
