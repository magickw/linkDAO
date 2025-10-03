-- Marketplace Listings Schema Migration
-- This migration creates the marketplace_listings table for the marketplace API endpoints

-- Create marketplace_listings table
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_address VARCHAR(42) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(18,8) NOT NULL,
  currency VARCHAR(10) DEFAULT 'ETH',
  images JSON,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint to seller_profiles table
  CONSTRAINT fk_marketplace_listings_seller 
    FOREIGN KEY (seller_address) 
    REFERENCES sellers(wallet_address) 
    ON DELETE CASCADE
);

-- Create indexes for performance on common queries
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller_address ON marketplace_listings(seller_address);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_created_at ON marketplace_listings(created_at);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_price ON marketplace_listings(price);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_is_active ON marketplace_listings(is_active);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_title ON marketplace_listings USING gin(to_tsvector('english', title));

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_active_created ON marketplace_listings(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller_active ON marketplace_listings(seller_address, is_active);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category_active ON marketplace_listings(category, is_active, created_at DESC);