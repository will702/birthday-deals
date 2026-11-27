import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlanBuilder } from "@/components/PlanBuilder";

export const metadata: Metadata = {
  title: "Rencana Ulang Tahun | UltahID",
  description:
    "Jadwal klaim promo ulang tahun dari H-30 sampai H+30, lengkap dengan persiapan daftar member dan pasang aplikasi.",
};

export default function RencanaPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1 -ml-2 text-sm font-semibold text-ink-muted hover:text-ink hover:bg-subtle/70 pressable focus-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Direktori
        </Link>
        <h1 className="mt-3 font-display text-display-lg text-ink">Rencana Ulang Tahun</h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-ink-2">
          Masukkan tanggal ulang tahunmu dan kami susun jadwal kapan promo bisa diklaim, kapan harus
          daftar atau pasang aplikasi, dan kapan batas terakhirnya.
        </p>
      </div>
      <PlanBuilder />
    </div>
  );
}
