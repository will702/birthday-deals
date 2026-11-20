import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center space-y-5">
      <p
        aria-hidden="true"
        className="font-display text-[clamp(5rem,18vw,8.5rem)] font-extrabold leading-none tracking-tight text-accent-vivid select-none"
      >
        404
      </p>
      <h1 className="font-display text-display-md text-ink">
        Promo ulang tahun yang kamu cari tidak ditemukan
      </h1>
      <p className="text-sm leading-relaxed text-ink-2">
        Promo mungkin sudah dihapus atau alamat tautan berubah.
      </p>
      <div className="pt-2">
        <Link href="/" className={buttonClasses("secondary", "lg", "rounded-full")}>
          Kembali ke Direktori Promo
        </Link>
      </div>
    </div>
  );
}
