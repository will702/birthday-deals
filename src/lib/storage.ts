import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "proofs");
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function hasValidImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mimeType === "image/webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}

export async function saveProofImage(file: File): Promise<{ url: string; bytes: number }> {
  if (process.env.VERCEL) {
    // Vercel's filesystem is read-only/ephemeral; never write uploads to disk there.
    throw new Error(
      "Unggah gambar belum tersedia di deployment ini. Kirim tanpa gambar atau sertakan tautan bukti."
    );
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error("Format file tidak didukung. Gunakan JPG, PNG, atau WebP.");
  }
  if (file.size === 0) {
    throw new Error("File gambar kosong.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Ukuran gambar maksimal 5 MB.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (!hasValidImageSignature(buffer, file.type)) {
    throw new Error("Isi file bukan gambar JPG/PNG/WebP yang valid.");
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const fileName = `proof-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const fullPath = path.join(UPLOAD_DIR, fileName);
  await fs.writeFile(fullPath, buffer);

  return {
    url: `/api/uploads/${fileName}`,
    bytes: buffer.length,
  };
}
