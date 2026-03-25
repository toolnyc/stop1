# Stop One

Recurring DIY party series platform. RSVP pages, door check-in app, and P&L budget tracker per event.

---

## Tool Discovery & Bootstrap

This file is the **primary instruction source** for all AI coding agents.

If your AI tool prefers a specific entry point, create it by copying or symlinking this file:

| Tool | Entry Point |
|------|-------------|
| Claude Code | `CLAUDE.md` (exists - thin wrapper) |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Cursor | `.cursorrules` |
| Windsurf | `.windsurfrules` |
| Other | Check tool documentation, create as needed |

**Sync script:** Run `pnpm sync-instructions` to verify all entry points are consistent.

---

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
| Deployment & Vercel      | [docs/deployment.md](docs/deployment.md)     |
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
2. The **Smoke test** step in `.github/workflows/ci.yml` passes
3. No JS console errors on page load
4. Mobile layout at 390px viewport

**Issue #1 must add the first smoke test step.** Use `pnpm dev` (NOT `pnpm preview` — `@astrojs/vercel` doesn't support `astro preview`). Background the dev server, `sleep 5`, then run curl checks. Every subsequent issue adds its own curl checks to the same step.

## Pull Request Instructions

- Title format: `feat: <short description> (#N)` where N is the issue number
- After opening the PR, enable auto-merge (squash) so it merges automatically when CI passes
- Do not request a review — CI green = ready to merge
- Close the issue in the PR body with `Closes #N`

---

## Skills / Procedures

### Issue Grinder (`/grind`)

Pick up issues from ISSUES.md one by one, implement each, create a PR, wait for auto-merge, and continue to the next issue.

Optional argument: a specific issue number to start from (e.g., `/grind 5`). If omitted, automatically detect the next unfinished issue.

#### Step 0 — Determine which issues are done

Run:
```
gh pr list --state merged --limit 100 --json title
```

Extract issue numbers from merged PR titles (pattern: `(#N)` in the title). Also check `git log --oneline main` for commit messages referencing issue numbers. Build a set of completed issue numbers.

#### Step 1 — Pick the next issue

Read `ISSUES.md` and find all issue definitions (headers matching `### #N —`).

For each issue, check:
1. Is it already completed? (from Step 0) → skip
2. Does it have a `Depends on:` line? Are all dependencies completed? → if not, skip

If a specific issue number is provided, start from that issue number instead of auto-detecting.

Pick the first eligible issue. If no issues remain, report "All issues complete!" and stop.

#### Step 2 — Implement the issue (loop starts here)

For the selected issue, do the following:

##### 2a — Create a worktree branch

```bash
git checkout main
git pull origin main
git checkout -b feature/issue-N-<short-slug>
```

Where `N` is the issue number and `<short-slug>` is a 2-3 word kebab-case summary derived from the issue title.

##### 2b — Read context and implement

1. Read the full issue text from ISSUES.md carefully — it contains file paths, dependencies, acceptance criteria, and verification steps.
2. Read any referenced docs (docs/architecture.md, docs/database.md, docs/patterns.md) as needed.
3. If the issue references a pattern from a reference repo (`~/Code/verbs`, `~/Code/blow`), read the referenced file for patterns.
4. Implement the issue completely. Follow all file paths and acceptance criteria exactly.

##### 2c — Verify the build

```bash
pnpm build
```

This MUST exit 0. If it fails, fix all TypeScript errors before proceeding. Do not move forward with a broken build.

##### 2d — Run issue-specific verification

If the issue has a `Verification:` section with commands, run those too (except ones requiring a running dev server — those are for manual verification).

##### 2e — Commit and push

Stage all relevant files and create a commit:
```
feat: <Issue title> (#N)
```

Push the branch:
```bash
git push -u origin feature/issue-N-<short-slug>
```

##### 2f — Create a PR

```bash
gh pr create --title "feat: <Issue title> (#N)" --body "$(cat <<'EOF'
## Summary
Implements issue #N from ISSUES.md.

<1-3 bullet points describing what was done>

## Acceptance Criteria
<paste the acceptance criteria checkboxes from the issue>

## Verification
- [x] `pnpm build` exits 0
<any other verification results>
EOF
)"
```

#### Step 3 — Wait for auto-merge

The repo has an auto-merge workflow that enables squash merge when CI passes. Poll until the PR is merged:

```bash
gh pr view <PR-NUMBER> --json state,mergedAt
```

Check every 30 seconds. The CI pipeline runs `pnpm build` — it typically takes 1-3 minutes. If the PR is not merged after 10 minutes, report the status and ask for guidance.

If CI fails on the PR, check the failure:
```bash
gh pr checks <PR-NUMBER>
gh run view <RUN-ID> --log-failed
```
Fix the issue locally, commit, and push again. The auto-merge will re-trigger.

#### Step 4 — Prepare for next issue

Once the PR is merged:

```bash
git checkout main
git pull origin main
```

Then go back to **Step 1** to pick the next issue. Continue the loop until all issues are done or you encounter a blocker.

#### Grinder Rules

- Never commit directly to `main` — always use a feature branch + PR.
- `pnpm build` must exit 0 before creating any PR.
- Use `bcryptjs` (not `bcrypt`) — native bindings fail on Vercel.
- `supabaseAdmin` is server-side only — never import in client code.
- Collaborators must never see other collaborators' data — always filter by session `collaborator_id`.
- If an issue is blocked by an unmerged dependency, skip it and try the next eligible one.
- Report progress after each PR: "Issue #N done. Moving to #M next."

---

## Deeper Context

- [docs/architecture.md](docs/architecture.md) — Directory structure, naming conventions, Astro patterns
- [docs/database.md](docs/database.md) — Schema, migrations, RLS policies, Supabase query patterns
- [docs/patterns.md](docs/patterns.md) — Auth (admin/PIN/token), Stripe, Resend, Vercel Blob
- [docs/verification.md](docs/verification.md) — How to run browser + API verification checks
