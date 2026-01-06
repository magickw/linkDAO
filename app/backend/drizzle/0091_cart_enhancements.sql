-- Migration: 0091_cart_enhancements.sql
-- Description: Add saved_for_later table and enhance cart_items with gift options and selection
-- Date: 2026-01-06

-- Create saved_for_later table
CREATE TABLE IF NOT EXISTS saved_for_later (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    saved_at TIMESTAMP NOT NULL DEFAULT NOW(),
    notes TEXT,
    price_at_save NUMERIC(10, 2),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Add gift and selection columns to cart_items
ALTER TABLE cart_items 
ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gift_message TEXT,
ADD COLUMN IF NOT EXISTS gift_wrap_option VARCHAR(50),
ADD COLUMN IF NOT EXISTS selected BOOLEAN DEFAULT TRUE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_for_later_user_id ON saved_for_later(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_for_later_product_id ON saved_for_later(product_id);
CREATE INDEX IF NOT EXISTS idx_saved_for_later_saved_at ON saved_for_later(saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_items_selected ON cart_items(selected) WHERE selected = TRUE;

-- Add comments for documentation
COMMENT ON TABLE saved_for_later IS 'Stores items that users have saved for later purchase';
COMMENT ON COLUMN saved_for_later.price_at_save IS 'Price when item was saved, for price change tracking';
COMMENT ON COLUMN cart_items.is_gift IS 'Whether this item is marked as a gift';
COMMENT ON COLUMN cart_items.gift_message IS 'Custom gift message (max 200 chars)';
COMMENT ON COLUMN cart_items.gift_wrap_option IS 'Gift wrap option: standard, premium, or none';
COMMENT ON COLUMN cart_items.selected IS 'Whether item is selected for checkout (for bulk actions)';
