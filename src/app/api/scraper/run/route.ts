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

export async function POST(req: Request) {
  if (!isAdminAuthorized(req)) {
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
