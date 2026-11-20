"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, IdCard, ListChecks, Smartphone } from "lucide-react";
import type { DealSummaryDto } from "@/lib/deal-types";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/Dialog";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: `Tgl ${i + 1}`,
}));

const MONTH_OPTIONS = MONTHS.map((m, idx) => ({
  value: String(idx),
  label: m,
}));

interface BirthdayPlannerProps {
  deals: DealSummaryDto[];
  nowIso: string;
  onApplyPlannerFilter: (mode: "prep_apps" | "walk_in_ktp") => void;
}

export function BirthdayPlanner({
  deals,
  nowIso,
  onApplyPlannerFilter,
}: BirthdayPlannerProps) {
  const today = useMemo(() => new Date(nowIso), [nowIso]);
  const [day, setDay] = useState<number>(today.getDate());
  const [month, setMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [checklistOpen, setChecklistOpen] = useState<boolean>(false);

  const daysUntilBirthday = useMemo(() => {
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    let target = new Date(today.getFullYear(), month, day);
    if (target.getTime() < startOfToday.getTime()) {
      const diffPast = Math.round(
        (startOfToday.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffPast <= 7) {
        return -diffPast; // Still inside H+7 claim window!
      }
      target = new Date(today.getFullYear() + 1, month, day);
    }
    return Math.round(
      (target.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
    );
  }, [day, month, today]);

  const activeDeals = useMemo(
    () => deals.filter((d) => d.verificationStatus !== "EXPIRED"),
    [deals],
  );

  const prepAppDeals = useMemo(
    () =>
      activeDeals
        .filter((d) => d.requiresApp && (d.minRegistrationDays ?? 0) > 0)
        .sort(
          (a, b) => (b.minRegistrationDays ?? 0) - (a.minRegistrationDays ?? 0),
        ),
    [activeDeals],
  );

  const walkInDeals = useMemo(
    () => activeDeals.filter((d) => d.requiresIdCard && !d.requiresApp),
    [activeDeals],
  );

  const countdownMeta = useMemo(() => {
    if (daysUntilBirthday === 0) {
      return {
        pill: "HARI H!",
        pillClass: "bg-emerald text-white",
        note: "Selamat ulang tahun! Cek promo yang bisa diklaim langsung hari ini.",
      };
    }
    if (daysUntilBirthday < 0) {
      return {
        pill: `H+${Math.abs(daysUntilBirthday)}`,
        pillClass: "bg-success-bg text-emerald border border-success-line",
        note: "Baru lewat beberapa hari — masih banyak promo berlaku s/d H+7 & H+30.",
      };
    }
    if (daysUntilBirthday <= 7) {
      return {
        pill: `H-${daysUntilBirthday}`,
        pillClass: "bg-accent text-white",
        note: "Minggu ulang tahun! Promo H-7 s/d H+7 sudah mulai aktif diklaim.",
      };
    }
    if (daysUntilBirthday <= 30) {
      return {
        pill: `H-${daysUntilBirthday}`,
        pillClass: "bg-warn-bg text-amber border border-warn-line",
        note: "Waktu krusial untuk daftar aplikasi member yang mensyaratkan H-30 / H-7.",
      };
    }
    return {
      pill: `H-${daysUntilBirthday}`,
      pillClass: "bg-subtle text-ink border border-hairline",
      note: "Atur tanggal lahirmu untuk melihat promo mana yang perlu daftar aplikasi lebih awal.",
    };
  }, [daysUntilBirthday]);

  return (
    <>
      <section
        aria-label="Perencana Persiapan Promo Ulang Tahun"
        className="flex h-full flex-col justify-between rounded-3xl border border-hairline bg-surface p-5 sm:p-6 shadow-[0_2px_10px_-4px_rgb(17_19_23/0.06)]"
      >
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <CalendarDays className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight text-ink leading-tight">
                  Perencana Ultah H-30
                </h2>
                <p className="text-[11px] font-medium text-ink-muted">
                  Siapkan akun sebelum Hari H
                </p>
              </div>
            </div>

            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 font-mono text-xs font-bold tabular-nums",
                countdownMeta.pillClass,
              )}
            >
              {countdownMeta.pill}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div>
              <label className="sr-only" htmlFor="planner-day">
                Tanggal Lahir
              </label>
              <SelectMenu
                id="planner-day"
                aria-label="Tanggal lahir"
                size="sm"
                value={String(day)}
                onValueChange={(v) => setDay(Number(v))}
                options={DAY_OPTIONS}
                className="font-mono font-semibold tabular-nums"
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="planner-month">
                Bulan Lahir
              </label>
              <SelectMenu
                id="planner-month"
                aria-label="Bulan lahir"
                size="sm"
                value={String(month)}
                onValueChange={(v) => setMonth(Number(v))}
                options={MONTH_OPTIONS}
                className="font-semibold"
              />
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-ink-2">
            {countdownMeta.note}
          </p>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onApplyPlannerFilter("prep_apps")}
              className="group rounded-2xl border border-warn-line bg-warn-bg/80 p-3 text-left transition-colors hover:bg-warn-bg pressable focus-ring cursor-pointer"
            >
              <div className="flex items-center justify-between gap-1 text-amber">
                <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                <ArrowRight
                  className="h-3 w-3 opacity-60 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-1.5 font-display text-xl font-extrabold leading-none text-ink tabular-nums">
                {prepAppDeals.length}
              </div>
              <div className="mt-1 text-[11px] font-semibold text-amber">
                Wajib Daftar App
              </div>
            </button>

            <button
              type="button"
              onClick={() => onApplyPlannerFilter("walk_in_ktp")}
              className="group rounded-2xl border border-success-line bg-success-bg/80 p-3 text-left transition-colors hover:bg-success-bg pressable focus-ring cursor-pointer"
            >
              <div className="flex items-center justify-between gap-1 text-emerald">
                <IdCard className="h-3.5 w-3.5" aria-hidden="true" />
                <ArrowRight
                  className="h-3 w-3 opacity-60 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-1.5 font-display text-xl font-extrabold leading-none text-ink tabular-nums">
                {walkInDeals.length}
              </div>
              <div className="mt-1 text-[11px] font-semibold text-emerald">
                Langsung KTP
              </div>
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setChecklistOpen(true)}
            className="w-full h-9 rounded-xl"
          >
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
            Buka Checklist Persiapan ({prepAppDeals.length + walkInDeals.length})
          </Button>
        </div>
      </section>

      <Dialog open={checklistOpen} onOpenChange={setChecklistOpen}>
        <DialogPopup className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold tabular-nums",
                  countdownMeta.pillClass,
                )}
              >
                {countdownMeta.pill}
              </span>
              <span className="text-xs font-medium text-ink-muted">
                Ulang tahun: {day} {MONTHS[month]}
              </span>
            </div>
            <DialogTitle className="mt-1">
              Checklist Persiapan Klaim Ulang Tahun
            </DialogTitle>
            <DialogDescription>
              {countdownMeta.note}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-micro font-bold uppercase text-amber">
                  Wajib Daftar Aplikasi ({prepAppDeals.length})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setChecklistOpen(false);
                    onApplyPlannerFilter("prep_apps");
                  }}
                  className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                >
                  Filter semua
                </button>
              </div>
              <p className="text-xs text-ink-2">
                Brand seperti Starbucks &amp; Boost menolak klaim jika akun baru dibuat mendekati hari H.
              </p>
              <ul className="space-y-1.5">
                {prepAppDeals.slice(0, 8).map((deal) => (
                  <li key={deal.id}>
                    <Link
                      href={`/deals/${deal.slug}`}
                      onClick={() => setChecklistOpen(false)}
                      className="flex items-center justify-between gap-2 rounded-xl border border-hairline bg-canvas px-3 py-2 text-xs hover:border-line-strong hover:bg-subtle/70 transition-colors"
                    >
                      <span className="font-semibold text-ink truncate">
                        {deal.brandName} — {deal.appName || "App"}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] font-bold text-amber tabular-nums">
                        Min. H-{deal.minRegistrationDays}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-micro font-bold uppercase text-emerald">
                  Langsung Datang Bawa KTP ({walkInDeals.length})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setChecklistOpen(false);
                    onApplyPlannerFilter("walk_in_ktp");
                  }}
                  className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                >
                  Filter semua
                </button>
              </div>
              <p className="text-xs text-ink-2">
                Tidak perlu unduh aplikasi; cukup tunjukkan KTP/SIM/Paspor asli saat datang.
              </p>
              <ul className="space-y-1.5">
                {walkInDeals.slice(0, 8).map((deal) => (
                  <li key={deal.id}>
                    <Link
                      href={`/deals/${deal.slug}`}
                      onClick={() => setChecklistOpen(false)}
                      className="flex items-center justify-between gap-2 rounded-xl border border-hairline bg-canvas px-3 py-2 text-xs hover:border-line-strong hover:bg-subtle/70 transition-colors"
                    >
                      <span className="font-semibold text-ink truncate">
                        {deal.brandName}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] font-medium text-emerald">
                        {deal.claimWindow}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </DialogBody>
        </DialogPopup>
      </Dialog>
    </>
  );
}
