"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { DealSummaryDto } from "@/lib/deal-types";
import { Select } from "@/components/ui/Field";

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
  const reduceMotion = useReducedMotion();

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
      className="mt-16 rounded-2xl bg-subtle/60 p-5 sm:p-8"
    >
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
        <div className="flex items-start gap-3.5 max-w-xl">
          <div className="mt-0.5 rounded-lg bg-accent-soft p-2 text-accent">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-serif text-display-md text-ink">
              Rencanakan klaim ultahmu
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
              {statusText} Beberapa promo butuh persiapan H-30 — atur tanggal
              lahir untuk lihat checklistnya.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="planner-day">
            Tanggal Lahir
          </label>
          <Select
            id="planner-day"
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className="w-auto py-1.5 text-xs font-semibold tabular-nums"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                Tgl {d}
              </option>
            ))}
          </Select>

          <label className="sr-only" htmlFor="planner-month">
            Bulan Lahir
          </label>
          <Select
            id="planner-month"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-auto py-1.5 text-xs font-semibold"
          >
            {MONTHS.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </Select>

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            aria-controls="planner-checklist"
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-ink/88 pressable focus-ring"
          >
            {expanded ? "Tutup Checklist" : "Lihat Checklist"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <motion.div
        id="planner-checklist"
        initial={false}
        animate={{
          height: expanded ? "auto" : 0,
          opacity: expanded ? 1 : 0,
        }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: "spring", bounce: 0, duration: 0.45 }
        }
        className="overflow-hidden"
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <div className="pt-6 mt-6 border-t border-line-strong/70 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-micro font-bold uppercase text-amber">
                Wajib daftar aplikasi ({prepAppDeals.length})
              </h3>
              <button
                type="button"
                onClick={() => onApplyPlannerFilter("prep_apps")}
                className="rounded-md text-xs font-semibold text-accent hover:text-accent-hover underline-offset-4 hover:underline pressable focus-ring"
              >
                Filter di direktori
              </button>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-2">
              Beberapa brand (seperti Starbucks &amp; Boost) menolak klaim jika
              akun baru dibuat mendekati hari H.
            </p>
            <ul className="mt-3 space-y-1.5">
              {prepAppDeals.slice(0, 5).map((deal) => (
                <li
                  key={deal.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-xs"
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

          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-micro font-bold uppercase text-emerald">
                Langsung datang bawa KTP ({walkInDeals.length})
              </h3>
              <button
                type="button"
                onClick={() => onApplyPlannerFilter("walk_in_ktp")}
                className="rounded-md text-xs font-semibold text-accent hover:text-accent-hover underline-offset-4 hover:underline pressable focus-ring"
              >
                Filter di direktori
              </button>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-2">
              Tidak perlu unduh aplikasi terlebih dahulu; cukup tunjukkan
              KTP/SIM/Paspor asli saat datang.
            </p>
            <ul className="mt-3 space-y-1.5">
              {walkInDeals.slice(0, 5).map((deal) => (
                <li
                  key={deal.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-xs"
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
      </motion.div>
    </section>
  );
}
