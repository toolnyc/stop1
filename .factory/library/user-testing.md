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
