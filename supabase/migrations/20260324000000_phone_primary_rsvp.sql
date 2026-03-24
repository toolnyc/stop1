-- Phone-first RSVP: phone required, email optional, unique on (event_id, phone)

-- Backfill NULL phones so NOT NULL constraint can apply
UPDATE rsvps SET phone = 'unknown-' || LEFT(id::text, 8) WHERE phone IS NULL;

-- Flip required/optional
ALTER TABLE rsvps ALTER COLUMN phone SET NOT NULL;
ALTER TABLE rsvps ALTER COLUMN email DROP NOT NULL;

-- Default sms_opt_in to true
ALTER TABLE rsvps ALTER COLUMN sms_opt_in SET DEFAULT true;

-- Swap unique constraint from email to phone
ALTER TABLE rsvps DROP CONSTRAINT rsvps_event_id_email_key;
ALTER TABLE rsvps ADD CONSTRAINT rsvps_event_id_phone_key UNIQUE (event_id, phone);

-- Swap index from email to phone
DROP INDEX idx_rsvps_email;
CREATE INDEX idx_rsvps_phone ON rsvps (phone);
