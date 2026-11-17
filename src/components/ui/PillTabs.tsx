"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";

export interface PillTabOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

interface PillTabsProps<T extends string> {
  options: PillTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label"?: string;
  className?: string;
}

/**
 * Segmented quick-filter pills with a spring-sliding active indicator
 * (Apple-style: interruptible, starts from the live position via layoutId).
 */
export function PillTabs<T extends string>({
  options,
  value,
  onChange,
  className = "",
  ...aria
}: PillTabsProps<T>) {
  const groupId = useId();
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="group"
      aria-label={aria["aria-label"]}
      className={`flex items-center gap-1 overflow-x-auto rounded-full border border-hairline bg-surface p-1 shadow-[0_1px_2px_rgb(31_30_27/0.03)] max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-20px),transparent)] ${className}`}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`relative shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap pressable focus-ring ${
              active ? "text-white" : "text-ink-2 hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`pill-${groupId}`}
                className="absolute inset-0 rounded-full bg-ink"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", bounce: 0, duration: 0.4 }
                }
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {option.label}
              {option.count !== undefined && (
                <span
                  className={`font-mono text-[10px] tabular-nums ${
                    active ? "text-white/70" : "text-ink-muted"
                  }`}
                >
                  {option.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
