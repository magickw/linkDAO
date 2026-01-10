-- Migration: Add Service Delivery Fields
-- This migration adds fields to support service-based products and orders

-- Add service-related fields to products table
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_service" BOOLEAN DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "service_type" VARCHAR(50); -- 'remote', 'in_person', 'consultation', 'subscription'
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "service_duration_minutes" INTEGER; -- Expected duration of service
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "requires_scheduling" BOOLEAN DEFAULT true;

-- Add service delivery fields to orders table
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "is_service_order" BOOLEAN DEFAULT false;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "scheduled_date" DATE;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "scheduled_time" TIME;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "scheduled_timezone" VARCHAR(50);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_status" VARCHAR(32) DEFAULT 'pending'; -- 'pending', 'scheduled', 'in_progress', 'completed', 'cancelled'
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_notes" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_deliverables" JSONB; -- Array of {type, url, name, uploadedAt}
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_completed_at" TIMESTAMP;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "buyer_confirmed_at" TIMESTAMP;

-- Create index for service orders
CREATE INDEX IF NOT EXISTS "idx_orders_is_service" ON "orders" ("is_service_order");
CREATE INDEX IF NOT EXISTS "idx_orders_service_status" ON "orders" ("service_status");
CREATE INDEX IF NOT EXISTS "idx_orders_scheduled_date" ON "orders" ("scheduled_date");
CREATE INDEX IF NOT EXISTS "idx_products_is_service" ON "products" ("is_service");

-- Add comments for documentation
COMMENT ON COLUMN "products"."is_service" IS 'Whether this product is a service rather than physical/digital good';
COMMENT ON COLUMN "products"."service_type" IS 'Type of service: remote, in_person, consultation, subscription';
COMMENT ON COLUMN "orders"."service_deliverables" IS 'JSON array of deliverables: [{type: "file"|"link", url: string, name: string, uploadedAt: timestamp}]';
