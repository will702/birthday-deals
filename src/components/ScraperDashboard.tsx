"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { ScrapeRunDto } from "@/lib/deal-types";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/ui/StatTile";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/utils";

interface ScraperDashboardProps {
  initialRuns: ScrapeRunDto[];
  initialSummary: {
    totalDeals: number;
    activeDeals: number;
    staleDeals: number;
    expiredDeals: number;
  };
}

const ADAPTER_OPTIONS = [
  {
    key: "official-brands",
    label: "Official Indonesian Brand Pages",
    detail: "Boost Juice ID (Vibe), Starbucks ID, Sushi Tei, Fore Coffee, Kopi Kenangan, Boga Group",
  },
  {
    key: "aggregators",
    label: "Indonesian Promo Aggregators",
    detail: "Katalogpromosi.com (Birthday Treats), Foodierate.com, GilaDiskon.com",
  },
  {
    key: "search-discovery",
    label: "Web Search Discovery",
    detail: "Pencarian artikel roundup promo ulang tahun Indonesia terbaru",
  },
];

function runStatusTone(status: string): BadgeTone {
  if (status === "SUCCESS") return "emerald";
  if (status === "PARTIAL") return "warn";
  if (status === "FAILED") return "danger";
  return "neutral";
}

export function ScraperDashboard({
  initialRuns,
  initialSummary,
}: ScraperDashboardProps) {
  const router = useRouter();
  const [runs, setRuns] = useState<ScrapeRunDto[]>(initialRuns);
  const [summary, setSummary] = useState(initialSummary);
  const [selectedSources, setSelectedSources] = useState<string[]>([
    "official-brands",
    "aggregators",
    "search-discovery",
  ]);
  const [runFreshness, setRunFreshness] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [lastOutputNotes, setLastOutputNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState("");

  function toggleSource(key: string) {
    setSelectedSources((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function handleRunScraper(onlyFreshness = false) {
    setIsRunning(true);
    setError(null);
    setLastOutputNotes([]);
    try {
      const payload = onlyFreshness
        ? { sources: [], runFreshness: true }
        : { sources: selectedSources, runFreshness };

      const res = await fetch("/api/scraper/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken.trim() ? { "x-admin-token": adminToken.trim() } : {}),
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Scraper gagal dijalankan.");

      const notes: string[] = [];
      for (const r of json.result?.runs ?? []) {
        notes.push(
          `${r.sourceName}: [${r.status}] ditemukan ${r.dealsFound}, baru ${r.dealsCreated}, diperbarui ${r.dealsUpdated}`,
        );
      }
      if (json.result?.freshness) {
        const f = json.result.freshness;
        notes.push(
          `Freshness Check: ${f.checkedCount} dicek, ${f.liveCount} link aktif, ${f.staleMarked} perlu cek ulang, ${f.expiredMarked} expired, ${f.botProtectedCount ?? 0} dilindungi anti-bot.`,
        );
      }
      setLastOutputNotes(notes);
      toast.success("Eksekusi scraper selesai.");

      const runsRes = await fetch("/api/scraper/runs");
      if (runsRes.ok) {
        const runsJson = await runsRes.json();
        setRuns(runsJson.runs);
        setSummary(runsJson.summary);
      }
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat scraping.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Bento Tiles */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-hairline bg-surface p-4 sm:p-5">
          <StatTile label="Total Promo Terdata" value={summary.totalDeals} />
        </div>
        <div className="rounded-2xl border border-success-line bg-success-bg/50 p-4 sm:p-5">
          <StatTile label="Promo Aktif" value={summary.activeDeals} tone="success" />
        </div>
        <div className="rounded-2xl border border-warn-line bg-warn-bg/50 p-4 sm:p-5">
          <StatTile label="Perlu Cek Ulang" value={summary.staleDeals} tone="warn" />
        </div>
        <div className="rounded-2xl border border-danger-line bg-danger-bg/50 p-4 sm:p-5">
          <StatTile label="Berakhir" value={summary.expiredDeals} tone="danger" />
        </div>
      </dl>

      {/* Control Panel */}
      <section className="rounded-3xl border border-hairline bg-surface p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-ink">
              Konfigurasi Sumber Scraper
            </h2>
            <p className="mt-1 text-sm text-ink-2">
              Pilih modul sumber yang ingin dijalankan. Situs yang dilindungi
              anti-bot/CAPTCHA otomatis dilewati tanpa bypass.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <input
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="Token admin"
              aria-label="Token admin"
              className="field rounded-xl border border-line-strong bg-surface px-3 py-2 text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={isRunning}
              onClick={() => handleRunScraper(true)}
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", isRunning && "animate-spin")}
                aria-hidden="true"
              />
              Cek Freshness Saja
            </Button>

            <Button
              size="sm"
              disabled={isRunning || (selectedSources.length === 0 && !runFreshness)}
              onClick={() => handleRunScraper(false)}
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              {isRunning ? "Sedang Scraping..." : "Jalankan Scraper"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ADAPTER_OPTIONS.map((opt) => {
            const checked = selectedSources.includes(opt.key);
            return (
              <div
                key={opt.key}
                className={cn(
                  "rounded-2xl border p-4 flex items-start justify-between gap-3 transition-colors",
                  checked
                    ? "border-accent/45 bg-accent-soft/35"
                    : "border-hairline bg-canvas",
                )}
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-ink">{opt.label}</div>
                  <div className="text-[11px] text-ink-2 mt-1 leading-relaxed">
                    {opt.detail}
                  </div>
                </div>
                <Switch
                  aria-label={opt.label}
                  checked={checked}
                  onCheckedChange={() => toggleSource(opt.key)}
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-canvas px-4 py-3">
          <Switch
            aria-label="Sertakan Freshness & HTTP Link Health Check setelah scraping"
            checked={runFreshness}
            onCheckedChange={setRunFreshness}
          />
          <span className="text-xs font-semibold text-ink">
            Sertakan Freshness &amp; HTTP Link Health Check setelah scraping
          </span>
        </div>

        {error && (
          <p role="alert" className="reveal text-xs font-semibold text-danger-ink">
            {error}
          </p>
        )}

        {lastOutputNotes.length > 0 && (
          <div className="reveal rounded-2xl border border-success-line bg-success-bg p-3.5 space-y-1 text-xs text-emerald">
            <p className="font-bold">Hasil Eksekusi Terbaru:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {lastOutputNotes.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Run History Table */}
      <section className="rounded-3xl border border-hairline bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold tracking-tight text-ink">
            Riwayat Eksekusi ({runs.length})
          </h2>
          <span className="rounded-lg bg-canvas px-2 py-1 text-[11px] text-ink-muted font-mono border border-hairline">
            npm run scrape
          </span>
        </div>

        {runs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Belum ada catatan eksekusi"
              description='Klik "Jalankan Scraper" di atas untuk memulai pengambilan data pertama.'
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas border-b border-hairline text-ink-muted">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Sumber</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Ditemukan</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Baru</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Update</th>
                  <th className="px-4 py-2.5 font-semibold">Waktu</th>
                  <th className="px-4 py-2.5 font-semibold">Catatan / Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-subtle/40">
                    <td className="px-4 py-3 font-semibold text-ink">
                      {run.sourceName}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={runStatusTone(run.status)} numeric>
                        {run.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {run.dealsFound}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald font-semibold">
                      +{run.dealsCreated}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {run.dealsUpdated}
                    </td>
                    <td className="px-4 py-3 text-ink-2 whitespace-nowrap font-mono tabular-nums">
                      {new Date(run.startedAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td
                      className="px-4 py-3 text-ink-2 max-w-xs truncate"
                      title={run.errorMessage || ""}
                    >
                      {run.errorMessage || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
