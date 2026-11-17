import { NextResponse } from "next/server";
import { saveProofImage } from "@/lib/storage";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File gambar bukti tidak ditemukan." },
        { status: 400 }
      );
    }

    const saved = await saveProofImage(file);
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal menyimpan gambar bukti.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
