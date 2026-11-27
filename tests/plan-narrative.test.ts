import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { generatePlanNarrative, groundNarrative } from "../src/ai/plan-narrative";
import { buildBirthdayPlan } from "../src/lib/birthday-plan";

const plan = buildBirthdayPlan({
  day: 15,
  month: 5,
  today: new Date(2026, 5, 1),
  deals: [],
});

describe("plan narrative", () => {
  it("drops days that are not in the schedule", () => {
    const grounded = groundNarrative(
      {
        title: "t",
        intro: "i",
        days: [
          { date: "2026-06-15", headline: "ok", tips: [] },
          { date: "2026-01-01", headline: "invented", tips: [] },
        ],
      },
      plan,
    );
    expect(grounded.days.map((d) => d.date)).toEqual(["2026-06-15"]);
  });

  it("uses the injected generator and grounds its output", async () => {
    const generate = vi.fn().mockResolvedValue({
      output: { title: "Rencana", intro: "Halo", days: [{ date: "2099-01-01", headline: "x", tips: [] }] },
    });
    const res = await generatePlanNarrative(plan, { model: "x/y", generate: generate as never });
    expect(res.title).toBe("Rencana");
    expect(res.days).toEqual([]);
    expect(generate).toHaveBeenCalledOnce();
  });
});
