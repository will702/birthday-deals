import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#E4DDD3] bg-[#F3EDE3]/50 mt-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#52525B]">
        <div>
          <p className="font-semibold text-[#18181B]">
            UltahID — Direktori Promo Ulang Tahun Indonesia
          </p>
          <p className="mt-1 text-[#71717A]">
            Data dihimpun dari situs resmi brand, agregator promo Indonesia, dan laporan bukti komunitas. Selalu cek S&amp;K di gerai atau aplikasi resmi sebelum klaim.
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0 font-medium">
          <Link href="/" className="hover:text-[#18181B] underline-offset-4 hover:underline">
            Semua Promo
          </Link>
          <Link href="/submit" className="hover:text-[#18181B] underline-offset-4 hover:underline">
            Kirim Temuan
          </Link>
          <Link href="/scraper" className="hover:text-[#18181B] underline-offset-4 hover:underline">
            Status Scraper
          </Link>
        </div>
      </div>
    </footer>
  );
}
