import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createDealSchema } from "@/lib/validation";
import { computeFreshnessScore, slugifyBrandDeal } from "@/scraper/normalizer";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const discount = searchParams.get("discount")?.trim() || "";
    const requirement = searchParams.get("requirement")?.trim() || "";
    const windowFilter = searchParams.get("window")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "active";
    const sort = searchParams.get("sort")?.trim() || "freshness";

    const where: Prisma.DealWhereInput = {};

    if (q) {
      where.OR = [
        { brandName: { contains: q } },
        { title: { contains: q } },
        { description: { contains: q } },
        { appName: { contains: q } },
      ];
    }

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (discount === "free_100") {
      where.discountType = "FREE_100";
    } else if (discount === "discount_50_plus") {
      where.OR = [
        ...(where.OR ?? []),
        { discountType: "FREE_100" },
        { discountValue: { gte: 50 } },
        { discountType: "BOGO" },
      ];
      // Note: if q was also set, combine properly via AND
      if (q) {
        delete where.OR;
        where.AND = [
          {
            OR: [
              { brandName: { contains: q } },
              { title: { contains: q } },
              { description: { contains: q } },
              { appName: { contains: q } },
            ],
          },
          {
            OR: [
              { discountType: "FREE_100" },
              { discountValue: { gte: 50 } },
              { discountType: "BOGO" },
            ],
          },
        ];
      }
    } else if (discount === "no_min_spend") {
      where.minPurchaseIdr = 0;
    }

    if (requirement === "ktp_only") {
      where.requiresIdCard = true;
      where.requiresApp = false;
    } else if (requirement === "app_required") {
      where.requiresApp = true;
    }

    if (windowFilter === "hari_h") {
      where.claimWindow = { contains: "Hari H" };
    } else if (windowFilter === "week_around") {
      where.claimWindow = { contains: "H-" };
    } else if (windowFilter === "birth_month") {
      where.claimWindow = { contains: "Bulan" };
    }

    if (status === "active") {
      where.verificationStatus = { not: "EXPIRED" };
    } else if (status === "verified") {
      where.verificationStatus = { in: ["ADMIN_VERIFIED", "SCRAPER_VERIFIED"] };
    } else if (status === "community") {
      where.verificationStatus = "COMMUNITY_SUBMITTED";
    } else if (status === "needs_check") {
      where.verificationStatus = "STALE";
    } else if (status === "expired") {
      where.verificationStatus = "EXPIRED";
    }

    let orderBy: Prisma.DealOrderByWithRelationInput[] = [
      { freshnessScore: "desc" },
      { stillWorksCount: "desc" },
    ];
    if (sort === "discount") {
      orderBy = [{ discountValue: "desc" }, { freshnessScore: "desc" }];
    } else if (sort === "votes") {
      orderBy = [{ stillWorksCount: "desc" }, { freshnessScore: "desc" }];
    } else if (sort === "newest") {
      orderBy = [{ createdAt: "desc" }];
    }

    const [deals, totalActive, free100Count, verifiedCount] = await Promise.all([
      prisma.deal.findMany({
        where,
        orderBy,
        include: {
          _count: {
            select: { proofs: true, verifications: true },
          },
          proofs: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              proofImageUrl: true,
              proofLinkUrl: true,
              submitterName: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.deal.count({ where: { verificationStatus: { not: "EXPIRED" } } }),
      prisma.deal.count({
        where: { verificationStatus: { not: "EXPIRED" }, discountType: "FREE_100" },
      }),
      prisma.deal.count({
        where: { verificationStatus: { in: ["ADMIN_VERIFIED", "SCRAPER_VERIFIED"] } },
      }),
    ]);

    return NextResponse.json({
      deals,
      stats: { totalActive, free100Count, verifiedCount },
    });
  } catch (err) {
    console.error("GET /api/deals error:", err);
    return NextResponse.json({ error: "Gagal memuat daftar promo." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createDealSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Data tidak valid.",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const baseSlug = slugifyBrandDeal(input.brandName, input.title);
    let slug = baseSlug;
    let suffix = 2;
    while (await prisma.deal.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const now = new Date();
    const freshnessScore = computeFreshnessScore({
      lastVerifiedAt: now,
      stillWorksCount: 1,
      expiredReportCount: 0,
      now,
    });

    const discountValue =
      input.discountType === "FREE_100"
        ? 100
        : input.discountType === "BOGO" && !input.discountValue
          ? 50
          : (input.discountValue ?? null);

    const deal = await prisma.deal.create({
      data: {
        slug,
        brandName: input.brandName,
        category: input.category,
        title: input.title,
        discountType: input.discountType,
        discountValue,
        description: input.description,
        termsAndConditions: JSON.stringify(input.termsAndConditions),
        claimWindow: input.claimWindow,
        requiresApp: input.requiresApp,
        appName: input.requiresApp ? input.appName : null,
        minRegistrationDays: input.minRegistrationDays ?? null,
        requiresIdCard: input.requiresIdCard,
        minPurchaseIdr: input.minPurchaseIdr,
        locations: input.locations,
        sourceUrl: input.proofLinkUrl,
        sourceType: "COMMUNITY",
        verificationStatus: "COMMUNITY_SUBMITTED",
        validYear: now.getFullYear(),
        stillWorksCount: 1,
        expiredReportCount: 0,
        freshnessScore,
        lastVerifiedAt: now,
        proofs: {
          create: {
            submitterName: input.submitterName,
            proofImageUrl: input.proofImageUrl,
            proofLinkUrl: input.proofLinkUrl,
            outletLocation: input.outletLocation,
            claimedDate: input.claimedDate ? new Date(input.claimedDate) : now,
            notes:
              input.proofNotes ??
              "Temuan komunitas dikirim dengan bukti awal terlampir.",
            isApproved: true,
          },
        },
        verifications: {
          create: {
            voteType: "STILL_WORKS",
            comment: input.proofNotes ?? "Berhasil diklaim (laporan awal kontributor).",
            proofImageUrl: input.proofImageUrl,
            proofLinkUrl: input.proofLinkUrl,
            voterFingerprint: input.submitterName,
          },
        },
      },
      include: {
        proofs: true,
        verifications: true,
      },
    });

    revalidatePath("/");
    return NextResponse.json({ deal }, { status: 201 });
  } catch (err) {
    console.error("POST /api/deals error:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan temuan promo." },
      { status: 500 }
    );
  }
}
