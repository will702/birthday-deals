import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SubmitDealForm } from "@/components/SubmitDealForm";

export default function SubmitDealPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-ink-muted hover:text-ink pressable focus-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Direktori
        </Link>
        <h1 className="mt-4 font-serif text-display-lg text-ink">
          Kirim temuan promo ulang tahun
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2">
          Menemukan promo ulang tahun terbaru di Indonesia yang belum ada di
          daftar? Bagikan di sini dengan melampirkan bukti gambar atau tautan
          resmi agar langsung terverifikasi komunitas.
        </p>
      </div>

      <SubmitDealForm />
    </div>
  );
}
