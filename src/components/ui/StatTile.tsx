import type { ReactNode } from "react";

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
    <div className="flex min-w-0 flex-col gap-0.5">
      <p
        className={`font-serif text-[1.75rem] leading-none tracking-tight tabular-nums ${valueTone}`}
      >
        {value}
      </p>
      <p className="text-micro font-medium uppercase text-ink-muted">{label}</p>
      {detail ? (
        <p className="text-xs text-ink-muted">{detail}</p>
      ) : null}
    </div>
  );
}
