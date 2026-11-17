# Surface brief — whole-app redesign (home/directory leads)

Scope: all routes — `/` (directory), `/deals/[slug]`, `/submit`, `/scraper`,
404, header/footer, shared primitives. Mode: **Operate** (visitor completes the
task of finding and trusting a birthday deal; the ops dashboard is Operate
outright).

Audience: Indonesians planning birthday claims (see PRODUCT.md). Job: find
claimable deals, understand preparation lead time, trust freshness. Action:
open a deal, verify, or submit proof. Proof/content: real scraped deals,
community verification counts, proof photos. Constraints: Bahasa Indonesia,
mobile-first, light UI, no dependence on brand logos.

## Direction contract

THESIS: A birthday-preparation directory that reads like a well-set Indonesian
magazine index and behaves like a native app. Refused: the stat-tile wall plus
identical admin cards — the deal's value ("50% GRATIS") becomes the typography,
and trust marks ride quietly beside it.

OWN-WORLD: warm ivory #FAF9F5 ground, white surfaces, clay #C96442 accent;
Newsreader serif display over Schibsted Grotesk UI and JetBrains Mono numerals;
frosted top chrome with a scroll-edge fade; flat cards, soft layered shadows,
warm hairlines; spring motion (motion library) on filter pills, collapsibles,
and a drag-dismissable lightbox.

STORY: visitor lands on the serif editorial claim with live counts, filters by
category, scans numeral-anchored cards, opens a deal, trusts the proof
timeline, verifies or submits their own.

FIRST VIEWPORT: frosted header with clay `%` mark; left-aligned serif headline
over a one-line stat strip; unified toolbar (search + segmented pills + sort);
3-column grid whose anchor is the large discount numeral; clay primary CTA
top-right.

FORM: user-pinned direction — Apple craft × Anthropic warmth × ClickUp
clarity, clay accent. Chosen directly by the user (no roll).
seed: none (user-pinned direction)

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance

## Unresolved decisions

Exact serif/grotesk fallbacks if Newsreader or Schibsted Grotesk fail to load
from Google Fonts at build time (system stacks take over; not user-visible
unless offline).
