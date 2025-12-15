-- Migration: Add rating columns to products/listings tables to cache calculated review averages

-- Add to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Add to listings table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Add to marketplace_listings table
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Add product_id to marketplace_reviews if not exists (to link reviews to products)
ALTER TABLE marketplace_reviews ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE marketplace_reviews ADD COLUMN IF NOT EXISTS listing_id UUID;
