import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyDealSchema } from "@/lib/validation";
import { computeFreshnessScore } from "@/scraper/normalizer";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const parsed = verifyDealSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input verifikasi tidak valid." },
        { status: 400 }
      );
    }

    const deal = await prisma.deal.findUnique({ where: { slug } });
    if (!deal) {
      return NextResponse.json({ error: "Promo tidak ditemukan." }, { status: 404 });
    }

    const data = parsed.data;
    const now = new Date();
    const isStillWorks = data.voteType === "STILL_WORKS";

    const nextStillWorks = deal.stillWorksCount + (isStillWorks ? 1 : 0);
    const nextExpiredReports = deal.expiredReportCount + (isStillWorks ? 0 : 1);
    const nextLastVerifiedAt = isStillWorks ? now : deal.lastVerifiedAt;

    let nextStatus = deal.verificationStatus;
    if (!isStillWorks && nextExpiredReports >= 3 && nextExpiredReports > nextStillWorks) {
      nextStatus = "EXPIRED";
    } else if (isStillWorks && (deal.verificationStatus === "STALE" || deal.verificationStatus === "EXPIRED")) {
      nextStatus = "COMMUNITY_SUBMITTED";
    }

    const nextFreshness = computeFreshnessScore({
      lastVerifiedAt: nextLastVerifiedAt,
      lastScrapedAt: deal.lastScrapedAt,
      stillWorksCount: nextStillWorks,
      expiredReportCount: nextExpiredReports,
      now,
    });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.dealVerification.create({
        data: {
          dealId: deal.id,
          voteType: data.voteType,
          comment: data.comment,
          proofImageUrl: data.proofImageUrl,
          proofLinkUrl: data.proofLinkUrl,
          voterFingerprint: data.submitterName,
        },
      });

      if (data.proofImageUrl || data.proofLinkUrl) {
        await tx.proofSubmission.create({
          data: {
            dealId: deal.id,
            submitterName: data.submitterName,
            proofImageUrl: data.proofImageUrl,
            proofLinkUrl: data.proofLinkUrl,
            outletLocation: data.outletLocation,
            claimedDate: now,
            notes:
              data.comment ??
              (isStillWorks
                ? "Konfirmasi berhasil diklaim dengan bukti baru."
                : "Laporan perubahan/kedaluwarsa dengan bukti."),
            isApproved: true,
          },
        });
      }

      return tx.deal.update({
        where: { id: deal.id },
        data: {
          stillWorksCount: nextStillWorks,
          expiredReportCount: nextExpiredReports,
          lastVerifiedAt: nextLastVerifiedAt,
          verificationStatus: nextStatus,
          freshnessScore: nextFreshness,
        },
        include: {
          proofs: { orderBy: { createdAt: "desc" } },
          verifications: { orderBy: { createdAt: "desc" } },
        },
      });
    });

    revalidatePath("/");
    revalidatePath(`/deals/${slug}`);

    return NextResponse.json({ deal: updated });
  } catch (err) {
    console.error("POST /api/deals/[slug]/verify error:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan verifikasi promo." },
      { status: 500 }
    );
  }
}
