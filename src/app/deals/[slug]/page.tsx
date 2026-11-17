import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, CheckSquare, ExternalLink, MapPin, Smartphone } from "lucide-react";
import { DealVerificationPanel } from "@/components/DealVerificationPanel";
import { Badge } from "@/components/ui/Badge";
import {
  getSourceLabel,
  getValueHeadline,
  getVerificationMeta,
  type DealDetailDto,
} from "@/lib/deal-types";
import { prisma } from "@/lib/prisma";
import { formatIdr, formatRelativeDays, parseTermsJson } from "@/lib/validation";

function DealDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <div className="h-4 w-40 rounded-md skeleton" />
      <div className="h-52 rounded-xl skeleton" />
      <div className="h-24 rounded-xl skeleton" />
      <div className="h-72 rounded-xl skeleton" />
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const deal = await prisma.deal.findUnique({
    where: { slug },
    select: { title: true, brandName: true, description: true, category: true },
  });
  if (!deal) return {};

  const title = `${deal.brandName} — ${deal.title} | UltahID`;
  const description = `${deal.description} Promo ulang tahun ${deal.brandName} kategori ${deal.category}, diverifikasi komunitas UltahID.`;

  return {
    title,
    description,
    openGraph: { title, description, siteName: "UltahID" },
    twitter: { card: "summary", title, description },
  };
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
  const statusMeta = getVerificationMeta(deal.verificationStatus);
  const headline = getValueHeadline(deal.discountType, deal.discountValue);
  const numeralTone =
    headline.tone === "emerald"
      ? "text-emerald"
      : headline.tone === "clay"
        ? "text-accent"
        : "text-ink";

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

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-ink-muted hover:text-ink pressable focus-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kembali ke Direktori
      </Link>

      {/* Editorial header: the page is the surface, hairlines separate sections */}
      <article>
        <header>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {deal.brandLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={deal.brandLogoUrl}
                  alt=""
                  width={22}
                  height={22}
                  className="h-[22px] w-[22px] shrink-0 rounded-full border border-hairline bg-subtle object-cover"
                />
              ) : null}
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-2">
                {deal.brandName}
              </span>
              <span aria-hidden="true" className="text-ink-muted">
                ·
              </span>
              <span className="truncate text-xs text-ink-muted">
                {deal.category} · {getSourceLabel(deal.sourceType)}
              </span>
            </div>
            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-3">
            <span
              className={`font-serif text-[clamp(3.5rem,10vw,5.5rem)] leading-[0.9] tracking-tight ${numeralTone}`}
              aria-label={`${headline.numeral} ${headline.unit}`}
            >
              {headline.numeral}
            </span>
            <span className="pb-2 text-micro font-medium uppercase text-ink-muted">
              {headline.unit}
            </span>
          </div>

          <h1 className="mt-5 font-serif text-display-md text-ink">
            {deal.title}
          </h1>
          <p className="mt-3 max-w-[65ch] text-base leading-relaxed text-ink-2">
            {deal.description}
          </p>
        </header>

        {/* Spec strip: flat facts, no nested boxes */}
        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-y border-hairline py-5 lg:grid-cols-4">
          <div className="min-w-0">
            <dt className="text-micro font-medium uppercase text-ink-muted">
              Periode Klaim
            </dt>
            <dd className="mt-1 text-sm font-semibold text-ink">
              {deal.claimWindow}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-micro font-medium uppercase text-ink-muted">
              Minimum Transaksi
            </dt>
            <dd className="mt-1 font-mono text-sm font-semibold text-ink tabular-nums">
              {formatIdr(deal.minPurchaseIdr)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-micro font-medium uppercase text-ink-muted">
              Identitas (KTP/SIM)
            </dt>
            <dd className="mt-1 text-sm font-semibold text-ink">
              {deal.requiresIdCard ? "Wajib Ditunjukkan" : "Tidak Disebutkan"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-micro font-medium uppercase text-ink-muted">
              Terakhir Diverifikasi
            </dt>
            <dd className="mt-1 text-sm font-semibold text-emerald">
              {formatRelativeDays(deal.lastVerifiedAt, now)}
            </dd>
          </div>
        </dl>

        {/* Requirements: two quiet panels */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-subtle/60 p-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink">
              <Smartphone className="h-4 w-4 text-accent" aria-hidden="true" />
              Persyaratan Aplikasi
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
              {deal.requiresApp
                ? `Wajib aplikasi ${deal.appName || "resmi brand"}${
                    deal.minRegistrationDays
                      ? ` (daftar minimal ${deal.minRegistrationDays} hari sebelum ulang tahun)`
                      : ""
                  }.`
                : "Tidak wajib daftar aplikasi — langsung datang ke outlet."}
            </p>
          </div>

          <div className="rounded-2xl bg-subtle/60 p-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink">
              <MapPin className="h-4 w-4 text-emerald" aria-hidden="true" />
              Lokasi Berlaku
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
              {deal.locations}
            </p>
          </div>
        </div>

        {/* Terms & Conditions */}
        <section className="mt-8">
          <h2 className="flex items-center gap-2 font-serif text-display-md text-ink">
            <CheckSquare className="h-5 w-5 text-emerald" aria-hidden="true" />
            Syarat &amp; Ketentuan Klaim
          </h2>
          <ul className="mt-4 space-y-2.5">
            {terms.map((term, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 text-sm text-ink-2 leading-relaxed"
              >
                <span
                  aria-hidden="true"
                  className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-vivid"
                />
                <span>{term}</span>
              </li>
            ))}
          </ul>
        </section>

        {deal.sourceUrl && (
          <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-5 text-xs">
            <span className="text-ink-muted">Sumber referensi asli:</span>
            <a
              href={deal.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1 rounded-md font-semibold text-accent hover:text-accent-hover underline-offset-4 hover:underline break-all pressable focus-ring"
            >
              {deal.sourceUrl}
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
          </footer>
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
