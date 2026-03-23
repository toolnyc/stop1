# Stop One

Recurring DIY party series platform. RSVP pages, door check-in app, and P&L budget tracker per event.

## Tech Stack

| Layer       | Choice                                          |
|-------------|-------------------------------------------------|
| Framework   | Astro 5 (SSR, `output: 'server'`)               |
| Database    | Supabase (Postgres + RLS + Auth)                |
| Auth        | Supabase Auth (admin) · PIN (door) · token (collaborators) |
| Payments    | Stripe Payment Elements (door only)             |
| Email/SMS   | Resend (email) · Twilio (SMS fallback)          |
| Storage     | Vercel Blob (expense receipts)                  |
| Deployment  | Vercel · DNS on Cloudflare (CNAME, proxy off)   |

## Quick Reference

| Topic                    | Details                                    |
|--------------------------|--------------------------------------------|
| Architecture & structure | [docs/architecture.md](docs/architecture.md) |
| Database & Supabase      | [docs/database.md](docs/database.md)       |
| Auth, Stripe, Blob patterns | [docs/patterns.md](docs/patterns.md)    |
| Verification approach    | [docs/verification.md](docs/verification.md) |
| Issue list + epics       | [ISSUES.md](ISSUES.md)                     |
| Pre-flight setup         | [PREFLIGHT.md](PREFLIGHT.md)               |

## Environments

| Environment | Branch | URL                          | Purpose         |
|-------------|--------|------------------------------|-----------------|
| Local       | any    | `localhost:4321`             | Development     |
| Preview     | PR     | `stop1-git-*.vercel.app`     | CI verification |
| Production  | `main` | `stop1.party`               | Live            |

**Branch flow:** `feature/issue-N-*` → PR → CI passes → merge to `main`

## Commands

```bash
pnpm dev          # Start dev server (port 4321)
pnpm build        # Production build — must pass zero TS errors
pnpm preview      # Preview production build locally
pnpm db:types     # Regenerate src/types/database.ts from Supabase schema
pnpm db:push      # Push migrations (supabase db push)
pnpm db:new <n>   # Create migration (supabase migration new <n>)
```

## Environment Variables

Copy `.env.example` to `.env.local`. Required keys:

```
PUBLIC_SUPABASE_URL          PUBLIC_SUPABASE_KEY
SUPABASE_SECRET_KEY         SUPABASE_PROJECT_ID
COOKIE_SECRET                STRIPE_SECRET_KEY
PUBLIC_STRIPE_PUBLISHABLE_KEY  RESEND_API_KEY
EMAIL_FROM                   BLOB_READ_WRITE_TOKEN
TWILIO_ACCOUNT_SID (opt)     TWILIO_AUTH_TOKEN (opt)
TWILIO_FROM_NUMBER (opt)
```

## Critical Rules

1. Never commit directly to `main` — all work via worktree + PR
2. `pnpm build` must exit 0 before any PR merges
3. Use `bcryptjs` (not `bcrypt`) — native bindings fail on Vercel
4. `supabaseAdmin` is server-side only — never import in client code
5. Collaborators must never see other collaborators' data — always filter by session `collaborator_id`
