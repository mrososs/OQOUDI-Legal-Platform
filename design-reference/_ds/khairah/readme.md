# Khairah Holding — Design System

A design system for **Khairah Holding** (خيرة القابضة), a professional corporate holding company that manages assets, investments, and subsidiary companies. The system expresses a minimalist, clean, institutional identity for a bilingual (English / Arabic) audience.

## Sources
- `uploads/logo.png` — the supplied brand logo (bilingual wordmark + woven-ribbon mark). Processed into `assets/logo/` (color, white-knockout, isolated mark).
- Written brief: brand voice, color palette, typography direction, and UI styling rules provided by the client.
- No codebase, Figma file, or font files were provided. Where specifics were unknown they were derived from the brief and the logo. **Font files are substituted** (see Typography).

---

## Brand at a glance
- **Voice:** professional, trustworthy, corporate, minimalist.
- **Look:** robust industrial-institutional. Stone-paper light-gray ground, **deep corporate navy** primary (`--navy-700`), steel-blue support from the logo ribbon, rich charcoal footer. Bold, commanding display type. Weight, trust, physical presence.
- **Signature layout:** 2-column splits (image one side, text + solid navy button the other); header with logo left and a consolidated pill-menu right (deep navy nav text).

---

## CONTENT FUNDAMENTALS
How Khairah Holding writes.

- **Tone:** measured, institutional, confident but understated. Reads like an established holding company — not a startup. No hype, no exclamation marks.
- **Person:** first-person plural for the company ("**We** partner with management teams", "**Our** portfolio"); second person ("you") only in direct calls to action ("Get in touch").
- **Casing:** Sentence case for headings and body. UPPERCASE only for short eyebrows/kickers (e.g. `OUR APPROACH`) with wide letter-spacing. Title Case for proper nouns and nav labels.
- **Vocabulary:** stewardship, discipline, long-term, enduring value, governance, portfolio, capital allocation, resilient, diversified. Avoid trendy/tech jargon.
- **Length:** headings short and declarative ("Building enduring value across generations"). Body in calm, complete sentences; one idea per paragraph.
- **Bilingual:** English and Arabic are peers. Arabic copy mirrors meaning, not word-for-word; it sets right-to-left with Arabic type. The brand name is **Khairah Holding / خيرة القابضة**.
- **Emoji:** never. No emoji anywhere in the brand.
- **Numbers/metrics:** used sparingly and only when real and meaningful (companies, AUM, year founded). Currency shown as `SAR` prefix.
- **Examples:**
  - Eyebrow → Heading: `WHO WE ARE` → "A holding company built on trust"
  - CTA labels: "Learn more", "Explore our portfolio", "Get in touch" (verb-first, no period).

---

## VISUAL FOUNDATIONS

**Color.** Four families. *Deep corporate navy* (`#1F4063` primary, scale `--navy-*`) for buttons, links, nav/footer text, CTA and marquee bands. *Steel blue* (`#7A9FAE`, scale `--steel-*`, from the logo ribbon) as supporting accent on dark bands and image placeholders. *Rich charcoal* (`--charcoal-900` `#26292D`) grounds the footer bar. *Stone-gray neutrals* (`--neutral-*`) for surfaces. Semantic status colors are deliberately **muted**. Everything routes through semantic aliases (`--surface-*`, `--text-*`, `--accent`, `--border-*`).

**Type.** Clean corporate sans for Latin, geometric sans for Arabic — a single bilingual superfamily. Display headlines: **bold (700)**, commanding, tight tracking. Section headings: semibold (600). Body: regular (400), 1.5 line-height. Eyebrows: uppercase, 600, wide tracking (`0.12em`), in navy accent. Scale is a 1.25 major third from a 16px base (see `tokens/typography.css`).

**Spacing.** 8px base rhythm (`--space-*`). Sections breathe — `--section-gap` is `clamp(4rem, 9vw, 8rem)`. Content max width `1240px`; split gaps `clamp(2.5rem, 5vw, 5rem)`.

**Backgrounds.** The page ground is a **fine-grained stone-paper texture** in light gray (`assets/textures/stone-paper.png` tiled over `#ECEEF0`) — premium, physical, never busy. White bands lift key content sections; deep `--navy-900` bands carry the CTA and marquee; the footer sits on **rich charcoal** (`--surface-footer`). Imagery is **navy duotone photographic composites** of the holding's sectors — flowing water infrastructure, architectural gridwork, high-rise assets — unified by the etched calligraphy mark (`assets/imagery/`). Replace with real photography of the same character when supplied: cool, dark, architectural, never warm/saturated.

**Corners & cards.** Restrained rounding. Buttons are **solid and squared-off** (`--radius-sm`, 8px) — confidence, not softness. Nav pills keep `--radius-pill` inside the header. Cards & panels `--radius-lg` (20px), white with either a 1px hairline border (`--border-subtle`) *or* a soft shadow (`--shadow-sm`) — not both. Interactive cards lift 2px and gain `--shadow-md` on hover.

**Shadows.** Soft, low-contrast, cool-tinted (`rgba(28,53,69,...)`), four steps `xs→lg`. No hard or dark drop shadows. Elevation is subtle; the system leans on borders and whitespace more than shadow.

**Borders & dividers.** Hairlines in `--neutral-200/300`. Inputs use a 1.5px border that turns steel on focus with a soft focus ring (`--shadow-focus`).

**Motion.** Restrained and quick. Standard ease `cubic-bezier(0.4,0,0.2,1)`, durations 140–360ms. Fades and gentle 2px lifts only — **no bounces, no springy or playful motion**, no infinite/decorative loops. Respect `prefers-reduced-motion`.

**Hover / press states.** Primary button hover = darker navy (`--accent-hover`), active = darker still (`--accent-active`). Ghost/secondary hover = soft navy tint fill. Pill-nav active item = raised white pill on the gray track, deep navy text. Links shift from `--text-accent` to `--accent-hover`. Press = color deepening, not scale-down.

**Transparency / blur.** Used only on the sticky header — a translucent white with `backdrop-filter: blur` so content scrolls softly beneath. Elsewhere surfaces are opaque.

**Layout rules.** Sticky translucent header. Logo always left (mirrors to right in RTL), consolidated pill menu opposite. 2-column splits alternate sides down a page (`reverse`). Stats in a 4-up band bordered top and bottom. Generous, symmetrical section padding.

**RTL.** Full right-to-left support: `dir="rtl"` flips layout and switches to Arabic type; arrow glyphs in CTAs flip direction.

---

## ICONOGRAPHY
- **No icon assets were provided** in the brief, and the source is a single logo. The brand itself is **text-and-logo led** — it does not rely on a decorative icon set. UI affordances use simple typographic glyphs (arrows `→ ←`, check `✓`) rather than a heavy icon library.
- **Recommended set (substitution — flagged):** when icons are needed (sectors, contact, features), use **[Lucide](https://lucide.dev)** — thin, geometric, 1.5–2px stroke icons that match the minimalist, corporate tone and the system's line weights. Load from CDN: `https://unpkg.com/lucide@latest`. This is a documented substitution; replace with a brand-approved set if one exists.
- **Logo / mark** are the primary brand graphics — see `assets/logo/`. The isolated **woven-ribbon mark** doubles as a favicon / compact symbol.
- **Emoji:** never used.
- **Image placeholders** are flat steel-blue blocks, not iconographic.

---

## INDEX / MANIFEST

**Root**
- `styles.css` — global entry point (import-only). Consumers link this one file.
- `readme.md` — this guide.
- `SKILL.md` — Agent-Skill wrapper for use in Claude Code.

**`tokens/`** — CSS custom properties (all `@import`ed by `styles.css`)
- `fonts.css` · `colors.css` · `typography.css` · `spacing.css` · `effects.css` (radii/shadows/motion) · `base.css` (element defaults + helpers)

**`components/`** — reusable React primitives (compiled into `_ds_bundle.js`)
- `core/` — `Button`, `IconButton`, `Badge`, `Tag`, `Card`
- `forms/` — `Input`, `Select`
- `navigation/` — `PillNav`, `Logo`
- `layout/` — `SplitSection`
- `components.css` — component classes (shipped via `styles.css`)

**`ui_kits/website/`** — bilingual corporate website recreation (home / portfolio / about / contact). See its `README.md`.

**`guidelines/cards/`** — foundation specimen cards shown in the Design System tab (Colors, Type, Spacing, Brand).

**`assets/`**
- `logo/` — `khairah-logo.png`, `khairah-logo-white.png`, `khairah-mark.png`, `khairah-mark-white.png`.
- `imagery/` — navy duotone sector composites (`sectors-hero.jpg` 21:7, `sectors-towers.jpg` + `sectors-water.jpg` 4:5) with the etched calligraphy mark.
- `textures/` — `stone-paper.png`, the tileable light-gray page-ground texture.

---

## Usage (consumers)
Link the stylesheet and the bundle, then read components off the namespace:
```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
<script type="text/babel">
  const { Button, PillNav, Logo, SplitSection } = window.KhairahHoldingDesignSystem_52a247;
</script>
```
