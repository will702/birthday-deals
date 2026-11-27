"use client";

import { useEffect } from "react";
import { logInteraction } from "@/lib/client/personalization";

/** Logs a single VIEW interaction when mounted (deal detail page). */
export function ViewLogger({ dealId }: { dealId: string }) {
  useEffect(() => {
    logInteraction(dealId, "VIEW");
  }, [dealId]);
  return null;
}
