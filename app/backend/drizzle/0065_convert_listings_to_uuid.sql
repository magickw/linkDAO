-- Convert listings table to use UUID primary keys
-- This migration updates the listings table to use UUIDs instead of serial integers

-- First, create a new UUID column
ALTER TABLE listings ADD COLUMN uuid_id UUID DEFAULT gen_random_uuid() NOT NULL;

-- Update all references to use the new UUID column
-- Update orders table
ALTER TABLE orders ADD COLUMN listing_uuid UUID REFERENCES listings(uuid_id);
UPDATE orders SET listing_uuid = (SELECT uuid_id FROM listings WHERE listings.id = orders.listingId);
ALTER TABLE orders DROP COLUMN listingId;
ALTER TABLE orders RENAME COLUMN listing_uuid TO listingId;

-- Update bids table
ALTER TABLE bids ADD COLUMN listing_uuid UUID REFERENCES listings(uuid_id);
UPDATE bids SET listing_uuid = (SELECT uuid_id FROM listings WHERE listings.id = bids.listingId);
ALTER TABLE bids DROP COLUMN listingId;
ALTER TABLE bids RENAME COLUMN listing_uuid TO listingId;

-- Update offers table
ALTER TABLE offers ADD COLUMN listing_uuid UUID REFERENCES listings(uuid_id);
UPDATE offers SET listing_uuid = (SELECT uuid_id FROM listings WHERE listings.id = offers.listingId);
ALTER TABLE offers DROP COLUMN listingId;
ALTER TABLE bids RENAME COLUMN listing_uuid TO listingId;

-- Update escrows table
ALTER TABLE escrows ADD COLUMN listing_uuid UUID REFERENCES listings(uuid_id);
UPDATE escrows SET listing_uuid = (SELECT uuid_id FROM listings WHERE listings.id = escrows.listingId);
ALTER TABLE escrows DROP COLUMN listingId;
ALTER TABLE escrows RENAME COLUMN listing_uuid TO listingId;

-- Update ai_moderation table for marketplace listings
ALTER TABLE ai_moderation ADD COLUMN object_uuid UUID;
UPDATE ai_moderation SET object_uuid = (SELECT uuid_id FROM listings WHERE listings.id = ai_moderation.objectId) 
WHERE objectType = 'listing';
ALTER TABLE ai_moderation DROP COLUMN objectId;
ALTER TABLE ai_moderation RENAME COLUMN object_uuid TO objectId;

-- Drop the old primary key and set the new one
ALTER TABLE listings DROP CONSTRAINT listings_pkey;
ALTER TABLE listings DROP COLUMN id;
ALTER TABLE listings RENAME COLUMN uuid_id TO id;
ALTER TABLE listings ADD PRIMARY KEY (id);

-- Recreate indexes that were on the old id column
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON listings(sellerId);
CREATE INDEX IF NOT EXISTS idx_listings_product_id ON listings(productId);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_listing_type ON listings(listingType);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(createdAt);