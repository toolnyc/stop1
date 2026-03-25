# Issue Grinder

Pick up issues from ISSUES.md one by one, implement each, create a PR, wait for auto-merge, and continue to the next issue.

Optional argument: `$ARGUMENTS` — a specific issue number to start from (e.g., `/grind 5`). If omitted, automatically detect the next unfinished issue.

## Step 0 — Determine which issues are done

Run:
```
gh pr list --state merged --limit 100 --json title
```

Extract issue numbers from merged PR titles (pattern: `(#N)` in the title). Also check `git log --oneline main` for commit messages referencing issue numbers. Build a set of completed issue numbers.

## Step 1 — Pick the next issue

Read `ISSUES.md` and find all issue definitions (headers matching `### #N —`).

For each issue, check:
1. Is it already completed? (from Step 0) → skip
2. Does it have a `Depends on:` line? Are all dependencies completed? → if not, skip

If `$ARGUMENTS` is provided and is a number, start from that issue number instead of auto-detecting.

Pick the first eligible issue. If no issues remain, report "All issues complete!" and stop.

## Step 2 — Implement the issue (loop starts here)

For the selected issue, do the following:

### 2a — Create a worktree branch

```bash
git checkout main
git pull origin main
git checkout -b feature/issue-N-<short-slug>
```

Where `N` is the issue number and `<short-slug>` is a 2-3 word kebab-case summary derived from the issue title.

### 2b — Read context and implement

1. Read the full issue text from ISSUES.md carefully — it contains file paths, dependencies, acceptance criteria, and verification steps.
2. Read any referenced docs (docs/architecture.md, docs/database.md, docs/patterns.md) as needed.
3. If the issue references a pattern from a reference repo (`~/Code/verbs`, `~/Code/blow`), read the referenced file for patterns.
4. Implement the issue completely. Follow all file paths and acceptance criteria exactly.

### 2c — Verify the build

```bash
pnpm build
```

This MUST exit 0. If it fails, fix all TypeScript errors before proceeding. Do not move forward with a broken build.

### 2d — Run issue-specific verification

If the issue has a `Verification:` section with commands, run those too (except ones requiring a running dev server — those are for manual verification).

### 2e — Commit and push

Stage all relevant files and create a commit:
```
feat: <Issue title> (#N)
```

Push the branch:
```bash
git push -u origin feature/issue-N-<short-slug>
```

### 2f — Create a PR

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

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Step 3 — Wait for auto-merge

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

## Step 4 — Prepare for next issue

Once the PR is merged:

```bash
git checkout main
git pull origin main
```

Then go back to **Step 1** to pick the next issue. Continue the loop until all issues are done or you encounter a blocker.

## Rules

- Never commit directly to `main` — always use a feature branch + PR.
- `pnpm build` must exit 0 before creating any PR.
- Use `bcryptjs` (not `bcrypt`) — native bindings fail on Vercel.
- `supabaseAdmin` is server-side only — never import in client code.
- Collaborators must never see other collaborators' data — always filter by session `collaborator_id`.
- If an issue is blocked by an unmerged dependency, skip it and try the next eligible one.
- Report progress after each PR: "Issue #N done. Moving to #M next."
