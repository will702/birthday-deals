import { prisma } from "@/lib/prisma";

export const POSITIVE_TYPES = ["SAVE", "CLAIMED", "CLICK_SOURCE"];

export function cfMinInteractions(): number {
  const n = Number(process.env.RECO_CF_MIN);
  return Number.isFinite(n) && n > 0 ? n : 50;
}

const CF_WINDOW_DAYS = 180;
const COUNT_TTL_MS = 10 * 60 * 1000;
let countCache: { value: number; expiresAt: number } | null = null;

export function resetCfCountCache(): void {
  countCache = null;
}

/** Distinct (owner, deal) pairs with a positive interaction (last 180 days). Cached 10 minutes. */
export async function countPositiveInteractions(): Promise<number> {
  if (countCache && countCache.expiresAt > Date.now()) return countCache.value;
  try {
    const rows = await prisma.$queryRaw<Array<{ n: number }>>`
      SELECT COUNT(*)::int AS n FROM (
        SELECT DISTINCT COALESCE("userId", "visitorId") AS owner, "dealId"
        FROM "DealInteraction"
        WHERE type = ANY(${POSITIVE_TYPES}::text[])
          AND "createdAt" > NOW() - make_interval(days => ${CF_WINDOW_DAYS}::int)
      ) t`;
    const value = rows[0]?.n ?? 0;
    countCache = { value, expiresAt: Date.now() + COUNT_TTL_MS };
    return value;
  } catch {
    return 0;
  }
}

export interface CoHit {
  dealId: string;
  /** Number of distinct owners who interacted positively with both the seed and this deal. */
  count: number;
}

/**
 * Item-item co-occurrence: deals that other owners positively interacted with
 * alongside any of the seed deals. Returns [] when CF is disabled or on error.
 */
export async function collaborativeCandidates(
  seedIds: string[],
  excludeIds: string[] = [],
  k = 30,
  minPositive: number = cfMinInteractions(),
): Promise<CoHit[]> {
  if (seedIds.length === 0) return [];
  try {
    if ((await countPositiveInteractions()) < minPositive) return [];
    const exclude = [...new Set([...seedIds, ...excludeIds])];
    const rows = await prisma.$queryRaw<Array<{ dealId: string; cnt: number }>>`
      WITH pos AS (
        SELECT DISTINCT COALESCE("userId", "visitorId") AS owner, "dealId"
        FROM "DealInteraction"
        WHERE type = ANY(${POSITIVE_TYPES}::text[])
          AND "createdAt" > NOW() - make_interval(days => ${CF_WINDOW_DAYS}::int)
      )
      SELECT b."dealId" AS "dealId", COUNT(DISTINCT a.owner)::int AS cnt
      FROM pos a
      JOIN pos b ON a.owner = b.owner AND a."dealId" <> b."dealId"
      WHERE a."dealId" = ANY(${seedIds}::text[])
        AND NOT (b."dealId" = ANY(${exclude}::text[]))
      GROUP BY b."dealId"
      ORDER BY cnt DESC
      LIMIT ${k}`;
    return rows.map((r) => ({ dealId: r.dealId, count: Number(r.cnt) }));
  } catch (err) {
    console.error("[collaborative] gagal:", err instanceof Error ? err.message : err);
    return [];
  }
}
