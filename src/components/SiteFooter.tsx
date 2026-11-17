import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-subtle/50 mt-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-ink-2">
        <div>
          <p className="font-semibold text-ink">
            UltahID — Direktori Promo Ulang Tahun Indonesia
          </p>
          <p className="mt-1 text-ink-muted">
            Data dihimpun dari situs resmi brand, agregator promo Indonesia, dan laporan bukti komunitas. Selalu cek S&amp;K di gerai atau aplikasi resmi sebelum klaim.
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0 font-medium">
          <Link href="/" className="rounded-md hover:text-ink underline-offset-4 hover:underline pressable focus-ring">
            Semua Promo
          </Link>
          <Link href="/submit" className="rounded-md hover:text-ink underline-offset-4 hover:underline pressable focus-ring">
            Kirim Temuan
          </Link>
          <Link href="/scraper" className="rounded-md hover:text-ink underline-offset-4 hover:underline pressable focus-ring">
            Status Scraper
          </Link>
        </div>
      </div>
    </footer>
  );
}
