"use client";

import { useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

interface DedupePair {
  similarity: number;
  a: { id: string; slug: string; brandName: string; title: string };
  b: { id: string; slug: string; brandName: string; title: string };
}

interface QueueItem {
  id: string;
  slug: string;
  brandName: string;
  title: string;
  verificationStatus: string;
  reasons: string[];
}

interface ClassifyPreview {
  id: string;
  current: { category: string; tags: string[] };
  suggested: { category: string; tags: string[] };
}

interface SummaryPreview {
  id: string;
  current: string;
  suggested: string;
}

export function AdminAiPanel({ adminToken }: { adminToken: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [pairs, setPairs] = useState<DedupePair[] | null>(null);
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [dealId, setDealId] = useState("");
  const [classify, setClassify] = useState<ClassifyPreview | null>(null);
  const [summary, setSummary] = useState<SummaryPreview | null>(null);

  async function call(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(adminToken.trim() ? { "x-admin-token": adminToken.trim() } : {}),
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Aksi AI gagal.");
    return json;
  }

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Aksi AI gagal.");
    } finally {
      setBusy(null);
    }
  }

  const loadQueue = () =>
    run("queue", async () => {
      const json = await call({ action: "queue" });
      setQueue(json.items);
    });

  const decide = (id: string, decision: "approve" | "reject") =>
    run(`review-${id}`, async () => {
      await call({ action: "review", id, decision });
      setQueue((q) => q?.filter((i) => i.id !== id) ?? null);
      toast.success(decision === "approve" ? "Promo disetujui." : "Promo ditolak (ditandai kedaluwarsa).");
    });

  return (
    <section className="rounded-3xl border border-hairline bg-surface p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight text-ink flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" aria-hidden="true" />
          Alat AI Admin
        </h2>
        <p className="mt-1 text-sm text-ink-2">
          Hasil klasifikasi dan ringkasan hanya pratinjau. Perubahan baru disimpan setelah kamu menekan Terapkan.
          Memakai token admin di atas.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() =>
            run("dedupe", async () => {
              setPairs((await call({ action: "dedupe" })).pairs);
            })
          }
        >
          Cari Duplikat
        </Button>
        <Button variant="outline" size="sm" disabled={busy !== null} onClick={loadQueue}>
          Antrean Review
        </Button>
      </div>

      {pairs && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-ink">Kandidat duplikat ({pairs.length})</h3>
          {pairs.length === 0 && <p className="text-sm text-ink-2">Tidak ada pasangan mirip.</p>}
          {pairs.map((p) => (
            <div key={`${p.a.id}-${p.b.id}`} className="rounded-xl border border-hairline bg-canvas p-3 text-sm">
              <Badge tone="warn" numeric>{Math.round(p.similarity * 100)}% mirip</Badge>
              <p className="mt-1.5 text-ink">
                <a className="font-semibold hover:underline" href={`/deals/${p.a.slug}`}>{p.a.brandName}: {p.a.title}</a>
              </p>
              <p className="text-ink">
                <a className="font-semibold hover:underline" href={`/deals/${p.b.slug}`}>{p.b.brandName}: {p.b.title}</a>
              </p>
            </div>
          ))}
        </div>
      )}

      {queue && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-ink">Antrean review ({queue.length})</h3>
          {queue.length === 0 && <p className="text-sm text-ink-2">Antrean kosong.</p>}
          {queue.map((q) => (
            <div key={q.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-canvas p-3">
              <div className="min-w-0 text-sm">
                <a href={`/deals/${q.slug}`} className="font-semibold text-ink hover:underline">
                  {q.brandName}: {q.title}
                </a>
                <p className="mt-0.5 text-xs text-ink-muted">{q.reasons.join(" - ")}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="soft" disabled={busy !== null} onClick={() => decide(q.id, "approve")}>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Setujui
                </Button>
                <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => decide(q.id, "reject")}>
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Tolak
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 border-t border-hairline pt-4">
        <h3 className="text-sm font-bold text-ink">Klasifikasi / ringkas satu promo</h3>
        <div className="flex flex-wrap gap-2">
          <Input
            value={dealId}
            onChange={(e) => setDealId(e.target.value)}
            placeholder="ID promo"
            aria-label="ID promo"
            className="max-w-xs"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={busy !== null || !dealId.trim()}
            onClick={() =>
              run("classify", async () => {
                setClassify((await call({ action: "classify", id: dealId.trim() })).preview);
              })
            }
          >
            Klasifikasi
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy !== null || !dealId.trim()}
            onClick={() =>
              run("summarize", async () => {
                setSummary((await call({ action: "summarize", id: dealId.trim() })).preview);
              })
            }
          >
            Ringkas
          </Button>
        </div>

        {classify && (
          <div className="rounded-xl border border-hairline bg-canvas p-3 text-sm space-y-2">
            <p className="text-ink-2">
              Sekarang: <b>{classify.current.category}</b> [{classify.current.tags.join(", ")}]
            </p>
            <p className="text-ink">
              Usulan: <b>{classify.suggested.category}</b> [{classify.suggested.tags.join(", ")}]
            </p>
            <Button
              size="sm"
              disabled={busy !== null}
              onClick={() =>
                run("apply-classify", async () => {
                  await call({ action: "applyClassification", id: classify.id, value: classify.suggested });
                  toast.success("Klasifikasi diterapkan.");
                  setClassify(null);
                })
              }
            >
              Terapkan
            </Button>
          </div>
        )}

        {summary && (
          <div className="rounded-xl border border-hairline bg-canvas p-3 text-sm space-y-2">
            <p className="text-ink-2">Sekarang: {summary.current}</p>
            <p className="text-ink">Usulan: {summary.suggested}</p>
            <Button
              size="sm"
              disabled={busy !== null}
              onClick={() =>
                run("apply-summary", async () => {
                  await call({ action: "applySummary", id: summary.id, description: summary.suggested });
                  toast.success("Ringkasan diterapkan.");
                  setSummary(null);
                })
              }
            >
              Terapkan
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
