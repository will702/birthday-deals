import { parseClaimWindow } from "@/scraper/normalizer";

const MS_DAY = 1000 * 60 * 60 * 24;

/**
 * Days until the next birthday. Returns a negative number (-1..-7) when the
 * birthday passed within the last 7 days (still inside a typical H+7 window).
 * `month` is 0-indexed.
 */
export function daysUntilBirthday(day: number, month: number, today: Date): number {
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let target = new Date(today.getFullYear(), month, day);
  if (target.getTime() < startOfToday.getTime()) {
    const diffPast = Math.round((startOfToday.getTime() - target.getTime()) / MS_DAY);
    if (diffPast <= 7) return -diffPast;
    target = new Date(today.getFullYear() + 1, month, day);
  }
  return Math.round((target.getTime() - startOfToday.getTime()) / MS_DAY);
}

export interface ClaimWindowRange {
  /** Days before the birthday the claim opens (positive number, e.g. 7 for H-7). */
  before: number;
  /** Days after the birthday the claim closes. */
  after: number;
}

/** Converts a claimWindow label into an offset range around the birthday. */
export function claimWindowRange(claimWindow: string): ClaimWindowRange {
  const text = claimWindow.trim();
  const range = text.match(/H\s*-\s*(\d+)\s*(?:s\/d|sd|hingga|-|to)\s*H\s*\+\s*(\d+)/i);
  if (range) return { before: Number(range[1]), after: Number(range[2]) };
  if (/bulan\s*ulang\s*tahun|birthday\s*month/i.test(text)) return { before: 0, after: 30 };
  const plus = text.match(/H\s*\+\s*(\d+)/i);
  if (plus) return { before: 0, after: Number(plus[1]) };
  return { before: 0, after: 0 };
}

/** Same as claimWindowRange but runs raw text through parseClaimWindow first. */
export function claimWindowRangeFromText(text: string): ClaimWindowRange {
  return claimWindowRange(parseClaimWindow(text).claimWindow);
}

export type WindowFit = "open" | "soon" | "closed" | "unknown";

/**
 * Does the deal's claim window cover the user's birthday timeline?
 * - open: today is inside the claim window
 * - soon: window opens within 30 days (or app registration lead time still reachable)
 * - closed: birthday window passed and next one is far away
 */
export function windowFit(
  claimWindow: string,
  daysUntil: number | null,
  minRegistrationDays?: number | null,
): { fit: WindowFit; daysToOpen: number } {
  if (daysUntil === null) return { fit: "unknown", daysToOpen: 0 };
  const { before, after } = claimWindowRange(claimWindow);
  // daysUntil < 0 means birthday already passed by |daysUntil| days.
  if (daysUntil <= before && -daysUntil <= after) return { fit: "open", daysToOpen: 0 };
  const daysToOpen = daysUntil - before;
  if (daysToOpen > 0) {
    const lead = minRegistrationDays ?? 0;
    return { fit: daysToOpen <= 30 + lead ? "soon" : "closed", daysToOpen };
  }
  return { fit: "closed", daysToOpen: 0 };
}

/** Day 1-31, month 1-12 (human numbering). Feb 29 is allowed. */
export function isValidBirthday(day: number, month: number): boolean {
  if (!Number.isInteger(day) || !Number.isInteger(month)) return false;
  if (month < 1 || month > 12 || day < 1) return false;
  // Feb 29 is allowed (leap-day birthdays).
  const maxDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return day <= maxDays;
}

/**
 * Today's calendar date in Asia/Jakarta, as a local-midnight Date (so the local-date helpers
 * above work regardless of the server timezone, e.g. UTC on Vercel).
 */
export function todayInJakarta(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return new Date(get("year"), get("month") - 1, get("day"));
}
