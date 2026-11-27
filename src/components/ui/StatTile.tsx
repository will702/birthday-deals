import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  tone?: "default" | "success" | "warn" | "danger";
}) {
  const valueTone =
    tone === "success"
      ? "text-emerald"
      : tone === "warn"
        ? "text-amber"
        : tone === "danger"
          ? "text-danger-ink"
          : "text-ink";
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p
        className={cn(
          "font-display text-[1.875rem] font-extrabold leading-none tracking-tight tabular-nums",
          valueTone,
        )}
      >
        {value}
      </p>
      <p className="text-micro font-semibold uppercase text-ink-muted">{label}</p>
      {detail ? <p className="text-xs text-ink-muted">{detail}</p> : null}
    </div>
  );
}
