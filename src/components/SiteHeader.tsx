"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Menu, Plus, Radar, Search } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetDescription,
  SheetHeader,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinkClass = (active: boolean) =>
    cn(
      "px-3 py-1.5 rounded-xl text-sm font-semibold pressable focus-ring whitespace-nowrap",
      active
        ? "bg-subtle text-ink"
        : "text-ink-2 hover:text-ink hover:bg-subtle/70",
    );

  function handleQuickSearchClick() {
    if (pathname === "/") {
      window.dispatchEvent(new CustomEvent("ultahid:open-search"));
    } else {
      router.push("/?search=1");
    }
  }

  return (
    <header className="material sticky top-0 z-40 border-b border-hairline/70">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 group shrink-0 rounded-xl pressable focus-ring"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent-vivid shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_2px_8px_-2px_rgb(255_79_31/0.45)] transition-transform group-hover:scale-105"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4.2 12.4 11.8 3.6" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
              <circle cx="4.9" cy="5.2" r="2" stroke="#fff" strokeWidth="1.9" />
              <circle cx="11.1" cy="10.8" r="2" stroke="#fff" strokeWidth="1.9" />
            </svg>
          </span>
          <span className="flex flex-col">
            <span className="flex items-center gap-1.5">
              <span className="font-display text-lg font-extrabold tracking-tight text-ink leading-none">
                UltahID
              </span>
              <span className="hidden sm:inline-flex rounded-full bg-accent-soft px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent-hover">
                ID
              </span>
            </span>
            <span className="text-[11px] font-medium text-ink-muted leading-tight mt-0.5 hidden sm:block">
              Direktori Traktiran Ultah
            </span>
          </span>
        </Link>

        <nav
          aria-label="Navigasi utama"
          className="flex items-center gap-1.5 sm:gap-2 min-w-0"
        >
          <button
            type="button"
            onClick={handleQuickSearchClick}
            aria-label="Cari promo cepat (Command+K)"
            className="hidden md:inline-flex items-center gap-2 rounded-xl border border-hairline bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted shadow-2xs hover:border-line-strong hover:text-ink pressable focus-ring cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Cari brand…</span>
            <kbd className="rounded-md border border-hairline bg-canvas px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-2">
              ⌘K
            </kbd>
          </button>

          <Link href="/" className={cn(navLinkClass(pathname === "/"), "hidden sm:inline-flex")}>
            Direktori
          </Link>
          <Link
            href="/scraper"
            className={cn(navLinkClass(pathname === "/scraper"), "hidden sm:inline-flex")}
          >
            Scraper
          </Link>

          <Link
            href="/submit"
            className={buttonClasses("primary", "sm", "h-9 px-3.5 rounded-xl")}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sm:hidden">Kirim Bukti</span>
            <span className="hidden sm:inline">Kirim Bukti Promo</span>
          </Link>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger
              aria-label="Buka menu navigasi"
              className={buttonClasses(
                "outline",
                "icon",
                "sm:hidden h-9 w-9 rounded-xl border-hairline",
              )}
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </SheetTrigger>

            <SheetPopup side="right" className="max-w-xs">
              <SheetHeader>
                <SheetTitle>Menu UltahID</SheetTitle>
                <SheetDescription>
                  Jelajahi direktori promo ulang tahun Indonesia atau pantau status scraper.
                </SheetDescription>
              </SheetHeader>
              <SheetBody className="space-y-2">
                <SheetClose
                  render={
                    <Link
                      href="/"
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold pressable",
                        pathname === "/"
                          ? "bg-ink text-white"
                          : "bg-canvas text-ink hover:bg-subtle",
                      )}
                    />
                  }
                >
                  <Compass className="h-4 w-4" aria-hidden="true" />
                  Direktori Promo
                </SheetClose>

                <SheetClose
                  render={
                    <Link
                      href="/submit"
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold pressable",
                        pathname === "/submit"
                          ? "bg-accent text-white"
                          : "bg-canvas text-ink hover:bg-subtle",
                      )}
                    />
                  }
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Kirim Bukti Promo
                </SheetClose>

                <SheetClose
                  render={
                    <Link
                      href="/scraper"
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold pressable",
                        pathname === "/scraper"
                          ? "bg-ink text-white"
                          : "bg-canvas text-ink hover:bg-subtle",
                      )}
                    />
                  }
                >
                  <Radar className="h-4 w-4" aria-hidden="true" />
                  Status Scraper &amp; Kesegaran
                </SheetClose>
              </SheetBody>
            </SheetPopup>
          </Sheet>
        </nav>
      </div>
    </header>
  );
}
