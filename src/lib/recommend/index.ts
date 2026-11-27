import { todayInJakarta } from "@/lib/birthday";
import { prisma } from "@/lib/prisma";
import { dealSummaryInclude, toDealSummaryDto } from "@/lib/deal-dto";
import type { DealSummaryDto } from "@/lib/deal-types";
import type { Viewer } from "@/lib/visitor";
import { collaborativeCandidates } from "./collaborative";
import { scoreDealContent, type ScorableDeal } from "./content";
import { centroidSimilarity } from "./embeddings";
import { loadPreferenceProfile, type PreferenceProfile } from "./signals";

export interface RecommendationDto {
  deal: DealSummaryDto;
  score: number;
  reasons: string[];
}

export const BLEND_WEIGHTS = { content: 0.5, embedding: 0.3, cf: 0.2 } as const;

export type ComponentName = keyof typeof BLEND_WEIGHTS;

/** Renormalises weights over the components that are available (non-null). */
export function renormalizeWeights(
  available: Partial<Record<ComponentName, boolean>>,
  base: Record<ComponentName, number> = BLEND_WEIGHTS,
): Record<ComponentName, number> {
  const active = (Object.keys(base) as ComponentName[]).filter((k) => available[k]);
  const total = active.reduce((sum, k) => sum + base[k], 0);
  const out = { content: 0, embedding: 0, cf: 0 } as Record<ComponentName, number>;
  if (total === 0) return out;
  for (const k of active) out[k] = base[k] / total;
  return out;
}

/** Blends per-component score maps (each already in 0..1). Unavailable components are null. */
export function blendScores(
  components: Partial<Record<ComponentName, Map<string, number> | null>>,
  base: Record<ComponentName, number> = BLEND_WEIGHTS,
): Map<string, number> {
  const weights = renormalizeWeights(
    {
      content: Boolean(components.content),
      embedding: Boolean(components.embedding),
      cf: Boolean(components.cf),
    },
    base,
  );
  const ids = new Set<string>();
  for (const m of Object.values(components)) if (m) for (const id of m.keys()) ids.add(id);

  const out = new Map<string, number>();
  for (const id of ids) {
    let s = 0;
    for (const name of Object.keys(weights) as ComponentName[]) {
      s += weights[name] * (components[name]?.get(id) ?? 0);
    }
    out.set(id, s);
  }
  return out;
}

/** Cold start ranking: community popularity + freshness. */
export function popularityScore(deal: {
  freshnessScore: number;
  stillWorksCount: number;
  expiredReportCount: number;
  proofCount: number;
  verificationStatus: string;
}): number {
  if (deal.verificationStatus === "EXPIRED") return 0;
  const pop = Math.min(1, (deal.stillWorksCount + deal.proofCount - deal.expiredReportCount) / 10);
  const fresh = Math.min(1, Math.max(0, deal.freshnessScore / 100));
  const penalty = deal.verificationStatus === "STALE" ? 0.3 : 0;
  return Math.max(0, 0.55 * fresh + 0.45 * Math.max(0, pop) - penalty);
}

function normaliseMap(m: Map<string, number>): Map<string, number> {
  const max = Math.max(0, ...m.values());
  if (max === 0) return m;
  return new Map([...m].map(([k, v]) => [k, v / max]));
}

export function isColdStart(profile: PreferenceProfile): boolean {
  return profile.interactionCount === 0 && !profile.hasProfileData;
}

export async function recommendFor(input: {
  visitorId: string;
  userId: string | null;
  limit?: number;
}): Promise<{ items: RecommendationDto[]; coldStart: boolean }> {
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 30);
  const viewer: Viewer = { visitorId: input.visitorId, userId: input.userId };
  const now = todayInJakarta();

  const [profile, deals] = await Promise.all([
    loadPreferenceProfile(viewer),
    prisma.deal.findMany({
      where: { verificationStatus: { not: "EXPIRED" } },
      orderBy: [{ freshnessScore: "desc" }, { stillWorksCount: "desc" }],
      take: 400,
      include: dealSummaryInclude,
    }),
  ]);

  const dismissed = new Set(profile.dismissedDealIds);
  const candidates = deals.filter((d) => !dismissed.has(d.id));
  const byId = new Map(candidates.map((d) => [d.id, d]));
  const cold = isColdStart(profile);

  if (cold) {
    const ranked = candidates
      .map((d) => ({
        d,
        score: popularityScore({ ...d, proofCount: d._count.proofs }),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return {
      coldStart: true,
      items: ranked.map(({ d, score }) => ({
        deal: toDealSummaryDto(d),
        score,
        reasons: [d.stillWorksCount >= 3 ? "Populer di komunitas" : "Promo segar dan terverifikasi"],
      })),
    };
  }

  const reasonsById = new Map<string, string[]>();
  const contentMap = new Map<string, number>();
  for (const d of candidates) {
    const scorable: ScorableDeal = d;
    const res = scoreDealContent(scorable, profile, now);
    if (res.excluded) continue;
    contentMap.set(d.id, res.score);
    reasonsById.set(d.id, res.reasons);
  }

  const [embHits, cfHits] = await Promise.all([
    centroidSimilarity(profile.likedDealIds, 40, profile.dismissedDealIds),
    collaborativeCandidates(profile.positiveDealIds, profile.dismissedDealIds, 40),
  ]);

  const embMap = embHits.length
    ? new Map(embHits.map((h) => [h.dealId, Math.max(0, h.similarity)]))
    : null;
  const cfMap = cfHits.length ? normaliseMap(new Map(cfHits.map((h) => [h.dealId, h.count]))) : null;

  if (embMap) {
    for (const [id, sim] of embMap) {
      if (sim >= 0.45) reasonsById.set(id, [...(reasonsById.get(id) ?? []), "Mirip promo yang kamu simpan"]);
    }
  }
  if (cfMap) {
    for (const id of cfMap.keys()) {
      reasonsById.set(id, [...(reasonsById.get(id) ?? []), "Disukai pengguna dengan selera serupa"]);
    }
  }

  const blended = blendScores({ content: contentMap, embedding: embMap, cf: cfMap });
  const items = [...blended.entries()]
    .filter(([id]) => byId.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, score]) => ({
      deal: toDealSummaryDto(byId.get(id)!),
      score,
      reasons: [...new Set(reasonsById.get(id) ?? [])].slice(0, 3),
    }));

  return { items, coldStart: false };
}
