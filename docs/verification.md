# Verification Guide

How to verify that an issue is correctly implemented before merging.

## The Verification Gate

Every PR must pass all four checks:

| Check | Command / Method | Must pass |
|-------|-----------------|-----------|
| TypeScript build | `pnpm build` exits 0 | Zero errors |
| Browser smoke | Dev server + curl checks (see below) | All pass |
| Console errors | Browser devtools on each new page | None |
| Mobile layout | Resize to 390px or use devtools device mode | No overflow, usable |

## Running Browser Checks

Start the dev server, then run the checks for the specific issue being verified:

```bash
pnpm dev &   # starts on http://localhost:4321
sleep 3      # wait for server
```

### Check: page returns expected status

```bash
# 200 — page renders
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/events/test-event

# 302 — redirect (e.g. unauthenticated admin)
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/admin

# 404 — not found
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/events/nonexistent-slug
```

### Check: page contains expected content

```bash
curl -s http://localhost:4321/events/test-event | grep -q "RSVP" && echo "PASS" || echo "FAIL"
```

### Check: API endpoint returns correct JSON

```bash
# RSVP submission
curl -s -X POST http://localhost:4321/api/rsvp/test-event \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}' \
  | jq '.success'

# Should return: true
```

### Check: auth redirect works

```bash
# Admin route without cookie → expect 302 to /admin/login
curl -s -o /dev/null -w "%{http_code}" -L http://localhost:4321/admin/events
# Should return: 200 (followed redirect to login page)

curl -s http://localhost:4321/admin/events | grep -q "login" && echo "PASS" || echo "FAIL"
```

## Issue-Specific Checks

Each issue in `ISSUES.md` has a **Verification** section with specific curl/browser checks.
These are the minimum set — run them all before marking an issue done.

## Seed Data for Verification

To run browser checks, you need a published test event in the database.
Insert this via the Supabase dashboard SQL editor or use `pnpm db:seed` (if defined):

```sql
INSERT INTO events (title, slug, date, venue_name, door_price, door_pin, status)
VALUES (
  'Test Event',
  'test-event',
  NOW() + INTERVAL '7 days',
  'Test Venue',
  20.00,
  '$2b$10$examplehashhere',   -- bcrypt hash of "1234"
  'published'
);
```

For door PIN verification, the PIN `1234` bcrypt hash can be generated with:
```bash
node -e "const b = require('bcryptjs'); b.hash('1234', 10).then(console.log)"
```

## Stripe Verification

Card payment tests use Stripe test mode. Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

Apple Pay / Google Pay (tap-to-pay): only visible on HTTPS. Use a Vercel preview deployment to test:
```bash
vercel deploy --prebuilt   # after pnpm build
```

## Mobile Verification

Use browser devtools device emulation (Chrome DevTools → Toggle device toolbar → iPhone 14 = 390×844).

Key things to check on mobile:
- [ ] No horizontal scrollbar
- [ ] All form inputs are full-width and tap-friendly (min 44px height)
- [ ] Door check-in name search input is autofocused and large
- [ ] Buttons are at least 44×44px
- [ ] Text is readable without zooming (min 16px for inputs to prevent iOS zoom)
