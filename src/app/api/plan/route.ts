import { NextResponse } from "next/server";
import { z } from "zod";
import { buildPlanFor, CATEGORIES, isValidBirthday } from "@/ai/deal-queries";
import { aiAvailable } from "@/ai/model";
import { generatePlanNarrative } from "@/ai/plan-narrative";
import { limitRequest } from "@/lib/rate-limit";

export const maxDuration = 30;

const bodySchema = z.object({
  day: z.number().int().min(1).max(31),
  /** 1-12 (January = 1). */
  month: z.number().int().min(1).max(12),
  city: z.string().trim().max(60).optional(),
  categories: z.array(z.enum(CATEGORIES)).max(5).optional(),
  narrative: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    if (!limitRequest(req, "plan", null, 20)) {
      return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
    }
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
        { status: 400 },
      );
    }
    const { day, month, city, categories, narrative } = parsed.data;
    if (!isValidBirthday(day, month)) {
      return NextResponse.json({ error: "Tanggal ulang tahun tidak valid." }, { status: 400 });
    }

    const plan = await buildPlanFor({ day, month, city: city || undefined, categories });

    let narrativeResult = null;
    if (narrative !== false && aiAvailable() && plan.deals.length > 0) {
      try {
        narrativeResult = await generatePlanNarrative(plan);
      } catch (err) {
        console.error("[api/plan] narasi gagal:", err instanceof Error ? err.message : err);
      }
    }

    return NextResponse.json({ plan, narrative: narrativeResult });
  } catch (err) {
    console.error("[api/plan POST]", err);
    return NextResponse.json({ error: "Gagal menyusun rencana." }, { status: 500 });
  }
}
