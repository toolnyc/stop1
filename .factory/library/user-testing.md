# User Testing

## Validation Surface

**Primary surface:** Browser (localhost:4321)
**Tool:** agent-browser (headless Chromium)
**Dev server:** `pnpm dev` on port 4321 (Astro SSR)

The site requires a running Supabase backend (remote, configured in .env.local) to load event data on the landing page. If no event data exists, the landing page shows a TBA state.

**Testable pages:**

- Landing page: `http://localhost:4321` — flyer card, footer, action buttons, info modal, poster interaction
- Email templates: Not directly browser-accessible. Test by inspecting the rendered HTML output from the template functions, or by triggering an RSVP and checking the email content.

**Auth requirements:** None for the landing page. Admin pages require login but are not in scope for this mission's user testing.

## Validation Concurrency

**Machine:** 24 GB RAM, 14 CPU cores
**Dev server footprint:** ~280 MB (node + esbuild)
**agent-browser footprint:** ~450 MB per instance (headless Chromium + overhead)
**Available headroom:** ~14 GB \* 0.7 = ~9.8 GB
**Max concurrent validators:** 5

All assertions test against the same landing page or email template output. No complex isolation needed — assertions are independent and stateless.

### Current Run Adjustment (2026-03-26)

- Observed high baseline memory usage from desktop processes; run flow validators at max concurrency **3** for this milestone to avoid resource pressure.

## Flow Validator Guidance: browser

- Use agent-browser with explicit non-default session IDs.
- Shared target URL is `http://localhost:4321`.
- Allowed interactions: landing page load, viewport resize (390px and desktop), info modal open/close, pointer movement over flyer card.
- Do not perform destructive admin actions or any authenticated flows.
- Keep assertions read-only from the app perspective; no data mutation required for this milestone.

## Flow Validator Guidance: repo-cli

- Use repository-local commands only (grep, build, test render scripts).
- Do not modify application source while validating.
- Write only report JSON and evidence artifacts under assigned paths.
- For command evidence, include exact command, exit code, and key output excerpts proving assertion outcomes.
