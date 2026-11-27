import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-hairline bg-surface/70">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
        <div className="max-w-md">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-extrabold tracking-tight text-ink">
              UltahID
            </span>
            <span className="rounded-full bg-subtle px-2 py-0.5 font-mono text-[10px] font-semibold text-ink-2">
              Indonesia
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            Direktori promo ulang tahun yang dihimpun dari situs resmi brand,
            agregator promo Indonesia, dan laporan bukti komunitas. Selalu cek
            S&amp;K di gerai atau aplikasi resmi sebelum klaim.
          </p>
        </div>
        <nav
          aria-label="Navigasi footer"
          className="flex flex-wrap items-center gap-5 shrink-0 text-xs font-semibold text-ink-2"
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
