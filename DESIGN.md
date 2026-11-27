---
name: UltahID
description: High-contrast Indonesian birthday-deals directory combining a Bento discovery hero, category-coded voucher cards, and Base UI interactive primitives.
colors:
  canvas: "#F6F6F3"
  surface: "#FFFFFF"
  subtle: "#EEEEE9"
  ink: "#111317"
  ink-2: "#4B505B"
  ink-muted: "#6C727F"
  hairline: "#E4E5E9"
  line-strong: "#CFD2DA"
  accent: "#E03E1A"
  accent-hover: "#C23111"
  accent-vivid: "#FF4F1F"
  accent-soft: "#FFF0EB"
  emerald: "#047857"
  amber: "#B45309"
  danger-bg: "#FFF1F2"
  danger-line: "#FECDD3"
  danger-ink: "#BE123C"
  success-bg: "#ECFDF5"
  success-line: "#A7F3D0"
  info-bg: "#EFF6FF"
  info-line: "#BFDBFE"
  info: "#1D4ED8"
  warn-bg: "#FFFBEB"
  warn-line: "#FDE68A"
  selection: "#FFD9CE"
typography:
  display-xl:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 1.5rem + 2.8vw, 3.5rem)"
    fontWeight: 800
    lineHeight: 1.03
    letterSpacing: "-0.035em"
  display-lg:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 1.4rem + 1.6vw, 2.5rem)"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  display-md:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.375rem, 1.15rem + 0.9vw, 1.75rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.55
  label:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    lineHeight: "1rem"
    letterSpacing: "0.04em"
  numeral:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontFeature: "tnum"
---

# Design System: UltahID (Consumer-Deals Rebrand)

## Overview

UltahID pairs a crisp **Bento discovery hero** (dark-ink brand card + above-the-fold H-30 Birthday Planner) with **category-coded voucher cards**, deterministic brand monograms (zero dependency on scraped logos), and accessible **Base UI (`@base-ui/react`) + `cmdk` + `sonner`** primitives styled for Tailwind CSS v4.

## Key Characteristics

- **Palette:** Crisp off-white canvas (`#F6F6F3`), pure white voucher surfaces (`#FFFFFF`), deep charcoal ink (`#111317`), and punchy vermilion-coral accent (`#E03E1A` interactive / `#FF4F1F` mark).
- **Typography:** `Bricolage Grotesque` (600/700/800) for punchy display headlines, deal values, and brand names; `Plus Jakarta Sans` for crisp UI body copy; `JetBrains Mono` with tabular figures for counts, Rp minimums, H-30 countdowns, and scraper metrics.
- **Category Color Bands:** `F&B` (`#FF5A26`), `Drink & Cafe` (`#D97706`), `Cinema & Entertainment` (`#2563EB`), `Beauty & Retail` (`#E11D48`), `Other` (`#0F766E`). Each card leads with a 1px–4px category bar and a deterministic monogram avatar when `brandLogoUrl` is null.
- **Mobile Ergonomics:** Single-row frosted sticky search + Filter trigger (`~56px`) opening a bottom `Sheet` drawer for categories, quick filters, sorting, and grid/list toggling; header menu `Sheet` exposes `/`, `/submit`, and `/scraper` cleanly at `<640px`.
- **Command Search & Feedback:** `⌘K` / `Ctrl+K` `CommandPalette` searches brands, titles, categories, and apps; `sonner` toasts confirm API refreshes, link checks, proof uploads, votes, and share actions.
- **Detail & Submission Flows:** `/deals/[slug]` uses a 12-column split with a sticky *Panduan Persiapan Klaim* sidebar and Base UI `Dialog` proof lightbox; `/submit` uses a `diceui`-style `FileUploadDropzone`, Base UI `SelectMenu` and `Switch` toggles, and a live readiness + card preview sidebar.

## Accessibility & Constraints

- Preserves `lang="id"` Bahasa Indonesia copy throughout, `%` brand mark (`src/app/icon.svg`), and full support for `prefers-reduced-motion`, `prefers-reduced-transparency`, and `prefers-contrast: more`.
- No database or API schema changes; works seamlessly with `next.config.ts` `cacheComponents: true` (`<Suspense>` + `await connection()`).
