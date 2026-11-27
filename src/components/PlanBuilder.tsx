"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarPlus, Cake, Loader2, Sparkles } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { buttonClasses, Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldLabel, Select } from "@/components/ui/Field";
import type { BirthdayPlan, PlanItemKind } from "@/lib/birthday-plan";
import { KNOWN_CITIES } from "@/lib/cities";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

interface Narrative {
  title: string;
  intro: string;
  days: Array<{ date: string; headline: string; tips: string[] }>;
}

const KIND_META: Record<PlanItemKind, { label: string; tone: BadgeTone }> = {
  prep: { label: "Persiapan", tone: "warn" },
  open: { label: "Mulai", tone: "info" },
  claim: { label: "Klaim", tone: "emerald" },
  deadline: { label: "Terakhir", tone: "danger" },
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function PlanBuilder() {
  // Fixed defaults keep SSR and client markup identical; the effect below fills the real values.
  const [day, setDay] = useState(1);
  const [month, setMonth] = useState(1); // 1-12
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<BirthdayPlan | null>(null);
  const [narrative, setNarrative] = useState<Narrative | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => json?.profile ?? null)
      .catch(() => null)
      .then((p) => {
        if (cancelled) return;
        const today = new Date();
        setDay(p?.birthdayDay ?? today.getDate());
        setMonth(typeof p?.birthdayMonth === "number" ? p.birthdayMonth + 1 : today.getMonth() + 1);
        if (p?.city) setCity(p.city);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day, month, city: city || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyusun rencana.");
      setPlan(json.plan);
      setNarrative(json.narrative ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyusun rencana.");
    } finally {
      setLoading(false);
    }
  }

  const icsHref = `/api/plan/ics?day=${day}&month=${month}${city ? `&city=${encodeURIComponent(city)}` : ""}`;
  const narrativeByDate = new Map((narrative?.days ?? []).map((d) => [d.date, d]));

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="rounded-3xl border border-hairline bg-surface p-5 sm:p-6 grid gap-4 sm:grid-cols-[1fr_1.4fr_1.4fr_auto] items-end"
      >
        <div className="space-y-1.5">
          <FieldLabel htmlFor="plan-day">Tanggal</FieldLabel>
          <Select id="plan-day" value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="plan-month">Bulan</FieldLabel>
          <Select id="plan-month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="plan-city">Kota (opsional)</FieldLabel>
          <Select id="plan-city" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">Semua kota</option>
            {KNOWN_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Cake className="h-4 w-4" aria-hidden="true" />
          )}
          Susun Rencana
        </Button>
      </form>

      {error && (
        <p role="alert" className="rounded-2xl border border-danger-line bg-danger-bg px-4 py-3 text-sm text-danger-ink">
          {error}
        </p>
      )}

      {plan && plan.deals.length === 0 && (
        <EmptyState
          title="Belum ada promo untuk filter ini"
          description="Coba pilih kota lain atau lihat direktori promo lengkap."
          action={<Link href="/" className={buttonClasses("outline", "md")}>Lihat Direktori</Link>}
        />
      )}

      {plan && plan.deals.length > 0 && (
        <section className="space-y-4" aria-label="Jadwal rencana ulang tahun">
          <div className="rounded-3xl border border-hairline bg-surface p-5 sm:p-6 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-display-md text-ink">
                  {narrative?.title ?? `Rencana untuk ${formatDate(plan.birthday)}`}
                </h2>
                <p className="mt-1 text-sm text-ink-2">
                  {narrative?.intro ??
                    `Ulang tahunmu ${plan.daysUntil === 0 ? "hari ini" : plan.daysUntil < 0 ? `${-plan.daysUntil} hari lalu` : `${plan.daysUntil} hari lagi`}. ${plan.deals.length} promo masuk jadwal.`}
                </p>
                {narrative && (
                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-ink-muted">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    Ringkasan dibuat AI dari jadwal di bawah
                  </p>
                )}
              </div>
              <a href={icsHref} download className={buttonClasses("secondary", "md")}>
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                Tambah ke kalender
              </a>
            </div>
          </div>

          <ol className="space-y-3">
            {plan.days.map((d) => {
              const n = narrativeByDate.get(d.date);
              return (
                <li
                  key={d.date}
                  className={cn(
                    "rounded-2xl border bg-surface p-4 sm:p-5",
                    d.isBirthday ? "border-accent/45 bg-accent-soft/35" : "border-hairline",
                    d.past && "opacity-70",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold tabular-nums text-ink">{d.label}</span>
                    <span className="text-sm text-ink-2">{formatDate(d.date)}</span>
                    {d.isBirthday && <Badge tone="clay">Ulang tahunmu</Badge>}
                    {d.past && <Badge tone="neutral">Sudah lewat</Badge>}
                  </div>
                  {n && <p className="mt-2 text-sm font-semibold text-ink">{n.headline}</p>}
                  {d.items.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {d.items.map((it, i) => (
                        <li key={`${it.dealSlug}-${it.kind}-${i}`} className="flex items-start gap-2.5 text-sm">
                          <Badge tone={KIND_META[it.kind].tone}>{KIND_META[it.kind].label}</Badge>
                          <span className="min-w-0 text-ink">
                            <Link href={`/deals/${it.dealSlug}`} className="font-semibold hover:underline focus-ring rounded">
                              {it.brandName}
                            </Link>
                            <span className="text-ink-2"> - {it.text}</span>
                            {it.note && <span className="block text-xs text-ink-muted">{it.note}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {n && n.tips.length > 0 && (
                    <ul className="mt-3 list-disc pl-5 text-xs text-ink-2 space-y-1">
                      {n.tips.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
