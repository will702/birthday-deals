import pLimit from "p-limit";
import { prisma } from "../lib/prisma";
import { fetchPage } from "./http";
import { computeFreshnessScore, detectExpirationSignals } from "./normalizer";
import type { SourceHealth } from "./types";

export interface FreshnessSummary {
  checkedCount: number;
  liveCount: number;
  staleMarked: number;
  expiredMarked: number;
  botProtectedCount: number;
  dealsUpdated: number;
  errors: string[];
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export async function runFreshnessChecker(): Promise<FreshnessSummary> {
  const startedAt = new Date();
  const runLog = await prisma.scrapeRun.create({
    data: {
      sourceName: "Freshness & Source Link Checker",
      status: "RUNNING",
      startedAt,
    },
  });

  const deals = await prisma.deal.findMany({
    where: {
      verificationStatus: { not: "EXPIRED" },
    },
    orderBy: { lastVerifiedAt: "asc" },
    take: 40,
  });

  const limit = pLimit(4);
  let liveCount = 0;
  let staleMarked = 0;
  let expiredMarked = 0;
  let botProtectedCount = 0;
  let dealsUpdated = 0;
  const errors: string[] = [];

  await Promise.all(
    deals.map((deal) =>
      limit(async () => {
        let sourceHealth: SourceHealth = "UNKNOWN";

        if (deal.sourceUrl) {
          const res = await fetchPage(deal.sourceUrl, { timeoutMs: 9_000 });
          if (res.skipReason === "robots-disallowed") {
            // Not fetched on purpose: leave health unknown rather than calling it bot protection.
            sourceHealth = "UNKNOWN";
          } else if (res.blocked) {
            sourceHealth = "BOT_PROTECTED";
            botProtectedCount += 1;
          } else if (res.status === 404 || res.status === 410) {
            sourceHealth = "NOT_FOUND";
          } else if (res.ok) {
            const exp = detectExpirationSignals(res.text);
            if (exp.likelyExpired) {
              sourceHealth = "EXPIRED_SIGNAL";
            } else {
              sourceHealth = "LIVE";
              liveCount += 1;
            }
          } else if (res.status === 0) {
            errors.push(`${deal.brandName}: ${res.blockReason || "Koneksi gagal"}`);
          }
        }

        const now = new Date();
        const ageMs = now.getTime() - deal.lastVerifiedAt.getTime();
        let nextStatus = deal.verificationStatus;

        if (
          sourceHealth === "EXPIRED_SIGNAL" ||
          (deal.expiredReportCount >= 3 && deal.expiredReportCount > deal.stillWorksCount)
        ) {
          nextStatus = "EXPIRED";
          expiredMarked += 1;
        } else if (
          (ageMs > NINETY_DAYS_MS || sourceHealth === "NOT_FOUND") &&
          deal.verificationStatus !== "ADMIN_VERIFIED"
        ) {
          nextStatus = "STALE";
          staleMarked += 1;
        }

        const freshnessScore = computeFreshnessScore({
          lastVerifiedAt: deal.lastVerifiedAt,
          lastScrapedAt: sourceHealth === "LIVE" ? now : deal.lastScrapedAt,
          stillWorksCount: deal.stillWorksCount,
          expiredReportCount: deal.expiredReportCount,
          sourceHealth,
          now,
        });

        const nextLastScrapedAt = sourceHealth === "LIVE" ? now : deal.lastScrapedAt;
        const changed =
          freshnessScore !== deal.freshnessScore ||
          nextStatus !== deal.verificationStatus ||
          (nextLastScrapedAt?.getTime() ?? null) !== (deal.lastScrapedAt?.getTime() ?? null);

        if (changed) {
          await prisma.deal.update({
            where: { id: deal.id },
            data: {
              freshnessScore,
              verificationStatus: nextStatus,
              lastScrapedAt: nextLastScrapedAt,
            },
          });
          dealsUpdated += 1;
        }
      }),
    ),
  );

  await prisma.scrapeRun.update({
    where: { id: runLog.id },
    data: {
      status:
        errors.length > 0 && liveCount === 0 ? "FAILED" : errors.length > 0 ? "PARTIAL" : "SUCCESS",
      dealsFound: deals.length,
      dealsUpdated,
      errorMessage: errors.length > 0 ? errors.slice(0, 5).join("; ") : null,
      completedAt: new Date(),
    },
  });

  return {
    checkedCount: deals.length,
    liveCount,
    staleMarked,
    expiredMarked,
    botProtectedCount,
    dealsUpdated,
    errors,
  };
}
