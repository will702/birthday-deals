"use client";

import { useState } from "react";
import { Bookmark, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { logInteraction, toggleSaved, useSavedDeals } from "@/lib/client/personalization";
import { cn } from "@/lib/utils";

interface DealCardActionsProps {
  dealId: string;
  brandName: string;
  /** When provided, a "not interested" button is shown; called after the DISMISS is logged. */
  onDismiss?: (dealId: string) => void;
  className?: string;
}

const iconButton =
  "relative z-10 rounded-lg p-1.5 text-ink-muted hover:bg-subtle hover:text-ink pressable focus-ring cursor-pointer";

export function DealCardActions({ dealId, brandName, onDismiss, className }: DealCardActionsProps) {
  const savedIds = useSavedDeals();
  const isSaved = savedIds.has(dealId);
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    if (busy) return;
    setBusy(true);
    const result = await toggleSaved(dealId);
    setBusy(false);
    if (result === null) toast.error("Gagal memperbarui promo tersimpan.");
    else toast.success(result ? `${brandName} disimpan.` : `${brandName} dihapus dari simpanan.`);
  }

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      <button
        type="button"
        onClick={handleSave}
        aria-pressed={isSaved}
        aria-label={isSaved ? `Hapus ${brandName} dari simpanan` : `Simpan ${brandName}`}
        title={isSaved ? "Hapus dari simpanan" : "Simpan promo"}
        className={cn(iconButton, isSaved && "text-accent hover:text-accent-hover")}
      >
        <Bookmark
          className="h-3.5 w-3.5"
          fill={isSaved ? "currentColor" : "none"}
          aria-hidden="true"
        />
      </button>
      {onDismiss && (
        <button
          type="button"
          onClick={() => {
            logInteraction(dealId, "DISMISS");
            onDismiss(dealId);
          }}
          aria-label={`Sembunyikan ${brandName}`}
          title="Tidak tertarik"
          className={iconButton}
        >
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
