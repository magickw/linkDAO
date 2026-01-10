-- Add columns for Digital Delivery
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "digital_delivery_completed_at" timestamp;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_notes" text;

-- Add columns for Service Workflow
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_status" varchar(32);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_scheduled" boolean DEFAULT false;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "scheduled_date" varchar(50);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "scheduled_time" varchar(50);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "scheduled_timezone" varchar(50);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_notes" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_deliverables" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_completed_at" timestamp;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "buyer_confirmed_at" timestamp;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_started" boolean DEFAULT false;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_started_at" timestamp;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "is_service_order" boolean DEFAULT false;

-- Add index for service status queries
CREATE INDEX IF NOT EXISTS "idx_orders_service_status" ON "orders" ("service_status");
CREATE INDEX IF NOT EXISTS "idx_orders_is_service_order" ON "orders" ("is_service_order");
