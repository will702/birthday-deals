"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import type React from "react";
import { cn } from "@/lib/utils";

export function Tooltip({
  label,
  children,
  side = "top",
}: {
  label: string;
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
}): React.ReactElement {
  return (
    <TooltipPrimitive.Provider delay={220}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger render={children} />
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Positioner side={side} sideOffset={6} className="z-50">
            <TooltipPrimitive.Popup
              className={cn(
                "rounded-lg bg-ink px-2.5 py-1 text-[11px] font-medium text-white shadow-md transition-[opacity,transform] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
              )}
            >
              {label}
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
