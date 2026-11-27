import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyClassification,
  applySummary,
  classificationSchema,
  classifyDeal,
  dedupeCandidates,
  reviewDeal,
  reviewQueue,
  summarizeDeal,
} from "@/ai/admin-tools";
import { aiAvailable } from "@/ai/model";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

export const maxDuration = 60;

const id = z.string().min(1).max(60);

const adminAiSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("dedupe") }),
  z.object({ action: z.literal("queue") }),
  z.object({ action: z.literal("classify"), id }),
  z.object({ action: z.literal("applyClassification"), id, value: classificationSchema }),
  z.object({ action: z.literal("summarize"), id }),
  z.object({ action: z.literal("applySummary"), id, description: z.string().min(10).max(400) }),
  z.object({ action: z.literal("review"), id, decision: z.enum(["approve", "reject"]) }),
]);

export async function POST(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Admin token tidak valid." }, { status: 401 });
  }
  if (!rateLimit(`admin-ai:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
  }

  const parsed = adminAiSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Parameter tidak valid." }, { status: 400 });
  }
  const body = parsed.data;

  try {
    switch (body.action) {
      case "dedupe":
        return NextResponse.json(await dedupeCandidates());
      case "queue":
        return NextResponse.json(await reviewQueue());
      case "classify":
      case "summarize": {
        if (!aiAvailable()) {
          return NextResponse.json({ error: "AI Gateway belum dikonfigurasi." }, { status: 503 });
        }
        const result =
          body.action === "classify" ? await classifyDeal(body.id) : await summarizeDeal(body.id);
        if (!result) return NextResponse.json({ error: "Promo tidak ditemukan." }, { status: 404 });
        return NextResponse.json({ preview: result });
      }
      case "applyClassification":
      case "applySummary":
      case "review": {
        const ok =
          body.action === "applyClassification"
            ? await applyClassification(body.id, body.value)
            : body.action === "applySummary"
              ? await applySummary(body.id, body.description)
              : await reviewDeal(body.id, body.decision);
        if (!ok) return NextResponse.json({ error: "Promo tidak ditemukan." }, { status: 404 });
        revalidatePath("/");
        return NextResponse.json({ ok: true });
      }
    }
  } catch (err) {
    console.error("[api/admin/ai]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Gagal menjalankan aksi AI." }, { status: 500 });
  }
}
