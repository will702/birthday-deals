import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const deal = await prisma.deal.findUnique({
      where: { slug },
      include: {
        proofs: { orderBy: { createdAt: "desc" } },
        verifications: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!deal) {
      return NextResponse.json({ error: "Promo tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ deal });
  } catch {
    return NextResponse.json({ error: "Gagal memuat detail promo." }, { status: 500 });
  }
}
