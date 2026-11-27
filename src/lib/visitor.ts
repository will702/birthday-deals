import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export const ANON_COOKIE = "uid_anon";
const ANON_MAX_AGE = 60 * 60 * 24 * 365;

export interface Viewer {
  visitorId: string;
  userId: string | null;
}

function secret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET belum diatur");
  }
  return "dev-insecure-secret";
}

function sign(id: string): string {
  return crypto.createHmac("sha256", secret()).update(id).digest("base64url");
}

export function signAnonId(id: string): string {
  return `${id}.${sign(id)}`;
}

/** Returns the visitor id when the signed cookie value is valid, otherwise null. */
export function verifyAnonCookie(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(id);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return crypto.timingSafeEqual(a, b) ? id : null;
}

/**
 * Moves everything owned by an anonymous visitor onto a signed-in user.
 * Idempotent: rows the user already owns win, duplicates are dropped.
 * Runs in a single transaction; Visitor.userId is updated last so a failed
 * merge is retried on the next write.
 */
export async function mergeVisitorIntoUser(visitorId: string, userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.dealInteraction.updateMany({
      where: { visitorId, userId: null },
      data: { userId },
    });

    const [saved, mine] = await Promise.all([
      tx.savedDeal.findMany({ where: { visitorId, userId: null }, select: { id: true, dealId: true } }),
      tx.savedDeal.findMany({ where: { userId }, select: { dealId: true } }),
    ]);
    const owned = new Set(mine.map((r) => r.dealId));
    const dupes = saved.filter((r) => owned.has(r.dealId)).map((r) => r.id);
    const moving = saved.filter((r) => !owned.has(r.dealId)).map((r) => r.id);
    if (dupes.length > 0) await tx.savedDeal.deleteMany({ where: { id: { in: dupes } } });
    if (moving.length > 0) {
      await tx.savedDeal.updateMany({
        where: { id: { in: moving } },
        data: { userId, visitorId: null },
      });
    }

    const [visitorProfile, userProfile] = await Promise.all([
      tx.userProfile.findUnique({ where: { visitorId } }),
      tx.userProfile.findUnique({ where: { userId } }),
    ]);
    if (visitorProfile && !visitorProfile.userId) {
      if (!userProfile) {
        await tx.userProfile.update({
          where: { id: visitorProfile.id },
          data: { userId, visitorId: null },
        });
      } else {
        await tx.userProfile.update({
          where: { id: userProfile.id },
          data: {
            birthdayDay: userProfile.birthdayDay ?? visitorProfile.birthdayDay,
            birthdayMonth: userProfile.birthdayMonth ?? visitorProfile.birthdayMonth,
            city: userProfile.city ?? visitorProfile.city,
            preferredCategories:
              userProfile.preferredCategories.length > 0
                ? userProfile.preferredCategories
                : visitorProfile.preferredCategories,
          },
        });
        await tx.userProfile.delete({ where: { id: visitorProfile.id } });
      }
    }

    await tx.visitor.upsert({
      where: { id: visitorId },
      create: { id: visitorId, userId },
      update: { userId },
    });
  });
}

async function currentUserId(): Promise<string | null> {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Cookie options shared by set/rotate. */
export const ANON_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ANON_MAX_AGE,
};

/** Fresh signed anonymous id + cookie value (used to rotate on sign-in / sign-out). */
export function newAnonCookie(): { id: string; value: string } {
  const id = crypto.randomUUID();
  return { id, value: signAnonId(id) };
}

/**
 * Resolves the current viewer without touching the database.
 * - `create: true` (default, use in write handlers): mints the signed cookie when missing.
 * - `create: false` (use in GET handlers): never sets a cookie; without one, visitorId is ""
 *   (matches no anonymous rows) and only a signed-in userId identifies the viewer.
 * Returns null only when a cookie had to be minted but could not be set.
 */
export async function getViewer(options: { create?: boolean } = {}): Promise<Viewer | null> {
  const jar = await cookies();
  let visitorId = verifyAnonCookie(jar.get(ANON_COOKIE)?.value);
  const userId = await currentUserId();

  if (!visitorId) {
    if (options.create === false) return { visitorId: "", userId };
    visitorId = crypto.randomUUID();
    try {
      jar.set(ANON_COOKIE, signAnonId(visitorId), ANON_COOKIE_OPTIONS);
    } catch {
      return null;
    }
  }
  return { visitorId, userId };
}

/**
 * Persists the Visitor row lazily (first write only) and merges anonymous data
 * into the signed-in user when that has not happened yet. Call from write handlers.
 */
export async function ensureVisitor(viewer: Viewer): Promise<void> {
  if (!viewer.visitorId) return;
  try {
    const existing = await prisma.visitor.findUnique({
      where: { id: viewer.visitorId },
      select: { userId: true, lastSeenAt: true },
    });
    if (!existing) {
      await prisma.visitor.create({ data: { id: viewer.visitorId } });
    } else if (Date.now() - existing.lastSeenAt.getTime() > 3_600_000) {
      await prisma.visitor.update({
        where: { id: viewer.visitorId },
        data: { lastSeenAt: new Date() },
      });
    }
    if (viewer.userId && existing?.userId !== viewer.userId) {
      await mergeVisitorIntoUser(viewer.visitorId, viewer.userId);
    }
  } catch (err) {
    console.error("[visitor] gagal sinkron visitor:", err);
  }
}

/**
 * Prisma `where` fragment selecting rows owned by the viewer. Anonymous viewers only
 * match rows that have not been claimed by a user (shared-device safety).
 */
export function ownerWhere(
  viewer: Viewer,
): { userId: string } | { visitorId: string; userId: null } {
  return viewer.userId
    ? { userId: viewer.userId }
    : { visitorId: viewer.visitorId, userId: null };
}
