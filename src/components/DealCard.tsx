import Link from "next/link";
import { CheckCircle2, Clock, FileCheck2, ExternalLink, IdCard, Smartphone, Store } from "lucide-react";
import {
  getVerificationMeta,
  getValueHeadline,
  type DealSummaryDto,
} from "@/lib/deal-types";
import { Badge } from "@/components/ui/Badge";
import { formatIdr, formatRelativeDays } from "@/lib/validation";

interface DealCardProps {
  deal: DealSummaryDto;
  nowIso: string;
  /** Stagger index for the entrance animation; omit to skip animating. */
  revealIndex?: number;
  /** Render as a static preview (no navigation links) — used by the submit form. */
  preview?: boolean;
}

const numeralToneClasses: Record<string, string> = {
  emerald: "text-emerald",
  clay: "text-accent",
  ink: "text-ink",
};

export function DealCard({ deal, nowIso, revealIndex, preview }: DealCardProps) {
  const statusMeta = getVerificationMeta(deal.verificationStatus);
  const headline = getValueHeadline(deal.discountType, deal.discountValue);
  const now = new Date(nowIso);

  return (
    <article
      className={`group card-lift relative flex flex-col justify-between rounded-2xl border border-hairline bg-surface p-5 ${
        preview ? "" : "hover:border-line-strong has-[[data-stretched]:focus-visible]:outline-2 has-[[data-stretched]:focus-visible]:outline-accent has-[[data-stretched]:focus-visible]:outline-offset-2 "
      }${
        revealIndex !== undefined ? "reveal" : ""
      }`}
      style={
        revealIndex !== undefined
          ? { ["--i" as string]: Math.min(revealIndex, 12) }
          : undefined
      }
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {deal.brandLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={deal.brandLogoUrl}
                alt=""
                width={20}
                height={20}
                className="h-5 w-5 shrink-0 rounded-full border border-hairline bg-subtle object-cover"
              />
            ) : null}
            <span className="truncate text-xs font-semibold uppercase tracking-wide text-ink-2">
              {deal.brandName}
            </span>
            <span aria-hidden="true" className="text-ink-muted">
              ·
            </span>
            <span className="shrink-0 truncate text-xs text-ink-muted">
              {deal.category}
            </span>
          </div>
          <Badge tone={statusMeta.tone} className="shrink-0 whitespace-nowrap">
            {statusMeta.label}
          </Badge>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span
            className={`font-serif text-[2.625rem] leading-[0.95] tracking-tight ${numeralToneClasses[headline.tone]}`}
          >
            {headline.numeral}
          </span>
          <span className="text-micro font-medium uppercase text-ink-muted">
            {headline.unit}
          </span>
        </div>

        <h3 className="mt-3 text-base font-semibold leading-snug text-ink">
          {preview ? (
            deal.title
          ) : (
            <Link
              href={`/deals/${deal.slug}`}
              data-stretched
              className="outline-none after:absolute after:inset-0 after:content-[''] transition-colors group-hover:text-accent"
            >
              {deal.title}
            </Link>
          )}
        </h3>

        <p className="mt-1.5 text-sm leading-relaxed text-ink-2 line-clamp-2">
          {deal.description}
        </p>

        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          {deal.requiresApp ? (
            <span className="inline-flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
              App {deal.appName || "brand"}
              {deal.minRegistrationDays
                ? ` · daftar H-${deal.minRegistrationDays}`
                : ""}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-ink-2">
              <Store className="h-3.5 w-3.5" aria-hidden="true" />
              Langsung klaim
            </span>
          )}
          {deal.requiresIdCard && (
            <span className="inline-flex items-center gap-1.5">
              <IdCard className="h-3.5 w-3.5" aria-hidden="true" />
              Wajib KTP
            </span>
          )}
        </p>
      </div>

      <div className="mt-5 pt-4 border-t border-hairline">
        <dl className="grid grid-cols-2 gap-x-4 text-xs">
          <div className="min-w-0">
            <dt className="text-ink-muted">Periode klaim</dt>
            <dd className="mt-0.5 truncate font-medium text-ink">
              {deal.claimWindow}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-ink-muted">Min. belanja</dt>
            <dd className="mt-0.5 truncate font-mono font-medium text-ink tabular-nums">
              {deal.minPurchaseIdr === 0
                ? "Rp0 (Gratis)"
                : formatIdr(deal.minPurchaseIdr)}
            </dd>
          </div>
        </dl>

        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <div className="relative z-10 flex items-center gap-3 text-ink-2 tabular-nums">
            <span
              className="inline-flex items-center gap-1 font-medium text-emerald"
              aria-label={`${deal.stillWorksCount} konfirmasi masih berlaku`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {deal.stillWorksCount}
            </span>
            <span
              className="inline-flex items-center gap-1"
              aria-label={`${deal.proofCount} bukti terlampir`}
            >
              <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
              {deal.proofCount} bukti
            </span>
            <span
              className="inline-flex items-center gap-1 text-ink-muted"
              aria-label={`Terakhir diverifikasi ${formatRelativeDays(deal.lastVerifiedAt, now)}`}
            >
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {formatRelativeDays(deal.lastVerifiedAt, now)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {deal.sourceUrl && !preview && (
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
            {!preview && (
              <Link
                href={`/deals/${deal.slug}`}
                className="relative z-10 rounded-full px-2.5 py-1 -mr-1 font-semibold text-accent hover:text-accent-hover hover:bg-accent-soft/60 pressable focus-ring"
              >
                Detail &amp; Bukti
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
