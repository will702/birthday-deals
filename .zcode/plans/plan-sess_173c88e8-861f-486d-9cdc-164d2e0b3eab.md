# UltahID — Full Visual Redesign: Apple craft × Anthropic warmth × ClickUp clarity

## Context

The current UI is functionally solid (good empty/loading states, a11y work, warm token system in one file) but visually monotone: every surface is the same white rounded card on cream, card-in-card nesting, tiny `text-xs` type everywhere, `font-extrabold` flattening hierarchy, zero brand or celebration expression, duplicate badge logic in 3 places, and a default Next.js favicon. The user calls it slop and pinned the replacement world: **Apple** (materials, springs, typography discipline), **Anthropic** (warm ivory, editorial serif, clay accent), **ClickUp** (operational clarity, organized density). Confirmed decisions: **all surfaces in one pass**, **Anthropic clay accent (#C96442 family, % mark rebrands to clay)**, **add `motion` library for spring physics**. All Indonesian copy, product function, and API behavior stay untouched.

## Impeccable process gates (before any UI edit)

1. Run `~/.agents/skills/impeccable/scripts/impeccable context` (blocked in plan mode; runs first in implementation).
2. Write **PRODUCT.md** (init) — product truth: Indonesian birthday-deals directory, community proof-verification, Playwright scraper engine, Prisma/Neon.
3. Direction is **user-pinned** (beats the concept-seed roll). Write the surface brief via `impeccable surface-brief write` with the six-block direction contract; `FORM` records `seed: none (user-pinned direction)`. Build path: **code-led** (no image generation in this harness).
4. Read `~/.agents/skills/impeccable/reference/craft-floor.md` immediately before the first UI edit.
5. Per AGENTS.md: read the relevant guides in `node_modules/next/dist/docs/` before writing code (this Next.js differs from training data).
6. Install `motion` (mini build) as the only new dependency.

## The new visual world

**Palette** (rewrite `src/app/globals.css` `:root` + `@theme inline`): canvas `#FAF9F5` warm ivory, subtle `#F0EEE6`, ink `#1F1E1B` + warm gray secondaries, hairlines `#E8E4DB`/`#D6D1C4`, accent clay `#C96442` (hover `#A85338`, soft tint for hovers/backs), semantic tints (danger/success/info/warn) retinted warm; keep emerald for "still works".

**Type** (swap in `layout.tsx` via `next/font/google`): **Newsreader** (optical-size serif) for display headlines — the Anthropic editorial voice; **Schibsted Grotesk** for UI (replaces Plus Jakarta Sans); keep **JetBrains Mono** for numerals. Apple typography discipline: negative tracking on display, positive on micro-labels, weight-led hierarchy, rem spacing.

**Motion** (Apple skill): springs via `motion` — quick-filter pill gets a sliding active indicator, lightbox gets drag-to-dismiss with velocity handoff + rubber-banding, planner collapsible goes springy; keep/tune `.pressable` (feedback on pointer-down), add scroll-edge fade to the frosted header instead of a hard border; keep all `prefers-reduced-motion/transparency/contrast` blocks.

**Primitives** — new `src/components/ui/`: `Button` (clay primary / ink secondary / ghost / outline × sm-md-lg), `Badge` (single source replacing the 3 duplicated badge implementations in `DealCard.tsx:22-27`, `deals/[slug]/page.tsx:103-108`, `SubmitDealForm.tsx:584-595` — logic consolidated in `src/lib/deal-types.ts`), `Field` (unified input/select/textarea styling, one bg), `StatTile`, `EmptyState`, `PillTabs` (motion indicator). Card-in-card nesting gets flattened into proper hierarchy.

## Surfaces (all)

- **`layout.tsx` + `SiteHeader` + `SiteFooter`**: refined frosted material nav (saturate, edge fade), new clay `%` SVG logo mark, metadata/themeColor refresh.
- **`DealsExplorer` + home**: editorial serif hero replacing the stat-tile header wall, unified toolbar (search + segmented filters + sort), calmer stat strip.
- **`DealCard`**: typographic discount numeral becomes the visual anchor (large "50%"), cleaner anatomy, `brandLogoUrl` support, less boxed nesting.
- **`deals/[slug]`**: magazine-style detail — serif title, clean spec panel, `generateMetadata` with per-deal OG titles.
- **`DealVerificationPanel`**: calmer community section, spring lightbox.
- **`BirthdayPlanner`**: spring collapsible, quieter chrome.
- **`SubmitDealForm`**: ClickUp-style numbered sections, sidebar preview reuses the real `DealCard`.
- **`ScraperDashboard`**: ClickUp ops polish (dense table, status pills, unified stat tiles).
- **`not-found` + empty states**: serif, personality, on-brand.
- **Icons**: replace default Next.js favicon with branded clay `%` `icon.svg` + regenerated favicon; delete unused create-next-app SVGs in `public/`.

## Verification

1. `npm run build` clean; dev-server pass over all 5 routes (`/`, `/deals/[slug]`, `/submit`, `/scraper`, 404).
2. `impeccable detect --json` on changed targets; fix mechanical findings.
3. One batched screenshot round — desktop 1440 + mobile 390 — critiqued against the direction contract; one fix round max.
4. Spawn `impeccable-finish-reviewer` with captures + contract; act on its disposition (fix/ship).
5. Spawn `impeccable-documenter` → writes **DESIGN.md** + `.impeccable/design.json`; run `build-phase finish --disposition ship` if applicable.