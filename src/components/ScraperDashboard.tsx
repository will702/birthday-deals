"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, RefreshCw } from "lucide-react";
import type { ScrapeRunDto } from "@/lib/deal-types";

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
    detail: "Pencarian artikel roundup promo ulang tahun Indonesia 2026 terbaru",
  },
];

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
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
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
          `${r.sourceName}: [${r.status}] ditemukan ${r.dealsFound}, baru ${r.dealsCreated}, diperbarui ${r.dealsUpdated}`
        );
      }
      if (json.result?.freshness) {
        const f = json.result.freshness;
        notes.push(
          `Freshness Check: ${f.checkedCount} dicek, ${f.liveCount} link aktif, ${f.staleMarked} perlu cek ulang, ${f.expiredMarked} expired, ${f.botProtectedCount ?? 0} dilindungi anti-bot.`
        );
      }
      setLastOutputNotes(notes);

      const runsRes = await fetch("/api/scraper/runs");
      if (runsRes.ok) {
        const runsJson = await runsRes.json();
        setRuns(runsJson.runs);
        setSummary(runsJson.summary);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat scraping.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Real Summary Telemetry */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-[#E4DDD3] bg-white p-4">
          <dt className="text-xs text-[#71717A]">Total Promo Terdata</dt>
          <dd className="mt-1 font-mono text-2xl font-bold text-[#18181B] tabular-nums">
            {summary.totalDeals}
          </dd>
        </div>
        <div className="rounded-lg border border-[#BCE3CE] bg-[#ECFDF3] p-4">
          <dt className="text-xs text-[#146C43]">Promo Aktif</dt>
          <dd className="mt-1 font-mono text-2xl font-bold text-[#146C43] tabular-nums">
            {summary.activeDeals}
          </dd>
        </div>
        <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-4">
          <dt className="text-xs text-[#B45309]">Perlu Cek Ulang (Stale)</dt>
          <dd className="mt-1 font-mono text-2xl font-bold text-[#B45309] tabular-nums">
            {summary.staleDeals}
          </dd>
        </div>
        <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4">
          <dt className="text-xs text-[#C83228]">Berakhir (Expired)</dt>
          <dd className="mt-1 font-mono text-2xl font-bold text-[#C83228] tabular-nums">
            {summary.expiredDeals}
          </dd>
        </div>
      </dl>

      {/* Control Panel */}
      <section className="rounded-lg border border-[#E4DDD3] bg-white p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#18181B]">
              Konfigurasi Sumber Scraper Indonesia
            </h2>
            <p className="text-xs text-[#52525B] mt-0.5">
              Pilih modul sumber yang ingin dijalankan. Situs yang dilindungi anti-bot/CAPTCHA otomatis dilewati tanpa bypass.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="Token admin"
              aria-label="Token admin"
              className="rounded border border-[#D3C8B8] bg-white px-2.5 py-1 text-xs focus:border-[#18181B] focus:outline-none"
            />
            <button
              type="button"
              disabled={isRunning}
              onClick={() => handleRunScraper(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#D3C8B8] bg-[#FAF7F2] px-3 py-2 text-xs font-semibold text-[#18181B] hover:bg-[#F3EDE3] disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRunning ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Cek Freshness Link Saja
            </button>

            <button
              type="button"
              disabled={isRunning || (selectedSources.length === 0 && !runFreshness)}
              onClick={() => handleRunScraper(false)}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#C83228] px-4 py-2 text-xs font-bold text-white hover:bg-[#9F221A] disabled:opacity-60"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              {isRunning ? "Sedang Scraping..." : "Jalankan Scraper Sekarang"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ADAPTER_OPTIONS.map((opt) => {
            const checked = selectedSources.includes(opt.key);
            return (
              <label
                key={opt.key}
                className={`cursor-pointer rounded-md border p-3.5 flex items-start gap-2.5 transition-colors ${
                  checked
                    ? "border-[#18181B] bg-[#FAF7F2]"
                    : "border-[#E4DDD3] bg-white hover:border-[#D3C8B8]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSource(opt.key)}
                  className="mt-0.5 h-4 w-4 accent-[#C83228]"
                />
                <div>
                  <div className="text-xs font-bold text-[#18181B]">{opt.label}</div>
                  <div className="text-[11px] text-[#52525B] mt-1 leading-relaxed">
                    {opt.detail}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-[#18181B] cursor-pointer">
          <input
            type="checkbox"
            checked={runFreshness}
            onChange={(e) => setRunFreshness(e.target.checked)}
            className="h-4 w-4 accent-[#C83228]"
          />
          Sertakan Freshness &amp; HTTP Link Health Check setelah scraping
        </label>

        {error && (
          <p role="alert" className="text-xs font-semibold text-[#C83228]">
            {error}
          </p>
        )}

        {lastOutputNotes.length > 0 && (
          <div className="rounded-md border border-[#BCE3CE] bg-[#ECFDF3] p-3 space-y-1 text-xs text-[#146C43]">
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
      <section className="rounded-lg border border-[#E4DDD3] bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E4DDD3] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#18181B]">
            Riwayat Eksekusi Scraper ({runs.length})
          </h2>
          <span className="text-xs text-[#71717A]">CLI: npm run scrape</span>
        </div>

        {runs.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#52525B]">
            Belum ada catatan eksekusi scraper. Klik &quot;Jalankan Scraper Sekarang&quot; di atas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] border-b border-[#E4DDD3] text-[#71717A]">
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
              <tbody className="divide-y divide-[#E4DDD3]">
                {runs.map((run) => {
                  const statusColor =
                    run.status === "SUCCESS"
                      ? "bg-[#ECFDF3] text-[#146C43] border-[#BCE3CE]"
                      : run.status === "PARTIAL"
                        ? "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]"
                        : run.status === "FAILED"
                          ? "bg-[#FEF2F2] text-[#C83228] border-[#FECACA]"
                          : "bg-[#F3EDE3] text-[#18181B] border-[#D3C8B8]";

                  return (
                    <tr key={run.id} className="hover:bg-[#FAF7F2]/60">
                      <td className="px-4 py-3 font-semibold text-[#18181B]">
                        {run.sourceName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded border px-2 py-0.5 font-mono text-[10px] font-bold ${statusColor}`}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {run.dealsFound}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-[#146C43] font-semibold">
                        +{run.dealsCreated}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {run.dealsUpdated}
                      </td>
                      <td className="px-4 py-3 text-[#52525B] whitespace-nowrap font-mono tabular-nums">
                        {new Date(run.startedAt).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-[#52525B] max-w-xs truncate" title={run.errorMessage || ""}>
                        {run.errorMessage || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
