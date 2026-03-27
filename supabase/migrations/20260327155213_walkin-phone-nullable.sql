-- Allow NULL phone for walk-in guests who skip providing a number.
-- PostgreSQL treats NULLs as distinct in UNIQUE, so multiple (event_id, NULL) rows are fine.

ALTER TABLE rsvps ALTER COLUMN phone DROP NOT NULL;
