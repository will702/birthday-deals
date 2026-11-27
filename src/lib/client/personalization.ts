"use client";

import { useSyncExternalStore } from "react";

export type ClientInteractionType = "VIEW" | "CLICK_SOURCE" | "CLAIMED" | "DISMISS";

/** Fire-and-forget interaction log; never throws. */
export function logInteraction(dealId: string, type: ClientInteractionType): void {
  try {
    void fetch("/api/interactions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dealId, type }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ignore
  }
}

// ---- Shared saved-deals store ----

let saved: ReadonlySet<string> = new Set();
let loaded = false;
let loading = false;
const listeners = new Set<() => void>();

function emit(next: ReadonlySet<string>) {
  saved = next;
  for (const l of listeners) l();
}

async function loadSaved() {
  if (loaded || loading) return;
  loading = true;
  try {
    const res = await fetch("/api/saved");
    if (res.ok) {
      const data = (await res.json()) as { dealIds?: string[] };
      loaded = true;
      emit(new Set(data.dealIds ?? []));
    }
  } catch {
    // leave empty
  } finally {
    loading = false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void loadSaved();
  return () => {
    listeners.delete(listener);
  };
}

const EMPTY: ReadonlySet<string> = new Set();

export function useSavedDeals(): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribe,
    () => saved,
    () => EMPTY,
  );
}

/** Optimistically toggles a saved deal. Returns the new state, or null on failure. */
export async function toggleSaved(dealId: string): Promise<boolean | null> {
  const wasSaved = saved.has(dealId);
  const next = new Set(saved);
  if (wasSaved) next.delete(dealId);
  else next.add(dealId);
  emit(next);
  try {
    const res = await fetch("/api/saved", {
      method: wasSaved ? "DELETE" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dealId }),
    });
    if (!res.ok) throw new Error(String(res.status));
    return !wasSaved;
  } catch {
    const revert = new Set(saved);
    if (wasSaved) revert.add(dealId);
    else revert.delete(dealId);
    emit(revert);
    return null;
  }
}
