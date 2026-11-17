import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-hairline bg-canvas">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
        <div className="max-w-md">
          <p className="font-serif text-lg tracking-tight text-ink">
            UltahID — Direktori Promo Ulang Tahun Indonesia
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            Data dihimpun dari situs resmi brand, agregator promo Indonesia, dan
            laporan bukti komunitas. Selalu cek S&amp;K di gerai atau aplikasi
            resmi sebelum klaim.
          </p>
        </div>
        <nav
          aria-label="Navigasi footer"
          className="flex items-center gap-5 shrink-0 text-xs font-medium text-ink-2"
        >
          <Link
            href="/"
            className="rounded-md hover:text-ink underline-offset-4 hover:underline pressable focus-ring"
          >
            Semua Promo
          </Link>
          <Link
            href="/submit"
            className="rounded-md hover:text-ink underline-offset-4 hover:underline pressable focus-ring"
          >
            Kirim Temuan
          </Link>
          <Link
            href="/scraper"
            className="rounded-md hover:text-ink underline-offset-4 hover:underline pressable focus-ring"
          >
            Status Scraper
          </Link>
        </nav>
      </div>
    </footer>
  );
}
