import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-accent">
        404 — Tidak Ditemukan
      </p>
      <h1 className="text-2xl font-extrabold text-ink">
        Promo ulang tahun yang kamu cari tidak ditemukan
      </h1>
      <p className="text-sm text-ink-2">
        Promo mungkin sudah dihapus atau alamat tautan berubah.
      </p>
      <div className="pt-2">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/85 pressable focus-ring"
        >
          Kembali ke Direktori Promo
        </Link>
      </div>
    </div>
  );
}
