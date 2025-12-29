-- Marketplace Enhancements Schema Migration
-- Adds ENS support, image storage infrastructure, and enhanced listing/order management
-- Safe to run multiple times (uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS)

-- 1. Add ENS support columns to sellers table (nullable - ENS is optional)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sellers' AND column_name = 'ens_handle') THEN
        ALTER TABLE sellers ADD COLUMN ens_handle VARCHAR(255) NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sellers' AND column_name = 'ens_verified') THEN
        ALTER TABLE sellers ADD COLUMN ens_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sellers' AND column_name = 'ens_last_verified') THEN
        ALTER TABLE sellers ADD COLUMN ens_last_verified TIMESTAMP NULL;
    END IF;
END $$;

-- 2. Add image storage fields for IPFS hashes and CDN URLs to sellers table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sellers' AND column_name = 'profile_image_ipfs') THEN
        ALTER TABLE sellers ADD COLUMN profile_image_ipfs VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sellers' AND column_name = 'profile_image_cdn') THEN
        ALTER TABLE sellers ADD COLUMN profile_image_cdn VARCHAR(500);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sellers' AND column_name = 'cover_image_ipfs') THEN
        ALTER TABLE sellers ADD COLUMN cover_image_ipfs VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sellers' AND column_name = 'cover_image_cdn') THEN
        ALTER TABLE sellers ADD COLUMN cover_image_cdn VARCHAR(500);
    END IF;
END $$;

-- Add enhanced profile fields to sellers table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sellers' AND column_name = 'website_url') THEN
        ALTER TABLE sellers ADD COLUMN website_url VARCHAR(500);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sellers' AND column_name = 'twitter_handle') THEN
        ALTER TABLE sellers ADD COLUMN twitter_handle VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sellers' AND column_name = 'discord_handle') THEN
        ALTER TABLE sellers ADD COLUMN discord_handle VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sellers' AND column_name = 'telegram_handle') THEN
        ALTER TABLE sellers ADD COLUMN telegram_handle VARCHAR(100);
    END IF;
END $$;

-- 3. Create image_storage tracking table for comprehensive image management
CREATE TABLE IF NOT EXISTS image_storage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipfs_hash VARCHAR(255) NOT NULL UNIQUE,
  cdn_url VARCHAR(500),
  original_filename VARCHAR(255),
  content_type VARCHAR(100),
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  thumbnails TEXT, -- JSON object with thumbnail URLs
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  usage_type VARCHAR(50), -- 'profile', 'cover', 'listing', 'product'
  usage_reference_id VARCHAR(255), -- ID of the object using this image
  backup_urls TEXT, -- JSON array of backup/mirror URLs
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create ens_verifications table for ENS ownership tracking
CREATE TABLE IF NOT EXISTS ens_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(66) NOT NULL,
  ens_handle VARCHAR(255) NOT NULL,
  verification_method VARCHAR(50) NOT NULL, -- 'signature', 'transaction', 'reverse_resolution'
  verification_data TEXT, -- JSON object with verification details
  verified_at TIMESTAMP DEFAULT NOW(),
  verification_tx_hash VARCHAR(66),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Add enhanced fields to products table for better listing management
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'listing_status') THEN
        ALTER TABLE products ADD COLUMN listing_status VARCHAR(20) DEFAULT 'draft';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'published_at') THEN
        ALTER TABLE products ADD COLUMN published_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'search_vector') THEN
        ALTER TABLE products ADD COLUMN search_vector TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_ipfs_hashes') THEN
        ALTER TABLE products ADD COLUMN image_ipfs_hashes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_cdn_urls') THEN
        ALTER TABLE products ADD COLUMN image_cdn_urls TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'primary_image_index') THEN
        ALTER TABLE products ADD COLUMN primary_image_index INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seo_title') THEN
        ALTER TABLE products ADD COLUMN seo_title VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seo_description') THEN
        ALTER TABLE products ADD COLUMN seo_description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seo_keywords') THEN
        ALTER TABLE products ADD COLUMN seo_keywords TEXT;
    END IF;
END $$;

-- 6. Add enhanced fields to orders table for improved order tracking
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'checkout_session_id') THEN
        ALTER TABLE orders ADD COLUMN checkout_session_id VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
        ALTER TABLE orders ADD COLUMN payment_method VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_details') THEN
        ALTER TABLE orders ADD COLUMN payment_details TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shipping_address') THEN
        ALTER TABLE orders ADD COLUMN shipping_address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'billing_address') THEN
        ALTER TABLE orders ADD COLUMN billing_address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_notes') THEN
        ALTER TABLE orders ADD COLUMN order_notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'tracking_number') THEN
        ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'tracking_carrier') THEN
        ALTER TABLE orders ADD COLUMN tracking_carrier VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'estimated_delivery') THEN
        ALTER TABLE orders ADD COLUMN estimated_delivery DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'actual_delivery') THEN
        ALTER TABLE orders ADD COLUMN actual_delivery DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_confirmation') THEN
        ALTER TABLE orders ADD COLUMN delivery_confirmation TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_confirmation_hash') THEN
        ALTER TABLE orders ADD COLUMN payment_confirmation_hash VARCHAR(66);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'escrow_contract_address') THEN
        ALTER TABLE orders ADD COLUMN escrow_contract_address VARCHAR(66);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'total_amount') THEN
        ALTER TABLE orders ADD COLUMN total_amount NUMERIC(20, 8);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'currency') THEN
        ALTER TABLE orders ADD COLUMN currency VARCHAR(10) DEFAULT 'USD';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_metadata') THEN
        ALTER TABLE orders ADD COLUMN order_metadata TEXT;
    END IF;
END $$;

-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_sellers_ens_handle ON sellers(ens_handle) WHERE ens_handle IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sellers_ens_verified ON sellers(ens_verified) WHERE ens_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_sellers_profile_image_ipfs ON sellers(profile_image_ipfs) WHERE profile_image_ipfs IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sellers_cover_image_ipfs ON sellers(cover_image_ipfs) WHERE cover_image_ipfs IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_image_storage_ipfs_hash ON image_storage(ipfs_hash);
CREATE INDEX IF NOT EXISTS idx_image_storage_owner_id ON image_storage(owner_id);
CREATE INDEX IF NOT EXISTS idx_image_storage_usage_type ON image_storage(usage_type);
CREATE INDEX IF NOT EXISTS idx_image_storage_usage_reference ON image_storage(usage_reference_id);
CREATE INDEX IF NOT EXISTS idx_image_storage_created_at ON image_storage(created_at);

CREATE INDEX IF NOT EXISTS idx_ens_verifications_wallet_address ON ens_verifications(wallet_address);
CREATE INDEX IF NOT EXISTS idx_ens_verifications_ens_handle ON ens_verifications(ens_handle);
CREATE INDEX IF NOT EXISTS idx_ens_verifications_is_active ON ens_verifications(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ens_verifications_expires_at ON ens_verifications(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_listing_status ON products(listing_status);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'published_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_products_published_at ON products(published_at) WHERE published_at IS NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_search_optimization ON products(title, description) WHERE listing_status = 'published';

CREATE INDEX IF NOT EXISTS idx_orders_checkout_session_id ON orders(checkout_session_id) WHERE checkout_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number) WHERE tracking_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_estimated_delivery ON orders(estimated_delivery) WHERE estimated_delivery IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_payment_confirmation_hash ON orders(payment_confirmation_hash) WHERE payment_confirmation_hash IS NOT NULL;

-- Add unique constraints where appropriate
CREATE UNIQUE INDEX IF NOT EXISTS idx_ens_verifications_unique_active 
  ON ens_verifications(wallet_address, ens_handle) 
  WHERE is_active = TRUE;

-- Add foreign key constraints for new tables
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_image_storage_owner_id'
    ) THEN
        ALTER TABLE image_storage ADD CONSTRAINT fk_image_storage_owner_id 
          FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to tables with updated_at columns
DROP TRIGGER IF EXISTS update_image_storage_updated_at ON image_storage;
CREATE TRIGGER update_image_storage_updated_at 
  BEFORE UPDATE ON image_storage 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ens_verifications_updated_at ON ens_verifications;
CREATE TRIGGER update_ens_verifications_updated_at 
  BEFORE UPDATE ON ens_verifications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration completion notice
DO $$ 
BEGIN
    RAISE NOTICE 'Marketplace Enhancements Schema Migration Completed Successfully';
    RAISE NOTICE 'Enhanced Features Added:';
    RAISE NOTICE '  ✓ ENS support columns added to sellers table (nullable)';
    RAISE NOTICE '  ✓ Image storage fields added for IPFS hashes and CDN URLs';
    RAISE NOTICE '  ✓ Comprehensive image_storage tracking table created';
    RAISE NOTICE '  ✓ ENS verifications table created for ownership tracking';
    RAISE NOTICE '  ✓ Enhanced fields added to products table for better listing management';
    RAISE NOTICE '  ✓ Enhanced fields added to orders table for improved order tracking';
    RAISE NOTICE '  ✓ Performance indexes and constraints added';
    RAISE NOTICE '  ✓ Automatic timestamp update triggers configured';
    RAISE NOTICE '';
    RAISE NOTICE 'Key Features:';
    RAISE NOTICE '  - Optional ENS handle support with verification tracking';
    RAISE NOTICE '  - Comprehensive image storage with IPFS and CDN integration';
    RAISE NOTICE '  - Enhanced listing visibility and database integration';
    RAISE NOTICE '  - Improved order tracking with multiple payment methods';
    RAISE NOTICE '  - SEO optimization fields for better discoverability';
    RAISE NOTICE '  - Delivery tracking and confirmation system';
END $$;