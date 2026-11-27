"use client";

import type { AnchorHTMLAttributes } from "react";
import { logInteraction } from "@/lib/client/personalization";

type TrackedSourceLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  dealId: string;
  href: string;
};

/** External source link that logs a CLICK_SOURCE interaction. */
export function TrackedSourceLink({ dealId, onClick, ...rest }: TrackedSourceLinkProps) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      {...rest}
      onClick={(e) => {
        logInteraction(dealId, "CLICK_SOURCE");
        onClick?.(e);
      }}
    />
  );
}
