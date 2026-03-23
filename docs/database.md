# Database & Supabase Patterns

## Schema Overview

```
events          slug (unique), title, date, venue_name, venue_address,
                door_price, door_pin (bcrypt hash), capacity, status,
                reminder_email_sent_at, reminder_sms_sent_at

rsvps           event_id → events, name, email, phone,
                sms_opt_in, arrived_at (nullable), walk_in (bool)

door_payments   event_id → events, rsvp_id → rsvps (nullable),
                amount, method (cash|card), stripe_payment_intent_id,
                name (walk-in only)

collaborators   event_id → events, name, email, payout_pct,
                invite_token (unique), accepted_at

expenses        event_id → events, collaborator_id → collaborators,
                description, amount, receipt_url (Blob URL)

payouts         event_id → events, collaborator_id → collaborators,
                amount, method (cash|venmo|zelle|bank_transfer|other),
                notes, paid_at
```

**Budget formula:**
```
door_revenue = SUM(door_payments.amount)
total_expenses = SUM(expenses.amount)
profit = door_revenue - total_expenses
collab_payout = profit × (collaborator.payout_pct / 100)
```

## Supabase Clients

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = import.meta.env.SUPABASE_SERVICE_KEY;

// Public client — anon key, respects RLS. Use for public reads.
export const supabase = createClient<Database>(url, anonKey);

// Admin client — service role, bypasses RLS. SERVER-SIDE ONLY.
export const supabaseAdmin = serviceKey
  ? createClient<Database>(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;
```

**Rule:** Use `supabaseAdmin` for all writes from API routes. Never import `supabaseAdmin` in
any file that could be bundled for the browser (client `<script>` blocks or browser-only components).

## RLS Policies Summary

| Table | Public read | Public write | Admin | Service role |
|-------|-------------|--------------|-------|--------------|
| events | published only | ✗ | full | full |
| rsvps | ✗ | INSERT only | full | full |
| door_payments | ✗ | ✗ | full | full |
| collaborators | ✗ | ✗ | full | full |
| expenses | ✗ | ✗ | full | full |
| payouts | ✗ | ✗ | full | full |

All writes from API routes use `supabaseAdmin` (service role bypass).
Public RSVP submissions use the service role key via `supabaseAdmin` to bypass RLS.

## Migrations

```bash
supabase migration new <descriptive-name>   # creates supabase/migrations/<timestamp>_<name>.sql
supabase db push                            # applies pending migrations to remote
supabase migration list                     # shows applied / pending
```

Always run `pnpm db:types` after applying a migration and commit the updated `src/types/database.ts`.

**Naming convention:** `YYYYMMDDHHMMSS_<verb>_<noun>.sql`
- `20260001000000_init.sql`
- `20260002000000_add_reminder_sent_at.sql`

## Query Patterns

### Fetch single event by slug (with null check)
```typescript
const { data: event, error } = await supabaseAdmin!
  .from('events')
  .select('*')
  .eq('slug', slug)
  .eq('status', 'published')   // omit for admin queries
  .single();

if (error || !event) return Astro.redirect('/404');
```

### Insert with error handling
```typescript
const { data, error } = await supabaseAdmin!
  .from('rsvps')
  .insert({ event_id, name, email, phone, sms_opt_in })
  .select()
  .single();

if (error?.code === '23505') {
  // unique constraint violation — duplicate RSVP
  return new Response(JSON.stringify({ error: 'Already registered' }), { status: 409, ... });
}
```

### Multiple FK ambiguity (PGRST201)
When two tables share more than one FK, PostgREST throws `PGRST201`. Use explicit FK names:

```typescript
// BAD — ambiguous when events has both ticket_tiers.event_id and events.door_tier_id
.select('*, ticket_tiers(*)')

// GOOD — explicit FK constraint name
.select('*, ticket_tiers!ticket_tiers_event_id_fkey(*)')
```

Check FK constraint names in `supabase/migrations/` or the Supabase dashboard → Table Editor → Foreign Keys.

### Fuzzy name search (door check-in)
```typescript
.from('rsvps')
.select('*')
.eq('event_id', eventId)
.ilike('name', `%${query}%`)
.order('name')
.limit(20)
```

## Supabase Auth (admin only)

Admin sessions use Supabase email/password auth with cookie-based tokens.
Cookie names: `sb-access-token`, `sb-refresh-token` (httpOnly, SameSite=lax).

The middleware (`src/middleware.ts`) validates the access token on every `/admin/*` request,
attempts a refresh if expired, and clears cookies + redirects to `/admin/login` on failure.
Store the resolved user in `context.locals.user`.

## Type Generation

```bash
pnpm db:types
# Runs: supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/types/database.ts
```

Commit the generated file. It should never be edited manually.
The `Database` type powers the typed Supabase clients and gives full autocomplete on `.from('table')`.
