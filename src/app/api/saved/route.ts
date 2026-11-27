import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { limitRequest } from "@/lib/rate-limit";
import { ensureVisitor, getViewer, ownerWhere } from "@/lib/visitor";

const bodySchema = z.object({ dealId: z.string().min(1).max(64) });

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

export async function GET(req: Request) {
  try {
    const viewer = await getViewer({ create: false });
    if (!viewer || (!viewer.userId && !viewer.visitorId)) {
      return NextResponse.json({ dealIds: [] });
    }
    if (!limitRequest(req, "saved-get", viewer.visitorId, 60)) {
      return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
    }
    const rows = await prisma.savedDeal.findMany({
      where: ownerWhere(viewer),
      orderBy: { createdAt: "desc" },
      select: { dealId: true },
    });
    return NextResponse.json({ dealIds: rows.map((r) => r.dealId) });
  } catch (err) {
    console.error("[api/saved GET]", err);
    return NextResponse.json({ error: "Gagal memuat tersimpan." }, { status: 500 });
  }
}

async function handle(req: Request, mode: "save" | "unsave") {
  try {
    const viewer = await getViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Sesi tamu tidak tersedia." }, { status: 400 });
    }
    if (!limitRequest(req, "saved", viewer.visitorId, 60)) {
      return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
    }
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "dealId wajib diisi." }, { status: 400 });
    }
    const { dealId } = parsed.data;

    const deal = await prisma.deal.findUnique({ where: { id: dealId }, select: { id: true } });
    if (!deal) {
      return NextResponse.json({ error: "Promo tidak ditemukan." }, { status: 404 });
    }

    await ensureVisitor(viewer);
    const where = { ...ownerWhere(viewer), dealId };
    // User-owned rows carry userId only (visitorId null); anonymous rows carry visitorId with
    // userId null. Uniqueness is enforced by @@unique([userId, dealId]) and the partial unique
    // index in prisma/sql/post-push.sql.
    const owner = viewer.userId
      ? { userId: viewer.userId, visitorId: null }
      : { userId: null, visitorId: viewer.visitorId };

    if (mode === "save") {
      const existing = await prisma.savedDeal.findFirst({ where });
      if (!existing) {
        try {
          await prisma.savedDeal.create({ data: { ...owner, dealId } });
          await prisma.dealInteraction.create({
            data: { visitorId: viewer.visitorId, userId: viewer.userId, dealId, type: "SAVE" },
          });
        } catch (err) {
          if (!isUniqueViolation(err)) throw err; // concurrent save: already saved
        }
      }
    } else {
      const { count } = await prisma.savedDeal.deleteMany({ where });
      if (count > 0) {
        await prisma.dealInteraction.create({
          data: { visitorId: viewer.visitorId, userId: viewer.userId, dealId, type: "UNSAVE" },
        });
      }
    }
    return NextResponse.json({ ok: true, saved: mode === "save" });
  } catch (err) {
    console.error("[api/saved]", err);
    return NextResponse.json({ error: "Gagal memperbarui tersimpan." }, { status: 500 });
  }
}

export const POST = (req: Request) => handle(req, "save");
export const DELETE = (req: Request) => handle(req, "unsave");
