import type { Prisma } from "@prisma/client";
import { canonicalCity, parseCities, NATIONWIDE } from "@/lib/cities";
import { buildBirthdayPlan, type BirthdayPlan, type PlanDealInput } from "@/lib/birthday-plan";
import { prisma } from "@/lib/prisma";
import { recommendFor } from "@/lib/recommend";
import { searchByText, similarDeals } from "@/lib/recommend/embeddings";
import type { Viewer } from "@/lib/visitor";

/** Read-only deal queries shared by chat tools and the MCP server. Outputs are compact on purpose. */

export const CATEGORIES = [
  "F&B",
  "Drink & Cafe",
  "Cinema & Entertainment",
  "Beauty & Retail",
  "Other",
] as const;

export const DISCOUNT_TYPES = [
  "FREE_100",
  "DISCOUNT_PERCENT",
  "FREE_ITEM_WITH_PURCHASE",
  "VOUCHER",
  "BOGO",
] as const;

export interface CompactDeal {
  slug: string;
  url: string;
  brand: string;
  title: string;
  category: string;
  discount: string;
  claimWindow: string;
  requiresApp: boolean;
  appName: string | null;
  minRegistrationDays: number | null;
  requiresIdCard: boolean;
  minPurchaseIdr: number;
  cities: string[];
  status: string;
  summary: string;
  reasons?: string[];
}

interface DealLike {
  slug: string;
  brandName: string;
  title: string;
  category: string;
  discountType: string;
  discountValue: number | null;
  description: string;
  claimWindow: string;
  requiresApp: boolean;
  appName: string | null;
  minRegistrationDays: number | null;
  requiresIdCard: boolean;
  minPurchaseIdr: number;
  locations: string;
  cities?: string[];
  verificationStatus: string;
}

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function discountLabel(type: string, value: number | null): string {
  if (type === "FREE_100" || value === 100) return "Gratis 100%";
  if (type === "DISCOUNT_PERCENT" && value) return `Diskon ${value}%`;
  if (type === "BOGO") return "Beli 1 gratis 1";
  if (type === "FREE_ITEM_WITH_PURCHASE") return "Item gratis dengan pembelian";
  if (type === "VOUCHER") return "Voucher ulang tahun";
  return "Promo ulang tahun";
}

export function toCompactDeal(d: DealLike, reasons?: string[]): CompactDeal {
  const cities = d.cities && d.cities.length > 0 ? d.cities : parseCities(d.locations);
  return {
    slug: d.slug,
    url: `/deals/${d.slug}`,
    brand: d.brandName,
    title: truncate(d.title, 120),
    category: d.category,
    discount: discountLabel(d.discountType, d.discountValue),
    claimWindow: d.claimWindow,
    requiresApp: d.requiresApp,
    appName: d.appName,
    minRegistrationDays: d.minRegistrationDays,
    requiresIdCard: d.requiresIdCard,
    minPurchaseIdr: d.minPurchaseIdr,
    cities,
    status: d.verificationStatus,
    summary: truncate(d.description, 200),
    ...(reasons && reasons.length > 0 ? { reasons } : {}),
  };
}

export interface SearchFilters {
  category?: string;
  city?: string;
  discountType?: string;
  freeOnly?: boolean;
  noMinPurchase?: boolean;
}

/** SQL filters shared by semantic and keyword search. Expired deals are always excluded. */
export function buildDealWhere(f: SearchFilters): Prisma.DealWhereInput {
  const where: Prisma.DealWhereInput = { verificationStatus: { not: "EXPIRED" } };
  if (f.category) where.category = f.category;
  if (f.freeOnly) where.discountType = "FREE_100";
  else if (f.discountType) where.discountType = f.discountType;
  if (f.noMinPurchase) where.minPurchaseIdr = 0;
  const city = canonicalCity(f.city);
  if (city) {
    // cities = [] (not yet backfilled) counts as nationwide.
    where.OR = [{ cities: { hasSome: [city, NATIONWIDE] } }, { cities: { isEmpty: true } }];
  }
  return where;
}

export function keywordTerms(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9&]+/i)
        .filter((t) => t.length >= 3),
    ),
  ].slice(0, 5);
}

function keywordWhere(terms: string[]): Prisma.DealWhereInput {
  return {
    OR: terms.flatMap((t) => [
      { brandName: { contains: t, mode: "insensitive" as const } },
      { title: { contains: t, mode: "insensitive" as const } },
      { description: { contains: t, mode: "insensitive" as const } },
      { appName: { contains: t, mode: "insensitive" as const } },
      { tags: { has: t } },
    ]),
  };
}

export interface SearchDealsInput extends SearchFilters {
  query?: string;
  limit?: number;
}

export function clampLimit(limit: number | undefined, fallback = 5, max = 10): number {
  if (!limit || !Number.isFinite(limit)) return fallback;
  return Math.min(Math.max(Math.floor(limit), 1), max);
}

/** Semantic search (when a query is given) merged with SQL filters, keyword fallback fills the rest. */
export async function searchDealsCore(input: SearchDealsInput): Promise<{ deals: CompactDeal[] }> {
  const limit = clampLimit(input.limit);
  const filters = buildDealWhere(input);
  const query = input.query?.trim() ?? "";
  const ordered: CompactDeal[] = [];
  const seen = new Set<string>();
  const push = (rows: Array<DealLike & { id: string }>) => {
    for (const r of rows) {
      if (seen.has(r.id) || ordered.length >= limit) continue;
      seen.add(r.id);
      ordered.push(toCompactDeal(r));
    }
  };

  if (query) {
    const hits = await searchByText(query, limit * 3);
    if (hits.length > 0) {
      const rows = await prisma.deal.findMany({
        where: { AND: [filters, { id: { in: hits.map((h) => h.dealId) } }] },
      });
      const rank = new Map(hits.map((h, i) => [h.dealId, i]));
      rows.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
      push(rows);
    }
    if (ordered.length < limit) {
      const terms = keywordTerms(query);
      if (terms.length > 0) {
        const rows = await prisma.deal.findMany({
          where: { AND: [filters, keywordWhere(terms)] },
          orderBy: [{ freshnessScore: "desc" }, { stillWorksCount: "desc" }],
          take: limit * 2,
        });
        push(rows);
      }
    }
  } else {
    const rows = await prisma.deal.findMany({
      where: filters,
      orderBy: [{ freshnessScore: "desc" }, { stillWorksCount: "desc" }],
      take: limit,
    });
    push(rows);
  }

  return { deals: ordered };
}

export interface DealDetailCompact extends CompactDeal {
  terms: string[];
  locations: string;
  sourceUrl: string | null;
}

export async function getDealCore(slug: string): Promise<{ deal: DealDetailCompact | null }> {
  const row = await prisma.deal.findUnique({ where: { slug } });
  if (!row) return { deal: null };
  let terms: string[] = [];
  try {
    const parsed: unknown = JSON.parse(row.termsAndConditions);
    if (Array.isArray(parsed)) terms = parsed.filter((t): t is string => typeof t === "string");
  } catch {
    terms = [];
  }
  return {
    deal: {
      ...toCompactDeal(row),
      terms: terms.slice(0, 5).map((t) => truncate(t, 140)),
      locations: truncate(row.locations, 160),
      sourceUrl: row.sourceUrl,
    },
  };
}

export async function recommendCore(
  viewer: Viewer | null,
  limit?: number,
): Promise<{ deals: CompactDeal[]; personalized: boolean }> {
  const n = clampLimit(limit, 5, 10);
  if (!viewer) {
    const { deals } = await searchDealsCore({ limit: n });
    return { deals, personalized: false };
  }
  const { items, coldStart } = await recommendFor({
    visitorId: viewer.visitorId,
    userId: viewer.userId,
    limit: n,
  });
  return {
    personalized: !coldStart,
    deals: items.map((i) => toCompactDeal({ ...i.deal }, i.reasons)),
  };
}

export async function similarCore(slug: string, limit?: number): Promise<{ deals: CompactDeal[] }> {
  const base = await prisma.deal.findUnique({ where: { slug }, select: { id: true } });
  if (!base) return { deals: [] };
  const hits = await similarDeals(base.id, clampLimit(limit, 5, 10));
  if (hits.length === 0) return { deals: [] };
  const rows = await prisma.deal.findMany({ where: { id: { in: hits.map((h) => h.dealId) } } });
  const rank = new Map(hits.map((h, i) => [h.dealId, i]));
  rows.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  return { deals: rows.map((r) => toCompactDeal(r)) };
}

export interface PlanInput {
  /** Day of month, 1-31. */
  day: number;
  /** Month, 1-12 (human numbering, January = 1). */
  month: number;
  city?: string;
  categories?: string[];
  today?: Date;
}

export { isValidBirthday } from "@/lib/birthday";

export async function loadPlanDeals(input: Pick<PlanInput, "city" | "categories">): Promise<PlanDealInput[]> {
  const where: Prisma.DealWhereInput = buildDealWhere({ city: input.city });
  if (input.categories && input.categories.length > 0) where.category = { in: input.categories };
  const rows = await prisma.deal.findMany({
    where,
    orderBy: [{ freshnessScore: "desc" }, { stillWorksCount: "desc" }],
    take: 40,
  });
  return rows.map((d) => ({
    slug: d.slug,
    brandName: d.brandName,
    title: truncate(d.title, 120),
    category: d.category,
    claimWindow: d.claimWindow,
    minRegistrationDays: d.minRegistrationDays,
    requiresApp: d.requiresApp,
    appName: d.appName,
    requiresIdCard: d.requiresIdCard,
    minPurchaseIdr: d.minPurchaseIdr,
  }));
}

/** Builds the deterministic birthday schedule from live deals. */
export async function buildPlanFor(input: PlanInput): Promise<BirthdayPlan> {
  const deals = await loadPlanDeals(input);
  return buildBirthdayPlan({ day: input.day, month: input.month - 1, today: input.today, deals });
}

/** Compact form for LLM tools / MCP: drops the empty days and the per-deal window list. */
export function compactPlan(plan: BirthdayPlan) {
  return {
    birthday: plan.birthday,
    daysUntil: plan.daysUntil,
    days: plan.days
      .filter((d) => d.items.length > 0 || d.isBirthday)
      .slice(0, 20)
      .map((d) => ({
        date: d.date,
        label: d.label,
        items: d.items.slice(0, 6).map((i) => ({
          kind: i.kind,
          slug: i.dealSlug,
          brand: i.brandName,
          text: i.text,
        })),
      })),
    dealCount: plan.deals.length,
  };
}

export async function planBirthdayCore(input: PlanInput) {
  return compactPlan(await buildPlanFor(input));
}
