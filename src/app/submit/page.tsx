import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SubmitDealForm } from "@/components/SubmitDealForm";

export default function SubmitDealPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1 -ml-2 text-sm font-semibold text-ink-muted hover:text-ink hover:bg-subtle/70 pressable focus-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Direktori
        </Link>
        <h1 className="mt-3 font-display text-display-lg text-ink">
          Kirim temuan promo ulang tahun
        </h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-ink-2">
          Menemukan promo ulang tahun terbaru di Indonesia yang belum ada di
          daftar? Bagikan di sini dengan melampirkan bukti gambar atau tautan
          resmi agar langsung terverifikasi komunitas.
        </p>
      </div>

      <SubmitDealForm />
    </div>
  );
}
