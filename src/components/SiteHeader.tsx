"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();

  const navLinkClass = (active: boolean) =>
    `px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
      active
        ? "bg-[#F3EDE3] text-[#18181B]"
        : "text-[#52525B] hover:text-[#18181B] hover:bg-[#F3EDE3]/60"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-[#E4DDD3] bg-[#FAF7F2]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#C83228] text-white font-mono text-xs font-bold tracking-tight"
          >
            %
          </span>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight text-[#18181B] leading-none">
              UltahID
            </span>
            <span className="text-[11px] font-medium text-[#71717A] leading-tight mt-0.5 hidden sm:block">
              Promo Ulang Tahun Indonesia
            </span>
          </div>
        </Link>

        <nav aria-label="Navigasi utama" className="flex items-center gap-1 sm:gap-2 min-w-0">
          <Link href="/" className={navLinkClass(pathname === "/")}>
            Direktori
          </Link>
          <Link href="/scraper" className={navLinkClass(pathname === "/scraper")}>
            Scraper
          </Link>
          <Link
            href="/submit"
            className="ml-0.5 sm:ml-1 inline-flex items-center justify-center rounded-md bg-[#C83228] px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-[#9F221A] transition-colors whitespace-nowrap"
          >
            <span className="sm:hidden">+ Kirim Bukti</span>
            <span className="hidden sm:inline">+ Kirim Bukti Promo</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
