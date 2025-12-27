-- Migration: Consolidate marketplace_products into products table
-- Add missing columns from marketplace_products to products table

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "main_category" varchar(50);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sub_category" varchar(100);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_physical" boolean DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "price_fiat" numeric(20, 2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "metadata_uri" text;

-- DeFi specific fields
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "defi_protocol" varchar(100);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "defi_asset_type" varchar(50);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "underlying_assets" jsonb;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "current_apy" numeric(5, 2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "lock_period" integer;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "maturity_date" timestamp;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "risk_level" varchar(20) DEFAULT 'medium';

-- Physical goods specific fields
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "weight" numeric(10, 3);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "dimensions" jsonb;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "condition" varchar(20) DEFAULT 'new';

-- Service specific fields
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "service_duration" integer;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "delivery_method" varchar(20);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS "idx_products_main_category" ON "products" ("main_category");
CREATE INDEX IF NOT EXISTS "idx_products_sub_category" ON "products" ("sub_category");
CREATE INDEX IF NOT EXISTS "idx_products_defi_protocol" ON "products" ("defi_protocol");
CREATE INDEX IF NOT EXISTS "idx_products_defi_asset_type" ON "products" ("defi_asset_type");
CREATE INDEX IF NOT EXISTS "idx_products_risk_level" ON "products" ("risk_level");
