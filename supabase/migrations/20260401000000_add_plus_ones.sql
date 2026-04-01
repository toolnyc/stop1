-- Add plus-one support to RSVPs.
-- plus_one_count: set at RSVP time, 0–3.
-- plus_ones_arrived: incremented at the door as anonymous guests check in.

ALTER TABLE rsvps
  ADD COLUMN plus_one_count   smallint NOT NULL DEFAULT 0
    CONSTRAINT rsvps_plus_one_count_range CHECK (plus_one_count BETWEEN 0 AND 3),
  ADD COLUMN plus_ones_arrived smallint NOT NULL DEFAULT 0
    CONSTRAINT rsvps_plus_ones_arrived_range CHECK (plus_ones_arrived >= 0 AND plus_ones_arrived <= plus_one_count);
