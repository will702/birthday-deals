"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Link2 } from "lucide-react";
import { toast } from "sonner";
import { DEAL_CATEGORIES, DISCOUNT_TYPES } from "@/lib/validation";
import type { DealSummaryDto } from "@/lib/deal-types";
import { DealCard } from "./DealCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Textarea } from "@/components/ui/Field";
import { FileUploadDropzone } from "@/components/ui/FileUploadDropzone";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/utils";

const PREVIEW_EPOCH_ISO = "2026-01-01T00:00:00.000Z";

const CATEGORY_OPTIONS = DEAL_CATEGORIES.map((c) => ({ value: c, label: c }));

const DISCOUNT_TYPE_OPTIONS: Array<{
  value: (typeof DISCOUNT_TYPES)[number];
  label: string;
}> = [
  { value: "FREE_100", label: "100% Gratis (Free Item)" },
  { value: "DISCOUNT_PERCENT", label: "Diskon Persentase (%)" },
  { value: "BOGO", label: "Beli 1 Gratis 1 (BOGO)" },
  { value: "FREE_ITEM_WITH_PURCHASE", label: "Gratis dgn Min. Order" },
  { value: "VOUCHER", label: "Voucher Potongan" },
];

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
      className={cn(
        "rounded-3xl border border-hairline bg-surface p-5 sm:p-6 space-y-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-ink font-mono text-xs font-bold text-white"
        >
          {step}
        </span>
        <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-ink">
          {title}
        </h2>
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
    "Wajib menunjukkan KTP/SIM asli\nBerlaku untuk 1x klaim di hari ulang tahun",
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

  async function handleImageUpload(file: File | undefined) {
    if (uploading || !file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      const msg = "Format gambar tidak didukung. Gunakan JPG, PNG, atau WebP.";
      setError(msg);
      toast.error(msg);
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      const msg = "Ukuran gambar terlalu besar. Maksimal 4MB.";
      setError(msg);
      toast.error(msg);
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
      toast.success("Gambar bukti berhasil diunggah.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload gagal.";
      setError(msg);
      toast.error(msg);
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
      if (res.ok) {
        setLinkPreview(json);
        if (json.accessible) {
          toast.success("Tautan berhasil diverifikasi.");
        }
      }
    } catch {
      toast.error("Gagal mengecek pratinjau tautan.");
    } finally {
      setCheckingLink(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!proofImageUrl && !proofLinkUrl.trim()) {
      const msg =
        "Bukti wajib diisi: unggah foto struk/screenshot voucher ATAU tempel tautan sumber resmi/media sosial.";
      setError(msg);
      toast.error(msg);
      return;
    }

    const termsList = termsText
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length >= 2);

    if (termsList.length === 0) {
      const msg = "Isi minimal 1 baris syarat & ketentuan.";
      setError(msg);
      toast.error(msg);
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

      toast.success("Temuan promo berhasil dipublikasikan!");
      router.push(`/deals/${json.deal.slug}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const step1Ready =
    brandName.trim().length >= 2 &&
    title.trim().length >= 4 &&
    description.trim().length >= 10;
  const step2Ready =
    claimWindow.trim().length >= 2 &&
    termsText.trim().length >= 2 &&
    (!requiresApp || appName.trim().length > 0);
  const step3Ready = Boolean(proofImageUrl || proofLinkUrl.trim().length > 0);

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
    validYear: new Date(PREVIEW_EPOCH_ISO).getFullYear(),
    stillWorksCount: 1,
    expiredReportCount: 0,
    freshnessScore: 100,
    lastScrapedAt: null,
    lastVerifiedAt: PREVIEW_EPOCH_ISO,
    createdAt: PREVIEW_EPOCH_ISO,
    proofCount: proofImageUrl || proofLinkUrl ? 1 : 0,
    verificationCount: 0,
    latestProofImageUrl: proofImageUrl,
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-8 space-y-5">
        {/* Section 1 */}
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
              <div className="mt-1.5">
                <SelectMenu
                  id="category"
                  aria-label="Kategori promo"
                  value={category}
                  onValueChange={(v) => setCategory(v)}
                  options={CATEGORY_OPTIONS}
                />
              </div>
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
              <div className="mt-1.5">
                <SelectMenu
                  id="discountType"
                  aria-label="Jenis potongan"
                  value={discountType}
                  onValueChange={(next) => {
                    setDiscountType(next);
                    if (next === "FREE_100") setDiscountValue("100");
                    else if (next === "BOGO") setDiscountValue("50");
                  }}
                  options={DISCOUNT_TYPE_OPTIONS}
                />
              </div>
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

        {/* Section 2 */}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-canvas p-3.5">
              <div>
                <div className="text-xs font-bold text-ink">Wajib Tunjukkan KTP</div>
                <div className="text-[11px] text-ink-muted">KTP / SIM / Paspor asli di kasir</div>
              </div>
              <Switch
                aria-label="Wajib Tunjukkan KTP / SIM / Paspor"
                checked={requiresIdCard}
                onCheckedChange={setRequiresIdCard}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-canvas p-3.5">
              <div>
                <div className="text-xs font-bold text-ink">Wajib Daftar Aplikasi</div>
                <div className="text-[11px] text-ink-muted">Harus jadi member aplikasi brand</div>
              </div>
              <Switch
                aria-label="Wajib Daftar Aplikasi Member"
                checked={requiresApp}
                onCheckedChange={setRequiresApp}
              />
            </div>
          </div>

          {requiresApp && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-warn-line bg-warn-bg/60 p-4">
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

        {/* Section 3: Mandatory Proof */}
        <SectionStep
          step={3}
          title="Lampirkan Bukti Asli"
          required
          className="border-accent/35"
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
              <div className="reveal rounded-2xl border border-hairline bg-canvas p-3.5 text-xs">
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
              Upload Screenshot Voucher / Foto Struk
            </span>
            <FileUploadDropzone
              id="submit-proof-upload"
              imageUrl={proofImageUrl}
              uploading={uploading}
              onFileSelect={handleImageUpload}
              onRemove={() => setProofImageUrl(null)}
            />
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
            className="reveal rounded-2xl border border-danger-line bg-danger-bg p-3.5 text-sm font-medium text-danger-ink"
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

      {/* Sidebar: Readiness + Live Voucher Card Preview */}
      <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
        <div className="rounded-2xl border border-hairline bg-surface p-4 space-y-2.5">
          <div className="text-micro font-bold uppercase text-ink-muted">
            Kesiapan Pengiriman
          </div>
          <ul className="space-y-1.5 text-xs">
            {[
              { done: step1Ready, label: "1. Brand, judul & cara klaim" },
              { done: step2Ready, label: "2. Periode & syarat klaim" },
              { done: step3Ready, label: "3. Foto struk atau link bukti" },
            ].map((item) => (
              <li
                key={item.label}
                className={cn(
                  "flex items-center gap-2 font-medium",
                  item.done ? "text-emerald" : "text-ink-muted",
                )}
              >
                {item.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <Circle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2.5">
          <h3 className="text-micro font-bold uppercase text-ink-muted">
            Pratinjau Kartu Promo
          </h3>
          <DealCard deal={previewDeal} nowIso={PREVIEW_EPOCH_ISO} preview />
        </div>

        <div className="rounded-2xl border border-hairline bg-subtle/60 p-4 space-y-2 text-xs leading-relaxed text-ink-2">
          <h3 className="font-display text-sm font-bold text-ink">
            Kenapa wajib melampirkan bukti?
          </h3>
          <p>
            Banyak daftar promo ulang tahun di internet yang sudah kedaluwarsa
            atau diam-diam berubah syarat minimum belanjanya. Dengan bukti nyata,
            status promo tetap tepercaya.
          </p>
        </div>
      </aside>
    </form>
  );
}
