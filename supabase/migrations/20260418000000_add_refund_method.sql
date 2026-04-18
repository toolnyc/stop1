-- Add 'refund' to payment_method enum for negative-amount adjustment rows
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'refund';
