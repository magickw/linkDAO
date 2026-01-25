-- Migration: Add sku and canonical_product_id to products table
-- Path: app/backend/drizzle/0116_add_product_sku_canonical.sql

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sku" VARCHAR(100);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "canonical_product_id" UUID;

-- Add comments for documentation
COMMENT ON COLUMN "products"."sku" IS 'Stock Keeping Unit for inventory tracking';
COMMENT ON COLUMN "products"."canonical_product_id" IS 'Reference to a master product in a global catalog';

-- Add index for SKU search as it's a common query pattern
CREATE INDEX IF NOT EXISTS "idx_products_sku" ON "products" ("sku");
CREATE INDEX IF NOT EXISTS "idx_products_canonical_product_id" ON "products" ("canonical_product_id");
