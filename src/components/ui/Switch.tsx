"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import type React from "react";
import { cn } from "@/lib/utils";

export function Switch({
  className,
  ...props
}: SwitchPrimitive.Root.Props): React.ReactElement {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-transparent p-0.5 transition-colors duration-200 focus-ring data-checked:bg-accent data-unchecked:bg-border-strong data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      data-slot="switch"
      {...props}
    >
      <SwitchPrimitive.Thumb
        className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-xs transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] data-checked:translate-x-4 data-unchecked:translate-x-0"
        data-slot="switch-thumb"
      />
    </SwitchPrimitive.Root>
  );
}
