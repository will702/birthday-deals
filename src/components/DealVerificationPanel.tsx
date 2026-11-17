"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import {
  getVerificationMeta,
  type DealDetailDto,
} from "@/lib/deal-types";
import { formatRelativeDays } from "@/lib/validation";

interface DealVerificationPanelProps {
  initialDeal: DealDetailDto;
  nowIso: string;
}

export function DealVerificationPanel({
  initialDeal,
  nowIso,
}: DealVerificationPanelProps) {
  const router = useRouter();
  const [deal, setDeal] = useState<DealDetailDto>(initialDeal);
  const [voteType, setVoteType] = useState<"STILL_WORKS" | "EXPIRED_OR_CHANGED">("STILL_WORKS");
  const [submitterName, setSubmitterName] = useState("");
  const [outletLocation, setOutletLocation] = useState("");
  const [comment, setComment] = useState("");
  const [proofLinkUrl, setProofLinkUrl] = useState("");
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; cx: number; cy: number } | null>(null);
  const [lightboxClosing, setLightboxClosing] = useState(false);
  const lightboxTriggerRef = useRef<HTMLElement | null>(null);
  const lightboxCloseBtnRef = useRef<HTMLButtonElement | null>(null);
  const lightboxPanelRef = useRef<HTMLDivElement | null>(null);
  const lightboxClosingRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [adminToken, setAdminToken] = useState("");

  const now = new Date(nowIso);
  const statusMeta = getVerificationMeta(deal.verificationStatus);

  function openLightbox(src: string, trigger: HTMLElement) {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    const rect = trigger.getBoundingClientRect();
    lightboxTriggerRef.current = trigger;
    lightboxClosingRef.current = false;
    setLightboxClosing(false);
    setLightbox({
      src,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
    });
  }

  function closeLightbox() {
    if (lightboxClosingRef.current) return;
    lightboxClosingRef.current = true;
    setLightboxClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      lightboxClosingRef.current = false;
      setLightbox(null);
      setLightboxClosing(false);
      lightboxTriggerRef.current?.focus();
    }, 140);
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Set the pop-in transform origin in panel-local px before first paint.
  // offsetLeft/offsetTop ignore transforms, so the running scale animation
  // cannot skew the measurement; the offsetParent is the fixed full-viewport scrim.
  useLayoutEffect(() => {
    const panel = lightboxPanelRef.current;
    if (!lightbox || !panel) return;
    panel.style.transformOrigin = `${lightbox.cx - panel.offsetLeft}px ${lightbox.cy - panel.offsetTop}px`;
  }, [lightbox]);

  const lightboxOpen = lightbox !== null;
  useEffect(() => {
    if (!lightboxOpen) return;
    lightboxCloseBtnRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeLightbox();
      } else if (e.key === "Tab") {
        // Only the close button is focusable inside the modal.
        e.preventDefault();
        lightboxCloseBtnRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxOpen]);

  async function handleFileUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengunggah bukti.");
      setProofImageUrl(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal upload gambar.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmitVerification(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/deals/${deal.slug}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voteType,
          submitterName: submitterName.trim() || "Kontributor",
          outletLocation: outletLocation.trim() || null,
          comment: comment.trim() || null,
          proofImageUrl,
          proofLinkUrl: proofLinkUrl.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengirim verifikasi.");

      const updated = json.deal;
      setDeal((prev) => ({
        ...prev,
        stillWorksCount: updated.stillWorksCount,
        expiredReportCount: updated.expiredReportCount,
        freshnessScore: updated.freshnessScore,
        verificationStatus: updated.verificationStatus,
        lastVerifiedAt: updated.lastVerifiedAt,
        proofs: updated.proofs,
        verifications: updated.verifications,
        proofCount: updated.proofs.length,
        verificationCount: updated.verifications.length,
      }));
      setComment("");
      setOutletLocation("");
      setProofLinkUrl("");
      setProofImageUrl(null);
      setSuccessMsg(
        voteType === "STILL_WORKS"
          ? "Terima kasih! Laporan 'Masih Berlaku' tercatat dan skor kesegaran promo diperbarui."
          : "Laporan perubahan/kedaluwarsa berhasil dicatat."
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses verifikasi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleModerate(targetStatus: "ADMIN_VERIFIED" | "STALE" | "EXPIRED") {
    setModerating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (adminToken.trim()) headers["x-admin-token"] = adminToken.trim();
      const res = await fetch(`/api/deals/${deal.slug}/moderate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ verificationStatus: targetStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal moderasi status.");

      setDeal((prev) => ({
        ...prev,
        verificationStatus: json.deal.verificationStatus,
        freshnessScore: json.deal.freshnessScore,
        lastVerifiedAt: json.deal.lastVerifiedAt,
      }));
      setSuccessMsg(`Status promo diperbarui menjadi ${targetStatus}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Moderasi gagal.");
    } finally {
      setModerating(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Verification & Freshness Action Box */}
      <section className="rounded-xl border border-hairline bg-surface p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
          <div>
            <h2 className="text-base font-bold text-ink">
              Verifikasi Status &amp; Kirim Bukti Terbaru
            </h2>
            <p className="text-xs text-ink-2 mt-0.5">
              Baru saja klaim promo ini atau menemukan syaratnya berubah? Perbarui status agar pencari promo lain dapat info akurat.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-[11px] text-ink-muted">Skor Kesegaran</div>
              <div className="font-mono text-base font-bold text-ink tabular-nums">
                {deal.freshnessScore}/100
              </div>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
            >
              {statusMeta.label}
            </span>
          </div>
        </div>

        {/* Current Vote Tally */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-success-line bg-success-bg p-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald">Masih Berlaku</span>
            <span className="font-mono text-lg font-bold text-emerald tabular-nums">
              {deal.stillWorksCount}
            </span>
          </div>
          <div className="rounded-lg border border-danger-line bg-danger-bg p-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-accent">Lapor Berubah / Expired</span>
            <span className="font-mono text-lg font-bold text-accent tabular-nums">
              {deal.expiredReportCount}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmitVerification} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setVoteType("STILL_WORKS")}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold pressable focus-ring ${
                voteType === "STILL_WORKS"
                  ? "border-emerald bg-emerald text-white"
                  : "border-line-strong bg-canvas text-ink hover:bg-subtle"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Masih Berlaku (Saya Baru Klaim)
            </button>

            <button
              type="button"
              onClick={() => setVoteType("EXPIRED_OR_CHANGED")}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold pressable focus-ring ${
                voteType === "EXPIRED_OR_CHANGED"
                  ? "border-accent bg-accent text-white"
                  : "border-line-strong bg-canvas text-ink hover:bg-subtle"
              }`}
            >
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Sudah Berakhir / Syarat Berubah
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="verify-name"
                className="block text-xs font-semibold text-ink mb-1"
              >
                Nama / Inisial (Opsional)
              </label>
              <input
                id="verify-name"
                type="text"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                placeholder="Mis. Budi S."
                className="field w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="verify-outlet"
                className="block text-xs font-semibold text-ink mb-1"
              >
                Cabang / Kota Klaim (Opsional)
              </label>
              <input
                id="verify-outlet"
                type="text"
                value={outletLocation}
                onChange={(e) => setOutletLocation(e.target.value)}
                placeholder="Mis. Grand Indonesia, Jakarta"
                className="field w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="verify-comment"
              className="block text-xs font-semibold text-ink mb-1"
            >
              Catatan Lapangan (Opsional)
            </label>
            <textarea
              id="verify-comment"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                voteType === "STILL_WORKS"
                  ? "Mis. Berhasil klaim gratis hari ini tanpa min. order, cukup scan barcode app + KTP."
                  : "Mis. Kasir menginfokan mulai bulan ini wajib minimal belanja Rp100.000."
              }
              className="field w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="verify-proof-link"
                className="block text-xs font-semibold text-ink mb-1"
              >
                Tautan Bukti IG/TikTok/Web (Opsional)
              </label>
              <input
                id="verify-proof-link"
                type="url"
                value={proofLinkUrl}
                onChange={(e) => setProofLinkUrl(e.target.value)}
                placeholder="https://..."
                className="field w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm"
              />
            </div>

            <div>
              <span className="block text-xs font-semibold text-ink mb-1">
                Unggah Foto Struk / Voucher App (Opsional)
              </span>
              <div className="flex items-center gap-2">
                <label className="pressable inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line-strong bg-canvas px-3 py-2 text-xs font-semibold text-ink hover:bg-subtle has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  {uploading ? "Mengunggah..." : "Pilih Gambar"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => handleFileUpload(e.target.files?.[0])}
                  />
                </label>
                {proofImageUrl && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald">
                    <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    Bukti siap
                    <button
                      type="button"
                      onClick={() => setProofImageUrl(null)}
                      aria-label="Hapus gambar bukti"
                      className="pressable focus-ring rounded-md text-ink-muted hover:text-ink"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" className="reveal text-xs font-medium text-accent">
              {error}
            </p>
          )}
          {successMsg && (
            <p role="status" className="reveal text-xs font-medium text-emerald">
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || uploading}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-60 pressable focus-ring"
          >
            {submitting ? "Menyimpan..." : "Kirim Laporan Verifikasi"}
          </button>
        </form>
      </section>

      {/* Proof Gallery */}
      <section className="rounded-xl border border-hairline bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-ink">
            Galeri Bukti &amp; Sumber ({deal.proofs.length})
          </h2>
          <span className="text-xs text-ink-muted">
            Diurutkan dari bukti terbaru
          </span>
        </div>

        {deal.proofs.length === 0 ? (
          <p className="text-sm text-ink-2">
            Belum ada lampiran bukti tambahan. Jadilah kontributor pertama yang mengirim foto struk atau tautan resmi di atas.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {deal.proofs.map((proof) => (
              <div
                key={proof.id}
                className="rounded-lg border border-hairline bg-canvas p-3 flex flex-col justify-between gap-2.5"
              >
                {proof.proofImageUrl && (
                  <button
                    type="button"
                    onClick={(e) => openLightbox(proof.proofImageUrl!, e.currentTarget)}
                    className="pressable focus-ring block w-full overflow-hidden rounded-lg border border-hairline bg-surface text-left"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proof.proofImageUrl}
                      alt={`Bukti promo ${deal.brandName} oleh ${proof.submitterName}`}
                      className="h-44 w-full object-cover hover:opacity-95 transition-opacity"
                    />
                  </button>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-ink">{proof.submitterName}</span>
                    <span className="text-ink-muted">
                      {formatRelativeDays(proof.createdAt, now)}
                    </span>
                  </div>
                  {proof.outletLocation && (
                    <p className="text-xs font-medium text-ink-2">
                      Lokasi: {proof.outletLocation}
                    </p>
                  )}
                  {proof.notes && (
                    <p className="text-xs text-ink-2 leading-relaxed">{proof.notes}</p>
                  )}
                </div>

                {proof.proofLinkUrl && (
                  <a
                    href={proof.proofLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline truncate"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{proof.proofLinkUrl}</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Verification Timeline */}
      <section className="rounded-xl border border-hairline bg-surface p-5 space-y-3">
        <h2 className="text-base font-bold text-ink">
          Riwayat Pengecekan Komunitas ({deal.verifications.length})
        </h2>
        {deal.verifications.length === 0 ? (
          <p className="text-xs text-ink-muted">Belum ada riwayat voting komunitas.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {deal.verifications.slice(0, 10).map((v) => (
              <li key={v.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                <div>
                  <span
                    className={`inline-block font-semibold ${
                      v.voteType === "STILL_WORKS" ? "text-emerald" : "text-accent"
                    }`}
                  >
                    {v.voteType === "STILL_WORKS"
                      ? "Masih Berlaku"
                      : "Dilaporkan Berubah / Expired"}
                  </span>
                  <span className="text-ink-muted ml-2">
                    oleh {v.voterFingerprint || "Anonim"}
                  </span>
                  {v.comment && <p className="mt-0.5 text-ink-2">{v.comment}</p>}
                </div>
                <span className="text-ink-muted shrink-0">
                  {formatRelativeDays(v.createdAt, now)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Admin Moderation Controls */}
      <section className="rounded-xl border border-hairline bg-subtle/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-ink">
            <ShieldCheck className="h-4 w-4 text-emerald" aria-hidden="true" />
            Moderasi Status Admin
          </div>
          <input
            type="password"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            placeholder="Token admin"
            aria-label="Token admin"
            className="field rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={moderating}
            onClick={() => handleModerate("ADMIN_VERIFIED")}
            className="rounded-lg border border-emerald bg-success-bg px-3 py-1.5 text-xs font-semibold text-emerald hover:bg-emerald hover:text-white pressable focus-ring"
          >
            Tandai Admin Verified
          </button>
          <button
            type="button"
            disabled={moderating}
            onClick={() => handleModerate("STALE")}
            className="rounded-lg border border-amber bg-amber/10 px-3 py-1.5 text-xs font-semibold text-amber hover:bg-amber hover:text-white pressable focus-ring"
          >
            Tandai Perlu Cek Ulang
          </button>
          <button
            type="button"
            disabled={moderating}
            onClick={() => handleModerate("EXPIRED")}
            className="rounded-lg border border-accent bg-danger-bg px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent hover:text-white pressable focus-ring"
          >
            Tandai Expired
          </button>
        </div>
      </section>

      {/* Lightbox Modal for Proof Image */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau bukti promo"
          data-closing={lightboxClosing ? "true" : undefined}
          className="lightbox-scrim fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={closeLightbox}
        >
          <div
            ref={lightboxPanelRef}
            className="lightbox-panel relative max-w-3xl w-full bg-surface rounded-xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={lightboxCloseBtnRef}
              type="button"
              onClick={closeLightbox}
              aria-label="Tutup pratinjau gambar"
              className="pressable focus-ring absolute right-3 top-3 rounded-full bg-surface/90 p-1.5 text-ink border border-hairline"
            >
              <X className="h-4 w-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.src}
              alt="Pratinjau bukti promo"
              className="max-h-[80vh] w-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
