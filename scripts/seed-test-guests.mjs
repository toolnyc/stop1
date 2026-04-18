#!/usr/bin/env node

/**
 * Seed temporary test guests for manual QA.
 *
 * Usage:
 *   node scripts/seed-test-guests.mjs <event-slug>
 *   node scripts/seed-test-guests.mjs <event-slug> --clean   # remove test guests
 *
 * Requires: PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env.local
const envPath = resolve(import.meta.dirname, '..', '.env.local');
const envText = readFileSync(envPath, 'utf-8');
for (const line of envText.split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.+)/);
  if (match) process.env[match[1]] = match[2].trim();
}

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const slug = process.argv[2];
const isClean = process.argv.includes('--clean');

if (!slug) {
  console.error('Usage: node scripts/seed-test-guests.mjs <event-slug> [--clean]');
  process.exit(1);
}

const TEST_EMAIL_DOMAIN = 'test.stop1.local';

const TEST_GUESTS = [
  { name: 'Test User Alice', email: `alice@${TEST_EMAIL_DOMAIN}`, phone: '+10000000001' },
  { name: 'Test User Bob', email: `bob@${TEST_EMAIL_DOMAIN}`, phone: '+10000000002' },
  { name: 'Test User Charlie', email: `charlie@${TEST_EMAIL_DOMAIN}`, phone: null },
  {
    name: 'Test User Dana',
    email: `dana@${TEST_EMAIL_DOMAIN}`,
    phone: '+10000000004',
    plus_one_count: 2,
  },
  { name: 'Test Walkin Eve', email: `eve@${TEST_EMAIL_DOMAIN}`, phone: null, walk_in: true },
];

async function main() {
  // Look up event
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, title, door_price')
    .eq('slug', slug)
    .single();

  if (eventErr || !event) {
    console.error(`Event "${slug}" not found.`);
    process.exit(1);
  }

  console.log(`Event: ${event.title} (${event.id}) — door price: $${event.door_price ?? 0}`);

  if (isClean) {
    const { count, error } = await supabase
      .from('rsvps')
      .delete()
      .eq('event_id', event.id)
      .ilike('email', `%@${TEST_EMAIL_DOMAIN}`);

    if (error) {
      console.error('Delete failed:', error.message);
      process.exit(1);
    }
    console.log(`Removed test guests (matched ${count ?? 'all'} rows).`);
    return;
  }

  // Upsert test guests
  const rows = TEST_GUESTS.map((g) => ({
    event_id: event.id,
    name: g.name,
    email: g.email,
    phone: g.phone,
    sms_opt_in: false,
    walk_in: g.walk_in ?? false,
    arrived_at: null,
    plus_one_count: g.plus_one_count ?? 0,
    plus_ones_arrived: 0,
  }));

  const { data, error } = await supabase
    .from('rsvps')
    .upsert(rows, { onConflict: 'event_id,email' })
    .select('id, name, email');

  if (error) {
    console.error('Upsert failed:', error.message);
    process.exit(1);
  }

  console.log(`\nSeeded ${data.length} test guests:\n`);
  for (const r of data) {
    console.log(`  ${r.name} — ${r.email} (${r.id})`);
  }

  console.log(`\nTest checklist:`);
  console.log(`  1. Open homepage → tap "I'm here"`);
  console.log(`  2. Search "Test" → all 5 guests should appear`);
  console.log(`  3. Search "Ali" → Alice should match`);
  console.log(`  4. Search "Da Us" → Dana should match (fuzzy multi-token)`);
  console.log(`  5. Tap Alice → free event: instant check-in / paid: payment step`);
  console.log(`  6. Verify confirmed page shows name, status, time`);
  console.log(`  7. Search "Alice" again → should NOT appear (already arrived)`);
  console.log(`  8. Tap Dana (has +2 guests) → party check-in flow`);
  console.log(`\nCleanup: node scripts/seed-test-guests.mjs ${slug} --clean`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
