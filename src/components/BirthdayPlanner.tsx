"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { DealSummaryDto } from "@/lib/deal-types";

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
  const [expanded, setExpanded] = useState<boolean>(false);

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

  const statusText = useMemo(() => {
    if (daysUntilBirthday === 0) return "Hari ini adalah Hari H ulang tahunmu!";
    if (daysUntilBirthday < 0)
      return `Ulang tahunmu baru lewat ${Math.abs(daysUntilBirthday)} hari (H+${Math.abs(daysUntilBirthday)} — masih bisa klaim promo H+7/H+30).`;
    if (daysUntilBirthday <= 7)
      return `H-${daysUntilBirthday}: Banyak promo H-7 s/d H+7 sudah mulai bisa diklaim!`;
    if (daysUntilBirthday <= 30)
      return `H-${daysUntilBirthday}: Waktu terbaik daftar aplikasi wajib H-30 & H-7.`;
    return `H-${daysUntilBirthday} menuju ulang tahunmu.`;
  }, [daysUntilBirthday]);

  return (
    <section
      aria-label="Perencana Persiapan Promo Ulang Tahun"
      className="rounded-xl border border-hairline bg-surface p-4"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md border border-hairline bg-canvas p-2 text-accent">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink">
              Cek Kesiapan Tanggal Lahirmu (H-30 &amp; H-7 Planner)
            </h2>
            <p className="text-xs text-ink-2 mt-0.5">{statusText}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="planner-day">
            Tanggal Lahir
          </label>
          <select
            id="planner-day"
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className="field rounded-lg border border-line-strong bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink tabular-nums"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                Tgl {d}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="planner-month">
            Bulan Lahir
          </label>
          <select
            id="planner-month"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="field rounded-lg border border-line-strong bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink"
          >
            {MONTHS.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            aria-controls="planner-checklist"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-subtle pressable focus-ring"
          >
            {expanded ? "Tutup Checklist" : "Lihat Checklist Persiapan"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <div
        id="planner-checklist"
        className="collapsible"
        data-open={expanded}
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <div>
          <div className="mt-4 pt-4 border-t border-hairline grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-hairline bg-canvas p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-amber">
                  Wajib Daftar Aplikasi Sebelum Hari H ({prepAppDeals.length})
                </h3>
                <button
                  type="button"
                  onClick={() => onApplyPlannerFilter("prep_apps")}
                  className="rounded-md text-xs font-semibold text-accent hover:underline pressable focus-ring"
                >
                  Filter di direktori
                </button>
              </div>
              <p className="mt-1 text-xs text-ink-2">
                Beberapa brand (seperti Starbucks &amp; Boost) menolak klaim
                jika akun baru dibuat mendekati hari H.
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {prepAppDeals.slice(0, 5).map((deal) => (
                  <li
                    key={deal.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-xs"
                  >
                    <Link
                      href={`/deals/${deal.slug}`}
                      className="rounded-md font-semibold text-ink hover:text-accent truncate pressable focus-ring"
                    >
                      {deal.brandName} — {deal.appName || "App"}
                    </Link>
                    <span className="shrink-0 font-mono text-[11px] font-semibold text-amber tabular-nums">
                      Min. H-{deal.minRegistrationDays}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-hairline bg-canvas p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-emerald">
                  Langsung Datang Bawa KTP ({walkInDeals.length})
                </h3>
                <button
                  type="button"
                  onClick={() => onApplyPlannerFilter("walk_in_ktp")}
                  className="rounded-md text-xs font-semibold text-accent hover:underline pressable focus-ring"
                >
                  Filter di direktori
                </button>
              </div>
              <p className="mt-1 text-xs text-ink-2">
                Tidak perlu unduh aplikasi terlebih dahulu; cukup tunjukkan
                KTP/SIM/Paspor asli saat datang.
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {walkInDeals.slice(0, 5).map((deal) => (
                  <li
                    key={deal.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-xs"
                  >
                    <Link
                      href={`/deals/${deal.slug}`}
                      className="rounded-md font-semibold text-ink hover:text-accent truncate pressable focus-ring"
                    >
                      {deal.brandName}
                    </Link>
                    <span className="shrink-0 font-mono text-[11px] font-medium text-emerald">
                      {deal.claimWindow}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
