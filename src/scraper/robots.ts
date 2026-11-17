export const SCRAPER_PRODUCT_TOKEN = "BirthdayDealsBot";

interface RobotsRule {
  allow: boolean;
  pattern: string;
}

interface RobotsGroup {
  agents: string[];
  rules: RobotsRule[];
}

export type RobotsRules = RobotsGroup[];

const cache = new Map<string, Promise<RobotsRules | null>>();

export function parseRobotsTxt(content: string): RobotsRules {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (field === "allow" || field === "disallow") {
      lastWasAgent = false;
      // An empty Disallow means "allow everything"; an empty Allow is a no-op.
      if (current && value) current.rules.push({ allow: field === "allow", pattern: value });
    } else {
      lastWasAgent = false;
    }
  }
  return groups;
}

function patternToRegExp(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const escaped = body.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}${anchored ? "$" : ""}`);
}

function productToken(userAgent: string): string {
  const match = userAgent.match(/^[A-Za-z0-9_-]+/);
  return (match ? match[0] : userAgent).toLowerCase();
}

export function isPathAllowed(rules: RobotsRules, pathWithQuery: string, userAgent: string): boolean {
  const token = productToken(userAgent);
  const specific = rules.filter((g) => g.agents.some((a) => a !== "*" && token.includes(a)));
  const applicable = specific.length > 0 ? specific : rules.filter((g) => g.agents.includes("*"));

  let best: { length: number; allow: boolean } | null = null;
  for (const rule of applicable.flatMap((g) => g.rules)) {
    if (!patternToRegExp(rule.pattern).test(pathWithQuery)) continue;
    const length = rule.pattern.length;
    // Longest match wins; Allow wins ties.
    if (!best || length > best.length || (length === best.length && rule.allow)) {
      best = { length, allow: rule.allow };
    }
  }
  return best ? best.allow : true;
}

async function loadRobots(origin: string, timeoutMs: number): Promise<RobotsRules | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": `${SCRAPER_PRODUCT_TOKEN}/1.0` },
    });
    // 4xx (incl. 404) means no restrictions; 5xx/unreachable: fail open as well.
    if (!res.ok) return null;
    return parseRobotsTxt(await res.text());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Returns false only when a fetched robots.txt explicitly disallows the URL for this agent.
 * Fails open when robots.txt is missing or unreachable.
 */
export async function isAllowed(
  url: string,
  userAgent: string = SCRAPER_PRODUCT_TOKEN,
  options: { timeoutMs?: number } = {}
): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return true;

  let pending = cache.get(parsed.origin);
  if (!pending) {
    pending = loadRobots(parsed.origin, options.timeoutMs ?? 5_000);
    cache.set(parsed.origin, pending);
  }
  const rules = await pending;
  if (!rules) return true;
  return isPathAllowed(rules, `${parsed.pathname}${parsed.search}`, userAgent);
}

export function clearRobotsCache(): void {
  cache.clear();
}
