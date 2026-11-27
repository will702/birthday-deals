import { describe, expect, it } from "vitest";
import { cityMatches, isNationwide, parseCities } from "../src/lib/cities";

describe("parseCities", () => {
  it("maps nationwide strings to Nasional", () => {
    expect(parseCities("Nasional (Seluruh Indonesia)")).toEqual(["Nasional"]);
    expect(parseCities("")).toEqual(["Nasional"]);
    expect(parseCities("Semua outlet")).toEqual(["Nasional"]);
  });

  it("extracts known cities and aliases", () => {
    expect(parseCities("Jakarta, Bandung & Surabaya")).toEqual(["Jakarta", "Bandung", "Surabaya"]);
    expect(parseCities("Denpasar dan Ubud")).toEqual(["Bali"]);
    expect(parseCities("Jogja")).toEqual(["Yogyakarta"]);
  });

  it("expands Jabodetabek", () => {
    const cities = parseCities("Jabodetabek");
    expect(cities).toEqual(expect.arrayContaining(["Jakarta", "Bekasi", "Depok", "Bogor", "Tangerang"]));
  });

  it("keeps Nasional alongside named cities", () => {
    expect(parseCities("Nasional, termasuk Medan")).toEqual(["Nasional", "Medan"]);
  });

  it("falls back to Nasional for unknown places and avoids substring false positives", () => {
    expect(parseCities("Outlet tertentu")).toEqual(["Nasional"]);
    expect(parseCities("Solomon Street")).toEqual(["Nasional"]);
  });
});

describe("cityMatches / isNationwide", () => {
  it("matches case-insensitively", () => {
    expect(cityMatches(["Jakarta"], "jakarta")).toBe(true);
    expect(cityMatches(["Jakarta"], "Bandung")).toBe(false);
    expect(cityMatches(["Jakarta"], null)).toBe(false);
  });
  it("detects nationwide", () => {
    expect(isNationwide(["Nasional"])).toBe(true);
    expect(isNationwide([])).toBe(true);
    expect(isNationwide(["Jakarta"])).toBe(false);
  });
});
