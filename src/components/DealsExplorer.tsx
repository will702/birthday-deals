"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Clapperboard,
  Coffee,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Utensils,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getCategoryMeta, type DealSummaryDto } from "@/lib/deal-types";
import { cn } from "@/lib/utils";
import { DEAL_CATEGORIES } from "@/lib/validation";
import { BirthdayPlanner } from "./BirthdayPlanner";
import { DealCard } from "./DealCard";
import { Button } from "@/components/ui/Button";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { EmptyState } from "@/components/ui/EmptyState";
import { PillTabs } from "@/components/ui/PillTabs";
import { SelectMenu } from "@/components/ui/SelectMenu";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/Sheet";

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

type SortKey = "freshness" | "discount" | "votes" | "newest";

const ACTIVE_STATUSES_EXCLUDE: string[] = ["EXPIRED"];

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "freshness", label: "Terbaru & Segar" },
  { value: "discount", label: "Diskon Terbesar" },
  { value: "votes", label: "Konfirmasi Terbanyak" },
  { value: "newest", label: "Baru Ditambahkan" },
];

const QUICK_TABS: Array<{ value: QuickFilter; label: string }> = [
  { value: "all", label: "Semua Aktif" },
  { value: "free_100", label: "100% Gratis" },
  { value: "discount_50_plus", label: "Diskon 50%+" },
  { value: "no_min_spend", label: "Tanpa Min. Belanja" },
  { value: "ktp_only", label: "Cukup KTP" },
  { value: "app_required", label: "Wajib Aplikasi" },
  { value: "needs_check", label: "Perlu Cek Ulang" },
];

function CategoryIcon({ category }: { category: string }) {
  switch (category) {
    case "F&B":
      return <Utensils className="h-3.5 w-3.5" aria-hidden="true" />;
    case "Drink & Cafe":
      return <Coffee className="h-3.5 w-3.5" aria-hidden="true" />;
    case "Cinema & Entertainment":
      return <Clapperboard className="h-3.5 w-3.5" aria-hidden="true" />;
    case "Beauty & Retail":
      return <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />;
    case "Other":
      return <Tag className="h-3.5 w-3.5" aria-hidden="true" />;
    default:
      return <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />;
  }
}

export function DealsExplorer({
  initialDeals,
  nowIso,
  lastScrapedIso,
}: DealsExplorerProps) {
  const searchParams = useSearchParams();
  const shouldOpenFromUrl = searchParams.get("search") === "1";
  const [deals, setDeals] = useState<DealSummaryDto[]>(initialDeals);
  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [category, setCategory] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("freshness");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // Entrance animation only on first render; filtering must not re-animate.
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHasAnimated(true), 900);
    return () => clearTimeout(t);
  }, []);

  // Global Cmd+K / Ctrl+K + header search trigger + ?search=1 query support
  useEffect(() => {
    if (!shouldOpenFromUrl) return;
    const id = requestAnimationFrame(() => {
      setCommandOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    });
    return () => cancelAnimationFrame(id);
  }, [shouldOpenFromUrl]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    }
    function onOpenSearch() {
      setCommandOpen(true);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("ultahid:open-search", onOpenSearch);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("ultahid:open-search", onOpenSearch);
    };
  }, []);

  async function refreshFromApi() {
    setIsRefreshing(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/deals?status=all");
      if (!res.ok) throw new Error("Gagal memuat ulang data promo.");
      const json = await res.json();
      if (Array.isArray(json.deals)) {
        const mapped: DealSummaryDto[] = json.deals.map((d: Record<string, unknown>) => {
          const proofs = Array.isArray(d.proofs)
            ? (d.proofs as Array<{ proofImageUrl?: string | null }>)
            : [];
          return {
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
              (d._count as { verifications?: number } | undefined)?.verifications ?? 0,
            ),
            latestProofImageUrl: proofs[0]?.proofImageUrl ?? null,
          };
        });
        setDeals(mapped);
        toast.success(`Daftar diperbarui (${mapped.length} promo dimuat).`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan jaringan.";
      setFetchError(msg);
      toast.error(msg);
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

  const categoryCounts = useMemo(() => {
    const active = deals.filter((d) => d.verificationStatus !== "EXPIRED");
    const counts: Record<string, number> = { ALL: active.length };
    for (const cat of DEAL_CATEGORIES) {
      counts[cat] = active.filter((d) => d.category === cat).length;
    }
    return counts;
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

  const activeFilterCount =
    (category !== "ALL" ? 1 : 0) +
    (quickFilter !== "all" ? 1 : 0) +
    (sortBy !== "freshness" ? 1 : 0);

  const hasAnyActiveFilter =
    query.trim().length > 0 || category !== "ALL" || quickFilter !== "all";

  function resetAllFilters() {
    setQuery("");
    setQuickFilter("all");
    setCategory("ALL");
    setSortBy("freshness");
  }

  function applyPlannerMode(mode: "prep_apps" | "walk_in_ktp") {
    setCategory("ALL");
    setQuickFilter(mode === "prep_apps" ? "app_required" : "ktp_only");
    const target = document.getElementById("katalog-promo");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const categoryOptions = [
    { value: "ALL", label: "Semua Kategori", count: categoryCounts.ALL ?? 0 },
    ...DEAL_CATEGORIES.map((cat) => ({
      value: cat,
      label: cat,
      count: categoryCounts[cat] ?? 0,
    })),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* 12-Col Bento Discovery Hero (Above the Fold) */}
      <section className="pt-6 sm:pt-8 pb-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Bento: High-Contrast Brand Claim & Live Metrics */}
        <div className="lg:col-span-7 relative overflow-hidden rounded-3xl bg-ink p-6 sm:p-8 text-white flex flex-col justify-between">
          <div className="bento-dots pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-accent-vivid/25 blur-3xl"
          />

          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-white/95 whitespace-nowrap">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-vivid" aria-hidden="true" />
                Terverifikasi Komunitas
              </span>
              {lastScrapedIso && (
                <span className="inline-flex items-center rounded-full border border-white/12 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-white/75 whitespace-nowrap">
                  Update{" "}
                  {new Date(lastScrapedIso).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              )}
            </div>

            <h1 className="mt-4 font-display text-display-xl text-white">
              Klaim semua traktiran ulang tahunmu.
            </h1>

            <p className="mt-3 max-w-xl text-sm sm:text-base leading-relaxed text-white/78">
              Dari smoothie 100% gratis hingga diskon restoran 50% di Indonesia —
              lengkap dengan lead-time daftar aplikasi dan bukti struk nyata.
            </p>
          </div>

          <div className="relative z-10 mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setQuickFilter("all")}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 pressable focus-ring cursor-pointer"
            >
              <span className="font-mono font-bold tabular-nums">{stats.totalActive}</span>
              promo aktif
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter("free_100")}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#047857]/35 border border-[#34D399]/35 px-3 py-1.5 text-xs font-semibold text-[#A7F3D0] hover:bg-[#047857]/50 pressable focus-ring cursor-pointer"
            >
              <span className="font-mono font-bold tabular-nums">{stats.free100Count}</span>
              gratis 100%
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter("discount_50_plus")}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent-vivid/25 border border-accent-vivid/45 px-3 py-1.5 text-xs font-semibold text-[#FFD5C8] hover:bg-accent-vivid/40 pressable focus-ring cursor-pointer"
            >
              <span className="font-mono font-bold tabular-nums">{stats.discount50Count}</span>
              diskon 50%+
            </button>
          </div>
        </div>

        {/* Right Bento: Above-the-Fold H-30 Birthday Planner */}
        <div className="lg:col-span-5">
          <BirthdayPlanner
            deals={deals}
            nowIso={nowIso}
            onApplyPlannerFilter={applyPlannerMode}
          />
        </div>
      </section>

      {/* Vibrant Category Quick-Browse Band */}
      <section aria-label="Jelajahi berdasarkan kategori" className="pb-4">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-1">
          {categoryOptions.map((item) => {
            const active = category === item.value;
            const catMeta = item.value === "ALL" ? null : getCategoryMeta(item.value);
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(item.value)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold transition-colors pressable focus-ring cursor-pointer",
                  active
                    ? "border-ink bg-ink text-white shadow-xs"
                    : "border-hairline bg-surface text-ink hover:border-line-strong hover:bg-subtle/60",
                )}
              >
                <span
                  className={cn(
                    active
                      ? "text-accent-vivid"
                      : catMeta
                        ? catMeta.iconColorClass
                        : "text-ink-2",
                  )}
                >
                  <CategoryIcon category={item.value} />
                </span>
                <span>{item.label}</span>
                <span
                  className={cn(
                    "font-mono text-[11px] tabular-nums",
                    active ? "text-white/75" : "text-ink-muted",
                  )}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Razor-Thin Frosted Sticky Filter Toolbar (Single Row on Mobile!) */}
      <section
        id="katalog-promo"
        aria-label="Filter dan Pencarian Promo"
        className="sticky top-16 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-canvas/85 backdrop-blur-md border-y border-hairline scroll-mt-16"
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari brand atau promo — Boost, Sushi Tei…"
              aria-label="Cari brand atau promo"
              className={cn(
                "field h-10 w-full rounded-xl border border-line-strong bg-surface pl-10 text-sm text-ink placeholder:text-ink-muted",
                query ? "pr-9" : "pr-9 sm:pr-14",
              )}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Hapus pencarian"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-muted hover:text-ink pressable focus-ring cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                aria-label="Buka pencarian cepat Command+K"
                className="hidden sm:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center gap-1 rounded-md border border-hairline bg-canvas px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-muted hover:text-ink cursor-pointer"
              >
                ⌘K
              </button>
            )}
          </div>

          {/* Desktop Controls */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <div className="w-48">
              <SelectMenu
                aria-label="Urutkan promo"
                value={sortBy}
                onValueChange={setSortBy}
                options={SORT_OPTIONS}
              />
            </div>

            <div
              role="group"
              aria-label="Mode tampilan"
              className="inline-flex h-10 items-center rounded-xl border border-line-strong bg-surface p-1"
            >
              <button
                type="button"
                aria-label="Tampilan grid"
                aria-pressed={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer focus-ring",
                  viewMode === "grid"
                    ? "bg-ink text-white"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Tampilan daftar ringkas"
                aria-pressed={viewMode === "list"}
                onClick={() => setViewMode("list")}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer focus-ring",
                  viewMode === "list"
                    ? "bg-ink text-white"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                <List className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <Button
              variant="outline"
              onClick={refreshFromApi}
              disabled={isRefreshing}
              aria-label="Segarkan daftar promo"
              className="shrink-0"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
                aria-hidden="true"
              />
              <span>Segarkan</span>
            </Button>
          </div>

          {/* Mobile Single-Button Filter Sheet Trigger */}
          <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
            <SheetTrigger
              aria-label="Buka filter dan urutan"
              className="md:hidden relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3 text-xs font-semibold text-ink shadow-2xs pressable focus-ring cursor-pointer"
            >
              <SlidersHorizontal className="h-4 w-4 text-ink-2" aria-hidden="true" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold text-white tabular-nums">
                  {activeFilterCount}
                </span>
              )}
            </SheetTrigger>

            <SheetPopup side="bottom">
              <SheetHeader>
                <SheetTitle>Filter &amp; Urutkan Promo</SheetTitle>
                <SheetDescription>
                  Sesuaikan kategori, syarat klaim, dan urutan katalog UltahID.
                </SheetDescription>
              </SheetHeader>

              <SheetBody className="space-y-5">
                <div className="space-y-2">
                  <div className="text-micro font-bold uppercase text-ink-muted">
                    Kategori Brand
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categoryOptions.map((item) => {
                      const active = category === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setCategory(item.value)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer pressable",
                            active
                              ? "border-ink bg-ink text-white"
                              : "border-hairline bg-canvas text-ink-2",
                          )}
                        >
                          {item.label}
                          <span className="font-mono text-[10px] opacity-75">
                            {item.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-micro font-bold uppercase text-ink-muted">
                    Syarat &amp; Jenis Diskon
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_TABS.map((tab) => {
                      const active = quickFilter === tab.value;
                      return (
                        <button
                          key={tab.value}
                          type="button"
                          onClick={() => setQuickFilter(tab.value)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer pressable",
                            active
                              ? "border-accent bg-accent text-white"
                              : "border-hairline bg-canvas text-ink-2",
                          )}
                        >
                          {tab.label}
                          <span className="font-mono text-[10px] opacity-80">
                            {quickTabCounts[tab.value]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="text-micro font-bold uppercase text-ink-muted">
                      Urutkan
                    </div>
                    <SelectMenu
                      aria-label="Urutkan promo"
                      value={sortBy}
                      onValueChange={setSortBy}
                      options={SORT_OPTIONS}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-micro font-bold uppercase text-ink-muted">
                      Tampilan
                    </div>
                    <div className="grid grid-cols-2 h-10 rounded-xl border border-line-strong bg-canvas p-1">
                      <button
                        type="button"
                        onClick={() => setViewMode("grid")}
                        className={cn(
                          "rounded-lg text-xs font-semibold cursor-pointer",
                          viewMode === "grid" ? "bg-surface text-ink shadow-2xs" : "text-ink-muted",
                        )}
                      >
                        Grid
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("list")}
                        className={cn(
                          "rounded-lg text-xs font-semibold cursor-pointer",
                          viewMode === "list" ? "bg-surface text-ink shadow-2xs" : "text-ink-muted",
                        )}
                      >
                        List
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshFromApi}
                  disabled={isRefreshing}
                  className="w-full"
                >
                  <RefreshCw
                    className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
                    aria-hidden="true"
                  />
                  Segarkan Data dari Server
                </Button>
              </SheetBody>

              <SheetFooter>
                <Button variant="ghost" size="sm" onClick={resetAllFilters}>
                  Reset Semua
                </Button>
                <SheetClose
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-ink px-4 text-xs font-semibold text-white hover:bg-ink/88 cursor-pointer"
                >
                  Lihat {filteredDeals.length} Promo
                </SheetClose>
              </SheetFooter>
            </SheetPopup>
          </Sheet>
        </div>
      </section>

      {/* Non-sticky Segmented Quick-Filter Pills (Desktop / Tablet) */}
      <div className="mt-4 hidden md:block">
        <PillTabs
          aria-label="Filter cepat"
          options={QUICK_TABS.map((tab) => ({
            ...tab,
            count: quickTabCounts[tab.value],
          }))}
          value={quickFilter}
          onChange={setQuickFilter}
        />
      </div>

      {/* Error State */}
      {fetchError && (
        <div
          role="alert"
          className="reveal mt-4 rounded-2xl border border-danger-line bg-danger-bg p-4 flex items-center justify-between gap-4 text-sm text-danger-ink"
        >
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={refreshFromApi}
            className="rounded-xl border border-danger-line bg-surface px-3 py-1.5 text-xs font-semibold text-danger-ink hover:bg-danger-ink hover:text-white pressable focus-ring cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Result Count + Active Filter Chips */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            Menampilkan{" "}
            <strong className="font-mono text-ink tabular-nums">
              {filteredDeals.length}
            </strong>{" "}
            promo
          </span>

          {hasAnyActiveFilter && (
            <>
              <span aria-hidden="true">·</span>
              {category !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setCategory("ALL")}
                  className="inline-flex items-center gap-1 rounded-full border border-hairline bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-ink hover:border-line-strong cursor-pointer"
                >
                  {category}
                  <X className="h-3 w-3 text-ink-muted" aria-hidden="true" />
                </button>
              )}
              {quickFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setQuickFilter("all")}
                  className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold text-accent-hover cursor-pointer"
                >
                  {QUICK_TABS.find((t) => t.value === quickFilter)?.label}
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={resetAllFilters}
                className="font-semibold text-accent hover:underline cursor-pointer"
              >
                Reset
              </button>
            </>
          )}
        </div>

        <Link
          href="/submit"
          className="font-semibold text-accent hover:text-accent-hover underline-offset-4 hover:underline rounded-md pressable focus-ring"
        >
          Punya temuan promo lain? Kirim dengan bukti →
        </Link>
      </div>

      {/* Grid / List / Skeleton / Empty */}
      <div className="mt-3">
        {isRefreshing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-[19rem] rounded-2xl border border-hairline bg-surface p-5 space-y-3"
              >
                <div className="flex justify-between">
                  <div className="h-9 w-36 rounded-xl skeleton" />
                  <div className="h-5 w-20 rounded-full skeleton" />
                </div>
                <div className="h-10 w-28 rounded-lg skeleton" />
                <div className="h-4 w-4/5 rounded-md skeleton" />
                <div className="h-4 w-3/5 rounded-md skeleton" />
                <div className="h-12 w-full rounded-xl skeleton" />
              </div>
            ))}
          </div>
        ) : filteredDeals.length === 0 ? (
          <EmptyState
            title="Tidak ada promo yang cocok"
            description="Coba ubah kata kunci pencarian atau reset filter untuk melihat semua promo ulang tahun Indonesia."
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
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
          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : "flex flex-col gap-3",
            )}
          >
            {filteredDeals.map((deal, index) => (
              <DealCard
                key={deal.id}
                deal={deal}
                nowIso={nowIso}
                layout={viewMode}
                revealIndex={hasAnimated ? undefined : index}
              />
            ))}
          </div>
        )}
      </div>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        deals={deals}
        onQuickSelectFilter={(filter) => setQuickFilter(filter)}
      />
    </div>
  );
}
