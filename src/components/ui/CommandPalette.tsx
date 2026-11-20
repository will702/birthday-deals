"use client";

import { Command } from "cmdk";
import { ArrowUpRight, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog, DialogPopup } from "./Dialog";
import { getBrandInitials, getCategoryMeta, getValueHeadline, type DealSummaryDto } from "@/lib/deal-types";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deals: DealSummaryDto[];
  onQuickSelectFilter?: (filter: "free_100" | "ktp_only" | "app_required") => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  deals,
  onQuickSelectFilter,
}: CommandPaletteProps) {
  const router = useRouter();
  const activeDeals = deals.filter((d) => d.verificationStatus !== "EXPIRED");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup
        showCloseButton={false}
        className="max-w-xl p-0 overflow-hidden"
        aria-label="Pencarian cepat promo ulang tahun"
      >
        <Command className="flex flex-col bg-surface text-ink">
          <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <Command.Input
              autoFocus
              placeholder="Ketik nama brand, kategori, atau aplikasi (Starbucks, Sushi Tei, KTP)…"
              className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted outline-none"
            />
            <kbd className="hidden sm:inline-flex rounded-md border border-hairline bg-canvas px-1.5 py-0.5 font-mono text-[10px] font-medium text-ink-muted">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-10 text-center text-xs text-ink-muted">
              Tidak ada brand atau promo yang cocok.
            </Command.Empty>

            {onQuickSelectFilter && (
              <Command.Group
                heading="Filter Cepat"
                className="mb-2 px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink-muted"
              >
                <Command.Item
                  value="filter 100% gratis free"
                  onSelect={() => {
                    onQuickSelectFilter("free_100");
                    onOpenChange(false);
                  }}
                  className="flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold text-ink aria-selected:bg-subtle"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-emerald" aria-hidden="true" />
                    Tampilkan hanya promo 100% Gratis
                  </span>
                  <span className="font-mono text-[11px] text-ink-muted">Filter</span>
                </Command.Item>
                <Command.Item
                  value="filter langsung ktp tanpa aplikasi"
                  onSelect={() => {
                    onQuickSelectFilter("ktp_only");
                    onOpenChange(false);
                  }}
                  className="flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold text-ink aria-selected:bg-subtle"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                    Promo walk-in cukup bawa KTP
                  </span>
                  <span className="font-mono text-[11px] text-ink-muted">Filter</span>
                </Command.Item>
              </Command.Group>
            )}

            <Command.Group
              heading={`Promo Aktif (${activeDeals.length})`}
              className="px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink-muted"
            >
              {activeDeals.map((deal) => {
                const catMeta = getCategoryMeta(deal.category);
                const headline = getValueHeadline(deal.discountType, deal.discountValue, deal.title);
                return (
                  <Command.Item
                    key={deal.id}
                    value={`${deal.brandName} ${deal.title} ${deal.category} ${deal.appName || ""}`}
                    onSelect={() => {
                      onOpenChange(false);
                      router.push(`/deals/${deal.slug}`);
                    }}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-sm aria-selected:bg-subtle"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-xs font-bold",
                          catMeta.avatarBgClass,
                          catMeta.avatarTextClass,
                        )}
                      >
                        {getBrandInitials(deal.brandName)}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-ink text-xs sm:text-sm">
                          {deal.brandName}
                        </div>
                        <div className="truncate text-[11px] text-ink-muted">
                          {deal.title}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-mono text-[11px] font-bold",
                          headline.tone === "emerald"
                            ? "bg-success-bg text-emerald"
                            : "bg-accent-soft text-accent-hover",
                        )}
                      >
                        {headline.numeral}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
                    </div>
                  </Command.Item>
                );
              })}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogPopup>
    </Dialog>
  );
}
