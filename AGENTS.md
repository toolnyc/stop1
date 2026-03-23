# Agent Instructions

Read by GitHub Copilot coding agent and other AI agents.
For full context: [CLAUDE.md](CLAUDE.md) · [docs/](docs/)

## Quick Rules

- **Stack:** Astro 5 SSR, TypeScript strict, plain CSS (no Tailwind), Supabase, Stripe, Resend
- **No client-side JS framework.** Interactivity via native `fetch` + inline `<script>` blocks only.
- **Mobile-first.** Every page must work well at 390px viewport width.
- **`bcryptjs` only** (not `bcrypt`) — native bindings fail on Vercel serverless.
- **`supabaseAdmin` is server-side only** — never import in `.astro` client scripts or browser code.
- **RLS enabled** on every table. Use `supabaseAdmin` for writes from API routes.
- **Collaborator data isolation** — always filter queries by `collaborator_id` from session cookie, never trust body.
- **File naming:** kebab-case everywhere (`src/lib/supabase.ts`, `src/pages/api/rsvp/[slug].ts`).
- **No `any` types.** Use `unknown` and narrow, or generated types from `src/types/database.ts`.

## Worktree Workflow

```bash
git worktree add -b feature/issue-N-slug ../stop1-issue-N
cd ../stop1-issue-N
pnpm install
cp ../stop1/.env.local .env.local
# ... do work ...
git push -u origin feature/issue-N-slug
# Open PR — CI must pass — merge
```

## Verification Gate

Every PR must pass:
1. `pnpm build` exits 0 (zero TypeScript errors)
2. Browser checks listed in the issue's **Verification** section
3. No JS console errors on page load
4. Mobile layout at 390px viewport

## Pull Request Instructions

- Title format: `feat: <short description> (#N)` where N is the issue number
- After opening the PR, enable auto-merge (squash) so it merges automatically when CI passes
- Do not request a review — CI green = ready to merge
- Close the issue in the PR body with `Closes #N`

## Deeper Context

- [docs/architecture.md](docs/architecture.md) — Directory structure, naming conventions, Astro patterns
- [docs/database.md](docs/database.md) — Schema, migrations, RLS policies, Supabase query patterns
- [docs/patterns.md](docs/patterns.md) — Auth (admin/PIN/token), Stripe, Resend, Vercel Blob
- [docs/verification.md](docs/verification.md) — How to run browser + API verification checks
