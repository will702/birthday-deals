"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronsUpDown } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface SelectMenuProps<T extends string> {
  id?: string;
  value: T;
  onValueChange: (value: T) => void;
  options: SelectOption<T>[];
  "aria-label"?: string;
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
}

export function SelectMenu<T extends string>({
  id,
  value,
  onValueChange,
  options,
  "aria-label": ariaLabel,
  placeholder = "Pilih…",
  className,
  size = "md",
}: SelectMenuProps<T>): React.ReactElement {
  const activeOption = options.find((o) => o.value === value);

  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string") {
          onValueChange(next as T);
        }
      }}
      modal={false}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "field inline-flex w-full items-center justify-between gap-2 rounded-xl border border-line-strong bg-surface text-left font-medium text-ink shadow-2xs transition-colors hover:border-ink-muted/55 focus-ring cursor-pointer select-none",
          size === "sm" ? "h-8 px-2.5 text-xs" : "h-10 px-3.5 text-sm",
          className,
        )}
      >
        <SelectPrimitive.Value className="truncate">
          {activeOption?.label ?? placeholder}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon className="shrink-0 text-ink-muted">
          <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner side="bottom" sideOffset={6} align="start" className="z-50">
          <SelectPrimitive.Popup className="min-w-[var(--anchor-width)] max-w-[90vw] origin-[var(--transform-origin)] overflow-hidden rounded-xl border border-hairline bg-surface p-1 text-ink shadow-[0_14px_36px_-10px_rgb(17_19_23/0.2)] outline-none transition-[transform,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <SelectPrimitive.List className="max-h-64 overflow-y-auto">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium text-ink outline-none cursor-pointer data-highlighted:bg-subtle data-selected:font-semibold data-selected:text-accent"
                >
                  <SelectPrimitive.ItemIndicator className="col-start-1 text-accent">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText className="col-start-2 truncate">
                    {option.label}
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
