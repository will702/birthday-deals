import { NextResponse } from "next/server";
import { buildPlanFor, isValidBirthday } from "@/ai/deal-queries";
import { buildPlanIcs } from "@/lib/ics";
import { limitRequest } from "@/lib/rate-limit";

/** GET /api/plan/ics?day=15&month=8&city=Jakarta (month is 1-12). */
export async function GET(req: Request) {
  try {
    if (!limitRequest(req, "plan-ics", null, 20)) {
      return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
    }
    const url = new URL(req.url);
    const day = Number(url.searchParams.get("day"));
    const month = Number(url.searchParams.get("month"));
    if (!isValidBirthday(day, month)) {
      return NextResponse.json({ error: "Tanggal ulang tahun tidak valid." }, { status: 400 });
    }
    const city = url.searchParams.get("city")?.trim().slice(0, 60) || undefined;

    const plan = await buildPlanFor({ day, month, city });
    const ics = buildPlanIcs(plan, { baseUrl: url.origin });
    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="rencana-ulang-tahun.ics"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/plan/ics GET]", err);
    return NextResponse.json({ error: "Gagal membuat file kalender." }, { status: 500 });
  }
}
