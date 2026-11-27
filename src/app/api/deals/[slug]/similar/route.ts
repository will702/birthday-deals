import { NextResponse } from "next/server";
import { dealSummaryInclude, toDealSummaryDto } from "@/lib/deal-dto";
import { prisma } from "@/lib/prisma";
import { similarDeals } from "@/lib/recommend/embeddings";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const deal = await prisma.deal.findUnique({
      where: { slug },
      select: { id: true, category: true },
    });
    if (!deal) {
      return NextResponse.json({ error: "Promo tidak ditemukan." }, { status: 404 });
    }

    const hits = await similarDeals(deal.id, 6);
    let ids = hits.map((h) => h.dealId);

    // Fallback when embeddings are unavailable: same category, freshest first.
    if (ids.length === 0) {
      const fallback = await prisma.deal.findMany({
        where: {
          id: { not: deal.id },
          category: deal.category,
          verificationStatus: { not: "EXPIRED" },
        },
        orderBy: [{ freshnessScore: "desc" }, { stillWorksCount: "desc" }],
        take: 6,
        select: { id: true },
      });
      ids = fallback.map((d) => d.id);
    }

    const rows = await prisma.deal.findMany({
      where: { id: { in: ids } },
      include: dealSummaryInclude,
    });
    const order = new Map(ids.map((id, i) => [id, i]));
    rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return NextResponse.json({ items: rows.map(toDealSummaryDto) });
  } catch (err) {
    console.error("[api/deals/similar]", err);
    return NextResponse.json({ items: [] });
  }
}
