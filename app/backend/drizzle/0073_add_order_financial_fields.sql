-- Add financial fields to orders table
ALTER TABLE "orders" ADD COLUMN "tax_amount" numeric DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "shipping_cost" numeric DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "platform_fee" numeric DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "tax_breakdown" jsonb DEFAULT '[]'::jsonb;
