-- Stop One — initial schema

-- Extensions (must be before tables/indexes that use them)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums
CREATE TYPE event_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE payment_method AS ENUM ('cash', 'card');
CREATE TYPE payout_method AS ENUM ('cash', 'venmo', 'zelle', 'bank_transfer', 'other');

-- Events
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  date timestamptz NOT NULL,
  time_end timestamptz,
  venue_name text,
  venue_address text,
  description text,
  flyer_url text,
  door_price numeric(10,2) NOT NULL DEFAULT 0,
  door_pin text, -- bcrypt hash
  capacity integer,
  status event_status NOT NULL DEFAULT 'draft',
  reminder_email_sent_at timestamptz,
  reminder_sms_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_slug ON events (slug);
CREATE INDEX idx_events_status ON events (status);
CREATE INDEX idx_events_date ON events (date);

-- RSVPs
CREATE TABLE rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  sms_opt_in boolean NOT NULL DEFAULT false,
  arrived_at timestamptz,
  walk_in boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, email)
);

CREATE INDEX idx_rsvps_event_id ON rsvps (event_id);
CREATE INDEX idx_rsvps_email ON rsvps (email);
CREATE INDEX idx_rsvps_name ON rsvps USING gin (name gin_trgm_ops);

-- Door Payments
CREATE TABLE door_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  rsvp_id uuid REFERENCES rsvps(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  method payment_method NOT NULL,
  stripe_payment_intent_id text,
  name text, -- walk-in only
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_door_payments_event_id ON door_payments (event_id);
CREATE INDEX idx_door_payments_rsvp_id ON door_payments (rsvp_id);

-- Collaborators
CREATE TABLE collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  payout_pct numeric(5,2) NOT NULL DEFAULT 0,
  invite_token text UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_collaborators_event_id ON collaborators (event_id);
CREATE INDEX idx_collaborators_invite_token ON collaborators (invite_token);

-- Expenses
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  collaborator_id uuid NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL,
  receipt_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_event_id ON expenses (event_id);
CREATE INDEX idx_expenses_collaborator_id ON expenses (collaborator_id);

-- Payouts
CREATE TABLE payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  collaborator_id uuid NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  method payout_method NOT NULL,
  notes text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payouts_event_id ON payouts (event_id);
CREATE INDEX idx_payouts_collaborator_id ON payouts (collaborator_id);

-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE door_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Events: public can read published events
CREATE POLICY "Public can read published events"
  ON events FOR SELECT
  USING (status = 'published');

-- Events: authenticated admin has full access
CREATE POLICY "Admin full access to events"
  ON events FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RSVPs: public can insert (via service role in practice)
CREATE POLICY "Public can insert rsvps"
  ON rsvps FOR INSERT
  WITH CHECK (true);

-- RSVPs: admin can read all
CREATE POLICY "Admin full access to rsvps"
  ON rsvps FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Door Payments: admin only
CREATE POLICY "Admin full access to door_payments"
  ON door_payments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Collaborators: admin only
CREATE POLICY "Admin full access to collaborators"
  ON collaborators FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Expenses: admin only
CREATE POLICY "Admin full access to expenses"
  ON expenses FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Payouts: admin only
CREATE POLICY "Admin full access to payouts"
  ON payouts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
