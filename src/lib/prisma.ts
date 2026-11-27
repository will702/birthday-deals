import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const log: ("warn" | "error")[] =
  process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];

function createClient(): PrismaClient {
  // Escape hatch: plain TCP connection through Prisma's own engine.
  if (process.env.PRISMA_NO_ADAPTER === "1") return new PrismaClient({ log });

  // Neon over WebSocket (HTTPS/443) instead of Postgres TCP (5432).
  neonConfig.webSocketConstructor = ws;
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter, log });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
