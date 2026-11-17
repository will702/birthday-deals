import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { moderateDealSchema } from "@/lib/validation";
import { computeFreshnessScore } from "@/scraper/normalizer";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    if (!isAdminAuthorized(req)) {
      return NextResponse.json({ error: "Admin token tidak valid." }, { status: 401 });
    }

    const { slug } = await params;
    const body = await req.json();
    const parsed = moderateDealSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Status moderasi tidak valid." }, { status: 400 });
    }

    const deal = await prisma.deal.findUnique({ where: { slug } });
    if (!deal) {
      return NextResponse.json({ error: "Promo tidak ditemukan." }, { status: 404 });
    }

    const now = new Date();
    const targetStatus = parsed.data.verificationStatus;
    const lastVerifiedAt = targetStatus === "ADMIN_VERIFIED" ? now : deal.lastVerifiedAt;
    const freshnessScore =
      targetStatus === "EXPIRED"
        ? 0
        : targetStatus === "ADMIN_VERIFIED"
          ? Math.max(95, computeFreshnessScore({
              lastVerifiedAt,
              lastScrapedAt: deal.lastScrapedAt,
              stillWorksCount: deal.stillWorksCount,
              expiredReportCount: deal.expiredReportCount,
              now,
            }))
          : computeFreshnessScore({
              lastVerifiedAt,
              lastScrapedAt: deal.lastScrapedAt,
              stillWorksCount: deal.stillWorksCount,
              expiredReportCount: deal.expiredReportCount,
              now,
            });

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: {
        verificationStatus: targetStatus,
        lastVerifiedAt,
        freshnessScore,
      },
      include: {
        proofs: { orderBy: { createdAt: "desc" } },
        verifications: { orderBy: { createdAt: "desc" } },
      },
    });

    revalidatePath("/");
    revalidatePath(`/deals/${slug}`);

    return NextResponse.json({ deal: updated });
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui status moderasi." }, { status: 500 });
  }
}
