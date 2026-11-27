/** Canonical city name -> aliases (lowercase) that may appear in free-text `locations`. */
const CITY_ALIASES: Record<string, string[]> = {
  Jakarta: ["jakarta", "dki", "jabodetabek", "jabotabek"],
  Bandung: ["bandung"],
  Surabaya: ["surabaya"],
  Medan: ["medan"],
  Bali: ["bali", "denpasar", "kuta", "seminyak", "ubud", "badung"],
  Yogyakarta: ["yogyakarta", "jogja", "yogya", "diy"],
  Semarang: ["semarang"],
  Makassar: ["makassar"],
  Tangerang: ["tangerang", "bsd", "serpong", "alam sutera", "gading serpong"],
  Bekasi: ["bekasi"],
  Depok: ["depok"],
  Bogor: ["bogor"],
  Malang: ["malang"],
  Palembang: ["palembang"],
  Batam: ["batam"],
  Solo: ["solo", "surakarta"],
  Balikpapan: ["balikpapan"],
  Manado: ["manado"],
  Pekanbaru: ["pekanbaru"],
  Lampung: ["lampung", "bandar lampung"],
  Pontianak: ["pontianak"],
  Samarinda: ["samarinda"],
};

export const KNOWN_CITIES = Object.keys(CITY_ALIASES);
export const NATIONWIDE = "Nasional";

const NATIONAL_RE = /\bnasional\b|seluruh\s+indonesia|se-?indonesia|all\s+outlets?|semua\s+(?:outlet|cabang|gerai)/i;

const JABODETABEK_EXTRA = ["Jakarta", "Tangerang", "Bekasi", "Depok", "Bogor"];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MATCHERS = KNOWN_CITIES.map((city) => ({
  city,
  re: new RegExp(`(?<![a-z])(?:${CITY_ALIASES[city].map(escapeRe).join("|")})(?![a-z])`, "i"),
}));

/**
 * Extracts canonical city names from a free-text locations string.
 * "Nasional ..." (or nothing recognisable) -> ["Nasional"]. Named cities are
 * kept alongside "Nasional" when both appear.
 */
export function parseCities(locations: string | null | undefined): string[] {
  const text = (locations ?? "").trim();
  if (!text) return [NATIONWIDE];

  const found: string[] = [];
  for (const { city, re } of MATCHERS) {
    if (re.test(text) && !found.includes(city)) found.push(city);
  }
  if (/jabodetabek|jabotabek/i.test(text)) {
    for (const c of JABODETABEK_EXTRA) if (!found.includes(c)) found.push(c);
  }
  if (NATIONAL_RE.test(text)) return [NATIONWIDE, ...found];
  return found.length > 0 ? found : [NATIONWIDE];
}

/** Whether a deal (by its cities) is available in the user's city. */
export function cityMatches(dealCities: string[], userCity: string | null | undefined): boolean {
  if (!userCity) return false;
  const target = userCity.trim().toLowerCase();
  return dealCities.some((c) => c.toLowerCase() === target);
}

export function isNationwide(dealCities: string[]): boolean {
  return dealCities.length === 0 || dealCities.includes(NATIONWIDE);
}

/** Canonical KNOWN_CITIES name for free-text input ("jogja" -> "Yogyakarta"); trimmed input otherwise. */
export function canonicalCity(input: string | null | undefined): string | null {
  const text = (input ?? "").trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const city of KNOWN_CITIES) {
    if (city.toLowerCase() === lower || CITY_ALIASES[city].includes(lower)) return city;
  }
  return text;
}
