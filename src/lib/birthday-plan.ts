import {
  claimWindowRange,
  claimWindowRangeFromText,
  daysUntilBirthday,
  todayInJakarta,
} from "@/lib/birthday";

const MS_DAY = 1000 * 60 * 60 * 24;
export const PLAN_RANGE_DAYS = 30;
/** Earliest timeline offset: prep tasks (e.g. H-60 registration) extend the timeline up to H-90. */
export const PLAN_MAX_LEAD_DAYS = 90;

export interface PlanDealInput {
  slug: string;
  brandName: string;
  title: string;
  category: string;
  claimWindow: string;
  minRegistrationDays: number | null;
  requiresApp: boolean;
  appName: string | null;
  requiresIdCard: boolean;
  minPurchaseIdr: number;
}

export type PlanItemKind = "prep" | "open" | "deadline" | "claim";

export interface PlanItem {
  kind: PlanItemKind;
  dealSlug: string;
  brandName: string;
  text: string;
  note?: string;
}

export interface PlanDay {
  /** ISO calendar date, YYYY-MM-DD (local). */
  date: string;
  /** Days relative to the birthday (negative = before). */
  offset: number;
  /** "H-7", "Hari H", "H+3". */
  label: string;
  /** True when the date is already before today (prep that should have happened). */
  past: boolean;
  isBirthday: boolean;
  items: PlanItem[];
}

export interface PlanDealWindow {
  slug: string;
  brandName: string;
  title: string;
  category: string;
  claimWindow: string;
  opensOn: string;
  closesOn: string;
  registerBy: string | null;
  needsPrep: boolean;
}

export interface BirthdayPlan {
  birthday: string;
  daysUntil: number;
  days: PlanDay[];
  deals: PlanDealWindow[];
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function offsetLabel(offset: number): string {
  if (offset === 0) return "Hari H";
  return offset < 0 ? `H${offset}` : `H+${offset}`;
}

function rangeFor(claimWindow: string) {
  const r = claimWindowRange(claimWindow);
  return r.before || r.after ? r : claimWindowRangeFromText(claimWindow);
}

function clampOffset(n: number): number {
  return Math.min(PLAN_RANGE_DAYS, Math.max(-PLAN_MAX_LEAD_DAYS, n));
}

function rupiah(n: number): string {
  return `Rp${n.toLocaleString("id-ID")}`;
}

/** Date of the next birthday (or one that passed within the last 7 days). `month` is 0-indexed. */
export function resolveBirthdayDate(day: number, month: number, today: Date): Date {
  const until = daysUntilBirthday(day, month, today);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return addDays(start, until);
}

/**
 * Deterministic birthday schedule: for each deal computes the claim window dates,
 * app/registration prep tasks and groups everything into timeline days (H-30..H+30).
 * Pure: `today` is injected. `month` is 0-indexed.
 */
export function buildBirthdayPlan(input: {
  day: number;
  month: number;
  today?: Date;
  deals: PlanDealInput[];
}): BirthdayPlan {
  const today = input.today ?? todayInJakarta();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const birthday = resolveBirthdayDate(input.day, input.month, today);
  const daysUntil = Math.round((birthday.getTime() - startOfToday.getTime()) / MS_DAY);

  const byOffset = new Map<number, PlanItem[]>();
  const add = (offset: number, item: PlanItem) => {
    const key = clampOffset(offset);
    const list = byOffset.get(key) ?? [];
    list.push(item);
    byOffset.set(key, list);
  };

  const windows: PlanDealWindow[] = [];

  for (const deal of input.deals) {
    const { before, after } = rangeFor(deal.claimWindow);
    const opensOffset = -before;
    const closesOffset = after;

    const notes: string[] = [];
    if (deal.requiresIdCard) notes.push("Bawa KTP");
    if (deal.minPurchaseIdr > 0) notes.push(`Min. belanja ${rupiah(deal.minPurchaseIdr)}`);
    const note = notes.length > 0 ? notes.join(" - ") : undefined;

    let prepOffset: number | null = null;
    if (deal.minRegistrationDays && deal.minRegistrationDays > 0) {
      prepOffset = -deal.minRegistrationDays;
    } else if (deal.requiresApp) {
      prepOffset = Math.min(opensOffset, -1) - 1;
    }
    if (prepOffset !== null) {
      const app = deal.appName?.trim();
      const text = deal.minRegistrationDays
        ? `Daftar member${app ? ` / pasang aplikasi ${app}` : ""} untuk ${deal.brandName} (minimal H-${deal.minRegistrationDays})`
        : `Pasang aplikasi${app ? ` ${app}` : ""} dan buat akun ${deal.brandName}`;
      add(prepOffset, { kind: "prep", dealSlug: deal.slug, brandName: deal.brandName, text });
    }

    if (before === 0 && after === 0) {
      add(0, { kind: "claim", dealSlug: deal.slug, brandName: deal.brandName, text: `Klaim ${deal.title} di ${deal.brandName}`, note });
    } else {
      add(opensOffset, {
        kind: "open",
        dealSlug: deal.slug,
        brandName: deal.brandName,
        text: `Promo ${deal.brandName} mulai bisa diklaim: ${deal.title}`,
        note,
      });
      if (closesOffset !== opensOffset) {
        add(closesOffset, {
          kind: "deadline",
          dealSlug: deal.slug,
          brandName: deal.brandName,
          text: `Hari terakhir klaim ${deal.brandName}`,
        });
      }
    }

    windows.push({
      slug: deal.slug,
      brandName: deal.brandName,
      title: deal.title,
      category: deal.category,
      claimWindow: deal.claimWindow,
      opensOn: toIsoDate(addDays(birthday, opensOffset)),
      closesOn: toIsoDate(addDays(birthday, closesOffset)),
      registerBy: prepOffset !== null ? toIsoDate(addDays(birthday, prepOffset)) : null,
      needsPrep: prepOffset !== null,
    });
  }

  if (!byOffset.has(0)) byOffset.set(0, []);

  const days: PlanDay[] = [...byOffset.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([offset, items]) => {
      const date = addDays(birthday, offset);
      return {
        date: toIsoDate(date),
        offset,
        label: offsetLabel(offset),
        past: date.getTime() < startOfToday.getTime(),
        isBirthday: offset === 0,
        items,
      };
    });

  return { birthday: toIsoDate(birthday), daysUntil, days, deals: windows };
}
