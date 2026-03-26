# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Required Environment

- `.env.local` must exist with 13 configured variables (Supabase, Stripe, Resend, etc.)
- Supabase is remote — no local database needed
- Node.js with pnpm package manager

## Key Dependencies

- `astro` ^6.0.0 — SSR framework
- `gsap` ^3.14.2 — Animations (page transitions, 3D card, entrance animations)
- `resend` — Email sending (used in RSVP confirmation and day-of reminder)
- `bcryptjs` (NOT `bcrypt`) — Vercel-compatible PIN hashing

## Timezone

Events are in the `America/New_York` timezone. All `toLocaleTimeString`/`toLocaleDateString` calls must include `timeZone: 'America/New_York'`. A shared constant should exist in `src/lib/constants.ts`.
