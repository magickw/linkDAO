-- Marketplace Enhancements Database Migration Script
-- Version: 1.0.0
-- Description: Complete database schema changes for marketplace enhancements
-- 
-- This script includes all database changes needed for:
-- 1. Enhanced seller profile management with ENS support
-- 2. Comprehensive image storage infrastructure
-- 3. Listing visibility and database integration
-- 4. Functional checkout process and order management

-- =============================================================================
-- BACKUP REMINDER
-- =============================================================================
-- IMPORTANT: Create a full database backup before running this migration!
-- 
-- pg_dump -h localhost -U username -d database_name > backup_$(date +%Y%m%d_%H%M%S).sql
-- 
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. ENHANCED SELLER PROFILE MANAGEMENT
-- =============================================================================

-- Add optional ENS support to sellers table
DO $$ 
BEGIN
    -- Add ENS handle column (nullable - ENS is optional)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sellers' AND column_name = 'ens_handle') THEN
        ALTER TABLE sellers ADD COLUMN ens_handle VARCHAR(255) NULL;
    END IF;
    
    -- Add ENS verification status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sellers' AND column_name = 'ens_verified') THEN
        ALTER TABLE sellers ADD COLUMN ens_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add ENS last verification timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sellers' AND column_name = 'ens_last_verified') THEN
        ALTER TABLE sellers ADD COLUMN ens_last_verified TIMESTAMP NULL;
    END IF;
    
    -- Add image storage fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sellers' AND column_name = 'profile_image_ipfs') THEN
        ALTER TABLE sellers ADD COLUMN profile_image_ipfs VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sellers' AND column_name = 'cover_image_ipfs') THEN
        ALTER TABLE sellers ADD COLUMN cover_image_ipfs VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sellers' AND column_name = 'image_cdn_urls') THEN
        ALTER TABLE sellers ADD COLUMN image_cdn_urls TEXT; -- JSON object
    END IF;
    
    -- Add enhanced profile fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sellers' AND column_name = 'website_url') THEN
        ALTER TABLE sellers ADD COLUMN website_url VARCHAR(500);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sellers' AND column_name = 'twitter_handle') THEN
        ALTER TABLE sellers ADD COLUMN twitter_handle VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sellers' AND column_name = 'discord_handle') THEN
        ALTER TABLE sellers ADD COLUMN discord_handle VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sellers' AND column_name = 'telegram_handle') THEN
        ALTER TABLE sellers ADD COLUMN telegram_handle VARCHAR(100);
    END IF;
END $$;

-- Create ENS verifications tracking table
CREATE TABLE IF NOT EXISTS ens_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(66) NOT NULL,
    ens_handle VARCHAR(255) NOT NULL,
    verified_at TIMESTAMP DEFAULT NOW(),
    verification_tx_hash VARCHAR(66),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for ENS verifications
CREATE INDEX IF NOT EXISTS idx_ens_verifications_wallet ON ens_verifications(wallet_address);
CREATE INDEX IF NOT EXISTS idx_ens_verifications_handle ON ens_verifications(ens_handle);
CREATE INDEX IF NOT EXISTS idx_ens_verifications_expires ON ens_verifications(expires_at);

-- =============================================================================
-- 2. COMPREHENSIVE IMAGE STORAGE SOLUTION
-- =============================================================================

-- Create image storage tracking table
CREATE TABLE IF NOT EXISTS image_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ipfs_hash VARCHAR(255) NOT NULL UNIQUE,
    cdn_url VARCHAR(500),
    original_filename VARCHAR(255),
    content_type VARCHAR(100),
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    aspect_ratio DECIMAL(10,8),
    thumbnails TEXT, -- JSON object with thumbnail URLs
    owner_id UUID REFERENCES users(id),
    usage_type VARCHAR(50), -- 'profile', 'cover', 'listing'
    upload_session_id VARCHAR(255),
    processing_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

-- Create indexes for image storage
CREATE INDEX IF NOT EXISTS idx_image_storage_owner_usage ON image_storage(owner_id, usage_type);
CREATE INDEX IF NOT EXISTS idx_image_storage_ipfs_hash ON image_storage(ipfs_hash);
CREATE INDEX IF NOT EXISTS idx_image_storage_processing_status ON image_storage(processing_status);
CREATE INDEX IF NOT EXISTS idx_image_storage_created_at ON image_storage(created_at);

-- Create image usage tracking table
CREATE TABLE IF NOT EXISTS image_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_id UUID REFERENCES image_storage(id),
    entity_type VARCHAR(50), -- 'seller_profile', 'product_listing', 'store_cover'
    entity_id UUID,
    usage_context VARCHAR(100), -- 'primary_image', 'gallery_image', 'thumbnail'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for image usage
CREATE INDEX IF NOT EXISTS idx_image_usage_entity ON image_usage(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_image_usage_image ON image_usage(image_id, entity_type);

-- =============================================================================
-- 3. LISTING VISIBILITY AND DATABASE INTEGRATION
-- =============================================================================

-- Enhance products table for better listing management
DO $$ 
BEGIN
    -- Add listing status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'listing_status') THEN
        ALTER TABLE products ADD COLUMN listing_status VARCHAR(20) DEFAULT 'draft';
    END IF;
    
    -- Add published timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'published_at') THEN
        ALTER TABLE products ADD COLUMN published_at TIMESTAMP;
    END IF;
    
    -- Add search vector for full-text search
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'search_vector') THEN
        ALTER TABLE products ADD COLUMN search_vector tsvector;
    END IF;
    
    -- Add image IPFS hashes array
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'image_ipfs_hashes') THEN
        ALTER TABLE products ADD COLUMN image_ipfs_hashes TEXT[]; -- Array of IPFS hashes
    END IF;
    
    -- Add image CDN URLs JSON
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'image_cdn_urls') THEN
        ALTER TABLE products ADD COLUMN image_cdn_urls TEXT; -- JSON object with CDN URLs
    END IF;
END $$;

-- Create indexes for products enhancements
CREATE INDEX IF NOT EXISTS idx_products_listing_status ON products(listing_status);
CREATE INDEX IF NOT EXISTS idx_products_published_at ON products(published_at);
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING gin(search_vector);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_products_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', 
        COALESCE(NEW.title, '') || ' ' || 
        COALESCE(NEW.description, '') || ' ' || 
        COALESCE(NEW.category, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
DROP TRIGGER IF EXISTS products_search_vector_update ON products;
CREATE TRIGGER products_search_vector_update
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_products_search_vector();

-- =============================================================================
-- 4. FUNCTIONAL CHECKOUT PROCESS AND ORDER MANAGEMENT
-- =============================================================================

-- Enhance orders table for better tracking
DO $$ 
BEGIN
    -- Add order number for human-readable identification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'order_number') THEN
        ALTER TABLE orders ADD COLUMN order_number VARCHAR(20) UNIQUE;
    END IF;
    
    -- Add checkout session ID
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'checkout_session_id') THEN
        ALTER TABLE orders ADD COLUMN checkout_session_id VARCHAR(255);
    END IF;
    
    -- Add payment method tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
        ALTER TABLE orders ADD COLUMN payment_method VARCHAR(20);
    END IF;
    
    -- Add payment intent ID for fiat payments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'payment_intent_id') THEN
        ALTER TABLE orders ADD COLUMN payment_intent_id VARCHAR(255);
    END IF;
    
    -- Add transaction hash for crypto payments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'transaction_hash') THEN
        ALTER TABLE orders ADD COLUMN transaction_hash VARCHAR(66);
    END IF;
    
    -- Add escrow ID for escrow payments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'escrow_id') THEN
        ALTER TABLE orders ADD COLUMN escrow_id VARCHAR(255);
    END IF;
    
    -- Add payment status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'payment_status') THEN
        ALTER TABLE orders ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending';
    END IF;
    
    -- Add processing fees
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'processing_fees') THEN
        ALTER TABLE orders ADD COLUMN processing_fees DECIMAL(10,2);
    END IF;
    
    -- Add gas fees for crypto transactions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'gas_fees') THEN
        ALTER TABLE orders ADD COLUMN gas_fees DECIMAL(18,8);
    END IF;
    
    -- Add shipping address JSON
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'shipping_address') THEN
        ALTER TABLE orders ADD COLUMN shipping_address TEXT; -- JSON object
    END IF;
    
    -- Add shipping method
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'shipping_method') THEN
        ALTER TABLE orders ADD COLUMN shipping_method VARCHAR(50);
    END IF;
    
    -- Add tracking number
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'tracking_number') THEN
        ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(100);
    END IF;
    
    -- Add estimated delivery date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'estimated_delivery') THEN
        ALTER TABLE orders ADD COLUMN estimated_delivery DATE;
    END IF;
    
    -- Add actual delivery date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'actual_delivery_date') THEN
        ALTER TABLE orders ADD COLUMN actual_delivery_date TIMESTAMP;
    END IF;
    
    -- Add order notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'order_notes') THEN
        ALTER TABLE orders ADD COLUMN order_notes TEXT;
    END IF;
    
    -- Add special instructions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'special_instructions') THEN
        ALTER TABLE orders ADD COLUMN special_instructions TEXT;
    END IF;
    
    -- Add metadata JSON for extensibility
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'metadata') THEN
        ALTER TABLE orders ADD COLUMN metadata TEXT; -- JSON object
    END IF;
    
    -- Add status updated timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'status_updated_at') THEN
        ALTER TABLE orders ADD COLUMN status_updated_at TIMESTAMP DEFAULT NOW();
    END IF;
    
    -- Add completed timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'completed_at') THEN
        ALTER TABLE orders ADD COLUMN completed_at TIMESTAMP;
    END IF;
    
    -- Add cancelled timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'cancelled_at') THEN
        ALTER TABLE orders ADD COLUMN cancelled_at TIMESTAMP;
    END IF;
END $$;

-- Create indexes for orders enhancements
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method, status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_checkout_session ON orders(checkout_session_id);

-- Create order status history table
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) NOT NULL,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by UUID REFERENCES users(id),
    change_reason VARCHAR(100),
    metadata TEXT, -- JSON object
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for order status history
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_status_history_status ON order_status_history(new_status, created_at);

-- Create order tracking events table
CREATE TABLE IF NOT EXISTS order_tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'status_change', 'shipment_update', 'payment_update'
    event_data TEXT, -- JSON object
    event_source VARCHAR(50), -- 'system', 'seller', 'shipping_provider', 'payment_processor'
    location VARCHAR(255),
    occurred_at TIMESTAMP NOT NULL,
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for order tracking events
CREATE INDEX IF NOT EXISTS idx_order_tracking_events_order ON order_tracking_events(order_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_order_tracking_events_type ON order_tracking_events(event_type, occurred_at);

-- Create payment attempts table
CREATE TABLE IF NOT EXISTS payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    payment_method VARCHAR(20),
    amount DECIMAL(18,8),
    currency VARCHAR(10),
    status VARCHAR(20),
    error_code VARCHAR(50),
    error_message TEXT,
    transaction_hash VARCHAR(66),
    payment_intent_id VARCHAR(255),
    gas_used INTEGER,
    processing_fee DECIMAL(10,2),
    attempted_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Create indexes for payment attempts
CREATE INDEX IF NOT EXISTS idx_payment_attempts_order ON payment_attempts(order_id, payment_method);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON payment_attempts(status, attempted_at);

-- =============================================================================
-- 5. FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    sequence_part TEXT;
    order_number TEXT;
BEGIN
    year_part := EXTRACT(YEAR FROM NOW())::TEXT;
    
    -- Get next sequence number for this year
    SELECT LPAD((COUNT(*) + 1)::TEXT, 6, '0') INTO sequence_part
    FROM orders 
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    
    order_number := 'ORD-' || year_part || '-' || sequence_part;
    
    RETURN order_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically generate order numbers
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_set_order_number ON orders;
CREATE TRIGGER orders_set_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION set_order_number();

-- Function to update order status with history tracking
CREATE OR REPLACE FUNCTION update_order_status_with_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Update status timestamp
    NEW.status_updated_at := NOW();
    
    -- Record status change in history
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_history (
            order_id,
            previous_status,
            new_status,
            changed_by,
            change_reason,
            notes
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.updated_by, -- Assuming there's an updated_by field
            'Status updated',
            'Automatic status change tracking'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_status_history_trigger ON orders;
CREATE TRIGGER orders_status_history_trigger
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_order_status_with_history();

-- =============================================================================
-- 6. DATA MIGRATION AND CLEANUP
-- =============================================================================

-- Update existing products to have default listing status
UPDATE products 
SET listing_status = 'active', published_at = created_at 
WHERE listing_status IS NULL AND created_at IS NOT NULL;

-- Update existing orders to have default payment status
UPDATE orders 
SET payment_status = 'confirmed', status_updated_at = updated_at 
WHERE payment_status IS NULL;

-- Generate order numbers for existing orders
UPDATE orders 
SET order_number = generate_order_number() 
WHERE order_number IS NULL;

-- Update search vectors for existing products
UPDATE products 
SET search_vector = to_tsvector('english', 
    COALESCE(title, '') || ' ' || 
    COALESCE(description, '') || ' ' || 
    COALESCE(category, '')
) 
WHERE search_vector IS NULL;

-- =============================================================================
-- 7. CONSTRAINTS AND VALIDATION
-- =============================================================================

-- Add constraints for data integrity
ALTER TABLE ens_verifications 
ADD CONSTRAINT ens_verifications_wallet_format 
CHECK (wallet_address ~ '^0x[a-fA-F0-9]{40}$');

ALTER TABLE image_storage 
ADD CONSTRAINT image_storage_file_size_positive 
CHECK (file_size > 0);

ALTER TABLE image_storage 
ADD CONSTRAINT image_storage_dimensions_positive 
CHECK (width > 0 AND height > 0);

ALTER TABLE orders 
ADD CONSTRAINT orders_amounts_positive 
CHECK (total_amount > 0);

ALTER TABLE payment_attempts 
ADD CONSTRAINT payment_attempts_amount_positive 
CHECK (amount > 0);

-- =============================================================================
-- 8. PERMISSIONS AND SECURITY
-- =============================================================================

-- Grant necessary permissions to application user
-- Note: Replace 'app_user' with your actual application database user
DO $$
BEGIN
    -- Check if user exists before granting permissions
    IF EXISTS (SELECT 1 FROM pg_user WHERE usename = 'app_user') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON ens_verifications TO app_user;
        GRANT SELECT, INSERT, UPDATE, DELETE ON image_storage TO app_user;
        GRANT SELECT, INSERT, UPDATE, DELETE ON image_usage TO app_user;
        GRANT SELECT, INSERT, UPDATE, DELETE ON order_status_history TO app_user;
        GRANT SELECT, INSERT, UPDATE, DELETE ON order_tracking_events TO app_user;
        GRANT SELECT, INSERT, UPDATE, DELETE ON payment_attempts TO app_user;
        
        -- Grant sequence permissions
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
    END IF;
END $$;

-- =============================================================================
-- MIGRATION COMPLETION
-- =============================================================================

-- Insert migration record
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('marketplace_enhancements_v1.0.0', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- =============================================================================
-- POST-MIGRATION VERIFICATION
-- =============================================================================

-- Verify all tables exist
DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check for required tables
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ens_verifications') THEN
        missing_tables := array_append(missing_tables, 'ens_verifications');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'image_storage') THEN
        missing_tables := array_append(missing_tables, 'image_storage');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'image_usage') THEN
        missing_tables := array_append(missing_tables, 'image_usage');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_status_history') THEN
        missing_tables := array_append(missing_tables, 'order_status_history');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_tracking_events') THEN
        missing_tables := array_append(missing_tables, 'order_tracking_events');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_attempts') THEN
        missing_tables := array_append(missing_tables, 'payment_attempts');
    END IF;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Migration incomplete. Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'Migration completed successfully. All required tables created.';
    END IF;
END $$;

-- Verify column additions
DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check sellers table columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sellers' AND column_name = 'ens_handle') THEN
        missing_columns := array_append(missing_columns, 'sellers.ens_handle');
    END IF;
    
    -- Check products table columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'listing_status') THEN
        missing_columns := array_append(missing_columns, 'products.listing_status');
    END IF;
    
    -- Check orders table columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
        missing_columns := array_append(missing_columns, 'orders.payment_method');
    END IF;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Migration incomplete. Missing columns: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'All required columns added successfully.';
    END IF;
END $$;

-- =============================================================================
-- ROLLBACK SCRIPT REFERENCE
-- =============================================================================

-- To rollback this migration, run the rollback script:
-- psql -d database_name -f marketplace-enhancements-rollback.sql

-- =============================================================================
-- PERFORMANCE RECOMMENDATIONS
-- =============================================================================

-- After migration, consider running:
-- ANALYZE; -- Update table statistics
-- REINDEX; -- Rebuild indexes for optimal performance
-- VACUUM FULL; -- Reclaim space (during maintenance window)

RAISE NOTICE 'Marketplace Enhancements Migration v1.0.0 completed successfully!';
RAISE NOTICE 'Remember to update your application configuration and restart services.';
RAISE NOTICE 'Run ANALYZE to update table statistics for optimal query performance.';