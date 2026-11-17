import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SubmitDealForm } from "@/components/SubmitDealForm";

export default function SubmitDealPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-ink-2 hover:text-ink pressable focus-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Direktori
        </Link>
        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-ink">
          Kirim Temuan Promo Ulang Tahun
        </h1>
        <p className="mt-1.5 text-sm text-ink-2 max-w-2xl">
          Menemukan promo ulang tahun terbaru di Indonesia yang belum ada di daftar? Bagikan di sini dengan melampirkan bukti gambar atau tautan resmi agar langsung terverifikasi komunitas.
        </p>
      </div>

      <SubmitDealForm />
    </div>
  );
}
