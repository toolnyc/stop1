-- Prevent duplicate Stripe payment recording (TOCTOU race on checkout return).
-- Partial unique index: only non-null values are constrained (cash payments have NULL).
CREATE UNIQUE INDEX idx_door_payments_stripe_pi
  ON door_payments (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
