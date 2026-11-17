"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search, X } from "lucide-react";
import type { DealSummaryDto } from "@/lib/deal-types";
import { DEAL_CATEGORIES } from "@/lib/validation";
import { BirthdayPlanner } from "./BirthdayPlanner";
import { DealCard } from "./DealCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PillTabs } from "@/components/ui/PillTabs";
import { Select } from "@/components/ui/Field";

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

const ACTIVE_STATUSES_EXCLUDE: string[] = ["EXPIRED"];

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
  // Entrance animation only on first render; filtering must not re-animate.
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHasAnimated(true), 900);
    return () => clearTimeout(t);
  }, []);

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
    const active = deals.filter(
      (d) => !ACTIVE_STATUSES_EXCLUDE.includes(d.verificationStatus),
    );
    const free100 = active.filter((d) => d.discountType === "FREE_100");
    const discount50 = active.filter(
      (d) =>
        d.discountType === "FREE_100" ||
        d.discountType === "BOGO" ||
        (d.discountValue ?? 0) >= 50,
    );
    return {
      totalActive: active.length,
      free100Count: free100.length,
      discount50Count: discount50.length,
    };
  }, [deals]);

  const quickTabCounts = useMemo(() => {
    const active = deals.filter((d) => d.verificationStatus !== "EXPIRED");
    return {
      all: active.length,
      free_100: active.filter((d) => d.discountType === "FREE_100").length,
      discount_50_plus: active.filter(
        (d) =>
          d.discountType === "FREE_100" ||
          d.discountType === "BOGO" ||
          (d.discountValue ?? 0) >= 50,
      ).length,
      no_min_spend: active.filter((d) => d.minPurchaseIdr === 0).length,
      ktp_only: active.filter((d) => d.requiresIdCard && !d.requiresApp).length,
      app_required: active.filter((d) => d.requiresApp).length,
      needs_check: deals.filter(
        (d) => d.verificationStatus === "STALE" || d.verificationStatus === "EXPIRED",
      ).length,
    } satisfies Record<QuickFilter, number>;
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

  const quickTabs: Array<{ value: QuickFilter; label: string }> = [
    { value: "all", label: "Semua Aktif" },
    { value: "free_100", label: "100% Gratis" },
    { value: "discount_50_plus", label: "Diskon 50%+" },
    { value: "no_min_spend", label: "Tanpa Min. Belanja" },
    { value: "ktp_only", label: "Cukup KTP" },
    { value: "app_required", label: "Wajib Aplikasi" },
    { value: "needs_check", label: "Perlu Cek Ulang" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* Editorial hero: the claim, the proof, then the tools */}
      <section className="pt-10 sm:pt-14 pb-8 max-w-3xl">
        <h1 className="font-serif text-display-xl text-ink">
          Setiap ulang tahun punya bagiannya.
        </h1>
        <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-ink-2">
          Direktori promo ulang tahun di Indonesia—dari Boost Juice 100% gratis
          hingga diskon restoran 50%—dipantau scraper web dan diverifikasi
          komunitas dengan bukti struk atau tautan resmi.
        </p>
        <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
          <span>
            <strong className="font-serif text-base font-medium text-ink tabular-nums">
              {stats.totalActive}
            </strong>{" "}
            promo aktif
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span>
            <strong className="font-serif text-base font-medium text-emerald tabular-nums">
              {stats.free100Count}
            </strong>{" "}
            gratis total
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span>
            <strong className="font-serif text-base font-medium text-accent tabular-nums">
              {stats.discount50Count}
            </strong>{" "}
            diskon 50%+
          </span>
          {lastScrapedIso && (
            <>
              <span aria-hidden="true" className="hidden sm:inline">
                ·
              </span>
              <span>
                scraper terakhir{" "}
                {new Date(lastScrapedIso).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </>
          )}
        </p>
      </section>

      {/* Search, Filters & Sort Controls */}
      <section
        aria-label="Filter dan Pencarian Promo"
        className="sticky top-16 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-canvas/90 border-y border-hairline space-y-3"
      >
        <div className="flex flex-col md:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari brand atau promo — Boost, Sushi Tei, Starbucks…"
              aria-label="Cari brand atau promo"
              className="field w-full rounded-lg border border-line-strong bg-surface pl-9 pr-9 py-2 text-sm text-ink placeholder:text-ink-muted"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Hapus pencarian"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-muted hover:text-ink pressable focus-ring"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <Select
              aria-label="Kategori promo"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full sm:w-auto font-medium"
            >
              <option value="ALL">Semua Kategori</option>
              {DEAL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>

            <Select
              aria-label="Urutkan promo"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "freshness" | "discount" | "votes" | "newest")
              }
              className="w-full sm:w-auto font-medium"
            >
              <option value="freshness">Terbaru</option>
              <option value="discount">Diskon Terbesar</option>
              <option value="votes">Konfirmasi Terbanyak</option>
              <option value="newest">Baru Ditambahkan</option>
            </Select>

            <Button
              variant="outline"
              onClick={refreshFromApi}
              disabled={isRefreshing}
              className="shrink-0"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Segarkan</span>
            </Button>
          </div>
        </div>

        <PillTabs
          aria-label="Filter cepat"
          options={quickTabs.map((tab) => ({
            ...tab,
            count: quickTabCounts[tab.value],
          }))}
          value={quickFilter}
          onChange={setQuickFilter}
        />
      </section>

      {/* Error State */}
      {fetchError && (
        <div
          role="alert"
          className="reveal mt-4 rounded-xl border border-danger-line bg-danger-bg p-4 flex items-center justify-between gap-4 text-sm text-danger-ink"
        >
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={refreshFromApi}
            className="rounded-lg border border-danger-line px-3 py-1 text-xs font-semibold text-danger-ink hover:bg-danger-ink hover:text-white hover:border-danger-ink pressable focus-ring"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Result Count */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
        <span>
          Menampilkan{" "}
          <strong className="text-ink tabular-nums">{filteredDeals.length}</strong>{" "}
          promo
        </span>
        <Link
          href="/submit"
          className="font-semibold text-accent hover:text-accent-hover underline-offset-4 hover:underline rounded-md pressable focus-ring"
        >
          Punya temuan promo lain? Kirim dengan bukti
        </Link>
      </div>

      {/* Grid / Skeleton / Empty */}
      <div className="mt-3">
        {isRefreshing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-[22rem] rounded-2xl border border-hairline bg-surface p-5 space-y-3"
              >
                <div className="flex justify-between">
                  <div className="h-4 w-28 rounded-md skeleton" />
                  <div className="h-4 w-20 rounded-md skeleton" />
                </div>
                <div className="h-10 w-24 rounded-md skeleton" />
                <div className="h-4 w-4/5 rounded-md skeleton" />
                <div className="h-4 w-3/5 rounded-md skeleton" />
                <div className="h-12 w-full rounded-md skeleton" />
              </div>
            ))}
          </div>
        ) : filteredDeals.length === 0 ? (
          <EmptyState
            title="Tidak ada promo yang cocok"
            description="Coba ubah kata kunci pencarian atau reset filter untuk melihat semua promo ulang tahun Indonesia."
            action={
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" onClick={resetAllFilters}>
                  Reset Semua Filter
                </Button>
                <Link href="/submit" className="inline-flex">
                  <Button variant="secondary">Kirim Temuan Baru</Button>
                </Link>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDeals.map((deal, index) => (
              <DealCard
                key={deal.id}
                deal={deal}
                nowIso={nowIso}
                revealIndex={hasAnimated ? undefined : index}
              />
            ))}
          </div>
        )}
      </div>

      {/* Birthday planner: the quiet close that turns finds into a plan */}
      <BirthdayPlanner
        deals={deals}
        nowIso={nowIso}
        onApplyPlannerFilter={(mode) => {
          setQuickFilter(mode === "prep_apps" ? "app_required" : "ktp_only");
        }}
      />
    </div>
  );
}
