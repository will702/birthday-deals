import { describe, expect, it } from "vitest";
import { claimWindowRange, daysUntilBirthday, windowFit } from "../src/lib/birthday";

const today = new Date(2026, 5, 15); // 15 Jun 2026

describe("daysUntilBirthday", () => {
  it("counts days to an upcoming birthday", () => {
    expect(daysUntilBirthday(25, 5, today)).toBe(10);
    expect(daysUntilBirthday(15, 5, today)).toBe(0);
  });
  it("returns negative inside the H+7 window", () => {
    expect(daysUntilBirthday(12, 5, today)).toBe(-3);
  });
  it("rolls to next year once past H+7", () => {
    expect(daysUntilBirthday(1, 5, today)).toBe(351);
  });
});

describe("claimWindowRange", () => {
  it("parses ranges and keywords", () => {
    expect(claimWindowRange("H-7 s/d H+7")).toEqual({ before: 7, after: 7 });
    expect(claimWindowRange("Hari H s/d H+14")).toEqual({ before: 0, after: 14 });
    expect(claimWindowRange("Bulan Ulang Tahun")).toEqual({ before: 0, after: 30 });
    expect(claimWindowRange("Tepat Hari H")).toEqual({ before: 0, after: 0 });
  });
});

describe("windowFit", () => {
  it("is open on the day and inside the range", () => {
    expect(windowFit("Hari H Ulang Tahun", 0).fit).toBe("open");
    expect(windowFit("H-7 s/d H+7", 5).fit).toBe("open");
    expect(windowFit("H-7 s/d H+7", -3).fit).toBe("open");
  });
  it("is soon when the window opens within 30 days", () => {
    const r = windowFit("H-7 s/d H+7", 20);
    expect(r.fit).toBe("soon");
    expect(r.daysToOpen).toBe(13);
  });
  it("is closed when far away or already passed", () => {
    expect(windowFit("Tepat Hari H", 200).fit).toBe("closed");
    expect(windowFit("Tepat Hari H", -3).fit).toBe("closed");
  });
  it("is unknown without a birthday", () => {
    expect(windowFit("Tepat Hari H", null).fit).toBe("unknown");
  });
});
