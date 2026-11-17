import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "proofs");
const SAFE_FILENAME_RE = /^proof-[\w-]+\.(jpg|png|webp)$/;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  if (!SAFE_FILENAME_RE.test(filename)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const ext = filename.split(".").pop() || "png";
  const filePath = path.join(UPLOAD_DIR, filename);

  try {
    const buffer = await fs.readFile(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}
