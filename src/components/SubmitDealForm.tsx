"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Link2, Upload, X } from "lucide-react";
import { DEAL_CATEGORIES, DISCOUNT_TYPES } from "@/lib/validation";
import type { DealSummaryDto } from "@/lib/deal-types";
import { DealCard } from "./DealCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/Field";

interface LinkPreview {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
  accessible: boolean;
  blockedReason: string | null;
}

function SectionStep({
  step,
  title,
  required,
  children,
  className = "",
}: {
  step: number;
  title: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-hairline bg-surface p-5 sm:p-6 space-y-5 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-xs font-semibold text-white"
        >
          {step}
        </span>
        <h2 className="font-serif text-xl tracking-tight text-ink">{title}</h2>
        {required ? <Badge tone="clay">Wajib</Badge> : null}
      </div>
      {children}
    </section>
  );
}

export function SubmitDealForm() {
  const router = useRouter();
  const [brandName, setBrandName] = useState("");
  const [category, setCategory] = useState<(typeof DEAL_CATEGORIES)[number]>("Drink & Cafe");
  const [title, setTitle] = useState("");
  const [discountType, setDiscountType] = useState<(typeof DISCOUNT_TYPES)[number]>("FREE_100");
  const [discountValue, setDiscountValue] = useState<string>("100");
  const [description, setDescription] = useState("");
  const [termsText, setTermsText] = useState(
    "Wajib menunjukkan KTP/SIM asli\nBerlaku untuk 1x klaim di hari ulang tahun"
  );
  const [claimWindow, setClaimWindow] = useState("H-7 s/d H+7");
  const [requiresApp, setRequiresApp] = useState(false);
  const [appName, setAppName] = useState("");
  const [minRegistrationDays, setMinRegistrationDays] = useState<string>("7");
  const [requiresIdCard, setRequiresIdCard] = useState(true);
  const [minPurchaseIdr, setMinPurchaseIdr] = useState<string>("0");
  const [locations, setLocations] = useState("Nasional (Seluruh Indonesia)");
  const [submitterName, setSubmitterName] = useState("");
  const [outletLocation, setOutletLocation] = useState("");
  const [proofNotes, setProofNotes] = useState("");
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [proofLinkUrl, setProofLinkUrl] = useState("");

  const [uploading, setUploading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(false);
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // Prerender-safe clock for the live preview: a fixed epoch at SSR, real time after mount.
  const [previewNowIso, setPreviewNowIso] = useState("2026-01-01T00:00:00.000Z");
  useEffect(() => {
    setPreviewNowIso(new Date().toISOString());
  }, []);

  async function handleImageUpload(file: File | undefined) {
    if (uploading) return;
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Format gambar tidak didukung. Gunakan JPG, PNG, atau WebP.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Ukuran gambar terlalu besar. Maksimal 4MB.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.headers.get("content-type")?.includes("application/json")) {
        throw new Error("Gagal mengunggah gambar. Coba file yang lebih kecil.");
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload gambar gagal.");
      setProofImageUrl(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload gagal.");
    } finally {
      setUploading(false);
    }
  }

  async function handleInspectLink() {
    if (!proofLinkUrl.trim()) return;
    setCheckingLink(true);
    setLinkPreview(null);
    try {
      const res = await fetch("/api/social-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: proofLinkUrl.trim() }),
      });
      const json = await res.json();
      if (res.ok) setLinkPreview(json);
    } finally {
      setCheckingLink(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!proofImageUrl && !proofLinkUrl.trim()) {
      setError(
        "Bukti wajib diisi: unggah foto struk/screenshot voucher ATAU tempel tautan sumber resmi/media sosial."
      );
      return;
    }

    const termsList = termsText
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length >= 2);

    if (termsList.length === 0) {
      setError("Isi minimal 1 baris syarat & ketentuan.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          category,
          title,
          discountType,
          discountValue:
            discountType === "FREE_100"
              ? 100
              : discountValue
                ? Number(discountValue)
                : null,
          description,
          termsAndConditions: termsList,
          claimWindow,
          requiresApp,
          appName: requiresApp ? appName : null,
          minRegistrationDays:
            requiresApp && minRegistrationDays ? Number(minRegistrationDays) : null,
          requiresIdCard,
          minPurchaseIdr: Number(minPurchaseIdr || 0),
          locations,
          submitterName: submitterName.trim() || "Anonim",
          outletLocation: outletLocation.trim() || null,
          proofNotes: proofNotes.trim() || null,
          proofImageUrl,
          proofLinkUrl: proofLinkUrl.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal menyimpan promo baru.");
      }

      router.push(`/deals/${json.deal.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  // Live preview: the real card, fed by the form's current state.
  const previewDeal: DealSummaryDto = {
    id: "preview",
    slug: "preview",
    brandName: brandName || "Nama Brand",
    brandLogoUrl: null,
    category,
    title: title || "Judul penawaran promo akan tampil di sini",
    discountType,
    discountValue:
      discountType === "FREE_100"
        ? 100
        : discountValue
          ? Number(discountValue)
          : null,
    description: description || "Ringkasan cara klaim tampil di sini.",
    termsAndConditions: [],
    claimWindow: claimWindow || "-",
    requiresApp,
    appName: appName || null,
    minRegistrationDays: requiresApp && minRegistrationDays ? Number(minRegistrationDays) : null,
    requiresIdCard,
    minPurchaseIdr: Number(minPurchaseIdr || 0),
    locations,
    sourceUrl: null,
    sourceType: "COMMUNITY",
    verificationStatus: "COMMUNITY_SUBMITTED",
    validYear: new Date(previewNowIso).getFullYear(),
    stillWorksCount: 1,
    expiredReportCount: 0,
    freshnessScore: 100,
    lastScrapedAt: null,
    lastVerifiedAt: previewNowIso,
    createdAt: previewNowIso,
    proofCount: proofImageUrl || proofLinkUrl ? 1 : 0,
    verificationCount: 0,
    latestProofImageUrl: proofImageUrl,
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-5">
        {/* Section 1: Identitas Promo */}
        <SectionStep step={1} title="Informasi Brand & Diskon">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="brandName" required>
                Nama Brand (Indonesia)
              </FieldLabel>
              <Input
                id="brandName"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Mis. Boost Juice Indonesia / Ta Wan"
                className="mt-1.5"
              />
            </div>

            <div>
              <FieldLabel htmlFor="category" required>
                Kategori
              </FieldLabel>
              <Select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as (typeof DEAL_CATEGORIES)[number])}
                className="mt-1.5"
              >
                {DEAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="title" required>
              Judul Penawaran Promo
            </FieldLabel>
            <Input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mis. Gratis 1 Original Smoothie (100% Off) atau Diskon 50% Menu Utama"
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <FieldLabel htmlFor="discountType" required>
                Jenis Potongan
              </FieldLabel>
              <Select
                id="discountType"
                value={discountType}
                onChange={(e) => {
                  const next = e.target.value as (typeof DISCOUNT_TYPES)[number];
                  setDiscountType(next);
                  if (next === "FREE_100") setDiscountValue("100");
                  else if (next === "BOGO") setDiscountValue("50");
                }}
                className="mt-1.5"
              >
                <option value="FREE_100">100% Gratis (Free Item)</option>
                <option value="DISCOUNT_PERCENT">Diskon Persentase (%)</option>
                <option value="BOGO">Beli 1 Gratis 1 (BOGO)</option>
                <option value="FREE_ITEM_WITH_PURCHASE">Gratis dgn Min. Order</option>
                <option value="VOUCHER">Voucher Potongan</option>
              </Select>
            </div>

            <div>
              <FieldLabel htmlFor="discountValue">Nilai Diskon (%)</FieldLabel>
              <Input
                id="discountValue"
                type="number"
                min={1}
                max={100}
                disabled={discountType === "FREE_100"}
                value={discountType === "FREE_100" ? "100" : discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="50"
                className="mt-1.5 font-mono tabular-nums"
              />
            </div>

            <div>
              <FieldLabel htmlFor="minPurchaseIdr">Min. Belanja (Rp)</FieldLabel>
              <Input
                id="minPurchaseIdr"
                type="number"
                min={0}
                step={5000}
                value={minPurchaseIdr}
                onChange={(e) => setMinPurchaseIdr(e.target.value)}
                className="mt-1.5 font-mono tabular-nums"
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="description" required>
              Ringkasan Cara Klaim
            </FieldLabel>
            <Textarea
              id="description"
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan cara klaim di kasir atau aplikasi, produk apa saja yang termasuk, dll."
              className="mt-1.5"
            />
          </div>
        </SectionStep>

        {/* Section 2: Syarat & Periode Klaim */}
        <SectionStep step={2} title="Syarat & Periode Klaim">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="claimWindow" required>
                Jendela Waktu Klaim
              </FieldLabel>
              <Input
                id="claimWindow"
                required
                value={claimWindow}
                onChange={(e) => setClaimWindow(e.target.value)}
                placeholder="Mis. Hari H, H-7 s/d H+7, Bulan Ulang Tahun"
                className="mt-1.5"
              />
            </div>

            <div>
              <FieldLabel htmlFor="locations">Cakupan Outlet</FieldLabel>
              <Input
                id="locations"
                value={locations}
                onChange={(e) => setLocations(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={requiresIdCard}
                onChange={(e) => setRequiresIdCard(e.target.checked)}
                className="h-4 w-4 rounded-md border-line-strong accent-accent"
              />
              Wajib Tunjukkan KTP / SIM / Paspor
            </label>

            <label className="inline-flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={requiresApp}
                onChange={(e) => setRequiresApp(e.target.checked)}
                className="h-4 w-4 rounded-md border-line-strong accent-accent"
              />
              Wajib Daftar Aplikasi Member
            </label>
          </div>

          {requiresApp && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-canvas p-4">
              <div>
                <FieldLabel htmlFor="appName" required>
                  Nama Aplikasi
                </FieldLabel>
                <Input
                  id="appName"
                  required={requiresApp}
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Mis. MyBoost / Boga App"
                  className="mt-1.5"
                />
              </div>
              <div>
                <FieldLabel htmlFor="minRegistrationDays">
                  Minimal Daftar Sebelum Hari H (Hari)
                </FieldLabel>
                <Input
                  id="minRegistrationDays"
                  type="number"
                  min={0}
                  max={365}
                  value={minRegistrationDays}
                  onChange={(e) => setMinRegistrationDays(e.target.value)}
                  className="mt-1.5 font-mono tabular-nums"
                />
              </div>
            </div>
          )}

          <div>
            <FieldLabel htmlFor="termsText" required>
              Daftar Syarat &amp; Ketentuan (1 poin per baris)
            </FieldLabel>
            <Textarea
              id="termsText"
              rows={4}
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </SectionStep>

        {/* Section 3: MANDATORY PROOF */}
        <SectionStep
          step={3}
          title="Lampirkan Bukti Asli"
          required
          className="border-accent-vivid/45"
        >
          <p className="-mt-2 text-sm leading-relaxed text-ink-2">
            Salah satu atau keduanya: agar direktori bebas dari info palsu,
            kirim foto struk/screenshot voucher aplikasi atau tautan
            pengumuman resmi brand.
          </p>

          <div className="space-y-2">
            <FieldLabel htmlFor="proofLinkUrl">
              Tautan Sumber Resmi / Postingan IG / TikTok
            </FieldLabel>
            <div className="flex gap-2">
              <Input
                id="proofLinkUrl"
                type="url"
                value={proofLinkUrl}
                onChange={(e) => setProofLinkUrl(e.target.value)}
                placeholder="https://www.instagram.com/p/... atau https://brand.co.id/promo"
                className="flex-1"
              />
              <Button
                variant="outline"
                disabled={!proofLinkUrl.trim() || checkingLink}
                onClick={handleInspectLink}
                className="shrink-0"
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                {checkingLink ? "Mengecek..." : "Cek Link"}
              </Button>
            </div>

            {linkPreview && (
              <div className="reveal rounded-xl bg-canvas p-3.5 text-xs">
                {linkPreview.accessible ? (
                  <div className="space-y-1">
                    <p className="font-bold text-emerald">
                      Tautan terbaca ({linkPreview.siteName || "Web"})
                    </p>
                    {linkPreview.title && (
                      <p className="font-semibold text-ink">{linkPreview.title}</p>
                    )}
                    {linkPreview.description && (
                      <p className="text-ink-2 line-clamp-2">{linkPreview.description}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-amber">
                    Catatan: Pratinjau otomatis tidak tersedia ({linkPreview.blockedReason}), tapi tautan tetap akan disimpan sebagai referensi.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <span className="flex items-baseline gap-1 text-xs font-semibold text-ink">
              Upload Screenshot Voucher / Foto Struk (JPG, PNG, WebP maks 4MB)
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <label
                data-dragover={dragOver ? "true" : undefined}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                  setDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                  setDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleImageUpload(e.dataTransfer.files?.[0]);
                }}
                className="pressable inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line-strong bg-canvas px-4 py-3 text-xs font-semibold text-ink hover:border-accent data-[dragover=true]:border-accent data-[dragover=true]:bg-accent-soft/40 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
              >
                <Upload className="h-4 w-4 text-accent" aria-hidden="true" />
                {uploading ? "Mengunggah gambar..." : "Pilih atau Taruh Gambar Bukti"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(e) => handleImageUpload(e.target.files?.[0])}
                />
              </label>

              {proofImageUrl && (
                <div className="reveal rounded-lg border border-success-line bg-success-bg p-1.5 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proofImageUrl}
                    alt="Preview bukti"
                    className="h-14 w-14 rounded-md object-cover"
                  />
                  <div className="text-xs pr-2">
                    <div className="font-semibold text-emerald flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Terunggah
                    </div>
                    <button
                      type="button"
                      onClick={() => setProofImageUrl(null)}
                      className="pressable focus-ring rounded-md text-[11px] text-accent hover:underline mt-0.5 inline-flex items-center gap-0.5"
                    >
                      <X className="h-3 w-3" /> Hapus
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="submitterName">Nama Kontributor (opsional)</FieldLabel>
              <Input
                id="submitterName"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                placeholder="Mis. Rina W."
                className="mt-1.5"
              />
            </div>
            <div>
              <FieldLabel htmlFor="outletLocation">
                Outlet Tempat Klaim (opsional)
              </FieldLabel>
              <Input
                id="outletLocation"
                value={outletLocation}
                onChange={(e) => setOutletLocation(e.target.value)}
                placeholder="Mis. Kota Kasablanka, Jakarta"
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="proofNotes">Catatan Bukti (opsional)</FieldLabel>
            <Input
              id="proofNotes"
              value={proofNotes}
              onChange={(e) => setProofNotes(e.target.value)}
              placeholder="Mis. Diklaim tanggal 15 Nov 2026, kasir langsung ACC."
              className="mt-1.5"
            />
          </div>
        </SectionStep>

        {error && (
          <div
            role="alert"
            className="reveal rounded-xl border border-danger-line bg-danger-bg p-3.5 text-sm font-medium text-danger-ink"
          >
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button type="submit" size="lg" disabled={submitting || uploading}>
            {submitting ? "Mempublikasikan..." : "Publikasikan Temuan Promo"}
          </Button>
        </div>
      </div>

      {/* Sidebar: live preview (the real card) + proof standard */}
      <aside className="space-y-4 lg:sticky lg:top-24 self-start">
        <div className="space-y-3">
          <h3 className="text-micro font-semibold uppercase text-ink-muted">
            Pratinjau Kartu Promo
          </h3>
          <DealCard deal={previewDeal} nowIso={previewNowIso} preview />
        </div>

        <div className="rounded-2xl bg-subtle/60 p-5 space-y-2.5 text-xs leading-relaxed text-ink-2">
          <h3 className="font-serif text-base tracking-tight text-ink">
            Kenapa wajib bukti?
          </h3>
          <p>
            Banyak daftar promo ulang tahun di internet yang sudah kedaluwarsa
            atau diam-diam berubah syarat minimum belanjanya.
          </p>
          <p>
            Dengan melampirkan foto struk, screenshot voucher di aplikasi, atau
            link pengumuman resmi, status promo terjamin valid dan bisa
            dikonfirmasi ulang oleh pengguna lain.
          </p>
        </div>
      </aside>
    </form>
  );
}
