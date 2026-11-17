"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClasses } from "@/components/ui/Button";

export function SiteHeader() {
  const pathname = usePathname();

  const navLinkClass = (active: boolean) =>
    `px-2.5 py-1.5 rounded-md text-sm font-medium pressable focus-ring whitespace-nowrap ${
      active
        ? "bg-subtle text-ink"
        : "text-ink-2 hover:text-ink hover:bg-subtle/60"
    }`;

  return (
    <header className="material sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 group shrink-0 rounded-md pressable focus-ring"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent-vivid shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4.2 12.4 11.8 3.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              <circle cx="4.9" cy="5.2" r="2" stroke="#fff" strokeWidth="1.9" />
              <circle cx="11.1" cy="10.8" r="2" stroke="#fff" strokeWidth="1.9" />
            </svg>
          </span>
          <span className="flex flex-col">
            <span className="font-serif text-[17px] font-semibold tracking-tight text-ink leading-none">
              UltahID
            </span>
            <span className="text-micro font-medium text-ink-muted leading-tight mt-1 hidden sm:block">
              Promo Ulang Tahun Indonesia
            </span>
          </span>
        </Link>

        <nav
          aria-label="Navigasi utama"
          className="flex items-center gap-1.5 min-w-0"
        >
          <Link href="/" className={navLinkClass(pathname === "/")}>
            Direktori
          </Link>
          <Link
            href="/scraper"
            className={`${navLinkClass(pathname === "/scraper")} hidden sm:inline-block`}
          >
            Scraper
          </Link>
          <Link
            href="/submit"
            className={buttonClasses("primary", "sm", "ml-1")}
          >
            <span className="sm:hidden">+ Kirim Bukti</span>
            <span className="hidden sm:inline">+ Kirim Bukti Promo</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
