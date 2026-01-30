-- Migration: Add stripeCustomerId to sellers table
-- This migration adds the stripeCustomerId field to track Stripe customer IDs for sellers

-- Add stripeCustomerId column to sellers table
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sellers_stripe_customer_id ON sellers(stripe_customer_id);

-- Add comment for documentation
COMMENT ON COLUMN sellers.stripe_customer_id IS 'Stripe Customer ID for fee charging and payout processing';