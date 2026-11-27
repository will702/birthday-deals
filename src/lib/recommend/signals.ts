import { prisma } from "@/lib/prisma";
import { ownerWhere, type Viewer } from "@/lib/visitor";

export const INTERACTION_TYPES = [
  "VIEW",
  "CLICK_SOURCE",
  "SAVE",
  "UNSAVE",
  "CLAIMED",
  "DISMISS",
] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const INTERACTION_WEIGHTS: Record<InteractionType, number> = {
  SAVE: 3,
  CLAIMED: 4,
  CLICK_SOURCE: 2,
  VIEW: 1,
  UNSAVE: -3,
  DISMISS: -4,
};

export const HALF_LIFE_DAYS = 30;
/** Weight (pre-decay) given to categories the user ticked in their profile. */
export const PREFERRED_CATEGORY_WEIGHT = 3;

export interface ProfileInput {
  birthdayDay: number | null;
  birthdayMonth: number | null;
  city: string | null;
  preferredCategories: string[];
  appOk: boolean;
}

export interface InteractionInput {
  dealId: string;
  type: string;
  createdAt: Date;
  category?: string | null;
  discountType?: string | null;
}

export interface PreferenceProfile {
  birthdayDay: number | null;
  birthdayMonth: number | null;
  city: string | null;
  appOk: boolean;
  preferredCategories: string[];
  /** Normalised to [-1, 1] (divided by the largest absolute weight). */
  categoryWeights: Record<string, number>;
  discountTypeAffinity: Record<string, number>;
  likedDealIds: string[];
  dismissedDealIds: string[];
  /** Deals with a positive signal (save / claimed / source click), used as CF seeds. */
  positiveDealIds: string[];
  interactionCount: number;
  hasProfileData: boolean;
}

export function decayFactor(ageDays: number, halfLifeDays = HALF_LIFE_DAYS): number {
  return Math.pow(0.5, Math.max(0, ageDays) / halfLifeDays);
}

function normalise(map: Record<string, number>): Record<string, number> {
  const max = Math.max(0, ...Object.values(map).map((v) => Math.abs(v)));
  if (max === 0) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) out[k] = v / max;
  return out;
}

export const EMPTY_PROFILE_INPUT: ProfileInput = {
  birthdayDay: null,
  birthdayMonth: null,
  city: null,
  preferredCategories: [],
  appOk: true,
};

/** Pure: folds a profile + interaction log into a preference profile. */
export function buildPreferenceProfile(
  profile: ProfileInput | null,
  interactions: InteractionInput[],
  now: Date = new Date(),
): PreferenceProfile {
  const p = profile ?? EMPTY_PROFILE_INPUT;
  const categories: Record<string, number> = {};
  const discountTypes: Record<string, number> = {};

  for (const c of p.preferredCategories) {
    categories[c] = (categories[c] ?? 0) + PREFERRED_CATEGORY_WEIGHT;
  }

  const sorted = [...interactions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const liked = new Set<string>();
  const dismissed = new Set<string>();
  const positive = new Set<string>();

  for (const ev of sorted) {
    const weight = INTERACTION_WEIGHTS[ev.type as InteractionType];
    if (weight === undefined) continue;
    const ageDays = (now.getTime() - ev.createdAt.getTime()) / 86_400_000;
    const w = weight * decayFactor(ageDays);
    if (ev.category) categories[ev.category] = (categories[ev.category] ?? 0) + w;
    if (ev.discountType) discountTypes[ev.discountType] = (discountTypes[ev.discountType] ?? 0) + w;

    // Chronological state machine: the latest decisive event wins.
    if (ev.type === "SAVE" || ev.type === "CLAIMED") {
      liked.add(ev.dealId);
      dismissed.delete(ev.dealId);
      positive.add(ev.dealId);
    } else if (ev.type === "CLICK_SOURCE") {
      positive.add(ev.dealId);
    } else if (ev.type === "UNSAVE") {
      liked.delete(ev.dealId);
    } else if (ev.type === "DISMISS") {
      dismissed.add(ev.dealId);
      liked.delete(ev.dealId);
    }
  }

  const hasProfileData =
    p.city !== null ||
    p.birthdayDay !== null ||
    p.birthdayMonth !== null ||
    p.preferredCategories.length > 0;

  return {
    birthdayDay: p.birthdayDay,
    birthdayMonth: p.birthdayMonth,
    city: p.city,
    appOk: p.appOk,
    preferredCategories: p.preferredCategories,
    categoryWeights: normalise(categories),
    discountTypeAffinity: normalise(discountTypes),
    likedDealIds: [...liked],
    dismissedDealIds: [...dismissed],
    positiveDealIds: [...positive].filter((id) => !dismissed.has(id)),
    interactionCount: interactions.length,
    hasProfileData,
  };
}

export async function loadPreferenceProfile(viewer: Viewer): Promise<PreferenceProfile> {
  const where = ownerWhere(viewer);
  const [profile, events] = await Promise.all([
    prisma.userProfile.findFirst({ where }),
    prisma.dealInteraction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        dealId: true,
        type: true,
        createdAt: true,
        deal: { select: { category: true, discountType: true } },
      },
    }),
  ]);

  return buildPreferenceProfile(
    profile,
    events.map((e) => ({
      dealId: e.dealId,
      type: e.type,
      createdAt: e.createdAt,
      category: e.deal.category,
      discountType: e.deal.discountType,
    })),
  );
}
