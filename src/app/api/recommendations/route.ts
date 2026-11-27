import { NextResponse } from "next/server";
import { recommendFor } from "@/lib/recommend";
import { limitRequest } from "@/lib/rate-limit";
import { getViewer } from "@/lib/visitor";

export async function GET(req: Request) {
  try {
    const viewer = await getViewer({ create: false });
    if (!viewer || !limitRequest(req, "reco", viewer.visitorId, 30)) {
      return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
    }
    const limitParam = Number(new URL(req.url).searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 8;
    const { items, coldStart } = await recommendFor({
      visitorId: viewer.visitorId,
      userId: viewer.userId,
      limit,
    });
    return NextResponse.json({ items, coldStart });
  } catch (err) {
    console.error("[api/recommendations]", err);
    return NextResponse.json({ error: "Gagal memuat rekomendasi." }, { status: 500 });
  }
}
