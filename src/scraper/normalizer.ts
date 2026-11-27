import type {
  DealCategory,
  DiscountType,
  NormalizedDealInput,
  RawScrapedDeal,
  SourceHealth,
} from "./types";
import { cleanBrandName, ZODIAC_RE } from "./dedupe";

export function getCurrentYear(now: Date = new Date()): number {
  return now.getFullYear();
}

const APP_KEYWORDS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\bmyboost\b|\bvibe\s*club\b|\bboost\s*juice\b/i, name: "MyBoost / Vibe Club" },
  { pattern: /\bstarbucks\s*(?:id|indonesia|rewards)?\b/i, name: "Starbucks Indonesia" },
  { pattern: /\bboga\s*app\b|\bboga\s*group\b/i, name: "Boga App" },
  { pattern: /\bfore\s*(?:coffee)?\s*app\b|\baplikasi\s*fore\b/i, name: "Fore Coffee App" },
  { pattern: /\bkopi\s*kenangan\b|\bkenangan\s*app\b/i, name: "Kopi Kenangan App" },
  { pattern: /\bsushi\s*tei\b/i, name: "Sushi Tei Indonesia App" },
  { pattern: /\bismaya\+?\b/i, name: "Ismaya+" },
  { pattern: /\bmapclub\b|\bmap\s*club\b/i, name: "MAPClub" },
  { pattern: /\bm-tix\b|\bmtix\b/i, name: "M-Tix / Cinema XXI" },
  { pattern: /\bcgv\b/i, name: "CGV Indonesia App" },
  { pattern: /\bhaidilao\b/i, name: "Haidilao Member" },
  { pattern: /\bsociolla\b|\bsoco\b/i, name: "SOCO by Sociolla" },
  { pattern: /\bsephora\b/i, name: "Sephora Indonesia" },
  { pattern: /\bjco\b|\bj\.co\b/i, name: "J.CO App" },
  { pattern: /\bhokben\b/i, name: "HokBen App" },
  { pattern: /\bchatime\b|\bf&b\s*id\b/i, name: "F&B ID App" },
  { pattern: /\bmarugame\b/i, name: "Marugame Udon App" },
];

export function slugifyBrandDeal(brandName: string, titleHint?: string): string {
  const cleanBrand = brandName
    .toLowerCase()
    .replace(/&/g, " dan ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!titleHint) return cleanBrand || "promo-ultah";

  const cleanTitle = titleHint
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 4)
    .join("-");

  return cleanTitle ? `${cleanBrand}-${cleanTitle}` : cleanBrand;
}

export function parseIndonesianDiscount(text: string): {
  discountType: DiscountType;
  discountValue: number | null;
} {
  const lower = text.toLowerCase();

  // Check BOGO first ("beli 1 gratis 1", "buy 1 get 1", "b1g1", "bogo")
  if (
    /\bbeli\s*1\s*gratis\s*1\b|\bbuy\s*1\s*get\s*1\b|\bb1g1\b|\bbogo\b/i.test(lower)
  ) {
    return { discountType: "BOGO", discountValue: 50 };
  }

  // Explicit percentage discount ("diskon 50%", "50% off", "potongan 30%", "setengah harga")
  const pctMatch =
    lower.match(/diskon\s*(?:hingga\s*|up\s*to\s*)?(\d{1,3})\s*%/) ||
    lower.match(/potongan\s*(?:harga\s*)?(\d{1,3})\s*%/) ||
    lower.match(/(\d{1,3})\s*%\s*(?:off|discount|diskon)/);

  if (pctMatch) {
    const val = Number(pctMatch[1]);
    if (val === 100) {
      return { discountType: "FREE_100", discountValue: 100 };
    }
    if (val > 0 && val < 100) {
      return { discountType: "DISCOUNT_PERCENT", discountValue: val };
    }
  }

  if (/\bsetengah\s*harga\b/i.test(lower)) {
    return { discountType: "DISCOUNT_PERCENT", discountValue: 50 };
  }

  const minSpend = parseMinPurchaseIdr(text);
  const hasFreeKeyword = /\b(gratis|free|cuma-cuma)\b/i.test(lower);
  const hasConditionalPurchase =
    minSpend > 0 ||
    /\bdengan\s*(?:min|pembelian|transaksi)\b|\bsesuai\s*syarat\s*transaksi\b|\bfree\s*with\s*purchase\b/i.test(
      lower
    );

  if (hasFreeKeyword) {
    if (hasConditionalPurchase) {
      return { discountType: "FREE_ITEM_WITH_PURCHASE", discountValue: null };
    }
    return { discountType: "FREE_100", discountValue: 100 };
  }

  if (/\bvoucher\b|\bpotongan\s*(?:rp\.?|idr)/i.test(lower)) {
    return { discountType: "VOUCHER", discountValue: null };
  }

  return { discountType: "DISCOUNT_PERCENT", discountValue: null };
}

export function parseMinPurchaseIdr(text: string): number {
  const lower = text.toLowerCase();
  if (
    /tanpa\s*(?:min(?:imum|imal)?|syarat)\s*(?:transaksi|pembelian|belanja|order)/i.test(lower) ||
    /no\s*min(?:imum)?\s*(?:spend|purchase)/i.test(lower)
  ) {
    return 0;
  }

  const match = lower.match(
    /(?:min\.?(?:imum|imal)?\s*(?:transaksi|pembelian|belanja|order)|min\.?\s*spend)\s*(?:sebesar\s*)?(?:rp\.?\s*)?([\d.,]+)\s*(rb|ribu|k|jt|juta)?/i
  );
  if (!match) return 0;

  const rawNum = match[1].replace(/\./g, "").replace(/,/g, "");
  let value = Number.parseInt(rawNum, 10);
  if (Number.isNaN(value)) return 0;

  const unit = (match[2] || "").toLowerCase();
  if (unit === "rb" || unit === "ribu" || unit === "k") {
    value *= 1000;
  } else if (unit === "jt" || unit === "juta") {
    value *= 1_000_000;
  }

  return value;
}

export function parseClaimWindow(text: string): {
  claimWindow: string;
  minRegistrationDays: number | null;
} {
  const lower = text.toLowerCase();

  let claimWindow = "Hari H Ulang Tahun";
  const rangeMatch = text.match(/H\s*-\s*(\d+)\s*(?:s\/d|sd|hingga|-|to)\s*H\s*\+\s*(\d+)/i);
  if (rangeMatch) {
    claimWindow = `H-${rangeMatch[1]} s/d H+${rangeMatch[2]}`;
  } else if (/\bh\s*-\s*7\b.*\bh\s*\+\s*7\b|7\s*hari\s*sebelum.*sesudah/i.test(lower)) {
    claimWindow = "H-7 s/d H+7";
  } else if (/\bh\s*-\s*14\b.*\bh\s*\+\s*14\b|14\s*hari\s*sebelum.*sesudah/i.test(lower)) {
    claimWindow = "H-14 s/d H+14";
  } else if (/\bh\s*\+\s*(\d+)\b/i.test(lower)) {
    const plusMatch = lower.match(/\bh\s*\+\s*(\d+)\b/i);
    claimWindow = plusMatch ? `Hari H s/d H+${plusMatch[1]}` : "Hari H Ulang Tahun";
  } else if (/\b(?:sepanjang|selama|di)\s*bulan\s*(?:ulang\s*tahun|kelahiran|ultah)\b|\bbirthday\s*month\b/i.test(lower)) {
    claimWindow = "Bulan Ulang Tahun";
  } else if (/\b(?:tepat\s*(?:di\s*)?hari\s*(?:h|ulang\s*tahun)|hari\s*h\s*saja|on\s*your\s*birthday)\b/i.test(lower)) {
    claimWindow = "Tepat Hari H";
  }

  let minRegistrationDays: number | null = null;
  const regMatch =
    lower.match(/(?:daftar|registrasi|member|bergabung|join)\s*(?:min(?:imal)?\.?\s*)?(\d+)\s*hari\s*(?:sebelum|prior)/i) ||
    lower.match(/(?:min(?:imal)?\.?\s*|paling\s*lambat\s*)h\s*-\s*(\d+)\s*(?:sebelum|daftar|registrasi)?/i) ||
    lower.match(/(\d+)\s*hari\s*sebelum\s*(?:ulang\s*tahun|ultah|hari\s*h)/i);

  if (regMatch) {
    const parsed = Number.parseInt(regMatch[1], 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 365) {
      minRegistrationDays = parsed;
    }
  } else if (/\bsebulan\s*sebelum|\b1\s*bulan\s*sebelum/i.test(lower)) {
    minRegistrationDays = 30;
  }

  return { claimWindow, minRegistrationDays };
}

export function parseRequirements(text: string): {
  requiresIdCard: boolean;
  requiresApp: boolean;
  appName: string | null;
} {
  const lower = text.toLowerCase();

  const requiresIdCard =
    /\b(ktp|e-ktp|sim|kia|paspor|passport|kartu\s*identitas|id\s*card|tunjukkan\s*identitas)\b/i.test(
      lower
    );

  let appName: string | null = null;
  for (const item of APP_KEYWORDS) {
    if (item.pattern.test(text)) {
      appName = item.name;
      break;
    }
  }

  const requiresApp =
    Boolean(appName) ||
    /\b(aplikasi|app|member|membership|rewards|unduh|download\s*app|registrasi\s*akun)\b/i.test(
      lower
    );

  return { requiresIdCard, requiresApp, appName };
}

export function inferCategory(text: string): DealCategory {
  const lower = text.toLowerCase();
  if (/\b(smoothie|kopi|coffee|tea|teh|boba|minuman|juice|jus|starbucks|fore|kenangan|chatime|boost)\b/.test(lower)) {
    return "Drink & Cafe";
  }
  if (/\b(bioskop|cinema|xxi|cgv|cinepolis|film|tiket|karaoke|timezone|theme\s*park|dufan|wahana)\b/.test(lower)) {
    return "Cinema & Entertainment";
  }
  if (/\b(skincare|makeup|beauty|sociolla|sephora|parfum|baju|retail|sepatu|fashion|belanja)\b/.test(lower)) {
    return "Beauty & Retail";
  }
  if (/\b(sushi|ramen|steak|buffet|grill|restoran|makan|cake|kue|udon|dimsum|bbq|pizza|burger|pepper\s*lunch)\b/.test(lower)) {
    return "F&B";
  }
  return "Other";
}

export function detectExpirationSignals(text: string, referenceYear: number = getCurrentYear()): {
  likelyExpired: boolean;
  reason: string | null;
} {
  const lower = text.toLowerCase();
  const explicitExpiredPatterns = [
    /\bpromo\s*(?:ini\s*)?(?:telah|sudah)\s*(?:berakhir|selesai|kedaluwarsa|kadaluwarsa)\b/i,
    /\bperiode\s*promo\s*(?:telah|sudah)\s*(?:berakhir|selesai)\b/i,
    /\b(?:sudah\s+tidak\s+berlaku|tidak\s+lagi\s+berlaku)\b/i,
    /\bthis\s*(?:offer|promotion)\s*has\s*expired\b/i,
    /\bno\s*longer\s*available\b/i,
  ];

  for (const pattern of explicitExpiredPatterns) {
    if (pattern.test(lower)) {
      return { likelyExpired: true, reason: "Teks sumber menyebut promo telah berakhir." };
    }
  }

  // Check if the page specifically states a past validity year without mentioning the current year
  const yearsMentioned = Array.from(lower.matchAll(/\b(202[0-9])\b/g)).map((m) =>
    Number.parseInt(m[1], 10)
  );
  if (yearsMentioned.length > 0) {
    const maxYear = Math.max(...yearsMentioned);
    if (maxYear <= referenceYear - 2 && !lower.includes(String(referenceYear))) {
      return {
        likelyExpired: true,
        reason: `Halaman sumber hanya menyebut tahun lama (${maxYear}).`,
      };
    }
  }

  return { likelyExpired: false, reason: null };
}

const CUSTOMER_BIRTHDAY_RE =
  /\b(birthday\s*treat|birthday\s*reward|birthday\s*deals|birthday\s*gift|birthday\s*surprise|yang\s*berulang\s*tahun|hari\s*ulang\s*tahunmu|bulan\s*ulang\s*tahunmu|tunjukkan\s*ktp|kartu\s*identitas|tanggal\s*lahir)\b/i;

export function isBrandAnniversaryPromo(title: string, text: string = ""): boolean {
  const combined = `${title} ${text}`.toLowerCase();
  const hasCustomerBirthdaySignals = CUSTOMER_BIRTHDAY_RE.test(combined);

  // Explicit company anniversary patterns (e.g. "Ulang Tahun ke-9", "Ulang Tahun 27", "Anniversary ke-44",
  // "HUT ke-17", "Anniversary Menu Serba Rp23.000", "Platinum Resto Anniversary")
  const hasAnniversaryPattern =
    /\b(?:ulang\s*tahun|hut|anniversary)\s*(?:ke[-\s]*)?\d{1,3}\b/i.test(title) ||
    /\b\d{1,3}(?:st|nd|rd|th)\s*anniversary\b/i.test(title) ||
    /\banniversary\b/i.test(title) ||
    /\bhut\s*(?:ke[-\s]*)?\d{1,3}\b/i.test(combined) ||
    /\bulang\s*tahun\s*ke[-\s]*\d{1,3}\b/i.test(combined) ||
    /\banniversary\s*menu\b/i.test(combined) ||
    /\bpaket\s*ulang\s*tahun\s*anak\b/i.test(title);

  return hasAnniversaryPattern && !hasCustomerBirthdaySignals;
}

const OWN_BIRTHDAY_TIE_RE =
  /\b(?:tanggal|tgl)\s*(?:lahir|ulang\s*tahun)\b|\bdate\s*of\s*birth\b|\bbirth\s*date\b|\bhari\s*ulang\s*tahun(?:mu|\s*(?:anda|kamu))\b|\bbulan\s*ulang\s*tahun(?:mu|\s*(?:anda|kamu))\b|\byour\s*birthday\b|\bon\s*your\s*birth|\bkartu\s*identitas\b|\bktp\b/i;

/** Zodiac-sign promos (sign in title/brand, or zodiac wording) unless tied to the user's own birthday date. */
export function isZodiacPromo(title: string, text: string = ""): boolean {
  const zodiacInTitle = ZODIAC_RE.test(title);
  const zodiacWording = /\b(?:zodiac|zodiak|horoskop|horoscope)\b/i.test(`${title} ${text}`);
  if (!zodiacInTitle && !(zodiacWording && ZODIAC_RE.test(text))) return false;
  return !OWN_BIRTHDAY_TIE_RE.test(`${title} ${text}`);
}

/** Reason a raw deal must be dropped, or null when it is acceptable. */
export function rejectionReason(raw: RawScrapedDeal): string | null {
  if (isZodiacPromo(`${raw.title} ${raw.brandName}`, raw.rawText)) return "promo zodiak";
  if (isBrandAnniversaryPromo(raw.title, raw.rawText)) return "anniversary brand";
  return null;
}

export function isValidBrandHeading(heading: string): boolean {
  const clean = heading.replace(/^\s*\d+[.)]\s*/, "").trim();
  if (clean.length < 2 || clean.length > 65) return false;
  if (
    /^(?:kenapa|mengapa|cara|tabel|tips|syarat|daftar|kesimpulan|penutup|rekomendasi|faq|apa\s+saja|berikut|\d+\s+(?:promo|restoran|tempat|birthday))/i.test(
      clean
    )
  ) {
    return false;
  }
  if (/\?$/.test(clean)) return false;
  if (clean.split(/\s+/).length > 7) return false;
  return true;
}

export function extractBrandNameFromHeadline(headline: string): string {
  // Clean common Indonesian promo headline prefixes like "Promo Pepper Lunch Birthday Deals..."
  let cleaned = headline
    .replace(/^\s*(?:\d+[.)]\s*)?promo\s+/i, "")
    .replace(/^(?:ulang\s*tahun|ultah|birthday\s*(?:treat|treats|deals|gift|reward|rewards|surprise))\s+/i, "")
    .trim();

  if (cleaned.includes(":")) {
    const beforeColon = cleaned.split(":")[0].trim();
    if (beforeColon.length >= 2 && beforeColon.length <= 45) {
      cleaned = beforeColon;
    }
  }

  const stopMatch = cleaned.match(
    /^(.+?)\s+(?:birthday\s*(?:treat|treats|deals|gift|reward|rewards|surprise)|ulang\s*tahun|ultah|diskon|gratis|free|member|september|oktober|november|desember|scorpio|season)/i
  );
  if (stopMatch && stopMatch[1].trim().length >= 2) {
    cleaned = stopMatch[1].trim();
  }

  return cleaned.slice(0, 60).trim() || headline.slice(0, 60).trim();
}

export function computeFreshnessScore(params: {
  lastVerifiedAt: Date;
  lastScrapedAt?: Date | null;
  stillWorksCount: number;
  expiredReportCount: number;
  sourceHealth?: SourceHealth;
  now?: Date;
}): number {
  const now = params.now ?? new Date();
  const daysSinceVerified = Math.max(
    0,
    (now.getTime() - params.lastVerifiedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  let score = 95;
  if (daysSinceVerified > 90) {
    score = 30;
  } else if (daysSinceVerified > 60) {
    score = 52;
  } else if (daysSinceVerified > 30) {
    score = 72;
  } else if (daysSinceVerified > 14) {
    score = 84;
  }

  // Boost for positive community confirmations
  score += Math.min(10, Math.max(0, params.stillWorksCount - 1) * 2);

  // Penalty for expired reports relative to stillWorks
  if (params.expiredReportCount > 0) {
    score -= params.expiredReportCount * 22;
  }

  if (params.sourceHealth === "LIVE") score += 4;
  if (params.sourceHealth === "NOT_FOUND") score -= 25;
  if (params.sourceHealth === "EXPIRED_SIGNAL") score -= 45;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function normalizeScrapedDeal(
  raw: RawScrapedDeal,
  options: { now?: Date } = {}
): NormalizedDealInput {
  const combinedText = `${raw.title} ${raw.rawText} ${(raw.termsList ?? []).join(" ")}`;

  const parsedDiscount = parseIndonesianDiscount(combinedText);
  const discountType = raw.discountTypeHint ?? parsedDiscount.discountType;
  const discountValue =
    raw.discountValueHint !== undefined ? raw.discountValueHint : parsedDiscount.discountValue;

  const minPurchaseIdr =
    raw.minPurchaseIdrHint !== undefined
      ? raw.minPurchaseIdrHint
      : parseMinPurchaseIdr(combinedText);

  const parsedWindow = parseClaimWindow(combinedText);
  const claimWindow = raw.claimWindowHint ?? parsedWindow.claimWindow;
  const minRegistrationDays =
    raw.minRegistrationDaysHint !== undefined
      ? raw.minRegistrationDaysHint
      : parsedWindow.minRegistrationDays;

  const parsedReq = parseRequirements(combinedText);
  const requiresIdCard =
    raw.requiresIdCardHint !== undefined ? raw.requiresIdCardHint : parsedReq.requiresIdCard;
  const appName = raw.appNameHint !== undefined ? raw.appNameHint : parsedReq.appName;
  const requiresApp = Boolean(appName) || parsedReq.requiresApp;

  const category = raw.category ?? inferCategory(`${raw.brandName} ${combinedText}`);

  const terms =
    raw.termsList && raw.termsList.length > 0
      ? raw.termsList
      : raw.rawText
          .split(/[.;]\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length >= 8)
          .slice(0, 6);

  const now = options.now ?? new Date();
  const freshnessScore = computeFreshnessScore({
    lastVerifiedAt: now,
    lastScrapedAt: now,
    stillWorksCount: 1,
    expiredReportCount: 0,
    sourceHealth: raw.sourceVerifiedLive ? "LIVE" : "UNKNOWN",
    now,
  });

  return {
    slug: slugifyBrandDeal(cleanBrandName(raw.brandName), raw.title),
    brandName: cleanBrandName(raw.brandName),
    brandLogoUrl: raw.brandLogoUrl ?? null,
    category,
    title: raw.title.trim(),
    discountType,
    discountValue,
    description: raw.rawText.trim().slice(0, 1000),
    termsAndConditions: terms.length > 0 ? terms : [raw.title.trim()],
    claimWindow,
    requiresApp,
    appName,
    minRegistrationDays,
    requiresIdCard,
    minPurchaseIdr,
    locations: raw.locations?.trim() || "Nasional (Seluruh Indonesia)",
    sourceUrl: raw.sourceUrl,
    sourceType: raw.sourceType,
    verificationStatus: raw.lowTrust ? "COMMUNITY_SUBMITTED" : "SCRAPER_VERIFIED",
    validYear: getCurrentYear(now),
    freshnessScore,
    proofNotes:
      raw.proofNotes ??
      `Diekstrak otomatis dari ${raw.sourceUrl} (${now.toISOString().slice(0, 10)})`,
    proofImageUrl: raw.proofImageUrl ?? null,
  };
}
