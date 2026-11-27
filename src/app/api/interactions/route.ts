import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { limitRequest } from "@/lib/rate-limit";
import { ensureVisitor, getViewer } from "@/lib/visitor";

// SAVE/UNSAVE are written only by /api/saved so they always match SavedDeal state.
const interactionSchema = z.object({
  dealId: z.string().min(1).max(64),
  type: z.enum(["VIEW", "CLICK_SOURCE", "CLAIMED", "DISMISS"]),
});

export async function POST(req: Request) {
  try {
    const viewer = await getViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Sesi tamu tidak tersedia." }, { status: 400 });
    }
    if (!limitRequest(req, "interactions", viewer.visitorId, 60)) {
      return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const parsed = interactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
        { status: 400 },
      );
    }

    const deal = await prisma.deal.findUnique({
      where: { id: parsed.data.dealId },
      select: { id: true },
    });
    if (!deal) {
      return NextResponse.json({ error: "Promo tidak ditemukan." }, { status: 404 });
    }

    await ensureVisitor(viewer);
    await prisma.dealInteraction.create({
      data: {
        visitorId: viewer.visitorId,
        userId: viewer.userId,
        dealId: deal.id,
        type: parsed.data.type,
      },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[api/interactions]", err);
    return NextResponse.json({ error: "Gagal menyimpan interaksi." }, { status: 500 });
  }
}
