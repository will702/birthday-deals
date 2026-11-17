import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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

    return NextResponse.json({
      runs,
      summary: { totalDeals, activeDeals, staleDeals, expiredDeals },
    });
  } catch {
    return NextResponse.json({ error: "Gagal memuat log scraper." }, { status: 500 });
  }
}
