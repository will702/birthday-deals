import type { BirthdayPlan } from "@/lib/birthday-plan";

function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Folds a content line at 75 octets per RFC 5545 (continuation lines start with a space). */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  let limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (size + n > limit) {
      parts.push(current);
      current = "";
      size = 0;
      limit = 74;
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function compactDate(iso: string): string {
  return iso.replace(/-/g, "");
}

function nextDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return `${next.getUTCFullYear()}${String(next.getUTCMonth() + 1).padStart(2, "0")}${String(next.getUTCDate()).padStart(2, "0")}`;
}

/** Builds an iCalendar file with one all-day VEVENT per plan item (plus the birthday itself). */
export function buildPlanIcs(
  plan: BirthdayPlan,
  options: { baseUrl?: string; now?: Date; calendarName?: string } = {},
): string {
  const now = options.now ?? new Date();
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const base = (options.baseUrl ?? "").replace(/\/$/, "");
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UltahID//Rencana Ulang Tahun//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(options.calendarName ?? "Rencana Ulang Tahun UltahID")}`,
  ];

  const pushEvent = (uid: string, date: string, summary: string, description: string, url?: string) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}@ultahid`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compactDate(date)}`,
      `DTEND;VALUE=DATE:${nextDay(date)}`,
      `SUMMARY:${escapeText(summary)}`,
    );
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
    if (url) lines.push(`URL:${url}`);
    lines.push("END:VEVENT");
  };

  for (const day of plan.days) {
    if (day.isBirthday) {
      pushEvent(`birthday-${day.date}`, day.date, "Hari ulang tahun kamu", "Selamat ulang tahun! Cek promo yang bisa diklaim hari ini.");
    }
    day.items.forEach((item, i) => {
      const prefix = item.kind === "prep" ? "Persiapan" : item.kind === "deadline" ? "Terakhir" : "Klaim";
      pushEvent(
        `${item.kind}-${item.dealSlug}-${day.date}-${i}`,
        day.date,
        `${prefix}: ${item.brandName}`,
        [item.text, item.note].filter(Boolean).join("\n"),
        base ? `${base}/deals/${item.dealSlug}` : undefined,
      );
    });
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
