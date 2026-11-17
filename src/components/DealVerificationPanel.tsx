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
import { motion, useReducedMotion } from "motion/react";
import {
  getVerificationMeta,
  type DealDetailDto,
} from "@/lib/deal-types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Textarea } from "@/components/ui/Field";
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
  /** null = open; "shrink" exits toward the thumbnail; "drop" exits downward after a flick. */
  const [lightboxExit, setLightboxExit] = useState<"shrink" | "drop" | null>(null);
  const [lightboxDropY, setLightboxDropY] = useState(0);
  const lightboxTriggerRef = useRef<HTMLElement | null>(null);
  const lightboxCloseBtnRef = useRef<HTMLButtonElement | null>(null);
  const lightboxPanelRef = useRef<HTMLDivElement | null>(null);
  const lightboxClosingRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [adminToken, setAdminToken] = useState("");
  const reduceMotion = useReducedMotion();

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
    setLightboxExit(null);
    setLightbox({
      src,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
    });
  }

  function closeLightbox(exit: "shrink" | "drop" = "shrink") {
    if (lightboxClosingRef.current) return;
    lightboxClosingRef.current = true;
    setLightboxClosing(true);
    setLightboxExit(exit);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      lightboxClosingRef.current = false;
      setLightbox(null);
      setLightboxClosing(false);
      setLightboxExit(null);
      lightboxTriggerRef.current?.focus();
    }, 180);
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
    <div className="space-y-6">
      {/* Verification & Freshness Action Box */}
      <section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
          <div>
            <h2 className="font-serif text-display-md text-ink">
              Bantu verifikasi promo ini
            </h2>
            <p className="mt-1 text-sm text-ink-2">
              Baru klaim atau menemukan syaratnya berubah? Perbarui status agar
              pencari promo lain dapat info akurat.
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="text-micro font-medium uppercase text-ink-muted">
                Skor kesegaran
              </div>
              <div className="font-mono text-lg font-bold text-ink tabular-nums">
                {deal.freshnessScore}/100
              </div>
            </div>
            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
          </div>
        </div>

        {/* Current Vote Tally */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-success-bg p-3.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald">
              Masih Berlaku
            </span>
            <span className="font-serif text-xl font-medium text-emerald tabular-nums">
              {deal.stillWorksCount}
            </span>
          </div>
          <div className="rounded-xl bg-danger-bg p-3.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-danger-ink">
              Lapor Berubah / Expired
            </span>
            <span className="font-serif text-xl font-medium text-danger-ink tabular-nums">
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
                  : "border-line-strong bg-surface text-ink hover:bg-subtle/70"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Masih Berlaku
            </button>

            <button
              type="button"
              onClick={() => setVoteType("EXPIRED_OR_CHANGED")}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold pressable focus-ring ${
                voteType === "EXPIRED_OR_CHANGED"
                  ? "border-danger-ink bg-danger-ink text-white"
                  : "border-line-strong bg-surface text-ink hover:bg-subtle/70"
              }`}
            >
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Sudah Berakhir / Berubah
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="verify-name">
                Nama / Inisial (opsional)
              </FieldLabel>
              <Input
                id="verify-name"
                type="text"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                placeholder="Mis. Budi S."
                className="mt-1.5"
              />
            </div>

            <div>
              <FieldLabel htmlFor="verify-outlet">
                Cabang / Kota Klaim (opsional)
              </FieldLabel>
              <Input
                id="verify-outlet"
                type="text"
                value={outletLocation}
                onChange={(e) => setOutletLocation(e.target.value)}
                placeholder="Mis. Grand Indonesia, Jakarta"
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="verify-comment">
              Catatan Lapangan (opsional)
            </FieldLabel>
            <Textarea
              id="verify-comment"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                voteType === "STILL_WORKS"
                  ? "Mis. Berhasil klaim gratis hari ini tanpa min. order, cukup scan barcode app + KTP."
                  : "Mis. Kasir menginfokan mulai bulan ini wajib minimal belanja Rp100.000."
              }
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="verify-proof-link">
                Tautan Bukti IG/TikTok/Web (opsional)
              </FieldLabel>
              <Input
                id="verify-proof-link"
                type="url"
                value={proofLinkUrl}
                onChange={(e) => setProofLinkUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1.5"
              />
            </div>

            <div>
              <span className="flex items-baseline gap-1 text-xs font-semibold text-ink">
                Unggah Foto Struk / Voucher (opsional)
              </span>
              <div className="mt-1.5 flex items-center gap-2">
                <label className="pressable inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-subtle/70 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
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
            <p role="alert" className="reveal text-xs font-medium text-danger-ink">
              {error}
            </p>
          )}
          {successMsg && (
            <p role="status" className="reveal text-xs font-medium text-emerald">
              {successMsg}
            </p>
          )}

          <Button type="submit" disabled={submitting || uploading}>
            {submitting ? "Menyimpan..." : "Kirim Laporan Verifikasi"}
          </Button>
        </form>
      </section>

      {/* Proof Gallery */}
      <section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-serif text-display-md text-ink">
            Galeri Bukti ({deal.proofs.length})
          </h2>
          <span className="text-xs text-ink-muted">
            Diurutkan dari bukti terbaru
          </span>
        </div>

        {deal.proofs.length === 0 ? (
          <p className="text-sm text-ink-2">
            Belum ada lampiran bukti tambahan. Jadilah kontributor pertama yang
            mengirim foto struk atau tautan resmi di atas.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {deal.proofs.map((proof) => (
              <div
                key={proof.id}
                className="rounded-xl bg-canvas p-3 flex flex-col justify-between gap-2.5"
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
                    className="inline-flex items-center gap-1 rounded-md text-xs font-semibold text-accent hover:text-accent-hover underline-offset-4 hover:underline truncate pressable focus-ring"
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
      <section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6 space-y-3">
        <h2 className="font-serif text-display-md text-ink">
          Riwayat Pengecekan ({deal.verifications.length})
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
                      v.voteType === "STILL_WORKS" ? "text-emerald" : "text-danger-ink"
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
      <section className="rounded-2xl bg-subtle/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink">
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
            className="rounded-lg border border-emerald bg-success-bg px-3 py-1.5 text-xs font-semibold text-emerald hover:bg-emerald hover:text-white hover:border-emerald pressable focus-ring"
          >
            Tandai Admin Verified
          </button>
          <button
            type="button"
            disabled={moderating}
            onClick={() => handleModerate("STALE")}
            className="rounded-lg border border-amber bg-warn-bg px-3 py-1.5 text-xs font-semibold text-amber hover:bg-amber hover:text-white hover:border-amber pressable focus-ring"
          >
            Tandai Perlu Cek Ulang
          </button>
          <button
            type="button"
            disabled={moderating}
            onClick={() => handleModerate("EXPIRED")}
            className="rounded-lg border border-danger-ink bg-danger-bg px-3 py-1.5 text-xs font-semibold text-danger-ink hover:bg-danger-ink hover:text-white hover:border-danger-ink pressable focus-ring"
          >
            Tandai Expired
          </button>
        </div>
      </section>

      {/* Lightbox: pops from its thumbnail; flick down to dismiss (velocity-aware) */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau bukti promo"
          data-closing={lightboxClosing ? "true" : undefined}
          className="lightbox-scrim fixed inset-0 z-50 flex items-center justify-center bg-[#1f1e1b]/78 p-4"
          onClick={() => closeLightbox()}
        >
          <motion.div
            ref={lightboxPanelRef}
            className="relative max-w-3xl w-full cursor-grab active:cursor-grabbing touch-none"
            onClick={(e) => e.stopPropagation()}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={
              lightboxExit === "drop"
                ? { y: lightboxDropY, opacity: 0, scale: 0.96 }
                : lightboxExit === "shrink"
                  ? { y: 0, opacity: 0, scale: 0.96 }
                  : { y: 0, opacity: 1, scale: 1 }
            }
            transition={
              lightboxExit !== null
                ? { duration: 0.17, ease: "easeIn" }
                : reduceMotion
                  ? { duration: 0.15 }
                  : { type: "spring", bounce: 0, duration: 0.35 }
            }
            drag={reduceMotion || lightboxExit !== null ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.15, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              // Momentum projection: a flick or a deep drag dismisses downward.
              if (info.offset.y > 110 || info.velocity.y > 550) {
                setLightboxDropY(Math.max(320, info.offset.y + info.velocity.y / 8));
                closeLightbox("drop");
              }
            }}
          >
            <div className="rounded-2xl bg-surface p-2 shadow-[0_24px_80px_-16px_rgb(0_0_0/0.5)]">
              <button
                ref={lightboxCloseBtnRef}
                type="button"
                onClick={() => closeLightbox()}
                aria-label="Tutup pratinjau gambar"
                className="pressable focus-ring absolute right-3 top-3 z-10 rounded-full bg-surface/90 p-1.5 text-ink border border-hairline"
              >
                <X className="h-4 w-4" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.src}
                alt="Pratinjau bukti promo"
                draggable={false}
                className="max-h-[80vh] w-full rounded-xl object-contain select-none"
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
