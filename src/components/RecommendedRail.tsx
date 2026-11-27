"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import type { DealSummaryDto } from "@/lib/deal-types";
import { DealCard } from "./DealCard";

interface RecommendationItem {
  deal: DealSummaryDto;
  score: number;
  reasons: string[];
}

interface RecommendedRailProps {
  nowIso: string;
}

export function RecommendedRail({ nowIso }: RecommendedRailProps) {
  const [items, setItems] = useState<RecommendationItem[] | null>(null);
  const [coldStart, setColdStart] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const res = await fetch("/api/recommendations?limit=8", { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { items: RecommendationItem[]; coldStart?: boolean };
        setItems(data.items);
        setColdStart(Boolean(data.coldStart));
      } catch {
        if (!controller.signal.aborted) setItems([]);
      }
    }
    void load();
    const refresh = () => void load();
    window.addEventListener("ultahid:profile-updated", refresh);
    window.addEventListener("ultahid:birthday-saved", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("ultahid:profile-updated", refresh);
      window.removeEventListener("ultahid:birthday-saved", refresh);
    };
  }, []);

  if (items === null) {
    return (
      <section aria-label="Untukmu" className="pb-6" aria-busy="true">
        <div className="mb-3 h-6 w-32 rounded-md skeleton" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[19rem] w-[17.5rem] shrink-0 rounded-2xl skeleton" />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="untukmu-heading" className="pb-6">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2
            id="untukmu-heading"
            className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-ink"
          >
            <Sparkles className="h-4.5 w-4.5 text-accent" aria-hidden="true" />
            Untukmu
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            {coldStart
              ? "Promo populer dan segar. Atur profilmu untuk rekomendasi yang lebih pas."
              : "Dipilih berdasarkan profil dan promo yang kamu lihat atau simpan."}
          </p>
        </div>
      </div>

      <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
        {items.map((item) => (
          <div key={item.deal.id} className="w-[17.5rem] shrink-0 snap-start sm:w-[19rem]">
            <DealCard
              deal={item.deal}
              nowIso={nowIso}
              reasons={item.reasons}
              onDismiss={(id) => setItems((prev) => prev?.filter((x) => x.deal.id !== id) ?? prev)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
