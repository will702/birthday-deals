import type { ReactNode } from "react";
import { SearchX } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface/75 px-6 py-14 text-center">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-subtle text-ink-2">
        {icon ?? <SearchX className="h-5 w-5" aria-hidden="true" />}
      </div>
      <h3 className="font-display text-display-md text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-2">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
