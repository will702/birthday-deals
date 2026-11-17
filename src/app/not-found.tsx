import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center space-y-5">
      <p
        aria-hidden="true"
        className="font-serif text-[clamp(5rem,18vw,9rem)] leading-none tracking-tight text-accent-vivid/80 select-none"
      >
        404
      </p>
      <h1 className="font-serif text-display-md text-ink">
        Promo ulang tahun yang kamu cari tidak ditemukan
      </h1>
      <p className="text-sm leading-relaxed text-ink-2">
        Promo mungkin sudah dihapus atau alamat tautan berubah.
      </p>
      <div className="pt-2">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink/88 pressable focus-ring"
        >
          Kembali ke Direktori Promo
        </Link>
      </div>
    </div>
  );
}
