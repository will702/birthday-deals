"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

export function ShareDealButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Fallback to clipboard copy if share sheet dismissed
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Tautan promo disalin ke clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin tautan.");
    }
  }

  return (
    <Button variant="outline" size="md" onClick={handleShare} className="w-full">
      {copied ? (
        <>
          <Check className="h-4 w-4 text-emerald" aria-hidden="true" />
          Tautan Disalin
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Bagikan Promo Ini
        </>
      )}
    </Button>
  );
}
