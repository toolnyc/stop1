# Stop One

Recurring DIY party series platform. RSVP pages, door check-in app, and P&L budget tracker per event.

## Tech Stack

Astro 5 (SSR) · Supabase (Postgres + Auth) · Stripe · Resend · Vercel

## Setup

```bash
pnpm install
cp .env.example .env.local   # fill in keys
pnpm dev                      # http://localhost:4321
```

## Commands

| Command         | Description                                 |
| --------------- | ------------------------------------------- |
| `pnpm dev`      | Start dev server (port 4321)                |
| `pnpm build`    | Production build (must pass zero TS errors) |
| `pnpm test`     | Run unit tests (Vitest)                     |
| `pnpm lint`     | Lint source files (ESLint)                  |
| `pnpm format`   | Format all files (Prettier)                 |
| `pnpm db:types` | Regenerate types from Supabase schema       |
| `pnpm db:push`  | Push database migrations                    |

## Environment Variables

See [`.env.example`](.env.example) for all required keys.

## Documentation

- [AGENTS.md](AGENTS.md) — AI agent instructions and project conventions
- [docs/architecture.md](docs/architecture.md) — Directory structure and patterns
- [docs/database.md](docs/database.md) — Schema, migrations, RLS policies
- [docs/patterns.md](docs/patterns.md) — Auth, Stripe, Resend, Blob patterns
- [docs/deployment.md](docs/deployment.md) — Vercel deployment guide
