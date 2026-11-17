import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRobotsCache, isAllowed, isPathAllowed, parseRobotsTxt } from "../src/scraper/robots";

const UA = "BirthdayDealsBot/1.0 (+https://x.test)";

describe("robots.txt parsing", () => {
  it("allows paths not covered and blocks Disallow matches", () => {
    const rules = parseRobotsTxt("User-agent: *\nDisallow: /admin\nDisallow: /private/");
    expect(isPathAllowed(rules, "/promo", UA)).toBe(true);
    expect(isPathAllowed(rules, "/admin/x", UA)).toBe(false);
    expect(isPathAllowed(rules, "/private/", UA)).toBe(false);
  });

  it("longest match wins and Allow beats Disallow on ties", () => {
    const rules = parseRobotsTxt(
      "User-agent: *\nDisallow: /a\nAllow: /a/public\nDisallow: /b\nAllow: /b",
    );
    expect(isPathAllowed(rules, "/a/public/x", UA)).toBe(true);
    expect(isPathAllowed(rules, "/a/other", UA)).toBe(false);
    expect(isPathAllowed(rules, "/b", UA)).toBe(true);
  });

  it("supports wildcards and end anchors", () => {
    const rules = parseRobotsTxt("User-agent: *\nDisallow: /*.pdf$\nDisallow: /search?*q=");
    expect(isPathAllowed(rules, "/files/a.pdf", UA)).toBe(false);
    expect(isPathAllowed(rules, "/files/a.pdf.html", UA)).toBe(true);
    expect(isPathAllowed(rules, "/search?x=1&q=2", UA)).toBe(false);
  });

  it("prefers the specific agent group over *", () => {
    const rules = parseRobotsTxt(
      "User-agent: *\nDisallow: /\n\nUser-agent: BirthdayDealsBot\nDisallow: /secret",
    );
    expect(isPathAllowed(rules, "/promo", UA)).toBe(true);
    expect(isPathAllowed(rules, "/secret", UA)).toBe(false);
    expect(isPathAllowed(rules, "/promo", "OtherBot/1.0")).toBe(false);
  });

  it("empty Disallow allows everything", () => {
    const rules = parseRobotsTxt("User-agent: *\nDisallow:");
    expect(isPathAllowed(rules, "/anything", UA)).toBe(true);
  });
});

describe("isAllowed", () => {
  beforeEach(() => clearRobotsCache());
  afterEach(() => vi.unstubAllGlobals());

  it("blocks explicit Disallow and caches per origin", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("User-agent: *\nDisallow: /x"));
    vi.stubGlobal("fetch", fetchMock);
    expect(await isAllowed("https://a.test/x/1", UA)).toBe(false);
    expect(await isAllowed("https://a.test/ok", UA)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails open on 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nf", { status: 404 })));
    expect(await isAllowed("https://b.test/x", UA)).toBe(true);
  });

  it("fails open when unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    expect(await isAllowed("https://c.test/x", UA)).toBe(true);
  });
});
