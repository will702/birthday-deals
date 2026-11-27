import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { ANON_COOKIE, mergeVisitorIntoUser, verifyAnonCookie } from "@/lib/visitor";

function readCookie(header: string | null | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  session: {
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session, ctx) => {
          try {
            const raw = readCookie(ctx?.headers?.get("cookie"), ANON_COOKIE);
            const visitorId = verifyAnonCookie(raw);
            if (visitorId) await mergeVisitorIntoUser(visitorId, session.userId);
          } catch (err) {
            console.error("[auth] gagal menggabungkan data tamu:", err);
          }
        },
      },
    },
  },
  // nextCookies() must be the last plugin.
  plugins: [nextCookies()],
});
