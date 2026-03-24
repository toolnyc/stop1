# Stop One — Design Token Spec

> Reference: S1 logomark, stop1 wordmark, April 18 flyer, Verbs project (layout/animation patterns).
> This spec defines the full token system for the site redesign. All values map to CSS custom properties.

---

## 1. Color

### Brand Palette

The flyer establishes the core palette: a dark, textured upper half with red/white photographic energy, and a warm paper-stock lower half. The brand lives in the tension between grit and clean type.

```
Token                        Value         Usage
─────────────────────────────────────────────────────────────────
--color-paper                #f0ebe4       Primary background — warm off-white,
                                           slightly yellow/green like uncoated stock
--color-paper-dark           #e2dbd2       Alternate surface — aged paper, cards,
                                           secondary sections
--color-ink                  #1a1714       Primary text — warm near-black,
                                           brown-tinted (not blue-black)
--color-ink-muted            #6b6560       Secondary text — warm gray
--color-ink-faint            #a39e98       Tertiary text — captions, timestamps
--color-red                  #cd2e2a       Brand red — pulled from the stop sign
                                           and flyer accents (slightly muted from
                                           pure #ed1e24 to feel printed, not digital)
--color-red-dark             #a82420       Red hover/active state
--color-charcoal             #2c2825       Dark surfaces — nav bars, dark sections,
                                           the flyer's upper-half energy
--color-charcoal-light       #3d3835       Raised dark surfaces — cards on dark bg
--color-border               #d0c9c1       Borders on light backgrounds
--color-border-dark          #443f3a       Borders on dark backgrounds
```

### Semantic Colors

```
Token                        Value                    Usage
─────────────────────────────────────────────────────────────────
--color-bg                   var(--color-paper)        Page background
--color-fg                   var(--color-ink)          Default text
--color-muted                var(--color-ink-muted)    Secondary text
--color-accent               var(--color-red)          CTAs, links, highlights
--color-accent-hover         var(--color-red-dark)     Interactive accent state
--color-surface              var(--color-paper-dark)   Cards, raised areas
--color-success              #3a7d44                   Confirmations (muted green,
                                                       not neon — feels organic)
--color-error                var(--color-red)          Errors share the brand red
--color-warning              #c4890e                   Warnings — warm amber
```

### Dark Context (nav, hero overlays, footer)

When content sits on `--color-charcoal` backgrounds, text flips to paper tones:

```css
.dark-ctx {
  --color-bg: var(--color-charcoal);
  --color-fg: var(--color-paper);
  --color-muted: var(--color-ink-faint);
  --color-surface: var(--color-charcoal-light);
  --color-border: var(--color-border-dark);
}
```

---

## 2. Typography

### Font Stack

```
Token                        Value
─────────────────────────────────────────────────────────────────
--font-display               'Neue Haas Grotesk Display Pro', system-ui,
                             -apple-system, sans-serif
--font-mono                  'JetBrains Mono', ui-monospace, monospace
```

Neue Haas Grotesk Display Pro is the sole typeface. Loaded via Adobe Fonts.
JetBrains Mono retained for prices, codes, and data (door app, budget tables).

### Weight System

The logo's core move — light "s" against heavy "1" — defines the weight contrast:

```
Token                        Value    Usage
─────────────────────────────────────────────────────────────────
--weight-light               300      Body text, labels, the "stop" in stop1
--weight-regular             400      Default body, form inputs
--weight-medium              500      Subheadings, nav items, emphasis
--weight-bold                700      Headlines, the "1" in stop1, CTAs
--weight-black               900      Display/hero — massive type moments
```

### Type Scale

Mobile-first with responsive bumps. Dramatic hierarchy — small body, massive display.

```
Token              Mobile        Tablet (768+)    Desktop (1024+)
─────────────────────────────────────────────────────────────────
--text-xs          0.75rem       0.75rem          0.75rem
--text-sm          0.8125rem     0.875rem         0.875rem
--text-base        0.9375rem     1rem             1rem
--text-lg          1.125rem      1.125rem         1.25rem
--text-xl          1.25rem       1.375rem         1.5rem
--text-2xl         1.5rem        1.75rem          2rem
--text-3xl         2rem          2.5rem           3rem
--text-4xl         2.5rem        3.5rem           4.5rem
--text-5xl         3.5rem        5rem             6rem
--text-6xl         4.5rem        7rem             9rem
```

### Type Properties

```
Token                        Value
─────────────────────────────────────────────────────────────────
--leading-tight              1.05        Headlines, display text
--leading-normal             1.4         Body copy
--leading-relaxed            1.6         Long-form, small text
--tracking-tight             -0.03em     Display text, headlines
--tracking-normal            -0.015em    Body text
--tracking-wide              0.05em      Labels, bracket tags like [Club]
```

---

## 3. Spacing

Same scale as Verbs — it works well. 4px base unit.

```
Token              Value       Typical Use
─────────────────────────────────────────────────────────────────
--space-xs         0.25rem     Inline gaps, badge padding
--space-sm         0.5rem      Input padding, tight gaps
--space-md         1rem        Default gap, section padding (mobile)
--space-lg         1.5rem      Card padding, row gaps
--space-xl         2rem        Section gaps
--space-2xl        3rem        Major section spacing
--space-3xl        4rem        Hero padding, page margins (desktop)
--space-4xl        6rem        Full section breaks
```

### Content Padding (responsive)

```
Token                   Mobile       Tablet (768+)    Desktop (1024+)
─────────────────────────────────────────────────────────────────
--content-padding       1rem         2rem             4rem
```

---

## 4. Layout

```
Token                        Value         Usage
─────────────────────────────────────────────────────────────────
--max-width                  1200px        Content container (tighter than
                                           Verbs' 1400 — Stop One is more
                                           intimate/focused)
--max-width-narrow           640px         RSVP forms, single-column pages
--max-width-admin            960px         Admin dashboard
--hero-image-ratio           4 / 5         Flyer display aspect ratio
--radius                     0px           No border radius — sharp edges
                                           match the brand's angular stop-sign
                                           and flyer aesthetic
--radius-sm                  2px           Subtle softening only where needed
                                           (inputs, small badges)
```

### Breakpoints

```
--bp-sm:   480px      Phone landscape, door app
--bp-md:   768px      Tablet
--bp-lg:   1024px     Desktop
--bp-xl:   1280px     Wide desktop
```

---

## 5. Borders & Dividers

```
Token                        Value
─────────────────────────────────────────────────────────────────
--border-width               1px
--border-style               solid
--border                     var(--border-width) var(--border-style) var(--color-border)
--divider                    var(--border-width) var(--border-style) var(--color-border)
```

No rounded corners by default. The stop sign is an octagon, the flyer is sharp rectangles, the type is geometric. Softness comes from color warmth and texture, not from radius.

---

## 6. Effects & Texture

### Noise Overlay

Canvas-based grain texture (like Verbs) but warmer — sepia-tinted rather than neutral gray. Gives the papery, printed feel without actual image textures.

```
Token                        Value
─────────────────────────────────────────────────────────────────
--noise-opacity              0.04          Subtle grain over backgrounds
--noise-size                 512px         Canvas render size
--noise-fps                  15            Animation frame rate (subtle drift)
--noise-blend                multiply      Blend mode — darkens slightly on
                                           paper bg, lightens on dark bg
```

### Shadows

Minimal. The flyer aesthetic is flat/printed — shadows only where functionally needed.

```
Token                        Value
─────────────────────────────────────────────────────────────────
--shadow-sm                  0 1px 3px rgba(26, 23, 20, 0.08)
--shadow-md                  0 4px 12px rgba(26, 23, 20, 0.1)
--shadow-lg                  0 12px 40px rgba(26, 23, 20, 0.15)
--shadow-flyer               0 20px 60px rgba(26, 23, 20, 0.25)
```

`--shadow-flyer` is the hero flyer's drop shadow — the one big depth moment on the page.

---

## 7. Motion

### GSAP + Lenis

All animation via GSAP. No CSS transitions except `:hover` micro-interactions.

```
Token                        Value           Usage
─────────────────────────────────────────────────────────────────
--ease-out                   power2.out      Default exits
--ease-out-back              back.out(1.7)   Playful entrances (flyer reveal)
--ease-out-expo              expo.out        Smooth scroll, large moves

--duration-fast              0.15s           Hover states (CSS only)
--duration-normal            0.3s            Standard GSAP tweens
--duration-slow              0.6s            Page entrances, hero reveal
--duration-dramatic          1.0s            First-load hero animation

--stagger-fast               0.05s           List item entrances
--stagger-normal             0.1s            Section element cascade
```

### Lenis Smooth Scroll

```js
{
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical',
  smoothWheel: true,
}
```

### Entrance Patterns

| Element          | Animation                                      |
|------------------|-------------------------------------------------|
| Hero flyer       | Scale 0.95 → 1, opacity 0 → 1, shadow fade in  |
| Wordmark         | Clip-path reveal left to right                  |
| Body text blocks | Y +20px → 0, opacity 0 → 1, staggered           |
| Nav items        | Y -10px → 0, opacity 0 → 1, staggered           |
| Section dividers | ScaleX 0 → 1, origin left                       |
| Bracket labels   | Typewriter/stamp effect (optional)               |

---

## 8. Component Tokens

### Buttons

```
Primary:    bg: --color-red       text: --color-paper      border: --color-red
            hover → bg: transparent, text: --color-red

Secondary:  bg: transparent       text: --color-ink         border: --color-ink
            hover → bg: --color-ink, text: --color-paper

Ghost:      bg: transparent       text: --color-ink-muted   border: none
            hover → text: --color-ink

Danger:     bg: transparent       text: --color-red         border: --color-red
            hover → bg: --color-red, text: --color-paper
```

All buttons: no border-radius, tight padding, medium weight, uppercase tracking-wide.

### Inputs

```
bg: transparent
border: var(--border) on bottom only (underline style) — or full border for contained forms
text: var(--color-ink)
placeholder: var(--color-ink-faint)
focus: 2px solid var(--color-red) outline
```

### Cards

```
bg: var(--color-surface)
border: var(--border)
padding: var(--space-lg)
radius: 0
```

### Badges / Tags

Bracket-style labeling from the flyer: `[Club]`, `[Roof]`, `[Sold Out]`

```
font-size: var(--text-xs)
font-weight: var(--weight-medium)
letter-spacing: var(--tracking-wide)
text-transform: uppercase
```

For status badges (RSVP'd, Checked In, etc.):
```
display: inline-flex
padding: var(--space-xs) var(--space-sm)
border: var(--border)
font-size: var(--text-xs)
```

---

## 9. Z-Index Scale

```
Token                   Value    Usage
─────────────────────────────────────────────────────────────────
--z-base                0        Default content
--z-raised              10       Cards, dropdowns
--z-sticky              100      Sticky nav
--z-overlay             200      Modals, drawers
--z-noise               300      Noise texture canvas (pointer-events: none)
--z-toast               400      Toast notifications
```

---

## 10. Admin & Door Contexts

The public site gets the full brand treatment. Admin and door app are functional — they inherit tokens but simplify:

**Admin:**
- Same colors but `--color-paper` bg, no noise overlay, no GSAP
- Standard full-border inputs (not underline)
- `--max-width-admin` container
- Sidebar nav pattern stays

**Door app (390px target):**
- `--color-charcoal` bg (dark context — easier on eyes in dim venues)
- Large touch targets: min 48px tap areas
- `--text-2xl` minimum for guest names
- `--color-red` accent for check-in actions
- `--font-mono` for prices/amounts

---

## Implementation Notes

1. **Font loading**: Adobe Fonts embed via `@import` or Astro font provider config (same as Verbs: `fontProviders.adobe({ id: 'YOUR_KIT_ID' })`)
2. **Noise canvas**: Port from Verbs' `animations.ts` — adjust tint from neutral gray to warm sepia
3. **No Tailwind**: Continue with plain CSS + custom properties. The token count is small enough that a framework adds more weight than value.
4. **Migration**: Replace all current `global.css` tokens. The variable names are different (e.g., `--color-accent` was `#e8ff00`, now `--color-red`) so every usage needs updating.
5. **Logo/wordmark**: Replace the current text-based "Stop One" with the actual S1 logomark SVG and stop1 wordmark. Need to export clean SVGs from the Illustrator source files.
6. **Flyer as hero**: Event pages show the uploaded flyer image as the primary visual. Homepage shows the next event's flyer prominently.
