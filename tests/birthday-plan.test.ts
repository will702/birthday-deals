import { describe, expect, it } from "vitest";
import { buildBirthdayPlan, resolveBirthdayDate, toIsoDate, type PlanDealInput } from "../src/lib/birthday-plan";
import { buildPlanIcs, foldLine } from "../src/lib/ics";

const base: PlanDealInput = {
  slug: "x",
  brandName: "X",
  title: "Gratis",
  category: "F&B",
  claimWindow: "Hari H Ulang Tahun",
  minRegistrationDays: null,
  requiresApp: false,
  appName: null,
  requiresIdCard: false,
  minPurchaseIdr: 0,
};

const today = new Date(2026, 5, 1); // 1 Jun 2026

describe("resolveBirthdayDate", () => {
  it("picks the next occurrence", () => {
    expect(toIsoDate(resolveBirthdayDate(15, 5, today))).toBe("2026-06-15");
    expect(toIsoDate(resolveBirthdayDate(1, 0, today))).toBe("2027-01-01");
  });
});

describe("buildBirthdayPlan", () => {
  it("schedules a H-7 s/d H+7 window with open and deadline items", () => {
    const plan = buildBirthdayPlan({
      day: 15,
      month: 5,
      today,
      deals: [{ ...base, claimWindow: "H-7 s/d H+7" }],
    });
    expect(plan.birthday).toBe("2026-06-15");
    expect(plan.daysUntil).toBe(14);
    expect(plan.deals[0].opensOn).toBe("2026-06-08");
    expect(plan.deals[0].closesOn).toBe("2026-06-22");
    const labels = plan.days.map((d) => d.label);
    expect(labels).toEqual(["H-7", "Hari H", "H+7"]);
    expect(plan.days[0].items[0].kind).toBe("open");
    expect(plan.days[2].items[0].kind).toBe("deadline");
  });

  it("places registration prep at H-minRegistrationDays and extends the timeline up to H-90", () => {
    const plan = buildBirthdayPlan({
      day: 15,
      month: 5,
      today,
      deals: [
        { ...base, slug: "a", minRegistrationDays: 14 },
        { ...base, slug: "b", minRegistrationDays: 90 },
        { ...base, slug: "c", minRegistrationDays: 200 },
      ],
    });
    expect(plan.deals[0].registerBy).toBe("2026-06-01");
    const first = plan.days[0];
    expect(first.offset).toBe(-90);
    expect(first.items[0].kind).toBe("prep");
    expect(plan.days.find((d) => d.offset === -14)?.items[0].dealSlug).toBe("a");
  });

  it("adds an app prep task the day before the window opens", () => {
    const plan = buildBirthdayPlan({
      day: 15,
      month: 5,
      today,
      deals: [{ ...base, requiresApp: true, appName: "Kopi App" }],
    });
    const prep = plan.days.find((d) => d.items.some((i) => i.kind === "prep"));
    expect(prep?.offset).toBe(-2);
    expect(prep?.items[0].text).toContain("Kopi App");
  });

  it("always includes the birthday day and marks past days", () => {
    const plan = buildBirthdayPlan({ day: 15, month: 5, today, deals: [] });
    expect(plan.days).toHaveLength(1);
    expect(plan.days[0].isBirthday).toBe(true);
    const near = buildBirthdayPlan({
      day: 3,
      month: 5,
      today,
      deals: [{ ...base, claimWindow: "H-7 s/d H+7" }],
    });
    expect(near.days[0].past).toBe(true);
  });

  it("notes KTP and min purchase", () => {
    const plan = buildBirthdayPlan({
      day: 15,
      month: 5,
      today,
      deals: [{ ...base, requiresIdCard: true, minPurchaseIdr: 50000 }],
    });
    const note = plan.days.find((d) => d.isBirthday)?.items[0].note ?? "";
    expect(note).toContain("KTP");
    expect(note).toContain("50");
  });
});

describe("buildPlanIcs", () => {
  const plan = buildBirthdayPlan({
    day: 15,
    month: 5,
    today,
    deals: [{ ...base, brandName: "Kopi; Enak, Banget", claimWindow: "H-7 s/d H+7" }],
  });
  const ics = buildPlanIcs(plan, { now: new Date("2026-06-01T00:00:00Z"), baseUrl: "https://ultah.id" });

  it("produces a valid calendar with all-day events", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(3); // birthday + open + deadline
    expect(ics).toContain("DTSTART;VALUE=DATE:20260608");
    expect(ics).toContain("DTEND;VALUE=DATE:20260609");
    expect(ics).toContain("DTSTAMP:20260601T000000Z");
    expect(ics).toContain("URL:https://ultah.id/deals/x");
  });

  it("escapes text and folds long lines", () => {
    expect(ics).toContain("Kopi\\; Enak\\, Banget");
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(foldLine("a".repeat(200)).split("\r\n ")).toHaveLength(3);
  });
});
