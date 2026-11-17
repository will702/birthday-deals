"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search, X } from "lucide-react";
import type { DealSummaryDto } from "@/lib/deal-types";
import { DEAL_CATEGORIES } from "@/lib/validation";
import { BirthdayPlanner } from "./BirthdayPlanner";
import { DealCard } from "./DealCard";

interface DealsExplorerProps {
  initialDeals: DealSummaryDto[];
  nowIso: string;
  lastScrapedIso: string | null;
}

type QuickFilter =
  | "all"
  | "free_100"
  | "discount_50_plus"
  | "no_min_spend"
  | "ktp_only"
  | "app_required"
  | "needs_check";

export function DealsExplorer({
  initialDeals,
  nowIso,
  lastScrapedIso,
}: DealsExplorerProps) {
  const [deals, setDeals] = useState<DealSummaryDto[]>(initialDeals);
  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [category, setCategory] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"freshness" | "discount" | "votes" | "newest">("freshness");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  async function refreshFromApi() {
    setIsRefreshing(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/deals?status=all");
      if (!res.ok) throw new Error("Gagal memuat ulang data promo.");
      const json = await res.json();
      if (Array.isArray(json.deals)) {
        const mapped: DealSummaryDto[] = json.deals.map((d: Record<string, unknown>) => ({
          id: String(d.id),
          slug: String(d.slug),
          brandName: String(d.brandName),
          brandLogoUrl: (d.brandLogoUrl as string | null) ?? null,
          category: String(d.category),
          title: String(d.title),
          discountType: String(d.discountType),
          discountValue: (d.discountValue as number | null) ?? null,
          description: String(d.description),
          termsAndConditions: [],
          claimWindow: String(d.claimWindow),
          requiresApp: Boolean(d.requiresApp),
          appName: (d.appName as string | null) ?? null,
          minRegistrationDays: (d.minRegistrationDays as number | null) ?? null,
          requiresIdCard: Boolean(d.requiresIdCard),
          minPurchaseIdr: Number(d.minPurchaseIdr ?? 0),
          locations: String(d.locations),
          sourceUrl: (d.sourceUrl as string | null) ?? null,
          sourceType: String(d.sourceType),
          verificationStatus: String(d.verificationStatus),
          validYear: Number(d.validYear ?? 2026),
          stillWorksCount: Number(d.stillWorksCount ?? 1),
          expiredReportCount: Number(d.expiredReportCount ?? 0),
          freshnessScore: Number(d.freshnessScore ?? 80),
          lastScrapedAt: (d.lastScrapedAt as string | null) ?? null,
          lastVerifiedAt: String(d.lastVerifiedAt),
          createdAt: String(d.createdAt),
          proofCount: Number((d._count as { proofs?: number } | undefined)?.proofs ?? 0),
          verificationCount: Number(
            (d._count as { verifications?: number } | undefined)?.verifications ?? 0
          ),
          latestProofImageUrl: null,
        }));
        setDeals(mapped);
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Terjadi kesalahan jaringan.");
    } finally {
      setIsRefreshing(false);
    }
  }

  const stats = useMemo(() => {
    const active = deals.filter((d) => d.verificationStatus !== "EXPIRED");
    const free100 = active.filter((d) => d.discountType === "FREE_100");
    const discount50 = active.filter(
      (d) =>
        d.discountType === "FREE_100" ||
        d.discountType === "BOGO" ||
        (d.discountValue ?? 0) >= 50
    );
    return {
      totalActive: active.length,
      free100Count: free100.length,
      discount50Count: discount50.length,
    };
  }, [deals]);

  const filteredDeals = useMemo(() => {
    const q = query.trim().toLowerCase();

    const list = deals.filter((deal) => {
      if (quickFilter === "needs_check") {
        if (deal.verificationStatus !== "STALE" && deal.verificationStatus !== "EXPIRED") {
          return false;
        }
      } else if (deal.verificationStatus === "EXPIRED") {
        return false;
      }

      if (quickFilter === "free_100" && deal.discountType !== "FREE_100") return false;
      if (
        quickFilter === "discount_50_plus" &&
        deal.discountType !== "FREE_100" &&
        deal.discountType !== "BOGO" &&
        (deal.discountValue ?? 0) < 50
      ) {
        return false;
      }
      if (quickFilter === "no_min_spend" && deal.minPurchaseIdr > 0) return false;
      if (quickFilter === "ktp_only" && (!deal.requiresIdCard || deal.requiresApp)) {
        return false;
      }
      if (quickFilter === "app_required" && !deal.requiresApp) return false;

      if (category !== "ALL" && deal.category !== category) return false;

      if (q) {
        const hay = `${deal.brandName} ${deal.title} ${deal.description} ${deal.appName || ""} ${deal.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "discount") {
        const av = a.discountType === "FREE_100" ? 100 : (a.discountValue ?? 0);
        const bv = b.discountType === "FREE_100" ? 100 : (b.discountValue ?? 0);
        if (bv !== av) return bv - av;
      } else if (sortBy === "votes") {
        if (b.stillWorksCount !== a.stillWorksCount) {
          return b.stillWorksCount - a.stillWorksCount;
        }
      } else if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (b.freshnessScore !== a.freshnessScore) {
        return b.freshnessScore - a.freshnessScore;
      }
      if (b.stillWorksCount !== a.stillWorksCount) {
        return b.stillWorksCount - a.stillWorksCount;
      }
      const rank = (d: DealSummaryDto) =>
        d.verificationStatus === "ADMIN_VERIFIED"
          ? 4
          : d.sourceType === "SCRAPER_BRAND"
            ? 3
            : d.sourceType === "COMMUNITY"
              ? 2
              : d.sourceType === "SCRAPER_AGGREGATOR"
                ? 1
                : 0;
      return rank(b) - rank(a);
    });
  }, [deals, query, quickFilter, category, sortBy]);

  function resetAllFilters() {
    setQuery("");
    setQuickFilter("all");
    setCategory("ALL");
    setSortBy("freshness");
  }

  const quickTabs: Array<{ key: QuickFilter; label: string }> = [
    { key: "all", label: "Semua Aktif" },
    { key: "free_100", label: "100% Gratis" },
    { key: "discount_50_plus", label: "Diskon 50%+" },
    { key: "no_min_spend", label: "Tanpa Min. Belanja" },
    { key: "ktp_only", label: "Cukup KTP (Tanpa App)" },
    { key: "app_required", label: "Wajib Aplikasi" },
    { key: "needs_check", label: "Perlu Cek Ulang / Expired" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
      {/* Editorial Header + Real Database Telemetry */}
      <section className="border-b border-[#E4DDD3] pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#18181B]">
            Direktori Promo Ulang Tahun Indonesia
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#52525B] leading-relaxed">
            Kumpulan promo birthday treat di Indonesia—mulai dari Boost Juice 100% gratis, Sushi Tei, Starbucks, hingga diskon restoran 50%—yang dipantau scraper web dan diverifikasi ulang oleh komunitas dengan bukti struk atau tautan resmi.
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-3 shrink-0">
          <div className="rounded-md border border-[#E4DDD3] bg-white px-3.5 py-2.5">
            <dt className="text-[11px] font-medium text-[#71717A]">Promo Aktif</dt>
            <dd className="mt-0.5 font-mono text-lg font-bold text-[#18181B] tabular-nums">
              {stats.totalActive}
            </dd>
          </div>
          <div className="rounded-md border border-[#BCE3CE] bg-[#ECFDF3] px-3.5 py-2.5">
            <dt className="text-[11px] font-medium text-[#146C43]">100% Gratis</dt>
            <dd className="mt-0.5 font-mono text-lg font-bold text-[#146C43] tabular-nums">
              {stats.free100Count}
            </dd>
          </div>
          <div className="rounded-md border border-[#E4DDD3] bg-white px-3.5 py-2.5">
            <dt className="text-[11px] font-medium text-[#71717A]">Diskon 50%+</dt>
            <dd className="mt-0.5 font-mono text-lg font-bold text-[#C83228] tabular-nums">
              {stats.discount50Count}
            </dd>
          </div>
        </dl>
      </section>

      {/* Birthday Prep Planner */}
      <BirthdayPlanner
        deals={deals}
        nowIso={nowIso}
        onApplyPlannerFilter={(mode) => {
          setQuickFilter(mode === "prep_apps" ? "app_required" : "ktp_only");
        }}
      />

      {/* Search, Filters & Sort Controls */}
      <section aria-label="Filter dan Pencarian Promo" className="space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717A]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari brand atau promo (mis. Boost, Sushi Tei, Starbucks, 50%, Boga)..."
              aria-label="Cari brand atau promo"
              className="w-full rounded-md border border-[#D3C8B8] bg-white pl-9 pr-9 py-2 text-sm text-[#18181B] placeholder:text-[#71717A] focus:border-[#C83228] focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Hapus pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181B]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Kategori promo"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-md border border-[#D3C8B8] bg-white px-3 py-2 text-sm font-medium text-[#18181B] focus:border-[#C83228] focus:outline-none"
            >
              <option value="ALL">Semua Kategori</option>
              {DEAL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              aria-label="Urutkan promo"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "freshness" | "discount" | "votes" | "newest")
              }
              className="rounded-md border border-[#D3C8B8] bg-white px-3 py-2 text-sm font-medium text-[#18181B] focus:border-[#C83228] focus:outline-none"
            >
              <option value="freshness">Terbaru &amp; Freshness Tertinggi</option>
              <option value="discount">Diskon Terbesar (100% dulu)</option>
              <option value="votes">Konfirmasi Komunitas Terbanyak</option>
              <option value="newest">Baru Ditambahkan</option>
            </select>

            <button
              type="button"
              onClick={refreshFromApi}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#D3C8B8] bg-white px-3 py-2 text-sm font-medium text-[#18181B] hover:bg-[#F3EDE3] disabled:opacity-60 transition-colors"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Segarkan
            </button>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter cepat">
          {quickTabs.map((tab) => {
            const active = quickFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setQuickFilter(tab.key)}
                className={`rounded-md border px-3 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? "border-[#18181B] bg-[#18181B] text-white"
                    : "border-[#E4DDD3] bg-white text-[#52525B] hover:border-[#D3C8B8] hover:text-[#18181B]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Error State */}
      {fetchError && (
        <div
          role="alert"
          className="rounded-md border border-[#FECACA] bg-[#FEF2F2] p-4 flex items-center justify-between gap-4 text-sm text-[#C83228]"
        >
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={refreshFromApi}
            className="rounded border border-[#C83228] px-3 py-1 text-xs font-semibold hover:bg-[#C83228] hover:text-white"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Result Count + Last Scrape Metadata */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#71717A]">
        <span>
          Menampilkan <strong className="text-[#18181B] tabular-nums">{filteredDeals.length}</strong>{" "}
          promo
          {lastScrapedIso
            ? ` · Scraper terakhir jalan ${new Date(lastScrapedIso).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}`
            : ""}
        </span>
        <Link href="/submit" className="font-semibold text-[#C83228] hover:underline">
          Punya temuan promo lain? Kirim dengan bukti
        </Link>
      </div>

      {/* Loading Skeleton State during manual API refresh */}
      {isRefreshing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-64 rounded-lg border border-[#E4DDD3] bg-white p-4 animate-pulse space-y-3"
            >
              <div className="flex justify-between">
                <div className="h-5 w-24 rounded bg-[#F3EDE3]" />
                <div className="h-5 w-20 rounded bg-[#F3EDE3]" />
              </div>
              <div className="h-4 w-32 rounded bg-[#F3EDE3]" />
              <div className="h-5 w-4/5 rounded bg-[#F3EDE3]" />
              <div className="h-16 w-full rounded bg-[#FAF7F2]" />
            </div>
          ))}
        </div>
      ) : filteredDeals.length === 0 ? (
        /* Empty State */
        <div className="rounded-lg border border-[#E4DDD3] bg-white p-10 text-center">
          <p className="text-base font-bold text-[#18181B]">
            Tidak ada promo yang cocok dengan filter ini.
          </p>
          <p className="mt-1 text-sm text-[#52525B]">
            Coba ubah kata kunci pencarian atau reset filter untuk melihat semua promo ulang tahun Indonesia.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={resetAllFilters}
              className="rounded-md border border-[#D3C8B8] bg-[#FAF7F2] px-4 py-2 text-sm font-semibold text-[#18181B] hover:bg-[#F3EDE3]"
            >
              Reset Semua Filter
            </button>
            <Link
              href="/submit"
              className="rounded-md bg-[#C83228] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9F221A]"
            >
              Kirim Temuan Baru
            </Link>
          </div>
        </div>
      ) : (
        /* Populated Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDeals.map((deal) => (
            <DealCard key={deal.id} deal={deal} nowIso={nowIso} />
          ))}
        </div>
      )}
    </div>
  );
}
