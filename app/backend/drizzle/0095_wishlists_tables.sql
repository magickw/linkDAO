-- Migration: Enhance Existing Wishlist Tables
-- Number: 0095
-- Created: 2026-01-06
-- Description: Adds enhanced features to existing wishlists and wishlist_items tables

-- Add new columns to wishlists table
ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS share_token VARCHAR(64) UNIQUE;

-- Add new columns to wishlist_items table
ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1 CHECK (quantity > 0);
ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low'));
ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS price_at_add NUMERIC(20, 2);
ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS price_alert_threshold NUMERIC(20, 2);
ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Rename price_alert to match new naming convention (if it exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wishlist_items' AND column_name = 'price_alert'
  ) THEN
    -- Copy data from old column to new if price_alert_threshold doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'wishlist_items' AND column_name = 'price_alert_threshold'
    ) THEN
      ALTER TABLE wishlist_items RENAME COLUMN price_alert TO price_alert_threshold;
    END IF;
  END IF;
END $$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_wishlists_share_token ON wishlists(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wishlists_public ON wishlists(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_wishlist_items_added_at ON wishlist_items(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_priority ON wishlist_items(priority);

-- Add unique constraint for user wishlist names
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_wishlist_name'
  ) THEN
    ALTER TABLE wishlists ADD CONSTRAINT unique_user_wishlist_name UNIQUE (user_id, name);
  END IF;
END $$;

-- Add unique constraint for wishlist products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_wishlist_product'
  ) THEN
    ALTER TABLE wishlist_items ADD CONSTRAINT unique_wishlist_product UNIQUE (wishlist_id, product_id);
  END IF;
END $$;

-- Create or replace trigger function to update wishlists updated_at
CREATE OR REPLACE FUNCTION update_wishlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for wishlists
DROP TRIGGER IF EXISTS trigger_wishlists_updated_at ON wishlists;
CREATE TRIGGER trigger_wishlists_updated_at
  BEFORE UPDATE ON wishlists
  FOR EACH ROW
  EXECUTE FUNCTION update_wishlists_updated_at();

-- Create or replace trigger function to update wishlist_items updated_at
CREATE OR REPLACE FUNCTION update_wishlist_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for wishlist_items
DROP TRIGGER IF EXISTS trigger_wishlist_items_updated_at ON wishlist_items;
CREATE TRIGGER trigger_wishlist_items_updated_at
  BEFORE UPDATE ON wishlist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_wishlist_items_updated_at();

-- Create or replace trigger function to update parent wishlist when items change
CREATE OR REPLACE FUNCTION update_wishlist_on_item_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE wishlists 
  SET updated_at = CURRENT_TIMESTAMP 
  WHERE id = COALESCE(NEW.wishlist_id, OLD.wishlist_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for wishlist item changes
DROP TRIGGER IF EXISTS trigger_wishlist_on_item_insert ON wishlist_items;
CREATE TRIGGER trigger_wishlist_on_item_insert
  AFTER INSERT ON wishlist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_wishlist_on_item_change();

DROP TRIGGER IF EXISTS trigger_wishlist_on_item_update ON wishlist_items;
CREATE TRIGGER trigger_wishlist_on_item_update
  AFTER UPDATE ON wishlist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_wishlist_on_item_change();

DROP TRIGGER IF EXISTS trigger_wishlist_on_item_delete ON wishlist_items;
CREATE TRIGGER trigger_wishlist_on_item_delete
  AFTER DELETE ON wishlist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_wishlist_on_item_change();

-- Add comments for new columns
COMMENT ON COLUMN wishlists.share_token IS 'Unique token for sharing private wishlists (e.g., gift registries)';

COMMENT ON COLUMN wishlist_items.quantity IS 'Desired quantity of the product';
COMMENT ON COLUMN wishlist_items.priority IS 'User-defined priority: high, medium, or low';
COMMENT ON COLUMN wishlist_items.price_at_add IS 'Product price when added to wishlist (for price tracking)';
COMMENT ON COLUMN wishlist_items.price_alert_threshold IS 'Alert user when price drops below this amount';
COMMENT ON COLUMN wishlist_items.updated_at IS 'Last update timestamp for the wishlist item';

-- Migration summary
DO $$ 
BEGIN
  RAISE NOTICE 'Wishlist Enhancement Migration Completed';
  RAISE NOTICE 'Enhanced wishlists table with:';
  RAISE NOTICE '  - share_token for sharing wishlists';
  RAISE NOTICE 'Enhanced wishlist_items table with:';
  RAISE NOTICE '  - quantity field';
  RAISE NOTICE '  - priority field (high/medium/low)';
  RAISE NOTICE '  - price_at_add for price tracking';
  RAISE NOTICE '  - price_alert_threshold for price drop alerts';
  RAISE NOTICE '  - updated_at timestamp';
  RAISE NOTICE 'Added indexes, constraints, and triggers for data integrity';
END $$;
