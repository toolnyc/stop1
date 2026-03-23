# Auth, Payment & Integration Patterns

## Admin Auth (Supabase)

Login flow (`POST /api/admin/login`):
```typescript
const { data, error } = await supabaseAdmin!.auth.signInWithPassword({ email, password });
if (error) return 401;
cookies.set('sb-access-token', data.session.access_token, {
  path: '/', httpOnly: true, secure: import.meta.env.PROD,
  sameSite: 'lax', maxAge: 60 * 60 * 24,
});
cookies.set('sb-refresh-token', data.session.refresh_token, {
  path: '/', httpOnly: true, secure: import.meta.env.PROD,
  sameSite: 'lax', maxAge: 60 * 60 * 24 * 7,
});
return redirect('/admin');
```

Logout (`POST /api/admin/logout`):
```typescript
await supabaseAdmin!.auth.signOut();
cookies.delete('sb-access-token', { path: '/' });
cookies.delete('sb-refresh-token', { path: '/' });
return redirect('/admin/login');
```

## Door PIN Auth

PIN stored as bcrypt hash in `events.door_pin`. Use `bcryptjs` (pure JS, works on Vercel).

```typescript
import bcrypt from 'bcryptjs';

// On event create/update
const hash = await bcrypt.hash(pin, 10);

// On door auth (POST /api/door/[slug]/auth)
const valid = await bcrypt.compare(inputPin, event.door_pin);
if (!valid) return 401;

// Set door session cookie
import { createHmac } from 'node:crypto';
const sig = createHmac('sha256', import.meta.env.COOKIE_SECRET)
  .update(slug)
  .digest('hex');
cookies.set(`door_session_${slug}`, sig, {
  path: `/door/${slug}`,
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: 'strict',
  maxAge: 60 * 60 * 12,  // 12 hours
});
```

Middleware verification for door routes:
```typescript
const sig = cookies.get(`door_session_${slug}`)?.value;
const expected = createHmac('sha256', COOKIE_SECRET).update(slug).digest('hex');
if (sig !== expected) return redirect(`/door/${slug}/pin`);
```

## Collaborator Token Auth

Collaborators access `/collaborate/[token]/*` via invite link. On first visit, validate token
and set a session cookie.

```typescript
// POST or GET /api/collaborators/validate-token
const { data: collab } = await supabaseAdmin!
  .from('collaborators')
  .select('id, event_id, name')
  .eq('invite_token', token)
  .single();
if (!collab) return 404;

// Mark accepted if first visit
if (!collab.accepted_at) {
  await supabaseAdmin!.from('collaborators')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', collab.id);
}

// Set session cookie
const payload = Buffer.from(JSON.stringify({ id: collab.id, eventId: collab.event_id }))
  .toString('base64');
const sig = createHmac('sha256', COOKIE_SECRET).update(payload).digest('hex');
cookies.set('collab_session', `${payload}.${sig}`, {
  path: '/collaborate',
  httpOnly: true, secure: import.meta.env.PROD,
  sameSite: 'strict', maxAge: 60 * 60 * 24 * 7,
});
```

Middleware reads `collab_session`, verifies HMAC, parses `{ id, eventId }` → `context.locals.collaborator`.

## Stripe — Door Payments

```typescript
// src/lib/stripe.ts
import Stripe from 'stripe';
export const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);
```

**Flow:**
1. `POST /api/door/[slug]/payment/create-intent` — creates PaymentIntent
2. Client mounts Stripe Payment Elements with `clientSecret`
3. On `payment.succeeded` confirmation in browser, `POST /api/door/[slug]/payment/confirm`

```typescript
// create-intent.ts
const intent = await stripe.paymentIntents.create({
  amount: Math.round(event.door_price * 100),  // cents
  currency: 'usd',
  automatic_payment_methods: { enabled: true },
  metadata: { event_id: event.id, slug: event.slug },
});
return { clientSecret: intent.client_secret };
```

```typescript
// confirm.ts — called after Stripe confirms payment client-side
const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
if (intent.status !== 'succeeded') return 400;

await supabaseAdmin!.from('door_payments').insert({
  event_id, rsvp_id: rsvpId ?? null, amount: event.door_price,
  method: 'card', stripe_payment_intent_id: paymentIntentId,
  name: walkInName ?? null,
});
// Also mark arrived if rsvp_id provided
if (rsvpId) {
  await supabaseAdmin!.from('rsvps')
    .update({ arrived_at: new Date().toISOString() })
    .eq('id', rsvpId);
}
```

**Mobile note:** Apple Pay / Google Pay (tap-to-pay) requires HTTPS. Dev server shows card fields only.
Test tap-to-pay on a Vercel preview deployment.

## Resend — Email

```typescript
// src/lib/resend.ts
import { Resend } from 'resend';
export const resend = new Resend(import.meta.env.RESEND_API_KEY);
```

**Rule:** Email failures must never fail the primary action. Always fire-and-forget:

```typescript
// Fire-and-forget pattern
resend.emails.send({ ... }).catch(err => console.error('[resend]', err));
// return your primary response immediately
```

RSVP confirmation template (`src/lib/emails/rsvp-confirmation.ts`):
```typescript
export function rsvpConfirmationEmail(name: string, event: Event) {
  return {
    from: import.meta.env.EMAIL_FROM,
    to: email,
    subject: `You're on the list for ${event.title}!`,
    text: `Hi ${name}, you're confirmed for ${event.title} on ${formatDate(event.date)} at ${event.venue_name}.`,
    html: `<p>Hi <strong>${name}</strong>, ...</p>`,
  };
}
```

## Vercel Blob — Expense Receipts

```typescript
// src/lib/blob.ts
import { put } from '@vercel/blob';

export async function uploadReceipt(file: File, collaboratorId: string): Promise<string> {
  const filename = `receipts/${collaboratorId}/${Date.now()}-${file.name}`;
  const { url } = await put(filename, file, { access: 'public' });
  return url;
}
```

API route handling multipart upload:
```typescript
// In /api/collaborators/expenses/add.ts
const formData = await request.formData();
const receipt = formData.get('receipt') as File | null;
let receiptUrl: string | null = null;
if (receipt && receipt.size > 0) {
  receiptUrl = await uploadReceipt(receipt, collaborator.id);
}
```

Max file size: 10MB. Accept: `image/*,application/pdf`.

## Utility Functions (`src/lib/utils.ts`)

```typescript
export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}
```
