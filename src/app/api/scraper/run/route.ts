import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { ScraperRunLockedError, runScraperPipeline } from "@/scraper/runner";

const runRequestSchema = z
  .object({
    sources: z.array(z.string()).optional(),
    runFreshness: z.boolean().optional(),
  })
  .optional();

// Scraping many pages can take minutes; the Vercel function must be allowed to run that long.
export const maxDuration = 300;

/**
 * Vercel Schedules cannot send custom headers, but send `Authorization: Bearer <CRON_SECRET>`
 * when CRON_SECRET is set. Fail-closed: unset/empty CRON_SECRET never authorizes.
 */
function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = req.headers.get("authorization");
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(`Bearer ${secret}`);
  if (a.length !== b.length) {
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!isAdminAuthorized(req) && !isCronAuthorized(req)) {
    return NextResponse.json({ error: "Admin token tidak valid." }, { status: 401 });
  }

  try {
    let body: unknown = undefined;
    try {
      body = await req.json();
    } catch {
      body = undefined;
    }

    const parsed = runRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Parameter scraper tidak valid." }, { status: 400 });
    }

    const result = await runScraperPipeline(parsed.data);
    revalidatePath("/");
    revalidatePath("/scraper");

    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof ScraperRunLockedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("POST /api/scraper/run error:", err);
    return NextResponse.json(
      { error: "Gagal menjalankan proses scraping." },
      { status: 500 }
    );
  }
}
