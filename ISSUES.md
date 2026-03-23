# Stop One — GitHub Issues / Epics

> Built for autonomous GitHub Copilot pickup. Each issue is self-contained:
> full context, exact file paths, acceptance criteria, and **Verification** checks.
>
> **Stack:** Astro 5 SSR · Vercel adapter · Supabase · Stripe Payment Elements · Resend · Vercel Blob · pnpm
> **Reference repos:** `~/Code/verbs` (Supabase/Stripe/admin patterns) · `~/Code/blow` (Astro structure)
> **Docs:** [docs/architecture.md](docs/architecture.md) · [docs/database.md](docs/database.md) · [docs/patterns.md](docs/patterns.md)
>
> Verification commands run against `http://localhost:4321` (dev server).
> `pnpm build` must pass zero TypeScript errors on every issue.

---

## Milestone 0 — Foundation

### #1 — Scaffold Astro 5 project with Vercel adapter

**Labels:** `foundation`

**Files to create:**
- `package.json` — `scripts: { dev, build, preview, db:types, db:push, db:new }`
- `astro.config.mjs` — `output: 'server'`, `adapter: vercel()`
- `tsconfig.json` — strict, path alias `@/*` → `src/*`
- `src/env.d.ts` — Astro types + `App.Locals` shape (user, doorSlug, collaborator)
- `src/layouts/Base.astro` — html/head/body shell, `<slot />`
- `public/favicon.svg` — minimal placeholder
- `.gitignore` — `node_modules dist .env* .vercel .DS_Store`
- `.nvmrc` — `20`
- `.env.example` — all env var keys, no values (see CLAUDE.md)

**Dependencies:** `astro@^5 @astrojs/vercel typescript`

**Acceptance criteria:**
- [ ] `pnpm dev` starts on port 4321 without errors
- [ ] `pnpm build` exits 0 with zero TypeScript errors
- [ ] `@/` path alias resolves correctly in build and editor

**Verification:**
```bash
pnpm build                                              # exits 0
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/  # 200
```

---

### #2 — Supabase client setup

**Labels:** `foundation` `database`
**Depends on:** #1

**Files to create:**
- `src/lib/supabase.ts` — exports `supabase` (anon/public) and `supabaseAdmin` (service role, null if key missing). Pattern: `~/Code/verbs/src/lib/supabase.ts`

**Dependencies:** `pnpm add @supabase/supabase-js`

**Env vars used:** `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_KEY`, `SUPABASE_SECRET_KEY`

**Acceptance criteria:**
- [ ] Both clients exported with correct TypeScript types (generic `Database` placeholder until #3)
- [ ] `supabaseAdmin` is `null` when `SUPABASE_SECRET_KEY` is missing (graceful degradation)
- [ ] `pnpm build` exits 0

**Verification:**
```bash
pnpm build   # exits 0, no TS errors on supabase.ts
```

---

### #3 — Database schema migration (init)

**Labels:** `foundation` `database`
**Depends on:** #2

**File to create:** `supabase/migrations/20260001000000_init.sql`

Full schema (copy from [docs/database.md](docs/database.md) — Schema Overview section):
- Tables: `events`, `rsvps`, `door_payments`, `collaborators`, `expenses`, `payouts`
- Enums: `event_status`, `payment_method`, `payout_method`
- Indexes on all FK columns and frequently-queried fields
- RLS enabled on all tables with policies per [docs/database.md](docs/database.md)

After migration, run `pnpm db:types` and commit `src/types/database.ts`.
Update `src/lib/supabase.ts` to use the generated `Database` type.

**Acceptance criteria:**
- [ ] `supabase db push` applies cleanly with no errors
- [ ] All 6 tables exist in Supabase dashboard
- [ ] `pnpm db:types` generates a non-empty `src/types/database.ts`
- [ ] `pnpm build` exits 0 with typed Supabase client

**Verification:**
```bash
supabase migration list           # shows init migration as applied
pnpm db:types                     # generates src/types/database.ts
pnpm build                        # exits 0
```

---

### #4 — Global styles + base layouts

**Labels:** `foundation` `ui`
**Depends on:** #1

**Files to create:**
- `src/styles/global.css` — CSS custom properties (tokens from CLAUDE.md), reset, base typography
- `src/layouts/Base.astro` — imports `global.css`, `<slot />`
- `src/layouts/Admin.astro` — extends Base, top nav with: Events (`/admin`), Logout button (`POST /api/admin/logout`)
- `src/pages/index.astro` — placeholder: `<h1>Stop One</h1>`

**Acceptance criteria:**
- [ ] Dark background (`#0a0a0a`), `--color-accent` (#e8ff00) applied
- [ ] Admin layout renders nav with correct links
- [ ] No horizontal scroll at 390px viewport

**Verification:**
```bash
pnpm build
curl -s http://localhost:4321/ | grep -q "Stop One" && echo "PASS"
# Open http://localhost:4321 in browser at 390px — no horizontal scroll
```

---

## Milestone 1 — Admin Auth

### #5 — Admin login page + API

**Labels:** `admin` `auth`
**Depends on:** #2, #4

**Files to create:**
- `src/pages/admin/login.astro` — email/password form, shows error message on failure
- `src/pages/api/admin/login.ts` — `POST`: `supabaseAdmin.auth.signInWithPassword` → set `sb-access-token` + `sb-refresh-token` cookies → redirect `/admin`
- `src/pages/api/admin/logout.ts` — `POST`: sign out, delete cookies → redirect `/admin/login`

**Pattern:** `~/Code/verbs/src/middleware.ts` (cookie names, httpOnly, secure, sameSite: lax)

**Acceptance criteria:**
- [ ] Valid credentials → cookies set, redirect to `/admin`
- [ ] Invalid credentials → 401, error message shown in form
- [ ] Logout → cookies cleared, redirect to `/admin/login`
- [ ] Login form is mobile-friendly (full-width inputs)

**Verification:**
```bash
# Login page renders
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/admin/login   # 200

# Bad credentials → error response
curl -s -X POST http://localhost:4321/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bad@test.com","password":"wrong"}' \
  -w "\nHTTP %{http_code}"   # HTTP 401
```

---

### #6 — Admin auth middleware

**Labels:** `admin` `auth`
**Depends on:** #5

**File to create/update:** `src/middleware.ts`

Guards `/admin/*` (except `/admin/login`): reads `sb-access-token` cookie → `supabaseAdmin.auth.getUser()` → on failure tries refresh → on final failure redirects to `/admin/login`. Sets `context.locals.user`.

**Pattern:** `~/Code/verbs/src/middleware.ts` (full implementation)

**Acceptance criteria:**
- [ ] Unauthenticated `/admin` → redirect to `/admin/login`
- [ ] `/admin/login` always accessible
- [ ] Valid session → `context.locals.user` populated
- [ ] Expired access token → refresh attempted before redirect

**Verification:**
```bash
# No cookies → redirects to login
curl -s -o /dev/null -w "%{http_code}" -L http://localhost:4321/admin   # 200 (at /admin/login)
curl -s http://localhost:4321/admin | grep -q "login\|Login" && echo "PASS"
```

---

### #7 — Admin dashboard

**Labels:** `admin` `ui`
**Depends on:** #6, #3

**File to create:** `src/pages/admin/index.astro`

Fetches all events (all statuses) sorted by date desc. Displays:
- Title, date (formatted), status badge (draft/published/archived), RSVP count
- "New Event" button → `/admin/events/new`
- Row click → `/admin/events/[slug]`

**Acceptance criteria:**
- [ ] Shows all events with correct fields
- [ ] RSVP count accurate (COUNT from rsvps table)
- [ ] "New Event" button present

**Verification:**
```bash
# Insert seed event first (see PREFLIGHT.md step 15)
curl -s http://localhost:4321/admin   # redirects to login without cookie
# After manual login in browser: page shows event list
```

---

## Milestone 2 — Events CRUD

### #8 — Create event form + API

**Labels:** `admin` `events`
**Depends on:** #6, #3

**Files to create:**
- `src/pages/admin/events/new.astro` — form
- `src/pages/api/admin/events/create.ts` — `POST` handler

**Form fields:** title, slug (auto-suggested from title via `slugify()`), date, time_end, venue_name, venue_address, description, door_price, door_pin, capacity, status (draft/published)

**Key logic:**
- `door_pin` → bcrypt hash via `bcrypt.hash(pin, 10)` before insert (`bcryptjs` not `bcrypt`)
- Duplicate slug → `23505` Postgres error → inline "Slug already taken" error
- Success → redirect to `/admin/events/[slug]`

**Dependencies:** `pnpm add bcryptjs && pnpm add -D @types/bcryptjs`

**Acceptance criteria:**
- [ ] All required fields validated server-side (return 400 with field errors)
- [ ] `door_pin` stored as bcrypt hash, never plain text
- [ ] Duplicate slug → 409 with "Slug already taken"
- [ ] Success → redirect to edit page

**Verification:**
```bash
pnpm build

# Create event via API (in browser after login, or with session cookie)
curl -s -X POST http://localhost:4321/api/admin/events/create \
  -H "Content-Type: application/json" \
  -b "sb-access-token=<token>" \
  -d '{"title":"Test Event","slug":"test-event","date":"2026-07-01T22:00","venue_name":"Test Venue","door_price":20,"door_pin":"1234","status":"published"}' \
  | jq '.success'   # true

# Duplicate slug
curl -s -X POST http://localhost:4321/api/admin/events/create \
  -b "sb-access-token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Dup","slug":"test-event",...}' \
  -w "\nHTTP %{http_code}"   # HTTP 409
```

---

### #9 — Edit event form + API

**Labels:** `admin` `events`
**Depends on:** #8

**Files to create:**
- `src/pages/admin/events/[slug]/index.astro` — pre-populated form + sidebar nav
- `src/pages/api/admin/events/[slug]/update.ts` — `POST`
- `src/pages/api/admin/events/[slug]/archive.ts` — `POST`: sets `status = 'archived'`

**Key logic:**
- `door_pin` field: if submitted blank, keep existing hash (don't overwrite with empty bcrypt hash)
- Slug is read-only display (not editable after creation)
- Sidebar nav links: Edit (active), RSVPs, Door (new tab), Budget, Collaborators

**Acceptance criteria:**
- [ ] All fields pre-populated from DB
- [ ] Blank `door_pin` submission preserves existing hash
- [ ] Archive → status = 'archived', redirect to `/admin`
- [ ] Sidebar nav links all present and correct

**Verification:**
```bash
pnpm build
curl -s http://localhost:4321/admin/events/test-event \
  -b "sb-access-token=<token>" | grep -q "test-event\|Test Event" && echo "PASS"
```

---

## Milestone 3 — Collaborators

### #10 — Collaborator management page

**Labels:** `admin` `collaborators`
**Depends on:** #9, #3

**Files to create:**
- `src/pages/admin/events/[slug]/collaborators.astro`
- `src/pages/api/admin/events/[slug]/collaborators/add.ts` — `POST`
- `src/pages/api/admin/events/[slug]/collaborators/remove.ts` — `POST`

**Add form fields:** name, email, payout_pct (0–100)

**Key logic:**
- Show total payout % (warn if > 100%, don't block)
- "Copy invite link" → `/collaborate/[invite_token]`
- Cannot remove collaborator who has expense rows (return 409)

**Acceptance criteria:**
- [ ] List shows name, email, payout %, invite status (accepted_at null = pending)
- [ ] Add creates row with `invite_token` auto-set by DB default
- [ ] Remove blocked if expenses exist (error message shown)
- [ ] Total payout % displayed

**Verification:**
```bash
pnpm build
curl -s http://localhost:4321/admin/events/test-event/collaborators \
  -b "sb-access-token=<token>" | grep -q "collaborat" && echo "PASS"
```

---

### #11 — Collaborator invite + token auth

**Labels:** `collaborators` `auth`
**Depends on:** #10

**Files to create:**
- `src/pages/collaborate/[token]/index.astro` — landing: event name, "You're invited as [name]", link to expenses
- `src/pages/api/collaborators/validate-token.ts` — `GET`: validate token → set `collab_session` cookie

**Key logic (from [docs/patterns.md](docs/patterns.md) — Collaborator Token Auth):**
- Valid token → base64+HMAC signed `collab_session` cookie (7-day, httpOnly, SameSite=strict)
- Sets `accepted_at` on first visit
- Invalid token → "Link not found" page (no 404 — avoid token enumeration timing attacks)

**Middleware update:** extend `src/middleware.ts` to guard `/collaborate/*/expenses` → validate `collab_session` cookie → set `context.locals.collaborator`

**Acceptance criteria:**
- [ ] Valid token → cookie set, landing page shows collaborator name
- [ ] Invalid token → "Link not found" message
- [ ] `/collaborate/[token]/expenses` without cookie → redirect to `/collaborate/[token]`
- [ ] `context.locals.collaborator` populated for expense routes

**Verification:**
```bash
pnpm build

# Insert test collaborator in DB, get its invite_token
# Then:
curl -s http://localhost:4321/collaborate/<test-token> | grep -q "invited\|collaborat" && echo "PASS"

# Invalid token
curl -s http://localhost:4321/collaborate/invalid-token-xxx | grep -q "not found\|invalid" && echo "PASS"
```

---

## Milestone 4 — RSVP Module

### #12 — Public event page

**Labels:** `rsvp` `public`
**Depends on:** #3, #4

**File to create:** `src/pages/events/[slug].astro`

Fetches event by slug where `status = 'published'`. Shows: flyer (if `flyer_url`), title, date/time (formatted), venue name + address.
Embeds `RsvpForm` component (from #13).

**Acceptance criteria:**
- [ ] 404 for unpublished or missing events
- [ ] All event fields displayed correctly
- [ ] Page loads fast on 3G mobile simulation

**Verification:**
```bash
pnpm build
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/events/test-event   # 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/events/nonexistent  # 404
curl -s http://localhost:4321/events/test-event | grep -q "Test Event" && echo "PASS"
```

---

### #13 — RSVP form + submission API

**Labels:** `rsvp` `public`
**Depends on:** #12

**Files to create:**
- `src/components/public/RsvpForm.astro` — form with JS fetch (no page reload)
- `src/pages/api/rsvp/[slug].ts` — `POST` handler

**Form fields:** name (required), email (required), phone (optional), sms_opt_in (checkbox — only show if phone filled)

**Key logic:**
- Use `supabaseAdmin` for insert (bypasses RLS)
- `23505` constraint error → 409 "You're already on the list!"
- On success: fire-and-forget email via Resend (#24 handles template — just `console.log` for now if #24 not merged)

**Acceptance criteria:**
- [ ] Successful RSVP → inline "You're on the list, [name]!" — no page reload
- [ ] Duplicate email → "You're already on the list!"
- [ ] Works with JS disabled (form falls back to full-page POST)
- [ ] `sms_opt_in` checkbox hidden until phone field has value

**Verification:**
```bash
pnpm build

# Successful RSVP
curl -s -X POST http://localhost:4321/api/rsvp/test-event \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","phone":"","sms_opt_in":false}' \
  | jq '.success'   # true

# Duplicate
curl -s -X POST http://localhost:4321/api/rsvp/test-event \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}' \
  -w "\nHTTP %{http_code}"   # HTTP 409

# Missing required field
curl -s -X POST http://localhost:4321/api/rsvp/test-event \
  -H "Content-Type: application/json" \
  -d '{"name":"No Email"}' \
  -w "\nHTTP %{http_code}"   # HTTP 400
```

---

### #14 — RSVP admin list

**Labels:** `admin` `rsvp`
**Depends on:** #13, #6

**File to create:** `src/pages/admin/events/[slug]/rsvps.astro`

Shows: name, email, phone, RSVP time, arrived badge. Total count header.
Client-side sort by name/time (`<th>` click). Client-side filter by name (instant).
"Export CSV" button → downloads `rsvps-[slug].csv`.

**Acceptance criteria:**
- [ ] Lists all RSVPs with correct fields
- [ ] Count shown in header
- [ ] Sort toggles asc/desc on column header click
- [ ] Name filter instant (no server round-trip)
- [ ] CSV export downloads with correct MIME type (`text/csv`)

**Verification:**
```bash
pnpm build
curl -s http://localhost:4321/admin/events/test-event/rsvps \
  -b "sb-access-token=<token>" | grep -q "RSVP\|rsvp\|guest" && echo "PASS"

# CSV export
curl -s -o /dev/null -w "%{content_type}" \
  "http://localhost:4321/admin/events/test-event/rsvps?export=csv" \
  -b "sb-access-token=<token>"   # text/csv
```

---

## Milestone 5 — Door App

### #15 — Door PIN authentication

**Labels:** `door` `auth`
**Depends on:** #3, #4

**Files to create:**
- `src/pages/door/[slug]/index.astro` — redirect to `/pin` or `/checkin` based on cookie
- `src/pages/door/[slug]/pin.astro` — large PIN entry form (mobile-first, touch-friendly)
- `src/pages/api/door/[slug]/auth.ts` — `POST`: bcrypt compare → set HMAC cookie

**Key logic (from [docs/patterns.md](docs/patterns.md) — Door PIN Auth):**
- Cookie: `door_session_[slug]`, HMAC signed, path `/door/[slug]`, 12hr, httpOnly, SameSite=strict
- Middleware: extend to verify this cookie for `/door/[slug]/checkin` and `/door/[slug]/summary`

**Dependencies:** `pnpm add bcryptjs && pnpm add -D @types/bcryptjs` (if not already from #8)

**Acceptance criteria:**
- [ ] Correct PIN → cookie set, redirect to `/door/[slug]/checkin`
- [ ] Wrong PIN → "Incorrect PIN", no redirect
- [ ] PIN input is large (min 48px height), numeric keyboard on mobile (`inputmode="numeric"`)
- [ ] Direct access to `/door/[slug]/checkin` without cookie → redirect to `/door/[slug]/pin`

**Verification:**
```bash
pnpm build

# Wrong PIN
curl -s -X POST http://localhost:4321/api/door/test-event/auth \
  -H "Content-Type: application/json" \
  -d '{"pin":"9999"}' \
  -w "\nHTTP %{http_code}"   # HTTP 401

# Correct PIN (uses "1234" from seed)
curl -s -X POST http://localhost:4321/api/door/test-event/auth \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234"}' \
  -w "\nHTTP %{http_code}"   # HTTP 302 (redirect)

# Unprotected checkin redirects
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/door/test-event/checkin   # 302
```

---

### #16 — Door check-in: name search + mark arrived

**Labels:** `door`
**Depends on:** #15

**Files to create:**
- `src/pages/door/[slug]/checkin.astro` — search input (autofocused) + results list
- `src/pages/api/door/[slug]/search.ts` — `GET ?q=`: `ilike` name search, returns array
- `src/pages/api/door/[slug]/arrive.ts` — `POST`: sets `arrived_at = now()`

**UI:**
- Large search input at top, autofocused on load
- Results: name, email (small), green "✓ Arrived" badge if `arrived_at` set
- Tap guest → expanded card: "Mark Arrived" button, "Add Payment" button (cash/card)
- Header: "N in" running arrived count
- "Not on list?" → manual walk-in entry → creates RSVP with `walk_in: true`, marks arrived

**Acceptance criteria:**
- [ ] Search returns results within 200ms
- [ ] Marking arrived is idempotent (no error on double-tap)
- [ ] Walk-in flow creates RSVP + marks arrived in one action
- [ ] Arrived count in header is accurate

**Verification:**
```bash
pnpm build

# Search
curl -s "http://localhost:4321/api/door/test-event/search?q=test" \
  -b "door_session_test-event=<hmac>" | jq 'length'   # >= 0 (array)

# Mark arrived
curl -s -X POST http://localhost:4321/api/door/test-event/arrive \
  -H "Content-Type: application/json" \
  -b "door_session_test-event=<hmac>" \
  -d '{"rsvpId":"<uuid>"}' | jq '.success'   # true
```

---

### #17 — Door payment: cash

**Labels:** `door` `payments`
**Depends on:** #16

**Files to create:**
- `src/components/door/CashPayment.astro` — inline form in guest card
- `src/pages/api/door/[slug]/payment/cash.ts` — `POST`

**Form:** amount (pre-filled with `event.door_price`, editable), Confirm button.

**Acceptance criteria:**
- [ ] Cash payment inserts `door_payments` row with `method = 'cash'`
- [ ] Walk-in cash (no rsvp_id) uses `name` field
- [ ] Amount defaults to `event.door_price` but can be overridden
- [ ] Success → instant UI feedback, no page reload

**Verification:**
```bash
pnpm build

curl -s -X POST http://localhost:4321/api/door/test-event/payment/cash \
  -H "Content-Type: application/json" \
  -b "door_session_test-event=<hmac>" \
  -d '{"amount":20,"rsvpId":"<uuid>"}' | jq '.success'   # true

# Walk-in (no rsvpId)
curl -s -X POST http://localhost:4321/api/door/test-event/payment/cash \
  -H "Content-Type: application/json" \
  -b "door_session_test-event=<hmac>" \
  -d '{"amount":20,"name":"Walk In Guest"}' | jq '.success'   # true
```

---

### #18 — Door payment: Stripe card/tap

**Labels:** `door` `payments` `stripe`
**Depends on:** #17

**Files to create:**
- `src/components/door/CardPayment.astro` — Stripe Payment Elements mount
- `src/pages/api/door/[slug]/payment/create-intent.ts` — `POST`: creates PaymentIntent
- `src/pages/api/door/[slug]/payment/confirm.ts` — `POST`: verify + insert `door_payments`
- `src/lib/stripe.ts` — Stripe SDK instance

**Dependencies:** `pnpm add stripe @stripe/stripe-js`
**Env vars:** `STRIPE_SECRET_KEY`, `PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Key logic:** Full flow in [docs/patterns.md](docs/patterns.md) — Stripe section.
Amount = `event.door_price` (not editable in card flow). Guest marked arrived on success.

**Acceptance criteria:**
- [ ] `create-intent` returns `{ clientSecret }`
- [ ] `confirm` inserts `door_payments` row only if `intent.status === 'succeeded'`
- [ ] Guest marked arrived automatically on card payment
- [ ] Card form loads on mobile (tap-to-pay visible only on HTTPS preview)

**Verification:**
```bash
pnpm build

# Create intent
curl -s -X POST http://localhost:4321/api/door/test-event/payment/create-intent \
  -H "Content-Type: application/json" \
  -b "door_session_test-event=<hmac>" \
  -d '{"rsvpId":"<uuid>"}' | jq '.clientSecret'   # "pi_..._secret_..."
```

---

### #19 — Door summary stats

**Labels:** `door`
**Depends on:** #18

**File to create:** `src/pages/door/[slug]/summary.astro`

Stats: total arrived, total cash, total card, total revenue, walk-ins vs. RSVPs.
Auto-refresh every 30s (`<meta http-equiv="refresh" content="30">`).

**Acceptance criteria:**
- [ ] All figures accurate from DB at render time
- [ ] Page auto-refreshes every 30s
- [ ] Large numbers readable on mobile

**Verification:**
```bash
pnpm build
curl -s http://localhost:4321/door/test-event/summary \
  -b "door_session_test-event=<hmac>" | grep -q "Revenue\|Total\|revenue\|total" && echo "PASS"
```

---

## Milestone 6 — Budget Module

### #20 — Collaborator expense entry

**Labels:** `budget` `collaborators`
**Depends on:** #11, #3

**Files to create:**
- `src/pages/collaborate/[token]/expenses.astro` — expense list + add form
- `src/pages/api/collaborators/expenses/add.ts` — `POST` (multipart)
- `src/pages/api/collaborators/expenses/delete.ts` — `POST`
- `src/lib/blob.ts` — Vercel Blob upload helper

**Dependencies:** `pnpm add @vercel/blob`
**Env var:** `BLOB_READ_WRITE_TOKEN`

**Form fields:** description (required), amount (required), receipt (file, optional, max 10MB)

**Key logic:** Full Blob pattern in [docs/patterns.md](docs/patterns.md) — Vercel Blob section.
Filter all queries by `collaborator_id` from `context.locals.collaborator` — never trust request body for this.
Delete only allowed if no payouts recorded for this event.

**Acceptance criteria:**
- [ ] Collaborator sees only their own expenses
- [ ] Receipt upload → Blob URL stored in `expenses.receipt_url`
- [ ] Delete blocked if payout exists (409 with message)
- [ ] Mobile-first: receipt upload button prominent

**Verification:**
```bash
pnpm build

# Add expense (requires collab_session cookie)
curl -s -X POST http://localhost:4321/api/collaborators/expenses/add \
  -H "Content-Type: application/json" \
  -b "collab_session=<signed>" \
  -d '{"description":"Sound system rental","amount":500}' | jq '.success'   # true
```

---

### #21 — Admin P&L dashboard

**Labels:** `admin` `budget`
**Depends on:** #20, #19

**File to create:** `src/pages/admin/events/[slug]/budget.astro`

Four sections:
1. **Income** — cash total + card total = door revenue
2. **Expenses** — grouped by collaborator, line items with receipt links, subtotals
3. **P&L** — `profit = revenue - expenses` (prominent summary box)
4. **Payouts** — per collaborator: owed (`profit × pct/100`), paid (sum of payouts), balance

**Acceptance criteria:**
- [ ] All figures accurate and live (SSR, no cache)
- [ ] Expenses grouped by collaborator with subtotals
- [ ] Receipt links open in new tab
- [ ] "Record Payout" button per collaborator (links to form in #22)

**Verification:**
```bash
pnpm build
curl -s http://localhost:4321/admin/events/test-event/budget \
  -b "sb-access-token=<token>" | grep -q "Revenue\|Expenses\|Profit" && echo "PASS"
```

---

### #22 — Payout recording

**Labels:** `admin` `budget`
**Depends on:** #21

**Files to create:**
- `src/components/budget/RecordPayoutForm.astro`
- `src/pages/api/admin/events/[slug]/payouts/record.ts` — `POST`

**Form fields:** amount (pre-filled with owed amount, editable), method (cash/venmo/zelle/bank_transfer/other), notes, paid_at (defaults to now)

**Acceptance criteria:**
- [ ] Pre-filled amount matches calculated owed
- [ ] Payout recorded → shown in budget page as "Paid [amount] via [method] on [date]"
- [ ] Multiple partial payouts supported
- [ ] Warning (not hard block) if amount > owed

**Verification:**
```bash
pnpm build

curl -s -X POST http://localhost:4321/api/admin/events/test-event/payouts/record \
  -H "Content-Type: application/json" \
  -b "sb-access-token=<token>" \
  -d '{"collaboratorId":"<uuid>","amount":250,"method":"venmo","paid_at":"2026-07-02T00:00"}' \
  | jq '.success'   # true
```

---

## Milestone 7 — Notifications

### #23 — RSVP confirmation email

**Labels:** `notifications` `rsvp`
**Depends on:** #13

**Files to create:**
- `src/lib/resend.ts` — Resend SDK client
- `src/lib/emails/rsvp-confirmation.ts` — email template (HTML + plain text)

**Dependencies:** `pnpm add resend`
**Env vars:** `RESEND_API_KEY`, `EMAIL_FROM`

**Email:** Subject "You're on the list for [event]!" · Body: name, date/time, venue.

**Update** `src/pages/api/rsvp/[slug].ts` to call Resend fire-and-forget after insert.

**Acceptance criteria:**
- [ ] Email sent after successful RSVP (verify in Resend dashboard logs)
- [ ] Email failure does NOT fail the RSVP (fire-and-forget)
- [ ] Plain text + HTML both included
- [ ] `pnpm build` exits 0

**Verification:**
```bash
pnpm build

# Submit RSVP with a real email — check Resend dashboard for delivery
curl -s -X POST http://localhost:4321/api/rsvp/test-event \
  -H "Content-Type: application/json" \
  -d '{"name":"Verify User","email":"your-real@email.com"}' | jq '.success'   # true
# → check Resend dashboard: https://resend.com/emails
```

---

### #24 — Day-of email reminder

**Labels:** `notifications`
**Depends on:** #23

**Files to create:**
- `src/lib/emails/day-of-reminder.ts` — email template
- `src/pages/api/admin/events/[slug]/reminders/send-email.ts` — `POST`

**Migration needed:** `supabase migration new add_reminder_sent_at` → add `reminder_email_sent_at TIMESTAMPTZ` to events.

**Trigger:** Manual "Send Email Reminder" button on admin event edit page.

**Acceptance criteria:**
- [ ] Sends to all RSVPs for the event
- [ ] Returns count of sent/failed
- [ ] Button disabled after send (`reminder_email_sent_at` set)
- [ ] Second click → "Already sent on [date]" message

**Verification:**
```bash
supabase migration list   # shows new migration applied
pnpm build

curl -s -X POST http://localhost:4321/api/admin/events/test-event/reminders/send-email \
  -b "sb-access-token=<token>" | jq '{sent: .sent, failed: .failed}'
```

---

### #25 — Day-of SMS reminder

**Labels:** `notifications`
**Depends on:** #24

**Files to create:**
- `src/lib/sms.ts` — Twilio SMS wrapper
- `src/pages/api/admin/events/[slug]/reminders/send-sms.ts` — `POST`

**Migration:** add `reminder_sms_sent_at TIMESTAMPTZ` to events (can be in same migration as #24).

**Filter:** only RSVPs where `sms_opt_in = true` AND `phone IS NOT NULL`.

**SMS content:** `"Tonight! [title] @ [venue], [time]. See you there 🖤"`

**Dependencies:** `pnpm add twilio`
**Env vars:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`

**Acceptance criteria:**
- [ ] Only opt-in RSVPs receive SMS
- [ ] `reminder_sms_sent_at` set after send (blocks duplicate sends)
- [ ] Separate button from email reminder

**Verification:**
```bash
pnpm build

# With a test RSVP that has sms_opt_in=true and a real phone number:
curl -s -X POST http://localhost:4321/api/admin/events/test-event/reminders/send-sms \
  -b "sb-access-token=<token>" | jq '{sent: .sent, skipped: .skipped}'
```

---

## Milestone 8 — CI/CD & Tooling

### #26 — Supabase type generation script

**Labels:** `tooling` `database`
**Depends on:** #3

**Updates:**
- `package.json` → add `"db:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/types/database.ts"`
- `package.json` → add `"db:push": "supabase db push"`, `"db:new": "supabase migration new"`
- Regenerate and commit `src/types/database.ts`

**Acceptance criteria:**
- [ ] `pnpm db:types` produces valid TypeScript with no manual edits
- [ ] `pnpm build` passes with generated types
- [ ] `SUPABASE_PROJECT_ID` documented in `.env.example`

**Verification:**
```bash
pnpm db:types
pnpm build   # exits 0
grep "export type Database" src/types/database.ts && echo "PASS"
```

---

### #27 — GitHub Actions CI

**Labels:** `ci` `tooling`
**Depends on:** #1

**File to create:** `.github/workflows/ci.yml`

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
    env:
      PUBLIC_SUPABASE_URL: ${{ secrets.PUBLIC_SUPABASE_URL }}
      PUBLIC_SUPABASE_KEY: ${{ secrets.PUBLIC_SUPABASE_KEY }}
      SUPABASE_SECRET_KEY: placeholder
      COOKIE_SECRET: placeholder-32-char-string-here
      STRIPE_SECRET_KEY: sk_test_placeholder
      PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_test_placeholder
      RESEND_API_KEY: re_placeholder
      EMAIL_FROM: noreply@example.com
      BLOB_READ_WRITE_TOKEN: placeholder
```

**Acceptance criteria:**
- [ ] Workflow runs on push and PR
- [ ] `pnpm build` is the gate — failure blocks merge
- [ ] Completes in < 3 minutes

**Verification:**
```bash
# Push the workflow file and check GitHub Actions tab
git push origin feature/issue-27-ci
# → GitHub Actions tab shows green checkmark
```

---

### #28 — Vercel deploy + setup docs

**Labels:** `ci` `deployment`
**Depends on:** #27

**Files to create:**
- `.env.example` — all env vars with inline comments (update from initial version in #1)
- `docs/SETUP.md` → move content from `PREFLIGHT.md` into a developer-friendly format

**Acceptance criteria:**
- [ ] `.env.example` documents every variable with a one-line comment
- [ ] Vercel deployment succeeds via GitHub integration (preview on PR, production on merge to `main`)
- [ ] Cloudflare DNS config documented: CNAME record, proxy status OFF

**Verification:**
```bash
# After merging to main:
vercel --prod   # or let GitHub integration trigger
curl -s -o /dev/null -w "%{http_code}" https://stop1.party/   # 200
```

---

## Dependency Graph

```
#1 → #2 → #3 → (all feature work)
#1 → #4 → (all UI work)

Admin:      #3+#4 → #5 → #6 → #7 → #8 → #9
Events:     #9 → #10
Collabs:    #9 → #10 → #11
RSVP:       #3+#4 → #12 → #13 → #14
Door:       #13 → #15 → #16 → #17 → #18 → #19
Budget:     #11+#19 → #20 → #21 → #22
Notify:     #13 → #23 → #24 → #25
CI/CD:      #1 → #27 → #28
Tooling:    #3 → #26
```

## Wave Build Order

| Wave | Issues | Gate |
|------|--------|------|
| 1 | #1, #4, #27 | Scaffold + CI running |
| 2 | #2, #3, #26 | DB schema live, types generated |
| 3 | #5, #6, #7, #8 | Admin auth + events CRUD working |
| 4 | #9, #10, #11, #12, #13 | Collaborators + public RSVP page |
| 5 | #14, #15, #16, #17, #23 | RSVP admin + door core + email |
| 6 | #18, #19, #20, #21, #24, #25 | Card payments + budget + notifications |
| 7 | #22, #28 | Payouts + production deploy |
