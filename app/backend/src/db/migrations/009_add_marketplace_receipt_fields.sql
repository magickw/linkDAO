-- Migration: Add missing fields to receipts table for marketplace purchases
-- Description: This migration adds fields required for marketplace purchase receipts
--              including subtotal, shipping, and tax (items and seller_name already exist)

-- Add subtotal field
ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(20, 8) DEFAULT 0;

-- Add shipping cost field
ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS shipping DECIMAL(20, 8) DEFAULT 0;

-- Add tax amount field
ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS tax DECIMAL(20, 8) DEFAULT 0;

-- Note: items (JSONB) and seller_name (VARCHAR) already exist in the receipts table

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_receipts_subtotal 
ON receipts(subtotal);

CREATE INDEX IF NOT EXISTS idx_receipts_shipping 
ON receipts(shipping);

CREATE INDEX IF NOT EXISTS idx_receipts_tax 
ON receipts(tax);

-- Add comments for documentation
COMMENT ON COLUMN receipts.items IS 'Array of order items with name, quantity, unitPrice, totalPrice';
COMMENT ON COLUMN receipts.subtotal IS 'Subtotal amount before fees and taxes';
COMMENT ON COLUMN receipts.shipping IS 'Shipping cost amount';
COMMENT ON COLUMN receipts.tax IS 'Tax amount';
COMMENT ON COLUMN receipts.seller_name IS 'Name of the seller for this order';