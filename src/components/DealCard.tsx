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
}

export function DealCard({ deal, nowIso }: DealCardProps) {
  const discount = getDiscountBadge(deal.discountType, deal.discountValue);
  const statusMeta = getVerificationMeta(deal.verificationStatus);
  const now = new Date(nowIso);

  const discountClasses =
    discount.tone === "emerald"
      ? "bg-[#ECFDF3] text-[#146C43] border-[#BCE3CE]"
      : discount.tone === "vermilion"
        ? "bg-[#FEF2F2] text-[#C83228] border-[#FACBC7]"
        : "bg-[#F3EDE3] text-[#18181B] border-[#D3C8B8]";

  return (
    <article className="group flex flex-col justify-between rounded-lg border border-[#E4DDD3] bg-white p-4 transition-colors hover:border-[#D3C8B8]">
      <div>
        <div className="flex items-start justify-between gap-2">
          <span
            className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] font-bold tracking-tight tabular-nums ${discountClasses}`}
          >
            {discount.label}
          </span>
          <span
            className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${statusMeta.className}`}
          >
            {statusMeta.label}
          </span>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between gap-2 text-xs text-[#71717A]">
            <span className="font-semibold uppercase tracking-wide text-[#52525B] truncate">
              {deal.brandName}
            </span>
            <span className="shrink-0">{deal.category}</span>
          </div>

          <h3 className="mt-1 text-base font-bold leading-snug text-[#18181B] group-hover:text-[#C83228] transition-colors">
            <Link href={`/deals/${deal.slug}`} className="focus:outline-none">
              {deal.title}
            </Link>
          </h3>

          <p className="mt-1.5 text-sm leading-relaxed text-[#52525B] line-clamp-2">
            {deal.description}
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2 rounded-md border border-[#E4DDD3] bg-[#FAF7F2] p-2.5 text-xs">
          <div>
            <dt className="text-[#71717A]">Periode Klaim</dt>
            <dd className="mt-0.5 font-semibold text-[#18181B] truncate">{deal.claimWindow}</dd>
          </div>
          <div>
            <dt className="text-[#71717A]">Min. Belanja</dt>
            <dd className="mt-0.5 font-mono font-semibold text-[#18181B] tabular-nums truncate">
              {deal.minPurchaseIdr === 0 ? "Rp0 (Gratis)" : formatIdr(deal.minPurchaseIdr)}
            </dd>
          </div>
          <div className="col-span-2 pt-1 border-t border-[#E4DDD3] flex flex-wrap items-center gap-1.5">
            {deal.requiresIdCard && (
              <span className="inline-flex items-center rounded bg-white border border-[#E4DDD3] px-1.5 py-0.5 text-[11px] font-medium text-[#18181B]">
                Wajib KTP / Identitas
              </span>
            )}
            {deal.requiresApp ? (
              <span className="inline-flex items-center rounded bg-white border border-[#E4DDD3] px-1.5 py-0.5 text-[11px] font-medium text-[#18181B]">
                App: {deal.appName || "Aplikasi Brand"}
                {deal.minRegistrationDays ? ` (Daftar H-${deal.minRegistrationDays})` : ""}
              </span>
            ) : (
              <span className="inline-flex items-center rounded bg-white border border-[#E4DDD3] px-1.5 py-0.5 text-[11px] font-medium text-[#146C43]">
                Tanpa Aplikasi
              </span>
            )}
          </div>
        </dl>
      </div>

      <div className="mt-4 pt-3 border-t border-[#E4DDD3] flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3 text-[#52525B] tabular-nums">
          <span className="inline-flex items-center gap-1 font-medium text-[#146C43]" title="Konfirmasi masih berlaku">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {deal.stillWorksCount}
          </span>
          <span className="inline-flex items-center gap-1" title="Jumlah bukti terlampir">
            <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
            {deal.proofCount} bukti
          </span>
          <span className="inline-flex items-center gap-1 text-[#71717A]" title="Terakhir diverifikasi">
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
              className="text-[#71717A] hover:text-[#18181B] p-1"
              title="Buka halaman sumber asli"
              aria-label={`Buka sumber ${deal.brandName}`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <Link
            href={`/deals/${deal.slug}`}
            className="font-semibold text-[#C83228] hover:text-[#9F221A]"
          >
            Detail &amp; Bukti
          </Link>
        </div>
      </div>
    </article>
  );
}
