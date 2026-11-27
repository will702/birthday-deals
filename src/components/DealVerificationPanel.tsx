"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import {
  getVerificationMeta,
  type DealDetailDto,
} from "@/lib/deal-types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogPopup } from "@/components/ui/Dialog";
import { FieldLabel, Input, Textarea } from "@/components/ui/Field";
import { FileUploadDropzone } from "@/components/ui/FileUploadDropzone";
import { cn } from "@/lib/utils";
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
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState("");

  const now = new Date(nowIso);
  const statusMeta = getVerificationMeta(deal.verificationStatus);

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
      toast.success("Foto bukti berhasil diunggah.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal upload gambar.";
      setError(msg);
      toast.error(msg);
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
      const msg =
        voteType === "STILL_WORKS"
          ? "Terima kasih! Laporan 'Masih Berlaku' tercatat dan skor kesegaran promo diperbarui."
          : "Laporan perubahan/kedaluwarsa berhasil dicatat.";
      setSuccessMsg(msg);
      toast.success(msg);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memproses verifikasi.";
      setError(msg);
      toast.error(msg);
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
      const msg = `Status promo diperbarui menjadi ${targetStatus}.`;
      setSuccessMsg(msg);
      toast.success(msg);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Moderasi gagal.";
      setError(msg);
      toast.error(msg);
    } finally {
      setModerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Verification & Freshness Action Box */}
      <section className="rounded-3xl border border-hairline bg-surface p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
          <div>
            <h2 className="font-display text-display-md text-ink">
              Bantu verifikasi promo ini
            </h2>
            <p className="mt-1 text-sm text-ink-2">
              Baru klaim atau menemukan syaratnya berubah? Perbarui status agar
              pencari promo lain dapat info akurat.
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="text-micro font-semibold uppercase text-ink-muted">
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
          <div className="rounded-2xl border border-success-line bg-success-bg p-3.5 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald">
              Masih Berlaku
            </span>
            <span className="font-display text-2xl font-extrabold text-emerald tabular-nums">
              {deal.stillWorksCount}
            </span>
          </div>
          <div className="rounded-2xl border border-danger-line bg-danger-bg p-3.5 flex items-center justify-between">
            <span className="text-xs font-bold text-danger-ink">
              Berubah / Expired
            </span>
            <span className="font-display text-2xl font-extrabold text-danger-ink tabular-nums">
              {deal.expiredReportCount}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmitVerification} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setVoteType("STILL_WORKS")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold pressable focus-ring cursor-pointer",
                voteType === "STILL_WORKS"
                  ? "border-emerald bg-emerald text-white"
                  : "border-line-strong bg-surface text-ink hover:bg-subtle/70",
              )}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Masih Berlaku
            </button>

            <button
              type="button"
              onClick={() => setVoteType("EXPIRED_OR_CHANGED")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold pressable focus-ring cursor-pointer",
                voteType === "EXPIRED_OR_CHANGED"
                  ? "border-danger-ink bg-danger-ink text-white"
                  : "border-line-strong bg-surface text-ink hover:bg-subtle/70",
              )}
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
              <span className="flex items-baseline gap-1 text-xs font-semibold text-ink mb-1.5">
                Unggah Foto Struk / Voucher (opsional)
              </span>
              <FileUploadDropzone
                id="verify-proof-file"
                compact
                imageUrl={proofImageUrl}
                uploading={uploading}
                onFileSelect={handleFileUpload}
                onRemove={() => setProofImageUrl(null)}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="reveal text-xs font-semibold text-danger-ink">
              {error}
            </p>
          )}
          {successMsg && (
            <p role="status" className="reveal text-xs font-semibold text-emerald">
              {successMsg}
            </p>
          )}

          <Button type="submit" disabled={submitting || uploading}>
            {submitting ? "Menyimpan..." : "Kirim Laporan Verifikasi"}
          </Button>
        </form>
      </section>

      {/* Proof Gallery */}
      <section className="rounded-3xl border border-hairline bg-surface p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-display-md text-ink">
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
                className="rounded-2xl border border-hairline bg-canvas p-3.5 flex flex-col justify-between gap-2.5"
              >
                {proof.proofImageUrl && (
                  <button
                    type="button"
                    onClick={() => setLightboxSrc(proof.proofImageUrl!)}
                    className="group relative pressable focus-ring block w-full overflow-hidden rounded-xl border border-hairline bg-surface text-left cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proof.proofImageUrl}
                      alt={`Bukti promo ${deal.brandName} oleh ${proof.submitterName}`}
                      className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-xs">
                      <ZoomIn className="h-3 w-3" aria-hidden="true" />
                      Perbesar
                    </span>
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
      <section className="rounded-3xl border border-hairline bg-surface p-5 sm:p-6 space-y-3">
        <h2 className="font-display text-display-md text-ink">
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
                    className={cn(
                      "inline-block font-semibold",
                      v.voteType === "STILL_WORKS" ? "text-emerald" : "text-danger-ink",
                    )}
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
      <section className="rounded-2xl border border-hairline bg-subtle/60 p-4 space-y-3">
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
            className="field rounded-xl border border-line-strong bg-surface px-3 py-1.5 text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={moderating}
            onClick={() => handleModerate("ADMIN_VERIFIED")}
            className="rounded-xl border border-emerald bg-success-bg px-3 py-1.5 text-xs font-semibold text-emerald hover:bg-emerald hover:text-white hover:border-emerald pressable focus-ring cursor-pointer"
          >
            Tandai Terverifikasi Admin
          </button>
          <button
            type="button"
            disabled={moderating}
            onClick={() => handleModerate("STALE")}
            className="rounded-xl border border-amber bg-warn-bg px-3 py-1.5 text-xs font-semibold text-amber hover:bg-amber hover:text-white hover:border-amber pressable focus-ring cursor-pointer"
          >
            Tandai Perlu Cek Ulang
          </button>
          <button
            type="button"
            disabled={moderating}
            onClick={() => handleModerate("EXPIRED")}
            className="rounded-xl border border-danger-ink bg-danger-bg px-3 py-1.5 text-xs font-semibold text-danger-ink hover:bg-danger-ink hover:text-white hover:border-danger-ink pressable focus-ring cursor-pointer"
          >
            Tandai Kedaluwarsa
          </button>
        </div>
      </section>

      {/* Accessible Lightbox via Base UI Dialog */}
      <Dialog
        open={lightboxSrc !== null}
        onOpenChange={(open) => {
          if (!open) setLightboxSrc(null);
        }}
      >
        <DialogPopup
          className="max-w-3xl bg-surface p-2"
          aria-label="Pratinjau bukti promo"
        >
          {lightboxSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightboxSrc}
              alt="Pratinjau bukti promo"
              className="max-h-[80vh] w-full rounded-xl object-contain select-none"
            />
          )}
        </DialogPopup>
      </Dialog>
    </div>
  );
}
