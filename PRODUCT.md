# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: Indonesians planning around their own birthday who want to claim brand
promos (freebies, BOGO, discounts) with minimal hassle — the H-30/H-7 claim
timeline, app pre-registration lead times, and KTP requirements matter to them.
Secondary: contributors who submit new deals and keep them honest by uploading
proof photos and voting masih berlaku / kadaluarsa.

## Product Purpose

UltahID is a directory of Indonesian birthday promotions. It exists because
birthday deals are scattered across brand apps, Instagram posts, and word of
mouth, and many require preparation weeks before the birthday itself. Success
means a visitor finds every deal they could claim on their birthday, understands
exactly what to prepare and when, and trusts it because the community has
verified it with photographic proof.

## Positioning

Every deal carries community verification with proof images — a live
masih-berlaku/kadaluarsa signal backed by photos — rather than being a
static scraped list that silently rots. The H-30 planner turns a directory
into a birthday preparation timeline.

## Operating Context

- Deals are gathered by a Playwright/Cheerio agentic scraping engine
  (`src/scraper/`) against brand promo pages, stored in Prisma (Neon Postgres
  in production, SQLite locally), and refreshed from an internal ops dashboard
  at `/scraper` guarded by an admin token.
- Community members submit deals at `/submit` with a mandatory proof image
  (uploads land under `public/uploads/proofs/`), and verify existing deals on
  each deal page.
- All user-facing copy is Bahasa Indonesia; `lang="id"`.

## Capabilities and Constraints

- Directory with client-side search, category quick-filters, and sorting;
  server-rendered from Prisma.
- Deal detail: claim window, minimum purchase, app/registration requirements,
  KTP requirement, T&C, source link, verification timeline, proof gallery
  with an accessible lightbox.
- Birthday planner: pick day/month, see countdown and a checklist split by
  deals needing early app registration vs walk-in-ready.
- Submission flow with link metadata preview ("Cek Link") and live deal-card
  preview.
- Admin moderation (approve/reject) on deal pages; scraper run history table.
- Constraint: images are user-uploaded and served unoptimized
  (`images.unoptimized`); brand logos may be absent — the UI must not depend
  on them.

## Brand Commitments

- Name: **UltahID**. Binding.
- Voice/copy: Bahasa Indonesia throughout. Binding.
- Identity: clay accent replaces the old vermilion as the brand color
  (approved 2026-11-17). The `%` logo mark is the recognizable brand asset.

## Evidence on Hand

- Real scraped deal data lives in the database; no testimonials, customer
  counts, or press exist — future work must not fabricate them.
- Proof images are real user uploads; `public/uploads/proofs/` may be empty
  in dev. Design empty states for the no-proof case.

## Product Principles

1. Trust is the product: freshness, verification status, and proof lead every
   layout decision.
2. Preparation time is the hidden cost of every birthday deal — surface lead
   times and requirements before the discount.
3. Indonesian, plain, and specific: no jargon, real brand names, real terms.
4. The community keeps it alive — verifying and submitting must feel like
   first-class actions, not afterthoughts.

## Accessibility & Inclusion

Mobile-first Indonesian audience on mixed-quality connections; keep the UI
light, legible, and functional without imagery. Existing reduced-motion,
reduced-transparency, and increased-contrast support is a baseline to preserve.
