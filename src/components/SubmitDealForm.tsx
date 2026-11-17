"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Link2, Upload, X } from "lucide-react";
import { DEAL_CATEGORIES, DISCOUNT_TYPES } from "@/lib/validation";

interface LinkPreview {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
  accessible: boolean;
  blockedReason: string | null;
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

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Section 1: Identitas Promo */}
        <section className="rounded-xl border border-hairline bg-surface p-5 space-y-4">
          <h2 className="text-base font-bold text-ink">1. Informasi Brand &amp; Diskon</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="brandName" className="block text-xs font-semibold text-ink mb-1">
                Nama Brand (Indonesia) *
              </label>
              <input
                id="brandName"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Mis. Boost Juice Indonesia / Ta Wan"
                className="field w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-xs font-semibold text-ink mb-1">
                Kategori *
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as (typeof DEAL_CATEGORIES)[number])}
                className="field w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm"
              >
                {DEAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="title" className="block text-xs font-semibold text-ink mb-1">
              Judul Penawaran Promo *
            </label>
            <input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mis. Gratis 1 Original Smoothie (100% Off) atau Diskon 50% Menu Utama"
              className="field w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="discountType" className="block text-xs font-semibold text-ink mb-1">
                Jenis Potongan *
              </label>
              <select
                id="discountType"
                value={discountType}
                onChange={(e) => {
                  const next = e.target.value as (typeof DISCOUNT_TYPES)[number];
                  setDiscountType(next);
                  if (next === "FREE_100") setDiscountValue("100");
                  else if (next === "BOGO") setDiscountValue("50");
                }}
                className="field w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm"
              >
                <option value="FREE_100">100% Gratis (Free Item)</option>
                <option value="DISCOUNT_PERCENT">Diskon Persentase (%)</option>
                <option value="BOGO">Beli 1 Gratis 1 (BOGO)</option>
                <option value="FREE_ITEM_WITH_PURCHASE">Gratis dgn Min. Order</option>
                <option value="VOUCHER">Voucher Potongan</option>
              </select>
            </div>

            <div>
              <label htmlFor="discountValue" className="block text-xs font-semibold text-ink mb-1">
                Nilai Diskon (%)
              </label>
              <input
                id="discountValue"
                type="number"
                min={1}
                max={100}
                disabled={discountType === "FREE_100"}
                value={discountType === "FREE_100" ? "100" : discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="50"
                className="field w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm font-mono tabular-nums disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="minPurchaseIdr" className="block text-xs font-semibold text-ink mb-1">
                Min. Belanja (Rp)
              </label>
              <input
                id="minPurchaseIdr"
                type="number"
                min={0}
                step={5000}
                value={minPurchaseIdr}
                onChange={(e) => setMinPurchaseIdr(e.target.value)}
                className="field w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm font-mono tabular-nums"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-semibold text-ink mb-1">
              Ringkasan Cara Klaim *
            </label>
            <textarea
              id="description"
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan cara klaim di kasir atau aplikasi, produk apa saja yang termasuk, dll."
              className="field w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm"
            />
          </div>
        </section>

        {/* Section 2: Syarat & Periode Klaim */}
        <section className="rounded-xl border border-hairline bg-surface p-5 space-y-4">
          <h2 className="text-base font-bold text-ink">2. Syarat &amp; Periode Klaim</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="claimWindow" className="block text-xs font-semibold text-ink mb-1">
                Jendela Waktu Klaim *
              </label>
              <input
                id="claimWindow"
                required
                value={claimWindow}
                onChange={(e) => setClaimWindow(e.target.value)}
                placeholder="Mis. Hari H, H-7 s/d H+7, Bulan Ulang Tahun"
                className="field w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="locations" className="block text-xs font-semibold text-ink mb-1">
                Cakupan Outlet
              </label>
              <input
                id="locations"
                value={locations}
                onChange={(e) => setLocations(e.target.value)}
                className="field w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-1">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-hairline bg-canvas p-3">
              <div>
                <label htmlFor="appName" className="block text-xs font-semibold text-ink mb-1">
                  Nama Aplikasi *
                </label>
                <input
                  id="appName"
                  required={requiresApp}
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Mis. MyBoost / Boga App"
                  className="field w-full rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="minRegistrationDays"
                  className="block text-xs font-semibold text-ink mb-1"
                >
                  Minimal Daftar Sebelum Hari H (Hari)
                </label>
                <input
                  id="minRegistrationDays"
                  type="number"
                  min={0}
                  max={365}
                  value={minRegistrationDays}
                  onChange={(e) => setMinRegistrationDays(e.target.value)}
                  className="field w-full rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm font-mono tabular-nums"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="termsText" className="block text-xs font-semibold text-ink mb-1">
              Daftar Syarat &amp; Ketentuan (1 poin per baris) *
            </label>
            <textarea
              id="termsText"
              rows={4}
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              className="field w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm"
            />
          </div>
        </section>

        {/* Section 3: MANDATORY PROOF */}
        <section className="rounded-xl border-2 border-ink bg-surface p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-ink">
              3. Lampirkan Bukti Asli (Wajib Salah Satu atau Keduanya) *
            </h2>
            <p className="text-xs text-ink-2 mt-0.5">
              Agar direktori bebas dari info palsu atau promo kedaluwarsa, kirim foto struk/screenshot voucher aplikasi atau tautan pengumuman resmi brand.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="proofLinkUrl" className="block text-xs font-semibold text-ink">
              Tautan Sumber Resmi / Postingan IG / TikTok
            </label>
            <div className="flex gap-2">
              <input
                id="proofLinkUrl"
                type="url"
                value={proofLinkUrl}
                onChange={(e) => setProofLinkUrl(e.target.value)}
                placeholder="https://www.instagram.com/p/... atau https://brand.co.id/promo"
                className="field flex-1 rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={!proofLinkUrl.trim() || checkingLink}
                onClick={handleInspectLink}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-subtle disabled:opacity-50 pressable focus-ring"
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                {checkingLink ? "Mengecek..." : "Cek Link"}
              </button>
            </div>

            {linkPreview && (
              <div className="reveal rounded-lg border border-hairline bg-canvas p-3 text-xs">
                {linkPreview.accessible ? (
                  <div className="space-y-1">
                    <p className="font-bold text-emerald">
                      Tautan terbaca ({linkPreview.siteName || "Web"})
                    </p>
                    {linkPreview.title && <p className="font-semibold text-ink">{linkPreview.title}</p>}
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
            <span className="block text-xs font-semibold text-ink">
              Upload Screenshot Voucher / Foto Struk Pembelian (JPG, PNG, WebP maks 4MB)
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
                className="pressable inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line-strong bg-canvas px-4 py-3 text-xs font-semibold text-ink hover:border-accent data-[dragover=true]:border-accent data-[dragover=true]:bg-accent/5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
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
                <div className="reveal relative rounded-lg border border-success-line bg-success-bg p-1.5 flex items-center gap-2">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label htmlFor="submitterName" className="block text-xs font-semibold text-ink mb-1">
                Nama Kontributor (Opsional)
              </label>
              <input
                id="submitterName"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                placeholder="Mis. Rina W."
                className="field w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="outletLocation" className="block text-xs font-semibold text-ink mb-1">
                Outlet Tempat Klaim (Opsional)
              </label>
              <input
                id="outletLocation"
                value={outletLocation}
                onChange={(e) => setOutletLocation(e.target.value)}
                placeholder="Mis. Kota Kasablanka, Jakarta"
                className="field w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="proofNotes" className="block text-xs font-semibold text-ink mb-1">
              Catatan Bukti (Opsional)
            </label>
            <input
              id="proofNotes"
              value={proofNotes}
              onChange={(e) => setProofNotes(e.target.value)}
              placeholder="Mis. Diklaim tanggal 15 Nov 2026, kasir langsung ACC."
              className="field w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm"
            />
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="reveal rounded-lg border border-danger-line bg-danger-bg p-3 text-sm font-medium text-accent"
          >
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={submitting || uploading}
            className="rounded-lg bg-accent px-6 py-2.5 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-60 pressable focus-ring"
          >
            {submitting ? "Mempublikasikan..." : "Publikasikan Temuan Promo"}
          </button>
        </div>
      </div>

      {/* Sidebar Preview & Proof Standard */}
      <aside className="space-y-4">
        <div className="rounded-xl border border-hairline bg-surface p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Pratinjau Kartu Promo
          </h3>
          <div className="rounded-lg border border-hairline bg-canvas p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-md border border-success-line bg-success-bg px-2 py-0.5 font-mono text-[11px] font-bold text-emerald">
                {discountType === "FREE_100"
                  ? "100% GRATIS"
                  : discountType === "DISCOUNT_PERCENT"
                    ? `DISKON ${discountValue || "?"}%`
                    : discountType === "BOGO"
                      ? "BELI 1 GRATIS 1"
                      : "PROMO ULTAH"}
              </span>
              <span className="rounded-md border border-info-line bg-info-bg px-2 py-0.5 text-[10px] font-semibold text-info">
                Bukti Komunitas
              </span>
            </div>
            <p className="text-xs font-semibold uppercase text-ink-2">
              {brandName || "Nama Brand"} · {category}
            </p>
            <p className="text-sm font-bold text-ink">
              {title || "Judul penawaran promo akan tampil di sini"}
            </p>
            <p className="text-xs text-ink-2">
              Klaim: {claimWindow || "-"} · Min. Rp{Number(minPurchaseIdr || 0).toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-hairline bg-subtle/70 p-4 space-y-2 text-xs text-ink-2">
          <h3 className="font-bold text-ink">Kenapa Wajib Bukti?</h3>
          <p>
            Banyak daftar promo ulang tahun di internet yang sudah kedaluwarsa atau diam-diam berubah syarat minimum belanjanya.
          </p>
          <p>
            Dengan melampirkan foto struk, screenshot voucher di aplikasi, atau link pengumuman resmi, status promo terjamin valid dan bisa dikonfirmasi ulang oleh pengguna lain.
          </p>
        </div>
      </aside>
    </form>
  );
}
