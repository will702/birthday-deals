import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone =
  | "clay"
  | "emerald"
  | "neutral"
  | "danger"
  | "info"
  | "warn";

const toneClasses: Record<BadgeTone, string> = {
  clay: "bg-accent-soft text-accent-hover border-accent/20",
  emerald: "bg-success-bg text-emerald border-success-line",
  neutral: "bg-subtle text-ink-2 border-hairline",
  danger: "bg-danger-bg text-danger-ink border-danger-line",
  info: "bg-info-bg text-info border-info-line",
  warn: "bg-warn-bg text-amber border-warn-line",
};

interface BadgeProps {
  tone?: BadgeTone;
  /** Mono suits numerals (DISKON 50%); sans suits words. */
  numeric?: boolean;
  className?: string;
  children: ReactNode;
}

export function Badge({
  tone = "neutral",
  numeric = false,
  className = "",
  children,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-tight",
        numeric && "font-mono tabular-nums uppercase",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Small status dot + label, for compact meta rows. */
export function StatusDot({ tone = "neutral" }: { tone?: BadgeTone }) {
  const dotColors: Record<BadgeTone, string> = {
    clay: "bg-accent-vivid",
    emerald: "bg-emerald",
    neutral: "bg-ink-muted",
    danger: "bg-danger-ink",
    info: "bg-info",
    warn: "bg-amber",
  };
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", dotColors[tone])}
    />
  );
}
