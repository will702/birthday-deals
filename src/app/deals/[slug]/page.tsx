import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, CheckSquare, ExternalLink, MapPin, Smartphone } from "lucide-react";
import { DealVerificationPanel } from "@/components/DealVerificationPanel";
import {
  getDiscountBadge,
  getSourceLabel,
  getVerificationMeta,
  type DealDetailDto,
} from "@/lib/deal-types";
import { prisma } from "@/lib/prisma";
import { formatIdr, formatRelativeDays, parseTermsJson } from "@/lib/validation";

function DealDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <div className="h-4 w-40 rounded-md skeleton" />
      <div className="h-48 rounded-xl border border-hairline skeleton" />
      <div className="h-72 rounded-xl border border-hairline skeleton" />
    </div>
  );
}

async function DealDetailLoader({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const now = new Date();

  const deal = await prisma.deal.findUnique({
    where: { slug },
    include: {
      proofs: { orderBy: { createdAt: "desc" } },
      verifications: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!deal) {
    notFound();
  }

  const terms = parseTermsJson(deal.termsAndConditions);
  const discount = getDiscountBadge(deal.discountType, deal.discountValue);
  const statusMeta = getVerificationMeta(deal.verificationStatus);

  const dto: DealDetailDto = {
    id: deal.id,
    slug: deal.slug,
    brandName: deal.brandName,
    brandLogoUrl: deal.brandLogoUrl,
    category: deal.category,
    title: deal.title,
    discountType: deal.discountType,
    discountValue: deal.discountValue,
    description: deal.description,
    termsAndConditions: terms,
    claimWindow: deal.claimWindow,
    requiresApp: deal.requiresApp,
    appName: deal.appName,
    minRegistrationDays: deal.minRegistrationDays,
    requiresIdCard: deal.requiresIdCard,
    minPurchaseIdr: deal.minPurchaseIdr,
    locations: deal.locations,
    sourceUrl: deal.sourceUrl,
    sourceType: deal.sourceType,
    verificationStatus: deal.verificationStatus,
    validYear: deal.validYear,
    stillWorksCount: deal.stillWorksCount,
    expiredReportCount: deal.expiredReportCount,
    freshnessScore: deal.freshnessScore,
    lastScrapedAt: deal.lastScrapedAt ? deal.lastScrapedAt.toISOString() : null,
    lastVerifiedAt: deal.lastVerifiedAt.toISOString(),
    createdAt: deal.createdAt.toISOString(),
    proofCount: deal.proofs.length,
    verificationCount: deal.verifications.length,
    latestProofImageUrl: deal.proofs[0]?.proofImageUrl ?? null,
    proofs: deal.proofs.map((p) => ({
      id: p.id,
      submitterName: p.submitterName,
      proofImageUrl: p.proofImageUrl,
      proofLinkUrl: p.proofLinkUrl,
      claimedDate: p.claimedDate ? p.claimedDate.toISOString() : null,
      outletLocation: p.outletLocation,
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
    })),
    verifications: deal.verifications.map((v) => ({
      id: v.id,
      voteType: v.voteType,
      comment: v.comment,
      proofImageUrl: v.proofImageUrl,
      proofLinkUrl: v.proofLinkUrl,
      voterFingerprint: v.voterFingerprint,
      createdAt: v.createdAt.toISOString(),
    })),
  };

  const discountClasses =
    discount.tone === "emerald"
      ? "bg-success-bg text-emerald border-success-line"
      : discount.tone === "vermilion"
        ? "bg-danger-bg text-accent border-accent-soft"
        : "bg-subtle text-ink border-line-strong";

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-ink-2 hover:text-ink pressable focus-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kembali ke Direktori Promo
      </Link>

      {/* Main Deal Summary Card */}
      <article className="rounded-xl border border-hairline bg-surface p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-xs font-bold tabular-nums ${discountClasses}`}
            >
              {discount.label}
            </span>
            <span className="rounded-md border border-hairline bg-canvas px-2.5 py-1 text-xs font-medium text-ink-2">
              {deal.category}
            </span>
            <span className="rounded-md border border-hairline bg-canvas px-2.5 py-1 text-xs font-medium text-ink-2">
              {getSourceLabel(deal.sourceType)}
            </span>
          </div>

          <span
            className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
          >
            {statusMeta.label}
          </span>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            {deal.brandName}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-ink">
            {deal.title}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-ink-2 leading-relaxed">
            {deal.description}
          </p>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-lg border border-hairline bg-canvas p-4 text-xs">
          <div>
            <dt className="text-ink-muted">Periode Klaim</dt>
            <dd className="mt-1 font-bold text-ink">{deal.claimWindow}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Minimum Transaksi</dt>
            <dd className="mt-1 font-mono font-bold text-ink tabular-nums">
              {formatIdr(deal.minPurchaseIdr)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Identitas (KTP/SIM)</dt>
            <dd className="mt-1 font-bold text-ink">
              {deal.requiresIdCard ? "Wajib Ditunjukkan" : "Tidak Disebutkan"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Terakhir Diverifikasi</dt>
            <dd className="mt-1 font-bold text-emerald">
              {formatRelativeDays(deal.lastVerifiedAt, now)}
            </dd>
          </div>
        </dl>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-start gap-2.5 rounded-lg border border-hairline p-3">
            <Smartphone className="h-4 w-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-bold text-ink">Persyaratan Aplikasi</p>
              <p className="mt-0.5 text-ink-2">
                {deal.requiresApp
                  ? `Wajib aplikasi ${deal.appName || "resmi brand"}${
                      deal.minRegistrationDays
                        ? ` (daftar minimal ${deal.minRegistrationDays} hari sebelum ulang tahun)`
                        : ""
                    }.`
                  : "Tidak wajib daftar aplikasi beforehand — langsung datang ke outlet."}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg border border-hairline p-3">
            <MapPin className="h-4 w-4 text-emerald shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-bold text-ink">Lokasi Berlaku</p>
              <p className="mt-0.5 text-ink-2">{deal.locations}</p>
            </div>
          </div>
        </div>

        {/* Terms & Conditions Checklist */}
        <div className="border-t border-hairline pt-4">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-emerald" aria-hidden="true" />
            Syarat &amp; Ketentuan Klaim
          </h2>
          <ul className="mt-2.5 space-y-2">
            {terms.map((term, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-sm text-ink-2 leading-relaxed"
              >
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                <span>{term}</span>
              </li>
            ))}
          </ul>
        </div>

        {deal.sourceUrl && (
          <div className="border-t border-hairline pt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-ink-muted">Sumber referensi asli:</span>
            <a
              href={deal.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md font-semibold text-accent hover:underline break-all pressable focus-ring"
            >
              {deal.sourceUrl}
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
          </div>
        )}
      </article>

      {/* Interactive Community Verification & Proof Gallery */}
      <DealVerificationPanel initialDeal={dto} nowIso={now.toISOString()} />
    </div>
  );
}

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<DealDetailSkeleton />}>
      <DealDetailLoader params={params} />
    </Suspense>
  );
}
