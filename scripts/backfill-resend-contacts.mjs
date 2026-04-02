#!/usr/bin/env node
/* global console, process, setTimeout */

/**
 * Backfill Resend contacts from RSVP data in Supabase.
 *
 * Reads all RSVPs that have an email, fetches existing Resend contacts,
 * and creates contacts for any emails not already in Resend.
 *
 * Usage:
 *   node scripts/backfill-resend-contacts.mjs            # dry-run (default)
 *   node scripts/backfill-resend-contacts.mjs --apply     # actually create contacts
 *
 * Requires .env.local with RESEND_API_KEY, PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// ---------------------------------------------------------------------------
// Load env from .env.local
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = resolve(import.meta.dirname, '..', '.env.local');
  let raw;
  try {
    raw = readFileSync(envPath, 'utf-8');
  } catch {
    console.error('❌  Could not read .env.local — copy .env.example and fill in values.');
    process.exit(1);
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val) process.env[key] = val;
  }
}

loadEnv();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    '❌  Missing required env vars: RESEND_API_KEY, PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY',
  );
  process.exit(1);
}

const dryRun = !process.argv.includes('--apply');

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const resend = new Resend(RESEND_API_KEY);
const RESEND_AUDIENCE_ID = '884b793e-8031-49b0-92c2-01a21732841a';

// ---------------------------------------------------------------------------
// Fetch all existing Resend contacts (paginated)
// ---------------------------------------------------------------------------
async function fetchAllResendContacts() {
  /** @type {Set<string>} */
  const emails = new Set();
  let cursor;
  let page = 0;

  while (true) {
    page++;
    /** @type {import('resend').ListContactsOptions} */
    const opts = { audienceId: RESEND_AUDIENCE_ID, limit: 100 };
    if (cursor) opts.after = cursor;

    const { data, error } = await resend.contacts.list(opts);
    if (error) {
      console.error('❌  Failed to list Resend contacts:', error);
      process.exit(1);
    }
    if (!data) break;

    for (const contact of data.data) {
      emails.add(contact.email.toLowerCase());
    }

    console.log(`  Resend page ${page}: ${data.data.length} contacts (${emails.size} total)`);

    if (!data.has_more || data.data.length === 0) break;
    cursor = data.data[data.data.length - 1].id;
  }

  return emails;
}

// ---------------------------------------------------------------------------
// Fetch all RSVPs with emails from Supabase
// ---------------------------------------------------------------------------
async function fetchRsvpsWithEmail() {
  /** @type {Map<string, { name: string, email: string }>} */
  const byEmail = new Map();

  // Supabase returns max 1000 rows per query — paginate
  const PAGE_SIZE = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('rsvps')
      .select('name, email')
      .not('email', 'is', null)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('❌  Failed to query RSVPs:', error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      const email = row.email.toLowerCase();
      // Keep the first RSVP name per email (earliest)
      if (!byEmail.has(email)) {
        byEmail.set(email, { name: row.name, email });
      }
    }

    console.log(`  Supabase page: ${data.length} rows (${byEmail.size} unique emails so far)`);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return byEmail;
}

// ---------------------------------------------------------------------------
// Split a name into first/last for Resend
// ---------------------------------------------------------------------------
function splitName(name) {
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  return { firstName, lastName };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n🔄  Backfill Resend contacts from RSVPs${dryRun ? ' (DRY RUN)' : ''}\n`);

  console.log('Fetching existing Resend contacts...');
  const existingEmails = await fetchAllResendContacts();
  console.log(`  → ${existingEmails.size} existing contacts\n`);

  console.log('Fetching RSVPs with emails from Supabase...');
  const rsvpsByEmail = await fetchRsvpsWithEmail();
  console.log(`  → ${rsvpsByEmail.size} unique RSVP emails\n`);

  // Determine which emails need to be added
  const toCreate = [];
  for (const [email, rsvp] of rsvpsByEmail) {
    if (!existingEmails.has(email)) {
      toCreate.push(rsvp);
    }
  }

  const alreadyExists = rsvpsByEmail.size - toCreate.length;
  console.log(`  ${alreadyExists} already in Resend (skipped)`);
  console.log(`  ${toCreate.length} new contacts to create\n`);

  if (toCreate.length === 0) {
    console.log('✅  Nothing to do — all RSVP emails are already in Resend.\n');
    return;
  }

  if (dryRun) {
    console.log('Contacts that would be created:');
    for (const rsvp of toCreate) {
      const { firstName, lastName } = splitName(rsvp.name);
      console.log(`  ${rsvp.email} — ${firstName} ${lastName}`);
    }
    console.log(`\nRun with --apply to create these contacts.\n`);
    return;
  }

  // Create contacts one at a time (Resend rate limit: 5 req/sec)
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  let created = 0;
  let failed = 0;

  for (const rsvp of toCreate) {
    const { firstName, lastName } = splitName(rsvp.name);
    const { error } = await resend.contacts.create({
      audienceId: RESEND_AUDIENCE_ID,
      email: rsvp.email,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
    });

    if (error) {
      console.error(`  ✗ ${rsvp.email}: ${error.message}`);
      failed++;
    } else {
      console.log(`  ✓ ${rsvp.email}`);
      created++;
    }

    // Respect Resend rate limit (5 req/sec)
    await delay(250);
  }

  console.log(
    `\n✅  Done: ${created} created, ${failed} failed, ${alreadyExists} already existed.\n`,
  );
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
