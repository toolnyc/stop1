# Architecture

## Key Files for This Mission

| File                                  | Purpose                                                                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/index.astro`               | Landing page — contains flyer card, 3D tilt JS, countdown timer, footer, info modal, action buttons. All inline (~450 lines). |
| `src/styles/global.css`               | CSS custom properties (colors, shadows, spacing), reset, typography                                                           |
| `src/layouts/Base.astro`              | HTML shell — meta theme-color, font imports, GSAP, ClientRouter                                                               |
| `src/lib/emails/rsvp-confirmation.ts` | RSVP confirmation email template (inline HTML)                                                                                |
| `src/lib/emails/day-of-reminder.ts`   | Day-of reminder email template (inline HTML)                                                                                  |
| `src/pages/api/rsvp/[slug].ts`        | RSVP API route — sends confirmation email                                                                                     |
| `src/pages/events/[slug].astro`       | RSVP page — formats event time in frontmatter                                                                                 |

## Color System

Current state (to be standardized):

- `--color-fg: #0a0a0a` in global.css → change to `#1a1816`
- `.dark-ctx --color-bg: #0a0a0a` → change to `#1a1816`
- Footer hardcoded `#231e19` → change to `#1a1816`
- Action buttons hardcoded `#231e19` → change to `#1a1816`
- Modal backdrop/shadow rgba(35,30,25,...) → change to rgba(26,24,22,...)
- Email templates `#f0ebe4`/`#1a1714`/`#cd2e2a` → change to `#f5f3f0`/`#1a1816`

## 3D Tilt Effect Parameters (index.astro)

| Parameter     | Current | Target                |
| ------------- | ------- | --------------------- |
| MAX_TILT      | 15 deg  | ≤ 8 deg               |
| lerp factor   | 0.08    | tune for organic feel |
| perspective   | 800px   | ≥ 1000px              |
| shine opacity | 0.18    | ≤ 0.12                |

## Email Templates

Both templates accept event data and generate inline-CSS HTML strings. They are pure functions returning `{ subject, html }`. The RSVP API route at `src/pages/api/rsvp/[slug].ts` currently selects only `id, status, title, date, venue_name` — needs to also select `time_end, door_price, venue_address` for the redesigned template.

## Assets

- Wordmark SVG: `public/images/wordmark.svg` (production: `https://stop1.party/images/wordmark.svg`)
- Logo SVG: `public/images/logo.svg`
