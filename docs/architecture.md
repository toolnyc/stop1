# Architecture & Conventions

## Project Structure

```
src/
├── components/
│   ├── admin/          # Admin-only UI (EventForm, CollaboratorRow, etc.)
│   ├── door/           # Door app (GuestCard, CashPayment, CardPayment)
│   ├── budget/         # Budget UI (ExpenseForm, PLSummary, RecordPayoutForm)
│   └── public/         # Public pages (EventHero, RsvpForm)
├── layouts/
│   ├── Base.astro      # html/head/body shell, imports global.css
│   └── Admin.astro     # Extends Base, adds admin nav
├── lib/
│   ├── supabase.ts     # Supabase public + admin clients
│   ├── stripe.ts       # Stripe SDK instance
│   ├── resend.ts       # Resend client
│   ├── blob.ts         # Vercel Blob upload helper
│   ├── auth.ts         # bcryptjs PIN hashing, HMAC cookie signing
│   └── utils.ts        # slugify, formatCurrency, formatDate
├── pages/
│   ├── index.astro                         # Redirect to next event or landing
│   ├── events/[slug].astro                 # Public RSVP page
│   ├── door/[slug]/
│   │   ├── index.astro                     # Redirect → /pin or /checkin
│   │   ├── pin.astro                       # PIN entry form
│   │   ├── checkin.astro                   # Name search + mark arrived
│   │   └── summary.astro                   # Live door stats
│   ├── collaborate/[token]/
│   │   ├── index.astro                     # Collaborator landing
│   │   └── expenses.astro                  # Expense entry + list
│   ├── admin/
│   │   ├── login.astro
│   │   ├── index.astro                     # Events list dashboard
│   │   └── events/
│   │       ├── new.astro
│   │       └── [slug]/
│   │           ├── index.astro             # Edit event + sidebar nav
│   │           ├── rsvps.astro
│   │           ├── budget.astro
│   │           └── collaborators.astro
│   └── api/
│       ├── admin/
│       │   ├── login.ts · logout.ts
│       │   └── events/[slug]/
│       │       ├── update.ts · archive.ts
│       │       ├── collaborators/add.ts · remove.ts
│       │       ├── payouts/record.ts
│       │       └── reminders/send-email.ts · send-sms.ts
│       ├── rsvp/[slug].ts
│       ├── door/[slug]/
│       │   ├── auth.ts · search.ts · arrive.ts
│       │   └── payment/cash.ts · create-intent.ts · confirm.ts
│       └── collaborators/
│           ├── validate-token.ts
│           └── expenses/add.ts · delete.ts
├── middleware.ts       # Auth guard (admin, door, collaborator routes)
├── styles/
│   └── global.css      # CSS custom properties, reset, base typography
└── types/
    └── database.ts     # Generated — do not edit manually (pnpm db:types)

supabase/
└── migrations/         # Timestamped SQL files (supabase migration new <name>)
docs/                   # This folder
```

## Astro Patterns

### SSR pages
All pages use `export const prerender = false` (default in SSR mode — no need to set explicitly).
Fetch data in the component frontmatter:

```astro
---
import { supabaseAdmin } from '@/lib/supabase';
const { slug } = Astro.params;
const { data: event } = await supabaseAdmin!.from('events').select('*').eq('slug', slug).single();
if (!event) return Astro.redirect('/404');
---
<html>...</html>
```

### API routes
Every API route exports typed handlers. Return JSON with explicit `Content-Type`:

```typescript
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    // validate → query → respond
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[api/route-name]', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

### Middleware (`src/middleware.ts`)
Guards three route families. Stores resolved identity in `context.locals`:

```typescript
context.locals.user         // Supabase user (admin routes)
context.locals.doorSlug     // event slug (door routes)
context.locals.collaborator // { id, eventId } (collaborate routes)
```

Declare locals shape in `src/env.d.ts`:
```typescript
declare namespace App {
  interface Locals {
    user?: import('@supabase/supabase-js').User;
    doorSlug?: string;
    collaborator?: { id: string; eventId: string };
  }
}
```

### Client-side interactivity
No framework. Use inline `<script>` with native fetch:

```html
<script>
  document.getElementById('rsvp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await fetch('/api/rsvp/my-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(e.target))),
    });
    const data = await res.json();
    // update DOM
  });
</script>
```

## CSS Conventions

Plain CSS custom properties — no Tailwind. All tokens defined in `src/styles/global.css`:

```css
--color-bg: #0a0a0a;          --color-surface: #141414;
--color-surface-raised: #1e1e1e;  --color-border: #2a2a2a;
--color-text: #f0f0f0;        --color-text-muted: #888;
--color-accent: #e8ff00;      --color-success: #22c55e;
--color-error: #ef4444;       --color-warning: #f59e0b;
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
--radius: 6px;  --radius-lg: 12px;
--space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
--space-6: 24px; --space-8: 32px; --space-10: 40px;
```

Mobile breakpoints: `@media (min-width: 640px)` · `@media (min-width: 1024px)`.
Door app and expense entry: tested at 390px (iPhone 14) — must be fully usable one-handed.

## TypeScript Conventions

- Strict mode on. No `any` — use `unknown` or the generated `Database` types.
- Path alias `@/*` → `src/*` (configured in `tsconfig.json`).
- Generated types live in `src/types/database.ts` — regenerate with `pnpm db:types` after any migration, commit the result.
- Interface types for DB rows come from generated types: `Database['public']['Tables']['events']['Row']`.
