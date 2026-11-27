import { cityMatches, isNationwide } from "@/lib/cities";
import { daysUntilBirthday, windowFit } from "@/lib/birthday";
import type { PreferenceProfile } from "./signals";

export interface ScorableDeal {
  id: string;
  category: string;
  discountType: string;
  cities: string[];
  claimWindow: string;
  requiresApp: boolean;
  minRegistrationDays: number | null;
  freshnessScore: number;
  stillWorksCount: number;
  expiredReportCount: number;
  verificationStatus: string;
}

export interface ContentScore {
  /** 0..1 */
  score: number;
  reasons: string[];
  excluded: boolean;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Pure content-based scoring against a preference profile. */
export function scoreDealContent(
  deal: ScorableDeal,
  profile: PreferenceProfile,
  now: Date = new Date(),
): ContentScore {
  if (profile.dismissedDealIds.includes(deal.id)) {
    return { score: 0, reasons: [], excluded: true };
  }

  const reasons: string[] = [];
  let score = 0;

  // Category (0.30)
  const catWeight = profile.categoryWeights[deal.category] ?? 0;
  score += catWeight * 0.3;
  if (catWeight >= 0.4) {
    reasons.push(
      profile.preferredCategories.includes(deal.category)
        ? `Sesuai kategori favoritmu (${deal.category})`
        : `Kamu sering melihat promo ${deal.category}`,
    );
  }

  // Discount type affinity (0.05)
  score += (profile.discountTypeAffinity[deal.discountType] ?? 0) * 0.05;

  // City (0.2 / 0.1, -0.1 when only elsewhere)
  if (profile.city) {
    if (cityMatches(deal.cities, profile.city)) {
      score += 0.2;
      reasons.push("Cocok untuk kota kamu");
    } else if (isNationwide(deal.cities)) {
      score += 0.1;
      reasons.push("Berlaku di seluruh Indonesia");
    } else {
      score -= 0.1;
    }
  } else if (isNationwide(deal.cities)) {
    score += 0.04;
  }

  // Birthday window (0.2 / 0.12)
  if (profile.birthdayDay !== null && profile.birthdayMonth !== null) {
    const until = daysUntilBirthday(profile.birthdayDay, profile.birthdayMonth, now);
    const { fit, daysToOpen } = windowFit(deal.claimWindow, until, deal.minRegistrationDays);
    if (fit === "open") {
      score += 0.2;
      reasons.push("Bisa diklaim di hari ulang tahunmu");
    } else if (fit === "soon") {
      score += 0.12;
      reasons.push(`Jendela klaim dibuka ${daysToOpen} hari lagi`);
    }
  }

  // App requirement
  if (deal.requiresApp && !profile.appOk) score -= 0.12;
  else if (!deal.requiresApp && !profile.appOk) {
    score += 0.05;
    reasons.push("Tanpa perlu aplikasi");
  }

  // Freshness (0.1)
  score += clamp01(deal.freshnessScore / 100) * 0.1;
  if (deal.freshnessScore >= 90) reasons.push("Baru diperbarui");

  // Community votes (0.1)
  const votes = deal.stillWorksCount + deal.expiredReportCount;
  const voteBalance = (deal.stillWorksCount - deal.expiredReportCount) / (votes + 1);
  score += voteBalance * 0.1;
  if (deal.stillWorksCount >= 3 && voteBalance > 0.5) reasons.push("Dikonfirmasi komunitas");

  // Status penalties
  if (deal.verificationStatus === "EXPIRED") score -= 0.6;
  else if (deal.verificationStatus === "STALE") score -= 0.25;

  return { score: clamp01(score), reasons: reasons.slice(0, 3), excluded: false };
}
