/**
 * Deterministic (no AI) matching helpers for scraped deals: brand keys, title "core item"
 * tokens, duplicate detection, in-batch dedupe and brand-name cleanup.
 */
import { BRAND_SOURCES } from "./sources/brands";
import { SOCIAL_PUBLIC_HANDLES } from "./sources/social";

export const ZODIAC_NAMES = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "scorpion",
  "sagitarius",
  "sagittarius",
  "capricorn",
  "kaprikornus",
  "aquarius",
  "pisces",
] as const;

export const ZODIAC_RE = new RegExp(`\\b(?:${ZODIAC_NAMES.join("|")})\\b`, "i");

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// ---------------------------------------------------------------- brand key

const BRAND_NOISE = new Set([
  "indonesia",
  "id",
  "official",
  "group",
  "grup",
  "tbk",
  "pt",
  "outlet",
  "store",
  "the" /* only dropped when trailing, see brandTokens */,
]);

const LOCATION_WORDS = new Set([
  "jakarta",
  "bali",
  "bandung",
  "surabaya",
  "medan",
  "yogyakarta",
  "jogja",
  "semarang",
  "makassar",
  "bekasi",
  "tangerang",
  "depok",
  "bogor",
  "malang",
  "denpasar",
  "nasional",
]);

/** Single-word brand prefixes too generic to justify a prefix match. */
const GENERIC_BRAND_TOKENS = new Set([
  "the",
  "cafe",
  "resto",
  "restaurant",
  "kopi",
  "coffee",
  "bakery",
  "warung",
  "rumah",
  "house",
  "sushi",
  "ramen",
  "bakmi",
  "mie",
  "ayam",
  "bar",
  "grill",
  "steak",
  "pizza",
  "burger",
  "cinema",
  "bioskop",
]);

export function brandTokens(name: string): string[] {
  const base = stripDiacritics(name)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const tokens = base.split(" ").filter(Boolean);
  // Drop noise words (never a leading "the") and trailing location words.
  const kept = tokens.filter((t, i) => !(BRAND_NOISE.has(t) && !(t === "the" && i === 0)));
  while (kept.length > 1 && LOCATION_WORDS.has(kept[kept.length - 1])) kept.pop();
  if (kept.length === 0) return tokens;
  return kept;
}

export function brandKey(name: string): string {
  return brandTokens(name).join(" ");
}

export function brandsMatch(a: string, b: string): boolean {
  const ta = brandTokens(a);
  const tb = brandTokens(b);
  if (ta.length === 0 || tb.length === 0) return false;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (!short.every((t, i) => long[i] === t)) return false;
  if (short.length === long.length) return true;
  // Prefix match: shorter brand must carry a distinctive token and some length.
  const distinctive = short.filter((t) => !GENERIC_BRAND_TOKENS.has(t));
  return distinctive.length > 0 && short.join("").length >= 4;
}

// --------------------------------------------------------------- title core

const FILLER = new Set([
  "promo",
  "promosi",
  "birthday",
  "bday",
  "b'day",
  "treat",
  "treats",
  "ulang",
  "tahun",
  "ultah",
  "gift",
  "gifts",
  "hadiah",
  "deal",
  "deals",
  "spesial",
  "special",
  "untuk",
  "member",
  "members",
  "membership",
  "dan",
  "and",
  "di",
  "yang",
  "dengan",
  "dari",
  "ke",
  "the",
  "for",
  "your",
  "you",
  "anda",
  "kamu",
  "reward",
  "rewards",
  "surprise",
  "khusus",
  "exclusive",
  "eksklusif",
  "hingga",
  "up",
  "to",
  "get",
  "indonesia",
  "id",
  "hari",
  "bulan",
  "nikmati",
  "dapatkan",
  "berulang",
]);

const SYNONYMS: Record<string, string> = {
  free: "gratis",
  gratis: "gratis",
  cuma: "gratis",
  discount: "diskon",
  disc: "diskon",
  diskon: "diskon",
  off: "diskon",
  potongan: "diskon",
  bogo: "bogo",
};

/** Discount-kind tokens: compared separately, excluded from the core item set. */
const KIND_TOKENS = new Set(["gratis", "diskon", "bogo"]);

export interface TitleCore {
  /** Meaningful item tokens (brand, filler and discount words removed). */
  core: Set<string>;
  /** Normalized discount kinds present (gratis / diskon / bogo). */
  kinds: Set<string>;
}

export function titleCore(title: string, brandNames: string[] = []): TitleCore {
  let text = stripDiacritics(title)
    .toLowerCase()
    .replace(/\bbeli\s*1\s*gratis\s*1\b|\bbuy\s*1\s*get\s*1\b|\bb1g1\b/g, " bogo ")
    .replace(/rp\.?\s*[\d.,]+\s*(?:rb|ribu|k|jt|juta)?/g, " ")
    .replace(/\d+(?:[.,]\d+)?\s*%/g, " ")
    .replace(/cuma-cuma/g, " gratis ")
    .replace(/[^a-z0-9]+/g, " ");
  text = ` ${text.trim()} `;
  // Remove each brand as a contiguous phrase (never single tokens: "Sushi Tei" must keep "sushi").
  for (const b of brandNames) {
    const full = stripDiacritics(b).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    for (const phrase of [brandTokens(b), full]) {
      if (phrase.length === 0) continue;
      text = text.split(` ${phrase.join(" ")} `).join("  ");
      text = text.split(` ${phrase.join(" ")} `).join("  ");
    }
  }
  const core = new Set<string>();
  const kinds = new Set<string>();
  for (const raw of text.split(" ")) {
    if (!raw) continue;
    const t = SYNONYMS[raw] ?? raw;
    if (KIND_TOKENS.has(t)) {
      kinds.add(t);
      continue;
    }
    if (/^\d+$/.test(t) || t.length < 3 || FILLER.has(t)) continue;
    core.add(t);
  }
  return { core, kinds };
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let overlap = 0;
  for (const t of a) if (b.has(t)) overlap += 1;
  return overlap / (a.size + b.size - overlap);
}

function isSubset(a: Set<string>, b: Set<string>): boolean {
  for (const t of a) if (!b.has(t)) return false;
  return true;
}

/** Compare two already-computed title cores. */
export function coresSimilar(a: TitleCore, b: TitleCore, threshold = 0.5): boolean {
  if (a.core.size === 0 && b.core.size === 0) {
    if (a.kinds.size === 0 || b.kinds.size === 0) return false;
    return [...a.kinds].some((k) => b.kinds.has(k));
  }
  if (a.core.size === 0 || b.core.size === 0) return false;
  return jaccard(a.core, b.core) >= threshold || isSubset(a.core, b.core) || isSubset(b.core, a.core);
}

/** Title-only similarity (brand-agnostic) on normalized core tokens. */
export function titlesSimilar(a: string, b: string, threshold = 0.5): boolean {
  const ca = titleCore(a);
  const cb = titleCore(b);
  if (ca.core.size === 0 && cb.core.size === 0 && ca.kinds.size === 0 && cb.kinds.size === 0) {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }
  return coresSimilar(ca, cb, threshold);
}

// ---------------------------------------------------------------- duplicates

export interface DedupeDeal {
  brandName: string;
  title: string;
  discountType?: string | null;
  discountValue?: number | null;
}

/** Free-item style types are interchangeable across sources ("Gratis X" vs "Free X with purchase"). */
const FREE_FAMILY = new Set(["FREE_100", "FREE_ITEM_WITH_PURCHASE"]);
/** Types where a brand practically never runs two different birthday promos at once. */
const ONE_PER_BRAND = new Set(["BOGO", "DISCOUNT_PERCENT"]);

function sharesItemToken(a: TitleCore, b: TitleCore): boolean {
  for (const t of a.core) if (t.length >= 4 && b.core.has(t)) return true;
  return false;
}

/**
 * Same brand key AND one of:
 * - title cores similar (Jaccard >= 0.5 or subset);
 * - one title is generic (names no item, e.g. "Promo Ulang Tahun Teazzi") and the types don't conflict;
 * - both free-family and they share a specific item word ("cake", "sushi");
 * - same one-per-brand type (BOGO / percent off) with equal-or-unknown value.
 * Two distinct freebies from one brand (Bakmi GM noodles vs chips voucher) stay separate.
 */
export function isDuplicateDeal(a: DedupeDeal, b: DedupeDeal): boolean {
  if (!brandsMatch(a.brandName, b.brandName)) return false;
  const names = [a.brandName, b.brandName];
  const ca = titleCore(a.title, names);
  const cb = titleCore(b.title, names);
  if (coresSimilar(ca, cb)) return true;

  const ta = a.discountType ?? null;
  const tb = b.discountType ?? null;
  const sameType = ta !== null && ta === tb;
  const valuesCompatible = a.discountValue == null || b.discountValue == null || a.discountValue === b.discountValue;
  const typesCompatible = ta === null || tb === null || ta === tb || (FREE_FAMILY.has(ta) && FREE_FAMILY.has(tb));

  if ((ca.core.size === 0 || cb.core.size === 0) && typesCompatible && valuesCompatible) return true;
  if (ta && tb && FREE_FAMILY.has(ta) && FREE_FAMILY.has(tb) && sharesItemToken(ca, cb)) return true;
  if (sameType && ONE_PER_BRAND.has(ta) && valuesCompatible) return true;
  if (sameType && a.discountValue != null && b.discountValue != null && a.discountValue === b.discountValue) {
    return !FREE_FAMILY.has(ta) && ta !== "VOUCHER";
  }
  return false;
}

export function findDuplicate<T extends DedupeDeal>(candidate: DedupeDeal, pool: T[]): T | undefined {
  return pool.find((d) => isDuplicateDeal(d, candidate));
}

const SOURCE_PRIORITY: Record<string, number> = {
  SCRAPER_BRAND: 3,
  SCRAPER_AGGREGATOR: 2,
  SCRAPER_SEARCH: 1,
};

export function sourcePriority(sourceType: string): number {
  return SOURCE_PRIORITY[sourceType] ?? 0;
}

export interface BatchDeal extends DedupeDeal {
  sourceType: string;
  description?: string | null;
}

/** True when `a` should win over `b` (higher source priority, tie -> longer description). */
export function isPreferred(a: BatchDeal, b: BatchDeal): boolean {
  const pa = sourcePriority(a.sourceType);
  const pb = sourcePriority(b.sourceType);
  if (pa !== pb) return pa > pb;
  return (a.description?.length ?? 0) > (b.description?.length ?? 0);
}

/** Collapse duplicates inside one batch, keeping the preferred item (first one on full ties). */
export function dedupeBatch<T extends BatchDeal>(items: T[]): { kept: T[]; dropped: number } {
  const kept: T[] = [];
  let dropped = 0;
  for (const item of items) {
    const idx = kept.findIndex((k) => isDuplicateDeal(k, item));
    if (idx === -1) {
      kept.push(item);
      continue;
    }
    dropped += 1;
    if (isPreferred(item, kept[idx])) kept[idx] = item;
  }
  return { kept, dropped };
}

// ------------------------------------------------------------ brand cleanup

const KNOWN_BRANDS: string[] = [
  ...BRAND_SOURCES.map((b) => b.brandName),
  ...SOCIAL_PUBLIC_HANDLES.map((h) => h.brandName),
];

const PROMO_CUT_RE = new RegExp(
  `\\s+(?:\\d{1,3}\\s*%|rp\\.?\\s*\\d|(?:promo|menu|serba|diskon|gratis|free|voucher|birthday|ulang\\s*tahun|ultah|anniversary|beli\\s*\\d|buy\\s*\\d|${ZODIAC_NAMES.join("|")})\\b)`,
  "i",
);

export function cleanBrandName(name: string, known: string[] = []): string {
  let cleaned = name
    .replace(/\s+/g, " ")
    .replace(/^\s*(?:\d+[.)]\s*)?promo\s+/i, "")
    .trim();
  const cut = cleaned.search(PROMO_CUT_RE);
  if (cut > 0) cleaned = cleaned.slice(0, cut).trim();
  cleaned = cleaned.replace(/[\s\-–:,|]+$/, "").trim();
  if (!cleaned) return name.trim();

  const key = brandKey(cleaned);
  for (const k of [...known, ...KNOWN_BRANDS]) {
    if (brandKey(k) === key) return k;
  }
  return cleaned;
}
