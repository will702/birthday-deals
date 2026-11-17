import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#C83228]">
        404 — Tidak Ditemukan
      </p>
      <h1 className="text-2xl font-extrabold text-[#18181B]">
        Promo ulang tahun yang kamu cari tidak ditemukan
      </h1>
      <p className="text-sm text-[#52525B]">
        Promo mungkin sudah dihapus atau alamat tautan berubah.
      </p>
      <div className="pt-2">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-[#18181B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3F3F46]"
        >
          Kembali ke Direktori Promo
        </Link>
      </div>
    </div>
  );
}
