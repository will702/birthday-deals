"use client";

import { useEffect, useState } from "react";
import type { DealSummaryDto } from "@/lib/deal-types";
import { DealCard } from "./DealCard";

export function SimilarDeals({ slug, nowIso }: { slug: string; nowIso: string }) {
  const [items, setItems] = useState<DealSummaryDto[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/deals/${encodeURIComponent(slug)}/similar`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items?: DealSummaryDto[] }) => setItems(data.items ?? []))
      .catch(() => undefined);
    return () => controller.abort();
  }, [slug]);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="mirip-heading">
      <h2 id="mirip-heading" className="font-display text-lg font-bold text-ink">
        Mirip dengan ini
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.slice(0, 4).map((deal) => (
          <DealCard key={deal.id} deal={deal} nowIso={nowIso} />
        ))}
      </div>
    </section>
  );
}
