"use client";

import { useState } from "react";
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
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
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
      <section className="rounded-lg border border-[#E4DDD3] bg-white p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4DDD3] pb-4">
          <div>
            <h2 className="text-base font-bold text-[#18181B]">
              Verifikasi Status &amp; Kirim Bukti Terbaru
            </h2>
            <p className="text-xs text-[#52525B] mt-0.5">
              Baru saja klaim promo ini atau menemukan syaratnya berubah? Perbarui status agar pencari promo lain dapat info akurat.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-[11px] text-[#71717A]">Skor Kesegaran</div>
              <div className="font-mono text-base font-bold text-[#18181B] tabular-nums">
                {deal.freshnessScore}/100
              </div>
            </div>
            <span
              className={`inline-flex items-center rounded border px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
            >
              {statusMeta.label}
            </span>
          </div>
        </div>

        {/* Current Vote Tally */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-[#BCE3CE] bg-[#ECFDF3] p-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#146C43]">Masih Berlaku</span>
            <span className="font-mono text-lg font-bold text-[#146C43] tabular-nums">
              {deal.stillWorksCount}
            </span>
          </div>
          <div className="rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#C83228]">Lapor Berubah / Expired</span>
            <span className="font-mono text-lg font-bold text-[#C83228] tabular-nums">
              {deal.expiredReportCount}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmitVerification} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setVoteType("STILL_WORKS")}
              className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-semibold transition-colors ${
                voteType === "STILL_WORKS"
                  ? "border-[#146C43] bg-[#146C43] text-white"
                  : "border-[#D3C8B8] bg-[#FAF7F2] text-[#18181B] hover:bg-[#F3EDE3]"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Masih Berlaku (Saya Baru Klaim)
            </button>

            <button
              type="button"
              onClick={() => setVoteType("EXPIRED_OR_CHANGED")}
              className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-semibold transition-colors ${
                voteType === "EXPIRED_OR_CHANGED"
                  ? "border-[#C83228] bg-[#C83228] text-white"
                  : "border-[#D3C8B8] bg-[#FAF7F2] text-[#18181B] hover:bg-[#F3EDE3]"
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
                className="block text-xs font-semibold text-[#18181B] mb-1"
              >
                Nama / Inisial (Opsional)
              </label>
              <input
                id="verify-name"
                type="text"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                placeholder="Mis. Budi S."
                className="w-full rounded-md border border-[#D3C8B8] bg-[#FAF7F2] px-3 py-2 text-sm focus:border-[#C83228] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="verify-outlet"
                className="block text-xs font-semibold text-[#18181B] mb-1"
              >
                Cabang / Kota Klaim (Opsional)
              </label>
              <input
                id="verify-outlet"
                type="text"
                value={outletLocation}
                onChange={(e) => setOutletLocation(e.target.value)}
                placeholder="Mis. Grand Indonesia, Jakarta"
                className="w-full rounded-md border border-[#D3C8B8] bg-[#FAF7F2] px-3 py-2 text-sm focus:border-[#C83228] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="verify-comment"
              className="block text-xs font-semibold text-[#18181B] mb-1"
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
              className="w-full rounded-md border border-[#D3C8B8] bg-[#FAF7F2] px-3 py-2 text-sm focus:border-[#C83228] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="verify-proof-link"
                className="block text-xs font-semibold text-[#18181B] mb-1"
              >
                Tautan Bukti IG/TikTok/Web (Opsional)
              </label>
              <input
                id="verify-proof-link"
                type="url"
                value={proofLinkUrl}
                onChange={(e) => setProofLinkUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-md border border-[#D3C8B8] bg-[#FAF7F2] px-3 py-2 text-sm focus:border-[#C83228] focus:outline-none"
              />
            </div>

            <div>
              <span className="block text-xs font-semibold text-[#18181B] mb-1">
                Unggah Foto Struk / Voucher App (Opsional)
              </span>
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#D3C8B8] bg-[#FAF7F2] px-3 py-2 text-xs font-semibold text-[#18181B] hover:bg-[#F3EDE3]">
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
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#146C43]">
                    <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    Bukti siap
                    <button
                      type="button"
                      onClick={() => setProofImageUrl(null)}
                      aria-label="Hapus gambar bukti"
                      className="text-[#71717A] hover:text-[#18181B]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-[#C83228]">
              {error}
            </p>
          )}
          {successMsg && (
            <p role="status" className="text-xs font-medium text-[#146C43]">
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || uploading}
            className="rounded-md bg-[#18181B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3F3F46] disabled:opacity-60 transition-colors"
          >
            {submitting ? "Menyimpan..." : "Kirim Laporan Verifikasi"}
          </button>
        </form>
      </section>

      {/* Proof Gallery */}
      <section className="rounded-lg border border-[#E4DDD3] bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#18181B]">
            Galeri Bukti &amp; Sumber ({deal.proofs.length})
          </h2>
          <span className="text-xs text-[#71717A]">
            Diurutkan dari bukti terbaru
          </span>
        </div>

        {deal.proofs.length === 0 ? (
          <p className="text-sm text-[#52525B]">
            Belum ada lampiran bukti tambahan. Jadilah kontributor pertama yang mengirim foto struk atau tautan resmi di atas.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {deal.proofs.map((proof) => (
              <div
                key={proof.id}
                className="rounded-md border border-[#E4DDD3] bg-[#FAF7F2] p-3 flex flex-col justify-between gap-2.5"
              >
                {proof.proofImageUrl && (
                  <button
                    type="button"
                    onClick={() => setLightboxImage(proof.proofImageUrl)}
                    className="block w-full overflow-hidden rounded border border-[#E4DDD3] bg-white text-left"
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
                    <span className="font-bold text-[#18181B]">{proof.submitterName}</span>
                    <span className="text-[#71717A]">
                      {formatRelativeDays(proof.createdAt, now)}
                    </span>
                  </div>
                  {proof.outletLocation && (
                    <p className="text-xs font-medium text-[#52525B]">
                      Lokasi: {proof.outletLocation}
                    </p>
                  )}
                  {proof.notes && (
                    <p className="text-xs text-[#52525B] leading-relaxed">{proof.notes}</p>
                  )}
                </div>

                {proof.proofLinkUrl && (
                  <a
                    href={proof.proofLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#C83228] hover:underline truncate"
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
      <section className="rounded-lg border border-[#E4DDD3] bg-white p-5 space-y-3">
        <h2 className="text-base font-bold text-[#18181B]">
          Riwayat Pengecekan Komunitas ({deal.verifications.length})
        </h2>
        {deal.verifications.length === 0 ? (
          <p className="text-xs text-[#71717A]">Belum ada riwayat voting komunitas.</p>
        ) : (
          <ul className="divide-y divide-[#E4DDD3]">
            {deal.verifications.slice(0, 10).map((v) => (
              <li key={v.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                <div>
                  <span
                    className={`inline-block font-semibold ${
                      v.voteType === "STILL_WORKS" ? "text-[#146C43]" : "text-[#C83228]"
                    }`}
                  >
                    {v.voteType === "STILL_WORKS"
                      ? "Masih Berlaku"
                      : "Dilaporkan Berubah / Expired"}
                  </span>
                  <span className="text-[#71717A] ml-2">
                    oleh {v.voterFingerprint || "Anonim"}
                  </span>
                  {v.comment && <p className="mt-0.5 text-[#52525B]">{v.comment}</p>}
                </div>
                <span className="text-[#71717A] shrink-0">
                  {formatRelativeDays(v.createdAt, now)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Admin Moderation Controls */}
      <section className="rounded-lg border border-[#E4DDD3] bg-[#F3EDE3]/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#18181B]">
            <ShieldCheck className="h-4 w-4 text-[#146C43]" aria-hidden="true" />
            Moderasi Status Admin
          </div>
          <input
            type="password"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            placeholder="Token admin"
            aria-label="Token admin"
            className="rounded border border-[#D3C8B8] bg-white px-2.5 py-1 text-xs focus:border-[#18181B] focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={moderating}
            onClick={() => handleModerate("ADMIN_VERIFIED")}
            className="rounded border border-[#146C43] bg-[#ECFDF3] px-3 py-1.5 text-xs font-semibold text-[#146C43] hover:bg-[#146C43] hover:text-white transition-colors"
          >
            Tandai Admin Verified
          </button>
          <button
            type="button"
            disabled={moderating}
            onClick={() => handleModerate("STALE")}
            className="rounded border border-[#B45309] bg-[#FFFBEB] px-3 py-1.5 text-xs font-semibold text-[#B45309] hover:bg-[#B45309] hover:text-white transition-colors"
          >
            Tandai Perlu Cek Ulang
          </button>
          <button
            type="button"
            disabled={moderating}
            onClick={() => handleModerate("EXPIRED")}
            className="rounded border border-[#C83228] bg-[#FEF2F2] px-3 py-1.5 text-xs font-semibold text-[#C83228] hover:bg-[#C83228] hover:text-white transition-colors"
          >
            Tandai Expired
          </button>
        </div>
      </section>

      {/* Lightbox Modal for Proof Image */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-white rounded-lg p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              aria-label="Tutup pratinjau gambar"
              className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 text-[#18181B] border border-[#E4DDD3]"
            >
              <X className="h-4 w-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage}
              alt="Pratinjau bukti promo"
              className="max-h-[80vh] w-full object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
}
