import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isValidBirthday } from "@/lib/birthday";
import { limitRequest } from "@/lib/rate-limit";
import { ensureVisitor, getViewer, ownerWhere } from "@/lib/visitor";

const profileSchema = z.object({
  birthdayDay: z.number().int().min(1).max(31).nullable().optional(),
  birthdayMonth: z.number().int().min(0).max(11).nullable().optional(),
  city: z.string().trim().max(60).nullable().optional(),
  preferredCategories: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  appOk: z.boolean().optional(),
}).superRefine((v, ctx) => {
  const hasDay = typeof v.birthdayDay === "number";
  const hasMonth = typeof v.birthdayMonth === "number";
  if (hasDay !== hasMonth && (hasDay || hasMonth)) {
    ctx.addIssue({ code: "custom", message: "Tanggal dan bulan lahir harus diisi bersamaan." });
  } else if (hasDay && hasMonth && !isValidBirthday(v.birthdayDay!, v.birthdayMonth! + 1)) {
    ctx.addIssue({ code: "custom", message: "Tanggal ulang tahun tidak valid." });
  }
});

function toDto(
  p: {
    birthdayDay: number | null;
    birthdayMonth: number | null;
    city: string | null;
    preferredCategories: string[];
    appOk: boolean;
  } | null,
) {
  return {
    birthdayDay: p?.birthdayDay ?? null,
    birthdayMonth: p?.birthdayMonth ?? null,
    city: p?.city ?? null,
    preferredCategories: p?.preferredCategories ?? [],
    appOk: p?.appOk ?? true,
  };
}

export async function GET(req: Request) {
  try {
    const viewer = await getViewer({ create: false });
    if (!viewer) return NextResponse.json({ profile: toDto(null), signedIn: false });
    if (!limitRequest(req, "profile", viewer.visitorId, 60)) {
      return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
    }
    if (!viewer.userId && !viewer.visitorId) {
      return NextResponse.json({ profile: toDto(null), signedIn: false });
    }
    const profile = await prisma.userProfile.findFirst({ where: ownerWhere(viewer) });
    return NextResponse.json({ profile: toDto(profile), signedIn: Boolean(viewer.userId) });
  } catch (err) {
    console.error("[api/profile GET]", err);
    return NextResponse.json({ error: "Gagal memuat profil." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const viewer = await getViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Sesi tamu tidak tersedia." }, { status: 400 });
    }
    if (!limitRequest(req, "profile-put", viewer.visitorId, 30)) {
      return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
    }
    const parsed = profileSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
        { status: 400 },
      );
    }
    const data = {
      ...parsed.data,
      city: parsed.data.city === "" ? null : parsed.data.city,
    };

    await ensureVisitor(viewer);
    const existing = await prisma.userProfile.findFirst({ where: ownerWhere(viewer) });
    const saved = existing
      ? await prisma.userProfile.update({ where: { id: existing.id }, data })
      : await prisma.userProfile.create({
          data: {
            ...data,
            ...(viewer.userId
              ? { userId: viewer.userId, visitorId: null }
              : { visitorId: viewer.visitorId }),
          },
        });
    return NextResponse.json({ profile: toDto(saved) });
  } catch (err) {
    console.error("[api/profile PUT]", err);
    return NextResponse.json({ error: "Gagal menyimpan profil." }, { status: 500 });
  }
}
