---
name: UltahID
description: Verified Indonesian birthday-deal directory that reads like a warm magazine index and behaves like a native app.
colors:
  canvas: "#FAF9F5"
  surface: "#FFFFFF"
  subtle: "#F0EEE6"
  ink: "#1F1E1B"
  ink-2: "#53514A"
  ink-muted: "#75716A"
  hairline: "#E8E4DB"
  line-strong: "#D9D3C6"
  accent: "#B4552F"
  accent-hover: "#9A4423"
  accent-vivid: "#C96442"
  accent-soft: "#F6E7DE"
  emerald: "#14713F"
  amber: "#96601A"
  danger-bg: "#FAEAE4"
  danger-line: "#ECCCBF"
  danger-ink: "#A03123"
  success-bg: "#E9F2E7"
  success-line: "#CFE0C8"
  info-bg: "#E9EFF5"
  info-line: "#CCDAE6"
  info: "#33557A"
  warn-bg: "#FAF3E0"
  warn-line: "#E8D9B0"
  selection: "#EFD8C9"
typography:
  display-xl:
    fontFamily: "Newsreader, ui-serif, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2.625rem, 1.7rem + 3.4vw, 4.25rem)"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.032em"
  display-lg:
    fontFamily: "Newsreader, ui-serif, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2rem, 1.55rem + 1.9vw, 2.875rem)"
    fontWeight: 500
    lineHeight: 1.06
    letterSpacing: "-0.026em"
  display-md:
    fontFamily: "Newsreader, ui-serif, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(1.625rem, 1.4rem + 1vw, 2.125rem)"
    fontWeight: 500
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.55
  label:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    lineHeight: "1rem"
    letterSpacing: "0.04em"
  numeral:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontFeature: "tnum"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.ink}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-secondary-hover:
    backgroundColor: "rgb(31 30 27 / 0.88)"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-ghost:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  badge:
    backgroundColor: "{colors.subtle}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "20px"
  quiet-panel:
    backgroundColor: "rgb(240 238 230 / 0.6)"
    rounded: "{rounded.xl}"
    padding: "16px"
  pill-tab:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  pill-tab-active:
    backgroundColor: "{colors.ink}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: "6px 12px"
---

# Design System: UltahID

## Overview

**Creative North Star: "The Indonesian Magazine Index"**

UltahID reads like a well-set Indonesian magazine index — warm ivory ground, serif display type, hairline rules, generous editorial margins — and behaves like a native app: frosted top chrome, spring-sliding filter pills, a drag-to-dismiss lightbox, and instant tactile press feedback on everything clickable. The direction is user-pinned: Apple craft × Anthropic warmth × ClickUp clarity, carried by a single clay accent that replaced the old vermilion (approved 2026-11-17).

The deal's value is the typography. Every card and detail page is anchored by an oversized serif numeral ("100", "50%") with a micro uppercase unit beside it; trust marks — verification badges, proof counts, freshness scores, timestamps — ride quietly in mono and muted metadata. Depth comes from warm tonal layering (ivory canvas / white card surfaces / oat quiet panels) and 1px hairlines, never from resting shadows. Cards sit flat until touched.

Refused: the stat-tile wall of identical admin cards. Also refused: any dependence on imagery — brand logos are optional decorations (the card works with a text-only brand row), proof photos are user uploads that may not exist, and every state (empty, loading skeleton, error) is designed to carry its weight with zero images. Mobile-first, light, and legible on mixed-quality connections; all user-facing copy is Bahasa Indonesia.

**Key Characteristics:**

- Warm ivory editorial ground (#FAF9F5) with paper-white surfaces and oat quiet panels — a tonal, not shadow-based, sense of depth
- Newsreader serif display over Schibsted Grotesk UI text; JetBrains Mono with tabular figures for every countable number
- One clay accent family (#B4552F interactive; vivid #C96442 reserved for the % logo mark and oversized numerals)
- Numeral-anchored card anatomy: big serif discount numeral + micro unit, trust data quiet underneath
- Hairline separation (1px warm #E8E4DB) instead of nested boxes; detail page uses the page itself as the surface
- Flat at rest; warm ink-tinted layered shadows appear only on hover, floating chrome, and the lightbox
- Native-app motion: zero-bounce springs (0.35–0.45s) on pills/collapsibles/lightbox, 120ms press scale, staggered 280ms entrances
- Accessibility fallbacks are part of the design: reduced motion, reduced transparency, increased contrast, themed selection and caret

## Colors

A warm paper palette with one terracotta accent: every neutral is tinted warm, and the accent is rare enough that a single clay button reads as the action.

### Primary
- **Terracotta Clay** ({colors.accent}): the interactive brand accent — primary buttons, text links, focus rings, field-focus border and glow, text caret, required-field markers, and clay-toned discount numerals. Binding brand color.
- **Burnt Clay** ({colors.accent-hover}): hover/active deepening of every clay surface (buttons, links).
- **Vivid Clay** ({colors.accent-vivid}): brighter sibling for size — the % logo mark tile, small status dots and list bullets, and the oversized 404 numeral. Never used for body-size text or fills that must contrast at small scale.
- **Clay Wash** ({colors.accent-soft}): soft clay-tinted ground for clay badges, icon chips, drag-over states, and gentle selected/hover fills.

### Secondary
- **Verification Emerald** ({colors.emerald}): trust and positive signal — "masih berlaku" counts, admin-verified accents, success panels. Trust is the product; emerald is its color.
- **Cautious Amber** ({colors.amber}): preparation-time caution — H-30/H-7 lead-day labels, "perlu cek ulang" states, warn panels.

### Tertiary
Warm semantic background/line pairs, always tinted (never neutral gray boxes). Text within them reuses emerald/amber/brick/info inks:
- **Ember Wash** ({colors.danger-bg}) + **Brick Edge** ({colors.danger-line}) + **Brick Ink** ({colors.danger-ink}): expired/error/reject. The vote tile for "lapor berubah/expired" and error alerts.
- **Meadow Wash** ({colors.success-bg}) + **Meadow Edge** ({colors.success-line}): success messages and the "masih berlaku" vote tile.
- **Mist Wash** ({colors.info-bg}) + **Mist Edge** ({colors.info-line}) + **Slate Ink** ({colors.info}): informational notices.
- **Straw Wash** ({colors.warn-bg}) + **Straw Edge** ({colors.warn-line}): stale/warn notices.

### Neutral
- **Warm Ivory** ({colors.canvas}): the page ground everywhere; also used as a recessed inset inside cards (proof tiles).
- **Paper White** ({colors.surface}): card and panel surfaces, inputs, buttons (except filled ones).
- **Warm Oat** ({colors.subtle}): recessed panels (60% alpha quiet panels), active nav pill, badge neutral tone, inset fields.
- **Espresso Ink** ({colors.ink}): primary text, near-black with warm undertone; also secondary-button fill (white text).
- **Warm Graphite** ({colors.ink-2}): secondary body text.
- **Warm Ash** ({colors.ink-muted}): metadata, placeholders, timestamps; under prefers-contrast it darkens.
- **Bone Hairline** ({colors.hairline}): 1px default borders and dividers; becomes Strong Linen under prefers-contrast.
- **Strong Linen** ({colors.line-strong}): input borders, card hover border, dashed empty-state border, quiet dividers inside panels.
- **Peach Selection** ({colors.selection}): text-selection highlight (`::selection`), keeping even browser chrome warm.

### Named Rules
**The One Clay Rule.** Clay is the only accent family on any screen: one clay primary action per view, clay for links and focus, clay numerals for clay-toned deals. If everything is clay, nothing is. Vivid clay appears only at large sizes (the mark, oversized numerals) or as sub-4px dots.

**The Warm Ground Rule.** Every neutral and semantic tint is warm (OKLCH hue ≈ 40–95). No pure grays, no blacks, no cool blues outside the Mist info pair. If a new color is needed, derive it warm from an existing family.

## Typography

**Display Font:** Newsreader (serif, optical sizing enabled, italic available for rare editorial flourish; falls back to ui-serif/Georgia)
**Body Font:** Schibsted Grotesk (grotesque UI sans; falls back to ui-sans-serif/system-ui)
**Label/Mono Font:** JetBrains Mono (numerals only; falls back to ui-monospace/SFMono-Regular)

**Character:** An editorial serif speaks from the front page, a neutral grotesk does the daily work, and mono keeps every number honest — the pairing that lets a directory feel like a magazine while behaving like a tool.

### Hierarchy
- **Display** (Newsreader 500; three clamp steps — 42–68px / 32–46px / 26–34px; leading 1.02–1.12; tracking tightens as it grows, −0.02em to −0.032em): hero claim on the directory, page H1s (`display-lg`), section headings (`display-md`). Headings balance their line breaks.
- **Headline** (Newsreader, `display-md` or 20px with tight tracking): panel and section headings inside cards and forms — "Galeri Bukti", "Rencanakan klaim ultahmu", scraper panel titles.
- **Title** (Schibsted Grotesk semibold, 16px, snug leading): card deal titles, form headings; table headers are 12px semibold.
- **Body** (Schibsted Grotesk 14–16px; body leading 1.55, relaxed 1.625): descriptions and copy; secondary text in Warm Graphite, metadata in Warm Ash. Detail-page descriptions cap at ~65ch.
- **Label** (micro scale: 11px, 1rem leading, +0.04em tracking, uppercase, medium/semibold): the unit word beside every big numeral, spec-strip terms, stat labels, brand·category rows. Uppercase is for labels only, never sentences.
- **Numerals** (two voices): serif display numerals sell — 42px/0.95 leading on cards, 56–88px/0.9 on the detail page, 28px in stat tiles; JetBrains Mono with tabular figures counts — Rp values, verification counts, freshness scores, dates, scraper table numbers.

### Named Rules
**The Numeral Is the Hero Rule.** The deal's value is the largest type on the card and on the detail page — bigger than the title, always serif, always with its micro unit beside it. Everything else is quieter than the numeral.

**Serif Sells, Mono Counts Rule.** A number that sells (discount, score emphasis, stat tile) is serif; a number that counts (Rp, tallies, timestamps, table data) is mono with tabular figures. Never mix the two jobs in one voice.

## Layout

A single centered column with editorial top margin; containers by page role, not a universal grid:

- **Directory / ops pages:** 1152px max width (72rem), gutters 16px mobile → 24px from 640px. Content maxes at 768px for hero prose.
- **Deal detail:** 896px max width (56rem) — the page is the surface; hairlines separate sections instead of nested cards. Description capped ~65ch.
- **404:** 672px, centered text.

Vertical rhythm uses the spacing scale (4 / 8 / 12 / 16 / 24 / 32px): 32px between major sections, 16px between cards, 20px card padding (24px on ≥640px panels), 12px inside dense meta rows.

Fixed chrome: frosted header 64px tall, sticky; on the directory, the toolbar (search + category + sort + filter pills) sticks directly beneath it on a 90% canvas ground with hairline top and bottom edges. The card grid is 1 column mobile → 2 from 768px → 3 from 1024px, gap 16px. Filter pills scroll horizontally under 640px with a right-edge fade mask. Horizontal overflow is clipped at the body; nothing may force side-scroll except intentional pill/table overflow (scraper table scrolls in place). Text wraps are tuned: headings balance, paragraphs pretty.

## Elevation & Depth

Hybrid, biased flat: tonal layering does the everyday work — ivory canvas below white surfaces below oat quiet panels, separated by warm hairlines — and shadows are reserved as *response*: hover, floating chrome, and modal depth. All shadows are tinted with the warm ink (#1F1E1B), never pure black, except the lightbox scrim.

### Shadow Vocabulary
- **Card hover lift** (`box-shadow: 0 1px 2px rgb(31 30 27/.04), 0 4px 12px rgb(31 30 27/.05), 0 12px 24px -8px rgb(31 30 27/.06)` + border strengthens to Strong Linen): the only resting-card shadow, and only under hover-capable pointers.
- **Header scroll edge** (`box-shadow: 0 1px 0 rgb(31 30 27/.07), 0 10px 28px -18px rgb(31 30 27/.22)`): animates in over the first 240px of scroll via a scroll-driven animation timeline; unsupported browsers simply keep the clean edge.
- **Lightbox depth** (`box-shadow: 0 24px 80px -16px rgb(0 0 0/.5)`): the one legitimately deep shadow, over a 78% ink scrim.
- **Pill-track whisper** (`box-shadow: 0 1px 2px rgb(31 30 27/.03)`): barely-there grounding under the filter pill rail.
- **Logo inset highlight** (`box-shadow: inset 0 1px 0 rgb(255 255 255/.25)`): a glassy top edge on the clay % mark chip.
- **Field focus glow** (`box-shadow: 0 0 0 3px rgb(180 85 47/.26)` with clay border): focus state for all inputs/selects/textareas.

### Named Rules
**The Flat-at-Rest Rule.** Surfaces cast no shadow until the user gives them a reason — hover, elevation (sticky/floating), or focus. If a design needs a resting shadow to look right, its tonal layering is wrong.

**The Frost Rule.** Persistent chrome (header) is translucent: canvas at 72% with 20px blur + 180% saturation backdrop, so content scrolls beneath like paper under glass. Under `prefers-reduced-transparency`, frost turns solid canvas — design must survive both.

## Shapes

Soft warm rectangles with a disciplined radius ladder, hairline edges, and fully-round pills:

- **Radius ladder:** 6px badges/small chips → 8px buttons (sm/md) and inputs → 12px large buttons and inner panels (vote tiles, proof tiles, icon chips) → 16px cards and page-level panels → full-round pills, status dots, the logo chip (10px). Bigger containers get bigger radii, one step at a time.
- **Hairline edges:** 1px Bone Hairline is the default border; Strong Linen for inputs, hover borders, and quiet internal dividers; borderless is also valid inside tonal panels.
- **Dashed = provisional:** empty states and upload drop targets use dashed Strong Linen borders — dashed means "waiting for content", solid means "real".
- **The % mark:** the logo is a % glyph drawn as vector strokes in a vivid-clay rounded tile (rx 14 on the 64px icon grid; 10px chip radius in the header), with a faint white inner edge.

**The Hairline Rule.** Separate with a hairline or a tonal step, not with another box. The deal detail page nests zero cards inside cards; nested chrome is a design smell.

## Components

### Buttons
Tactile and confident; every clickable gets the shared press behavior (scale to 0.97 over 120ms, disabled at half opacity, keyboard focus ring in clay 2px/2px offset).
- **Shape:** 8px radius (12px on large); heights 32/40/44px (sm/md/lg) with 12→20px horizontal padding, semibold 12–14px text.
- **Primary:** Terracotta Clay fill, white text; hover/active deepens to Burnt Clay. One per view.
- **Secondary:** Espresso Ink fill, white text; hover 88% ink.
- **Outline:** Paper White fill, Strong Linen border, ink text; hover warms to 70% oat with border softening.
- **Ghost:** no fill, Warm Graphite text; hover ink text on 70% oat.
- A `buttonClasses` helper styles links as buttons (header CTA, stretched-link rows).

### Chips
- **Badge:** 6px-radius tinted chip (11px semibold, tight tracking), tones clay/emerald/neutral/danger/info/warn mapping to the semantic washes; numeric badges switch to mono uppercase tabular (scraper statuses like SUCCESS/PARTIAL).
- **StatusDot:** 6px full-round dot, tone-matched (vivid clay for clay), always decorative with the label carrying meaning.
- **Filter pills (PillTabs):** full-round rail on Paper White with a hairline edge and whisper shadow; the active pill is an ink fill that springs between positions (zero-bounce 0.4s spring, interruptible), counts in mono; `role=group` with `aria-pressed` per pill.

### Cards / Containers
- **DealCard (signature):** 16px radius, hairline border, Paper White, 20px padding. Anatomy top-to-bottom: brand·category micro row + status badge → 42px serif numeral + micro uppercase unit → 16px semibold title (stretched-link to detail, whole card clickable) → 2-line description → requirement meta with 14px icons → hairline → claim window/min spend spec pair → trust row (emerald confirmations, proof count, last-verified) with text-link "Detail & Bukti". Entrance staggers 40ms/item (capped at 8) on first load only.
- **Quiet panels:** Oat at 60% alpha, 16px radius, 16–20px padding, no border — used for the planner, requirement panels, admin box, proof-standard aside.
- **EmptyState:** dashed-border card, serif `display-md` title, muted description, optional action row.

### Inputs / Fields
- **Style:** 8px radius, Strong Linen border, Paper White ground, 12px×8px padding, 14px text, Warm Ash placeholders; hover border warms.
- **Focus:** clay border + 3px clay glow at 26% (deliberately `:focus`, not `:focus-visible`, so mouse-opened selects show state; a transparent outline preserves forced-colors indication).
- **FieldLabel** 12px semibold with clay asterisk for required; **FieldHint** 12px muted. Selects carry a custom inline-SVG chevron (Warm Ash) and are mono/tabular where numeric.

### Navigation
Frosted sticky header (64px): clay % mark chip + "UltahID" in 17px serif + micro tagline, nav links as ghost pills (Warm Oat active fill), clay primary CTA right. Footer: hairline top, serif one-line identity, quiet 12px links. Back-links are quiet ghost rows with a 16px arrow.

### Proof Lightbox (signature)
Pops from its thumbnail (transform-origin set to the trigger's center, spring 0.35s zero-bounce) over a 78% ink scrim; drag down with rubber-band resistance (top 0.15 / bottom 0.55) — a flick (velocity > 550px/s) or deep drag (> 110px) dismisses downward with velocity-projected momentum, other closes shrink back toward the source. Focus is trapped, Escape closes, focus returns to the trigger.

### Stat Tile / Ops Surfaces
StatTile: 28px serif numeral (tone-tinted: ink/success/warn/danger) + micro uppercase label + optional detail. The ops dashboard composes four of them into one hairline-divided strip (not four cards) above a control panel and a real table with mono tabular columns. Admin actions on visitor pages sit in quiet oat panels as wash-filled buttons that flood to their semantic ink on hover.

### Iconography
Lucide line icons only, stroked, never filled; 14px for card meta, 16px for controls/headings, 20px max for section accents. Always `aria-hidden` with an `aria-label` on the adjacent stat span when the number needs announcing.

### Motion Defaults
Interaction: 120ms press scale; state transitions 150–200ms. Springs (motion library, bounce 0): pills 0.4s, planner checklist height 0.45s, lightbox 0.35s; lightbox dismiss 170ms ease-in. Entrances: 280ms fade+6px rise, 40ms stagger capped at 8. CSS easings: out `cubic-bezier(.22,1,.36,1)`, in-out `cubic-bezier(.77,0,.175,1)`, drawer `cubic-bezier(.32,.72,0,1)`. Under `prefers-reduced-motion`: movement drops, gentle 150ms fades remain, springs become instant; spin slows; shimmer stops.

## Do's and Don'ts

### Do:
- **Do** make the discount numeral the hero of any deal surface — serif, oversized (42px+ cards, 56px+ detail), with its micro uppercase unit beside it.
- **Do** set every countable number (Rp, counts, scores, dates, table data) in JetBrains Mono with tabular figures.
- **Do** separate sections with hairlines or tonal steps (canvas/surface/oat); the detail page nests no cards inside cards.
- **Do** keep exactly one clay primary action per view; links, focus rings, and the caret may also be clay.
- **Do** use the warm semantic wash+line pairs for status, with emerald reserved for verified trust and amber for lead-time caution.
- **Do** design empty, loading (calm shimmer skeleton), and error states that work with zero images — logos and proof photos are optional content.
- **Do** keep all interactive elements pressable (120ms scale), keyboard-focusable with a clay focus ring, and every motion respecting reduced-motion, reduced-transparency, and increased-contrast preferences.
- **Do** write all UI copy in Bahasa Indonesia, plain and specific (real brand names, real terms like H-7/H-30).

### Don't:
- **Don't** use vivid clay (#C96442) for body-size text or fills — it's for the logo mark, oversized numerals, and tiny dots only.
- **Don't** add resting shadows to cards or panels; shadows appear only on hover, floating chrome, or the lightbox.
- **Don't** introduce pure grays, black, or cool blues (outside the Mist info pair); every tint stays warm.
- **Don't** build stat-tile walls of identical cards; differentiate surfaces by hierarchy and rhythm, and compose stats into a single divided strip.
- **Don't** uppercase anything except micro labels and badges; never animate the card grid on every filter change — entrance stagger is first-load only.
- **Don't** depend on brand logos or any raster imagery for layout or identity; the UI must survive without them.

## Asset Provenance

Every shipping raster is a deterministic conversion of one authored vector; no AI-generated or stock imagery ships.

- **`src/app/icon.svg`** — the authored source of identity: clay % mark on a vivid-clay rounded tile (#C96442, rx 14 on a 64px grid, faint white inner edge). Hand-written SVG; the same glyph is inlined in the header at 15px.
- **`src/app/apple-icon.png`** — deterministic ImageMagick rasterization of `icon.svg` (180×180, 16-bit RGBA): `magick -background none icon.svg -resize 180x180 -depth 16 apple-icon.png`. Reproduced pixel-identical on 2026-11-17 with ImageMagick 7.1.2-34 (rsvg-convert delegate); only the embedded creation-timestamp chunk varies between runs.
- **`src/app/favicon.ico`** — deterministic ImageMagick multi-size raster of `icon.svg` (64/32/16px): `magick -background none icon.svg -define icon:auto-resize=64,32,16 favicon.ico`. Reproduced byte-identical (SHA-256 `316e9abb…28def`).
- **`.impeccable/review/*.png`** — internal finish-review QA screenshots, not shipping assets; never reference them from the app.
- **User-uploaded proof photos** (`public/uploads/proofs/`) are content, not design assets: unoptimized, possibly absent, and never load-bearing for layout.
