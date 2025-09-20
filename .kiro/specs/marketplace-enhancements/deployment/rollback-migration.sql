-- Marketplace Enhancements Rollback Migration Script
-- Version: 1.0.0
-- Description: Rollback script for marketplace enhancements database changes
-- 
-- WARNING: This script will remove all marketplace enhancement features
-- and may result in data loss. Use with extreme caution!

-- =============================================================================
-- ROLLBACK SAFETY CHECKS
-- =============================================================================
-- IMPORTANT: Create a full database backup before running this rollback!
-- 
-- pg_dump -h localhost -U username -d database_name > rollback_backup_$(date +%Y%m%d_%H%M%S).sql
-- 
-- =============================================================================

BEGIN;

-- =============================================================================
-- CONFIRMATION PROMPT
-- =============================================================================
-- Uncomment the following line to confirm you want to proceed with rollback
-- SELECT 'ROLLBACK_CONFIRMED' as confirmation;

-- If the above line is not uncommented, the rollback will fail
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM (
            SELECT 'ROLLBACK_CONFIRMED' as confirmation
        ) t
    ) THEN
        RAISE EXCEPTION 'Rollback not confirmed. Uncomment the confirmation line to proceed.';
    END IF;
END $$;

-- =============================================================================
-- 1. BACKUP CRITICAL DATA
-- =============================================================================

-- Create backup tables for critical data before dropping
CREATE TABLE IF NOT EXISTS ens_verifications_backup AS 
SELECT * FROM ens_verifications;

CREATE TABLE IF NOT EXISTS image_storage_backup AS 
SELECT * FROM image_storage;

CREATE TABLE IF NOT EXISTS order_status_history_backup AS 
SELECT * FROM order_status_history;

CREATE TABLE IF NOT EXISTS payment_attempts_backup AS 
SELECT * FROM payment_attempts;

RAISE NOTICE 'Critical data backed up to *_backup tables';

-- =============================================================================
-- 2. DROP TRIGGERS AND FUNCTIONS
-- =============================================================================

-- Drop order-related triggers
DROP TRIGGER IF EXISTS orders_set_order_number ON orders;
DROP TRIGGER IF EXISTS orders_status_history_trigger ON orders;

-- Drop product search vector trigger
DROP TRIGGER IF EXISTS products_search_vector_update ON products;

-- Drop functions
DROP FUNCTION IF EXISTS generate_order_number();
DROP FUNCTION IF EXISTS set_order_number();
DROP FUNCTION IF EXISTS update_order_status_with_history();
DROP FUNCTION IF EXISTS update_products_search_vector();

RAISE NOTICE 'Triggers and functions dropped';

-- =============================================================================
-- 3. DROP NEW TABLES
-- =============================================================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS payment_attempts CASCADE;
DROP TABLE IF EXISTS order_tracking_events CASCADE;
DROP TABLE IF EXISTS order_status_history CASCADE;
DROP TABLE IF EXISTS image_usage CASCADE;
DROP TABLE IF EXISTS image_storage CASCADE;
DROP TABLE IF EXISTS ens_verifications CASCADE;

RAISE NOTICE 'New tables dropped';

-- =============================================================================
-- 4. REMOVE COLUMNS FROM EXISTING TABLES
-- =============================================================================

-- Remove columns from sellers table
DO $$ 
BEGIN
    -- Remove ENS-related columns
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'sellers' AND column_name = 'ens_handle') THEN
        ALTER TABLE sellers DROP COLUMN ens_handle;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'sellers' AND column_name = 'ens_verified') THEN
        ALTER TABLE sellers DROP COLUMN ens_verified;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'sellers' AND column_name = 'ens_last_verified') THEN
        ALTER TABLE sellers DROP COLUMN ens_last_verified;
    END IF;
    
    -- Remove image-related columns
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'sellers' AND column_name = 'profile_image_ipfs') THEN
        ALTER TABLE sellers DROP COLUMN profile_image_ipfs;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'sellers' AND column_name = 'cover_image_ipfs') THEN
        ALTER TABLE sellers DROP COLUMN cover_image_ipfs;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'sellers' AND column_name = 'image_cdn_urls') THEN
        ALTER TABLE sellers DROP COLUMN image_cdn_urls;
    END IF;
    
    -- Remove social media columns
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'sellers' AND column_name = 'website_url') THEN
        ALTER TABLE sellers DROP COLUMN website_url;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'sellers' AND column_name = 'twitter_handle') THEN
        ALTER TABLE sellers DROP COLUMN twitter_handle;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'sellers' AND column_name = 'discord_handle') THEN
        ALTER TABLE sellers DROP COLUMN discord_handle;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'sellers' AND column_name = 'telegram_handle') THEN
        ALTER TABLE sellers DROP COLUMN telegram_handle;
    END IF;
END $$;

-- Remove columns from products table
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'products' AND column_name = 'listing_status') THEN
        ALTER TABLE products DROP COLUMN listing_status;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'products' AND column_name = 'published_at') THEN
        ALTER TABLE products DROP COLUMN published_at;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'products' AND column_name = 'search_vector') THEN
        ALTER TABLE products DROP COLUMN search_vector;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'products' AND column_name = 'image_ipfs_hashes') THEN
        ALTER TABLE products DROP COLUMN image_ipfs_hashes;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'products' AND column_name = 'image_cdn_urls') THEN
        ALTER TABLE products DROP COLUMN image_cdn_urls;
    END IF;
END $$;

-- Remove columns from orders table
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'order_number') THEN
        ALTER TABLE orders DROP COLUMN order_number;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'checkout_session_id') THEN
        ALTER TABLE orders DROP COLUMN checkout_session_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
        ALTER TABLE orders DROP COLUMN payment_method;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'payment_intent_id') THEN
        ALTER TABLE orders DROP COLUMN payment_intent_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'transaction_hash') THEN
        ALTER TABLE orders DROP COLUMN transaction_hash;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'escrow_id') THEN
        ALTER TABLE orders DROP COLUMN escrow_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'payment_status') THEN
        ALTER TABLE orders DROP COLUMN payment_status;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'processing_fees') THEN
        ALTER TABLE orders DROP COLUMN processing_fees;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'gas_fees') THEN
        ALTER TABLE orders DROP COLUMN gas_fees;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'shipping_address') THEN
        ALTER TABLE orders DROP COLUMN shipping_address;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'shipping_method') THEN
        ALTER TABLE orders DROP COLUMN shipping_method;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'tracking_number') THEN
        ALTER TABLE orders DROP COLUMN tracking_number;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'estimated_delivery') THEN
        ALTER TABLE orders DROP COLUMN estimated_delivery;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'actual_delivery_date') THEN
        ALTER TABLE orders DROP COLUMN actual_delivery_date;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'order_notes') THEN
        ALTER TABLE orders DROP COLUMN order_notes;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'special_instructions') THEN
        ALTER TABLE orders DROP COLUMN special_instructions;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'metadata') THEN
        ALTER TABLE orders DROP COLUMN metadata;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'status_updated_at') THEN
        ALTER TABLE orders DROP COLUMN status_updated_at;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'completed_at') THEN
        ALTER TABLE orders DROP COLUMN completed_at;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'cancelled_at') THEN
        ALTER TABLE orders DROP COLUMN cancelled_at;
    END IF;
END $$;

RAISE NOTICE 'Columns removed from existing tables';

-- =============================================================================
-- 5. DROP INDEXES
-- =============================================================================

-- Drop indexes created for marketplace enhancements
DROP INDEX IF EXISTS idx_ens_verifications_wallet;
DROP INDEX IF EXISTS idx_ens_verifications_handle;
DROP INDEX IF EXISTS idx_ens_verifications_expires;

DROP INDEX IF EXISTS idx_image_storage_owner_usage;
DROP INDEX IF EXISTS idx_image_storage_ipfs_hash;
DROP INDEX IF EXISTS idx_image_storage_processing_status;
DROP INDEX IF EXISTS idx_image_storage_created_at;

DROP INDEX IF EXISTS idx_image_usage_entity;
DROP INDEX IF EXISTS idx_image_usage_image;

DROP INDEX IF EXISTS idx_products_listing_status;
DROP INDEX IF EXISTS idx_products_published_at;
DROP INDEX IF EXISTS idx_products_search_vector;

DROP INDEX IF EXISTS idx_orders_payment_method;
DROP INDEX IF EXISTS idx_orders_payment_status;
DROP INDEX IF EXISTS idx_orders_order_number;
DROP INDEX IF EXISTS idx_orders_checkout_session;

DROP INDEX IF EXISTS idx_order_status_history_order;
DROP INDEX IF EXISTS idx_order_status_history_status;

DROP INDEX IF EXISTS idx_order_tracking_events_order;
DROP INDEX IF EXISTS idx_order_tracking_events_type;

DROP INDEX IF EXISTS idx_payment_attempts_order;
DROP INDEX IF EXISTS idx_payment_attempts_status;

RAISE NOTICE 'Indexes dropped';

-- =============================================================================
-- 6. REMOVE CONSTRAINTS
-- =============================================================================

-- Remove constraints added during migration
ALTER TABLE ens_verifications_backup DROP CONSTRAINT IF EXISTS ens_verifications_wallet_format;
ALTER TABLE image_storage_backup DROP CONSTRAINT IF EXISTS image_storage_file_size_positive;
ALTER TABLE image_storage_backup DROP CONSTRAINT IF EXISTS image_storage_dimensions_positive;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_amounts_positive;

RAISE NOTICE 'Constraints removed';

-- =============================================================================
-- 7. REVOKE PERMISSIONS
-- =============================================================================

-- Revoke permissions granted during migration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_user WHERE usename = 'app_user') THEN
        -- Note: These tables are already dropped, but including for completeness
        REVOKE ALL ON ens_verifications_backup FROM app_user;
        REVOKE ALL ON image_storage_backup FROM app_user;
    END IF;
END $$;

-- =============================================================================
-- 8. REMOVE MIGRATION RECORD
-- =============================================================================

-- Remove migration record
DELETE FROM schema_migrations 
WHERE version = 'marketplace_enhancements_v1.0.0';

-- =============================================================================
-- 9. CLEANUP BACKUP TABLES (OPTIONAL)
-- =============================================================================

-- Uncomment the following lines if you want to remove backup tables
-- WARNING: This will permanently delete the backed up data!

-- DROP TABLE IF EXISTS ens_verifications_backup;
-- DROP TABLE IF EXISTS image_storage_backup;
-- DROP TABLE IF EXISTS order_status_history_backup;
-- DROP TABLE IF EXISTS payment_attempts_backup;

RAISE NOTICE 'Backup tables preserved. Drop manually if no longer needed.';

COMMIT;

-- =============================================================================
-- ROLLBACK VERIFICATION
-- =============================================================================

-- Verify rollback completion
DO $$
DECLARE
    remaining_tables TEXT[] := ARRAY[]::TEXT[];
    remaining_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check for tables that should have been dropped
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ens_verifications') THEN
        remaining_tables := array_append(remaining_tables, 'ens_verifications');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'image_storage') THEN
        remaining_tables := array_append(remaining_tables, 'image_storage');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_status_history') THEN
        remaining_tables := array_append(remaining_tables, 'order_status_history');
    END IF;
    
    -- Check for columns that should have been dropped
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sellers' AND column_name = 'ens_handle') THEN
        remaining_columns := array_append(remaining_columns, 'sellers.ens_handle');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'listing_status') THEN
        remaining_columns := array_append(remaining_columns, 'products.listing_status');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
        remaining_columns := array_append(remaining_columns, 'orders.payment_method');
    END IF;
    
    -- Report results
    IF array_length(remaining_tables, 1) > 0 THEN
        RAISE WARNING 'Rollback incomplete. Remaining tables: %', array_to_string(remaining_tables, ', ');
    END IF;
    
    IF array_length(remaining_columns, 1) > 0 THEN
        RAISE WARNING 'Rollback incomplete. Remaining columns: %', array_to_string(remaining_columns, ', ');
    END IF;
    
    IF array_length(remaining_tables, 1) = 0 AND array_length(remaining_columns, 1) = 0 THEN
        RAISE NOTICE 'Rollback completed successfully!';
    END IF;
END $$;

-- =============================================================================
-- POST-ROLLBACK INSTRUCTIONS
-- =============================================================================

RAISE NOTICE '=============================================================================';
RAISE NOTICE 'MARKETPLACE ENHANCEMENTS ROLLBACK COMPLETED';
RAISE NOTICE '=============================================================================';
RAISE NOTICE '';
RAISE NOTICE 'IMPORTANT POST-ROLLBACK STEPS:';
RAISE NOTICE '1. Update your application configuration to remove marketplace enhancement features';
RAISE NOTICE '2. Restart all application services';
RAISE NOTICE '3. Update your frontend to remove marketplace enhancement UI components';
RAISE NOTICE '4. Verify that your application works correctly without the enhanced features';
RAISE NOTICE '5. Consider running ANALYZE to update table statistics';
RAISE NOTICE '';
RAISE NOTICE 'BACKUP DATA:';
RAISE NOTICE 'Critical data has been preserved in *_backup tables:';
RAISE NOTICE '- ens_verifications_backup';
RAISE NOTICE '- image_storage_backup';
RAISE NOTICE '- order_status_history_backup';
RAISE NOTICE '- payment_attempts_backup';
RAISE NOTICE '';
RAISE NOTICE 'These backup tables can be dropped manually when no longer needed.';
RAISE NOTICE '';
RAISE NOTICE 'If you need to restore the marketplace enhancements, run the original';
RAISE NOTICE 'migration script again: database-migrations.sql';
RAISE NOTICE '=============================================================================';

-- =============================================================================
-- EMERGENCY RECOVERY
-- =============================================================================

-- If you need to quickly restore critical functionality, uncomment and run:
-- 
-- -- Restore basic order tracking
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';
-- 
-- -- Restore basic listing status
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS listing_status VARCHAR(20) DEFAULT 'active';
-- 
-- RAISE NOTICE 'Emergency recovery applied. Run full migration for complete restoration.';