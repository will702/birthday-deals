import Link from "next/link";
import { CheckCircle2, Clock, FileCheck2, ExternalLink } from "lucide-react";
import {
  getDiscountBadge,
  getVerificationMeta,
  type DealSummaryDto,
} from "@/lib/deal-types";
import { formatIdr, formatRelativeDays } from "@/lib/validation";

interface DealCardProps {
  deal: DealSummaryDto;
  nowIso: string;
  /** Stagger index for the entrance animation; omit to skip animating. */
  revealIndex?: number;
}

export function DealCard({ deal, nowIso, revealIndex }: DealCardProps) {
  const discount = getDiscountBadge(deal.discountType, deal.discountValue);
  const statusMeta = getVerificationMeta(deal.verificationStatus);
  const now = new Date(nowIso);

  const discountClasses =
    discount.tone === "emerald"
      ? "bg-success-bg text-emerald border-success-line"
      : discount.tone === "vermilion"
        ? "bg-danger-bg text-accent border-accent-soft"
        : "bg-subtle text-ink border-line-strong";

  return (
    <article
      className={`group card-lift relative flex flex-col justify-between rounded-xl border border-hairline bg-surface p-4 hover:border-line-strong has-[[data-stretched]:focus-visible]:outline-2 has-[[data-stretched]:focus-visible]:outline-accent has-[[data-stretched]:focus-visible]:outline-offset-2 ${
        revealIndex !== undefined ? "reveal" : ""
      }`}
      style={
        revealIndex !== undefined
          ? { ["--i" as string]: Math.min(revealIndex, 12) }
          : undefined
      }
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold tracking-tight tabular-nums ${discountClasses}`}
          >
            {discount.label}
          </span>
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusMeta.className}`}
          >
            {statusMeta.label}
          </span>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between gap-2 text-xs text-ink-muted">
            <span className="font-semibold uppercase tracking-wide text-ink-2 truncate">
              {deal.brandName}
            </span>
            <span className="shrink-0">{deal.category}</span>
          </div>

          <h3 className="mt-1 text-base font-bold leading-snug text-ink group-hover:text-accent transition-colors">
            <Link
              href={`/deals/${deal.slug}`}
              data-stretched
              className="outline-none after:absolute after:inset-0 after:content-['']"
            >
              {deal.title}
            </Link>
          </h3>

          <p className="mt-1.5 text-sm leading-relaxed text-ink-2 line-clamp-2">
            {deal.description}
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-hairline bg-canvas p-2.5 text-xs">
          <div>
            <dt className="text-ink-muted">Periode Klaim</dt>
            <dd className="mt-0.5 font-semibold text-ink truncate">{deal.claimWindow}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Min. Belanja</dt>
            <dd className="mt-0.5 font-mono font-semibold text-ink tabular-nums truncate">
              {deal.minPurchaseIdr === 0 ? "Rp0 (Gratis)" : formatIdr(deal.minPurchaseIdr)}
            </dd>
          </div>
          <div className="col-span-2 pt-1 border-t border-hairline flex flex-wrap items-center gap-1.5">
            {deal.requiresIdCard && (
              <span className="inline-flex items-center rounded-md bg-surface border border-hairline px-1.5 py-0.5 text-[11px] font-medium text-ink">
                Wajib KTP / Identitas
              </span>
            )}
            {deal.requiresApp ? (
              <span className="inline-flex items-center rounded-md bg-surface border border-hairline px-1.5 py-0.5 text-[11px] font-medium text-ink">
                App: {deal.appName || "Aplikasi Brand"}
                {deal.minRegistrationDays ? ` (Daftar H-${deal.minRegistrationDays})` : ""}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-md bg-surface border border-hairline px-1.5 py-0.5 text-[11px] font-medium text-emerald">
                Tanpa Aplikasi
              </span>
            )}
          </div>
        </dl>
      </div>

      <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between gap-2 text-xs">
        <div className="relative z-10 flex items-center gap-3 text-ink-2 tabular-nums">
          <span className="inline-flex items-center gap-1 font-medium text-emerald" title="Konfirmasi masih berlaku">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {deal.stillWorksCount}
          </span>
          <span className="inline-flex items-center gap-1" title="Jumlah bukti terlampir">
            <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
            {deal.proofCount} bukti
          </span>
          <span className="inline-flex items-center gap-1 text-ink-muted" title="Terakhir diverifikasi">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {formatRelativeDays(deal.lastVerifiedAt, now)}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {deal.sourceUrl && (
            <a
              href={deal.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 rounded-md p-2 -m-1 text-ink-muted hover:text-ink pressable focus-ring"
              title="Buka halaman sumber asli"
              aria-label={`Buka sumber ${deal.brandName}`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <Link
            href={`/deals/${deal.slug}`}
            className="relative z-10 rounded-full px-2.5 py-1 -mr-1 font-semibold text-accent hover:text-accent-hover hover:bg-accent-soft/40 pressable focus-ring"
          >
            Detail &amp; Bukti
          </Link>
        </div>
      </div>
    </article>
  );
}
