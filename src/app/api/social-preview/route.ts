import { NextResponse } from "next/server";
import { z } from "zod";
import { extractSocialOrPageMetadata } from "@/scraper/adapters/social-metadata";

const previewSchema = z.object({
  url: z
    .string()
    .trim()
    .url("URL tidak valid")
    .refine((u) => u.startsWith("http://") || u.startsWith("https://"), {
      message: "URL harus diawali http:// atau https://",
    }),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = previewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "URL tidak valid" },
        { status: 400 }
      );
    }

    const meta = await extractSocialOrPageMetadata(parsed.data.url);
    return NextResponse.json(meta);
  } catch {
    return NextResponse.json(
      { error: "Gagal mengambil metadata tautan." },
      { status: 500 }
    );
  }
}
