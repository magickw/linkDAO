-- Migration: Add sales_count column to listings table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0;

-- Also add to marketplace_listings if it exists
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0;
