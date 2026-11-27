import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  IdCard,
  Image as ImageIcon,
  Sparkles,
  Smartphone,
  Store,
} from "lucide-react";
import { DealCardActions } from "@/components/DealCardActions";
import { TrackedSourceLink } from "@/components/TrackedSourceLink";
import { Badge, StatusDot } from "@/components/ui/Badge";
import {
  cleanDealDescription,
  getBrandInitials,
  getCategoryMeta,
  getValueHeadline,
  getVerificationMeta,
  type DealSummaryDto,
} from "@/lib/deal-types";
import { cn } from "@/lib/utils";
import { formatIdr, formatRelativeDays } from "@/lib/validation";

interface DealCardProps {
  deal: DealSummaryDto;
  nowIso: string;
  /** Stagger index for the entrance animation; omit to skip animating. */
  revealIndex?: number;
  /** Render as a static preview (no navigation links) — used by the submit form. */
  preview?: boolean;
  /** Grid card (default) or horizontal compact list row. */
  layout?: "grid" | "list";
  /** Why this deal was recommended (Indonesian strings); rendered as chips. */
  reasons?: string[];
  /** Shows a "not interested" button; invoked after the DISMISS interaction is logged. */
  onDismiss?: (dealId: string) => void;
}

const numeralToneClasses: Record<string, string> = {
  emerald: "text-emerald",
  clay: "text-accent",
  ink: "text-ink",
};

export function DealCard({
  deal,
  nowIso,
  revealIndex,
  preview,
  layout = "grid",
  reasons,
  onDismiss,
}: DealCardProps) {
  const statusMeta = getVerificationMeta(deal.verificationStatus);
  const categoryMeta = getCategoryMeta(deal.category);
  const headline = getValueHeadline(deal.discountType, deal.discountValue, deal.title);
  const cleanedDescription = cleanDealDescription(
    deal.brandName,
    deal.title,
    deal.description,
  );
  const initials = getBrandInitials(deal.brandName);
  const now = new Date(nowIso);
  const isQuietStatus = deal.verificationStatus === "SCRAPER_VERIFIED";

  const prepPill = deal.requiresApp ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-warn-line bg-warn-bg px-2 py-0.5 text-[11px] font-semibold text-amber whitespace-nowrap">
      <Smartphone className="h-3 w-3 shrink-0" aria-hidden="true" />
      {deal.minRegistrationDays
        ? `Daftar H-${deal.minRegistrationDays}`
        : "Wajib Aplikasi"}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-success-line bg-success-bg px-2 py-0.5 text-[11px] font-semibold text-emerald whitespace-nowrap">
      <Store className="h-3 w-3 shrink-0" aria-hidden="true" />
      Langsung Klaim
    </span>
  );

  const reasonChips =
    reasons && reasons.length > 0 ? (
      <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Alasan rekomendasi">
        {reasons.map((reason) => (
          <li
            key={reason}
            className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-hover"
          >
            <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
            {reason}
          </li>
        ))}
      </ul>
    ) : null;

  if (layout === "list") {
    return (
      <article
        className={cn(
          "group card-lift relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden rounded-2xl border border-hairline bg-surface p-4 pl-5",
          !preview &&
            "hover:border-line-strong has-[[data-stretched]:focus-visible]:outline-2 has-[[data-stretched]:focus-visible]:outline-accent has-[[data-stretched]:focus-visible]:outline-offset-2",
          revealIndex !== undefined && "reveal",
        )}
        style={
          revealIndex !== undefined
            ? { ["--i" as string]: Math.min(revealIndex, 10) }
            : undefined
        }
      >
        <span
          aria-hidden="true"
          className={cn("absolute inset-y-0 left-0 w-1", categoryMeta.barClass)}
        />

        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          {deal.brandLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={deal.brandLogoUrl}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-xl border border-hairline bg-subtle object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-sm font-extrabold tracking-tight",
                categoryMeta.avatarBgClass,
                categoryMeta.avatarTextClass,
              )}
            >
              {initials}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-sm font-bold text-ink">
                {deal.brandName}
              </span>
              <span className="text-[11px] font-medium text-ink-muted">
                · {deal.category}
              </span>
              {prepPill}
              {deal.requiresIdCard && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-2">
                  <IdCard className="h-3 w-3 text-ink-muted" aria-hidden="true" />
                  KTP
                </span>
              )}
            </div>

            <h3 className="mt-1 text-sm sm:text-base font-bold leading-snug text-ink">
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

            <p className="mt-1 text-xs text-ink-2 line-clamp-1">{cleanedDescription}</p>
            {reasonChips}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-dashed border-hairline pt-3 sm:border-t-0 sm:pt-0 shrink-0">
          <div className="flex items-center gap-3 text-xs text-ink-muted tabular-nums">
            <span className="font-mono text-ink-2">{deal.claimWindow}</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {deal.stillWorksCount}
            </span>
            {deal.latestProofImageUrl && (
              <span className="inline-flex items-center gap-1 text-ink-2">
                <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Foto
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                "font-display text-2xl font-extrabold leading-none tracking-tight",
                numeralToneClasses[headline.tone],
              )}
            >
              {headline.numeral}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              {headline.unit}
            </span>
          </div>

          {!preview && (
            <DealCardActions
              dealId={deal.id}
              brandName={deal.brandName}
              onDismiss={onDismiss}
            />
          )}

          {!preview && (
            <ArrowUpRight
              className="hidden sm:block h-4 w-4 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
              aria-hidden="true"
            />
          )}
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "group card-lift relative flex flex-col justify-between overflow-hidden rounded-2xl border border-hairline bg-surface",
        !preview &&
          "hover:border-line-strong has-[[data-stretched]:focus-visible]:outline-2 has-[[data-stretched]:focus-visible]:outline-accent has-[[data-stretched]:focus-visible]:outline-offset-2",
        revealIndex !== undefined && "reveal",
      )}
      style={
        revealIndex !== undefined
          ? { ["--i" as string]: Math.min(revealIndex, 10) }
          : undefined
      }
    >
      {/* Top Category Accent Band */}
      <div className={cn("h-1 w-full shrink-0", categoryMeta.barClass)} aria-hidden="true" />

      <div className="flex flex-1 flex-col justify-between p-5 pt-4">
        <div>
          {/* Brand Monogram & Quiet/Signal Status */}
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              {deal.brandLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={deal.brandLogoUrl}
                  alt=""
                  width={36}
                  height={36}
                  className="h-9 w-9 shrink-0 rounded-xl border border-hairline bg-subtle object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-xs font-extrabold tracking-tight border border-black/5",
                    categoryMeta.avatarBgClass,
                    categoryMeta.avatarTextClass,
                  )}
                >
                  {initials}
                </span>
              )}

              <div className="min-w-0">
                <div className="truncate font-display text-sm font-bold text-ink leading-tight">
                  {deal.brandName}
                </div>
                <div className="truncate text-[11px] font-medium text-ink-muted mt-0.5">
                  {deal.category}
                </div>
              </div>
            </div>

            {isQuietStatus ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink-2 border border-hairline">
                <StatusDot tone="emerald" />
                {statusMeta.label}
              </span>
            ) : (
              <Badge tone={statusMeta.tone} className="shrink-0 whitespace-nowrap">
                {statusMeta.label}
              </Badge>
            )}
          </div>

          {/* Hero Value Numeral + Prep Urgency Pill */}
          <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  "font-display text-[2.25rem] font-extrabold leading-[0.95] tracking-tight",
                  numeralToneClasses[headline.tone],
                )}
              >
                {headline.numeral}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                {headline.unit}
              </span>
            </div>

            <div className="flex items-center gap-1.5">{prepPill}</div>
          </div>

          {/* Title + Cleaned Copy */}
          <h3 className="mt-3 text-[15px] font-bold leading-snug text-ink">
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

          <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-ink-2 line-clamp-2">
            {cleanedDescription}
          </p>
          {reasonChips}

          {(deal.requiresApp || deal.requiresIdCard) && (
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-ink-muted">
              {deal.requiresApp && deal.appName && (
                <span className="inline-flex items-center gap-1 text-ink-2">
                  <Smartphone className="h-3.5 w-3.5 text-amber" aria-hidden="true" />
                  {deal.appName}
                </span>
              )}
              {deal.requiresIdCard && (
                <span className="inline-flex items-center gap-1 text-ink-2">
                  <IdCard className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
                  Wajib KTP
                </span>
              )}
            </p>
          )}
        </div>

        {/* Ticket-Stub Spec & Proof Footer */}
        <div className="mt-4 pt-3.5 border-t border-dashed border-hairline">
          <div className="flex items-center justify-between gap-3">
            <dl className="grid grid-cols-2 gap-x-4 text-xs flex-1 min-w-0">
              <div className="min-w-0">
                <dt className="text-[11px] text-ink-muted">Periode klaim</dt>
                <dd className="mt-0.5 truncate font-semibold text-ink">
                  {deal.claimWindow}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[11px] text-ink-muted">Min. belanja</dt>
                <dd className="mt-0.5 truncate font-mono font-semibold text-ink tabular-nums">
                  {deal.minPurchaseIdr === 0
                    ? "Rp0 (Gratis)"
                    : formatIdr(deal.minPurchaseIdr)}
                </dd>
              </div>
            </dl>

            {deal.latestProofImageUrl && (
              <div
                className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-hairline bg-subtle"
                title="Tersedia foto bukti asli"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={deal.latestProofImageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-xs">
            <div className="relative z-10 flex items-center gap-3 text-ink-2 tabular-nums">
              <span
                className="inline-flex items-center gap-1 font-semibold text-emerald"
                aria-label={`${deal.stillWorksCount} konfirmasi masih berlaku`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {deal.stillWorksCount}
              </span>
              <span
                className="inline-flex items-center gap-1"
                aria-label={`${deal.proofCount} bukti terlampir`}
              >
                <FileCheck2 className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
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

            <div className="flex items-center gap-1 shrink-0">
              {!preview && (
                <DealCardActions
                  dealId={deal.id}
                  brandName={deal.brandName}
                  onDismiss={onDismiss}
                />
              )}
              {deal.sourceUrl && !preview && (
                <TrackedSourceLink
                  dealId={deal.id}
                  href={deal.sourceUrl}
                  className="relative z-10 rounded-lg p-1.5 text-ink-muted hover:bg-subtle hover:text-ink pressable focus-ring"
                  title="Buka halaman sumber asli"
                  aria-label={`Buka sumber ${deal.brandName}`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </TrackedSourceLink>
              )}
              {!preview && (
                <span
                  aria-hidden="true"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-canvas text-ink-2 transition-all group-hover:bg-accent group-hover:text-white"
                >
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
