import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  ExternalLink,
  IdCard,
  MapPin,
  Smartphone,
  Store,
} from "lucide-react";
import { DealVerificationPanel } from "@/components/DealVerificationPanel";
import { ShareDealButton } from "@/components/ShareDealButton";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import {
  cleanDealDescription,
  getBrandInitials,
  getCategoryMeta,
  getSourceLabel,
  getValueHeadline,
  getVerificationMeta,
  type DealDetailDto,
} from "@/lib/deal-types";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { formatIdr, formatRelativeDays, parseTermsJson } from "@/lib/validation";

function DealDetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
      <div className="h-4 w-40 rounded-md skeleton" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="h-64 rounded-3xl skeleton" />
          <div className="h-48 rounded-2xl skeleton" />
        </div>
        <div className="lg:col-span-4 h-80 rounded-3xl skeleton" />
      </div>
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
  const categoryMeta = getCategoryMeta(deal.category);
  const headline = getValueHeadline(deal.discountType, deal.discountValue, deal.title);
  const cleanedDescription = cleanDealDescription(
    deal.brandName,
    deal.title,
    deal.description,
  );
  const initials = getBrandInitials(deal.brandName);
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
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1 -ml-2 text-sm font-semibold text-ink-muted hover:text-ink hover:bg-subtle/70 pressable focus-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kembali ke Direktori
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-6">
          <article className="overflow-hidden rounded-3xl border border-hairline bg-surface">
            <div className={cn("h-1.5 w-full", categoryMeta.barClass)} aria-hidden="true" />

            <div className="p-5 sm:p-8">
              <header>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {deal.brandLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={deal.brandLogoUrl}
                        alt=""
                        width={44}
                        height={44}
                        className="h-11 w-11 shrink-0 rounded-2xl border border-hairline bg-subtle object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-display text-sm font-extrabold tracking-tight border border-black/5",
                          categoryMeta.avatarBgClass,
                          categoryMeta.avatarTextClass,
                        )}
                      >
                        {initials}
                      </span>
                    )}

                    <div className="min-w-0">
                      <div className="font-display text-base font-bold text-ink leading-tight">
                        {deal.brandName}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                        <span>{deal.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{getSourceLabel(deal.sourceType)}</span>
                      </div>
                    </div>
                  </div>

                  <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                </div>

                {/* Tight Baseline-Aligned Offer Value */}
                <div className="mt-6 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span
                    className={cn(
                      "font-display text-[clamp(3rem,8vw,4.5rem)] font-extrabold leading-[0.95] tracking-tight",
                      numeralTone,
                    )}
                    aria-label={`${headline.numeral} ${headline.unit}`}
                  >
                    {headline.numeral}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    {headline.unit}
                  </span>
                </div>

                <h1 className="mt-3 font-display text-display-md text-ink">
                  {deal.title}
                </h1>
                <p className="mt-3 max-w-[65ch] text-sm sm:text-base leading-relaxed text-ink-2">
                  {cleanedDescription}
                </p>
              </header>

              {/* Spec Strip */}
              <dl className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-4 border-y border-dashed border-hairline py-5">
                <div className="min-w-0">
                  <dt className="text-micro font-semibold uppercase text-ink-muted">
                    Periode Klaim
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-ink">
                    {deal.claimWindow}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-micro font-semibold uppercase text-ink-muted">
                    Min. Belanja
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-bold text-ink tabular-nums">
                    {deal.minPurchaseIdr === 0
                      ? "Rp0 (Gratis)"
                      : formatIdr(deal.minPurchaseIdr)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-micro font-semibold uppercase text-ink-muted">
                    Identitas KTP
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-ink">
                    {deal.requiresIdCard ? "Wajib Asli" : "Opsional"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-micro font-semibold uppercase text-ink-muted">
                    Diverifikasi
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-emerald">
                    {formatRelativeDays(deal.lastVerifiedAt, now)}
                  </dd>
                </div>
              </dl>

              {/* Terms & Conditions */}
              <section className="mt-6">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                  <CheckSquare className="h-4.5 w-4.5 text-emerald" aria-hidden="true" />
                  Syarat &amp; Ketentuan Klaim
                </h2>
                <ul className="mt-3.5 space-y-2.5">
                  {terms.map((term, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-sm text-ink-2 leading-relaxed"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-vivid"
                      />
                      <span>{term}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {deal.sourceUrl && (
                <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-4 text-xs">
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
            </div>
          </article>

          {/* Interactive Community Verification & Proof Gallery */}
          <div id="verifikasi-komunitas" className="scroll-mt-20">
            <DealVerificationPanel initialDeal={dto} nowIso={now.toISOString()} />
          </div>
        </div>

        {/* Sticky Sidebar: Ringkasan Klaim & Persiapan */}
        <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
          <div className="rounded-3xl border border-hairline bg-surface p-5 sm:p-6 space-y-5 shadow-[0_2px_10px_-4px_rgb(17_19_23/0.05)]">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">
                Panduan Persiapan Klaim
              </h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Cek langkah wajib sebelum datang ke outlet {deal.brandName}.
              </p>
            </div>

            {deal.requiresApp ? (
              <div className="rounded-2xl border border-warn-line bg-warn-bg p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber">
                  <Smartphone className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {deal.minRegistrationDays
                    ? `Daftar Minimal H-${deal.minRegistrationDays}`
                    : "Wajib Aplikasi Member"}
                </div>
                <p className="text-xs leading-relaxed text-ink-2">
                  Unduh &amp; daftarkan akun di{" "}
                  <strong className="text-ink">{deal.appName || "aplikasi resmi brand"}</strong>
                  {deal.minRegistrationDays
                    ? ` paling lambat ${deal.minRegistrationDays} hari sebelum hari ulang tahun.`
                    : " sebelum melakukan klaim di kasir."}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-success-line bg-success-bg p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald">
                  <Store className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Langsung Klaim di Outlet
                </div>
                <p className="text-xs leading-relaxed text-ink-2">
                  Tidak wajib registrasi aplikasi terlebih dahulu — cukup datang sesuai periode klaim.
                </p>
              </div>
            )}

            <ul className="space-y-3 text-xs border-t border-hairline pt-4">
              <li className="flex items-start gap-2.5">
                <CalendarClock className="h-4 w-4 shrink-0 text-ink-muted mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-semibold text-ink">Periode berlaku:</span>{" "}
                  <span className="text-ink-2">{deal.claimWindow}</span>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <IdCard className="h-4 w-4 shrink-0 text-ink-muted mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-semibold text-ink">Identitas:</span>{" "}
                  <span className="text-ink-2">
                    {deal.requiresIdCard
                      ? "Wajib membawa KTP / SIM / Paspor asli"
                      : "Tidak disebutkan kewajiban KTP (tetap bawa untuk jaga-jaga)"}
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-ink-muted mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-semibold text-ink">Outlet:</span>{" "}
                  <span className="text-ink-2">{deal.locations}</span>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-semibold text-ink">Kepercayaan komunitas:</span>{" "}
                  <span className="font-mono font-semibold text-emerald tabular-nums">
                    {deal.stillWorksCount} konfirmasi
                  </span>{" "}
                  ·{" "}
                  <span className="font-mono text-ink-2 tabular-nums">
                    {dto.proofCount} bukti
                  </span>
                </div>
              </li>
            </ul>

            <div className="space-y-2 pt-2 border-t border-hairline">
              <a
                href="#verifikasi-komunitas"
                className={buttonClasses("primary", "md", "w-full")}
              >
                Konfirmasi / Kirim Bukti Klaim
              </a>

              {deal.sourceUrl && (
                <a
                  href={deal.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses("secondary", "md", "w-full")}
                >
                  Buka Sumber Resmi
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}

              <ShareDealButton title={`${deal.brandName} — ${deal.title}`} />
            </div>
          </div>
        </aside>
      </div>
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
