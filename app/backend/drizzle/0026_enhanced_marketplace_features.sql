-- Enhanced Marketplace Features Migration
-- Adds new tables to support advanced marketplace functionality
-- Safe to run multiple times (uses IF NOT EXISTS)

-- Wishlist/Favorites System
CREATE TABLE IF NOT EXISTS "wishlists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL DEFAULT 'My Wishlist',
  "description" text,
  "is_public" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "wishlist_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "wishlist_id" uuid NOT NULL,
  "product_id" uuid,
  "listing_id" integer,
  "price_alert" numeric(20, 8),
  "notes" text,
  "added_at" timestamp DEFAULT now()
);

-- Advanced Search & Filtering
CREATE TABLE IF NOT EXISTS "product_search_analytics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "search_query" varchar(500) NOT NULL,
  "user_id" uuid,
  "filters_applied" text, -- JSON object
  "results_count" integer NOT NULL,
  "clicked_products" text, -- JSON array of product IDs
  "session_id" varchar(128),
  "created_at" timestamp DEFAULT now()
);

-- Seller Performance Analytics
CREATE TABLE IF NOT EXISTS "seller_analytics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "seller_id" uuid NOT NULL,
  "date" date NOT NULL,
  "views" integer DEFAULT 0,
  "inquiries" integer DEFAULT 0,
  "orders" integer DEFAULT 0,
  "revenue" numeric(20, 8) DEFAULT 0,
  "average_rating" numeric(3, 2),
  "response_time_hours" numeric(5, 2),
  "completion_rate" numeric(5, 2),
  "return_rate" numeric(5, 2),
  "created_at" timestamp DEFAULT now()
);

-- Product Bundles & Cross-selling
CREATE TABLE IF NOT EXISTS "product_bundles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "seller_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "bundle_price" numeric(20, 8) NOT NULL,
  "currency" varchar(10) NOT NULL DEFAULT 'USD',
  "discount_percentage" numeric(5, 2),
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "bundle_products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "bundle_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "sort_order" integer DEFAULT 0
);

-- Price History & Tracking
CREATE TABLE IF NOT EXISTS "price_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "old_price" numeric(20, 8),
  "new_price" numeric(20, 8) NOT NULL,
  "currency" varchar(10) NOT NULL,
  "change_reason" varchar(100), -- 'manual', 'promotion', 'market_adjustment', etc.
  "changed_by" uuid,
  "created_at" timestamp DEFAULT now()
);

-- Shipping Zones & Rates
CREATE TABLE IF NOT EXISTS "shipping_zones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "seller_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "countries" text NOT NULL, -- JSON array of country codes
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "shipping_rates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "shipping_zone_id" uuid NOT NULL,
  "weight_min" numeric(10, 3) DEFAULT 0,
  "weight_max" numeric(10, 3),
  "price" numeric(20, 8) NOT NULL,
  "currency" varchar(10) NOT NULL DEFAULT 'USD',
  "delivery_time_min" integer, -- days
  "delivery_time_max" integer, -- days
  "shipping_method" varchar(100) NOT NULL,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);

-- Coupon & Discount System
CREATE TABLE IF NOT EXISTS "coupons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "seller_id" uuid NOT NULL,
  "code" varchar(50) NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "discount_type" varchar(20) NOT NULL, -- 'percentage', 'fixed_amount'
  "discount_value" numeric(20, 8) NOT NULL,
  "currency" varchar(10), -- for fixed_amount coupons
  "minimum_order_amount" numeric(20, 8),
  "maximum_discount_amount" numeric(20, 8),
  "usage_limit" integer,
  "usage_count" integer DEFAULT 0,
  "usage_limit_per_user" integer DEFAULT 1,
  "valid_from" timestamp NOT NULL,
  "valid_until" timestamp NOT NULL,
  "applicable_products" text, -- JSON array of product IDs (null = all products)
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "coupon_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "coupon_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "order_id" integer,
  "discount_applied" numeric(20, 8) NOT NULL,
  "used_at" timestamp DEFAULT now()
);

-- Advanced Inventory Management
CREATE TABLE IF NOT EXISTS "inventory_movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "movement_type" varchar(20) NOT NULL, -- 'in', 'out', 'adjustment', 'reserved', 'released'
  "quantity" integer NOT NULL,
  "previous_stock" integer NOT NULL,
  "new_stock" integer NOT NULL,
  "reason" varchar(100),
  "reference_id" varchar(128), -- order_id, return_id, etc.
  "notes" text,
  "created_by" uuid,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "stock_alerts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "seller_id" uuid NOT NULL,
  "alert_type" varchar(20) NOT NULL, -- 'low_stock', 'out_of_stock', 'overstock'
  "threshold_value" integer,
  "current_stock" integer,
  "is_resolved" boolean DEFAULT false,
  "resolved_at" timestamp,
  "created_at" timestamp DEFAULT now()
);

-- Enhanced Communication System
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "participants" text NOT NULL, -- JSON array of user IDs
  "subject" varchar(255),
  "related_product_id" uuid,
  "related_order_id" integer,
  "status" varchar(20) DEFAULT 'active', -- 'active', 'archived', 'closed'
  "last_message_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "conversation_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL,
  "sender_id" uuid NOT NULL,
  "message_type" varchar(20) DEFAULT 'text', -- 'text', 'image', 'file', 'system'
  "content" text,
  "attachments" text, -- JSON array of file references
  "is_read" boolean DEFAULT false,
  "read_at" timestamp,
  "is_deleted" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);

-- Add Foreign Key Constraints
ALTER TABLE "wishlists" ADD CONSTRAINT IF NOT EXISTS "wishlists_user_id_fkey" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "wishlist_items" ADD CONSTRAINT IF NOT EXISTS "wishlist_items_wishlist_id_fkey" 
  FOREIGN KEY ("wishlist_id") REFERENCES "wishlists"("id") ON DELETE CASCADE;

ALTER TABLE "wishlist_items" ADD CONSTRAINT IF NOT EXISTS "wishlist_items_product_id_fkey" 
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;

ALTER TABLE "wishlist_items" ADD CONSTRAINT IF NOT EXISTS "wishlist_items_listing_id_fkey" 
  FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE;

ALTER TABLE "product_search_analytics" ADD CONSTRAINT IF NOT EXISTS "product_search_analytics_user_id_fkey" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "seller_analytics" ADD CONSTRAINT IF NOT EXISTS "seller_analytics_seller_id_fkey" 
  FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "product_bundles" ADD CONSTRAINT IF NOT EXISTS "product_bundles_seller_id_fkey" 
  FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "bundle_products" ADD CONSTRAINT IF NOT EXISTS "bundle_products_bundle_id_fkey" 
  FOREIGN KEY ("bundle_id") REFERENCES "product_bundles"("id") ON DELETE CASCADE;

ALTER TABLE "bundle_products" ADD CONSTRAINT IF NOT EXISTS "bundle_products_product_id_fkey" 
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;

ALTER TABLE "price_history" ADD CONSTRAINT IF NOT EXISTS "price_history_product_id_fkey" 
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;

ALTER TABLE "price_history" ADD CONSTRAINT IF NOT EXISTS "price_history_changed_by_fkey" 
  FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "shipping_zones" ADD CONSTRAINT IF NOT EXISTS "shipping_zones_seller_id_fkey" 
  FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "shipping_rates" ADD CONSTRAINT IF NOT EXISTS "shipping_rates_shipping_zone_id_fkey" 
  FOREIGN KEY ("shipping_zone_id") REFERENCES "shipping_zones"("id") ON DELETE CASCADE;

ALTER TABLE "coupons" ADD CONSTRAINT IF NOT EXISTS "coupons_seller_id_fkey" 
  FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "coupon_usage" ADD CONSTRAINT IF NOT EXISTS "coupon_usage_coupon_id_fkey" 
  FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE;

ALTER TABLE "coupon_usage" ADD CONSTRAINT IF NOT EXISTS "coupon_usage_user_id_fkey" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "coupon_usage" ADD CONSTRAINT IF NOT EXISTS "coupon_usage_order_id_fkey" 
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL;

ALTER TABLE "inventory_movements" ADD CONSTRAINT IF NOT EXISTS "inventory_movements_product_id_fkey" 
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;

ALTER TABLE "inventory_movements" ADD CONSTRAINT IF NOT EXISTS "inventory_movements_created_by_fkey" 
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "stock_alerts" ADD CONSTRAINT IF NOT EXISTS "stock_alerts_product_id_fkey" 
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;

ALTER TABLE "stock_alerts" ADD CONSTRAINT IF NOT EXISTS "stock_alerts_seller_id_fkey" 
  FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "conversations" ADD CONSTRAINT IF NOT EXISTS "conversations_related_product_id_fkey" 
  FOREIGN KEY ("related_product_id") REFERENCES "products"("id") ON DELETE SET NULL;

ALTER TABLE "conversations" ADD CONSTRAINT IF NOT EXISTS "conversations_related_order_id_fkey" 
  FOREIGN KEY ("related_order_id") REFERENCES "orders"("id") ON DELETE SET NULL;

ALTER TABLE "conversation_messages" ADD CONSTRAINT IF NOT EXISTS "conversation_messages_conversation_id_fkey" 
  FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE;

ALTER TABLE "conversation_messages" ADD CONSTRAINT IF NOT EXISTS "conversation_messages_sender_id_fkey" 
  FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Add Indexes for Performance
CREATE INDEX IF NOT EXISTS "wishlists_user_id_idx" ON "wishlists"("user_id");
CREATE INDEX IF NOT EXISTS "wishlist_items_wishlist_id_idx" ON "wishlist_items"("wishlist_id");
CREATE INDEX IF NOT EXISTS "wishlist_items_product_id_idx" ON "wishlist_items"("product_id");

CREATE INDEX IF NOT EXISTS "product_search_analytics_search_query_idx" ON "product_search_analytics"("search_query");
CREATE INDEX IF NOT EXISTS "product_search_analytics_created_at_idx" ON "product_search_analytics"("created_at");

CREATE INDEX IF NOT EXISTS "seller_analytics_seller_id_date_idx" ON "seller_analytics"("seller_id", "date");
CREATE INDEX IF NOT EXISTS "seller_analytics_date_idx" ON "seller_analytics"("date");

CREATE INDEX IF NOT EXISTS "product_bundles_seller_id_idx" ON "product_bundles"("seller_id");
CREATE INDEX IF NOT EXISTS "bundle_products_bundle_id_idx" ON "bundle_products"("bundle_id");

CREATE INDEX IF NOT EXISTS "price_history_product_id_idx" ON "price_history"("product_id");
CREATE INDEX IF NOT EXISTS "price_history_created_at_idx" ON "price_history"("created_at");

CREATE INDEX IF NOT EXISTS "shipping_zones_seller_id_idx" ON "shipping_zones"("seller_id");
CREATE INDEX IF NOT EXISTS "shipping_rates_shipping_zone_id_idx" ON "shipping_rates"("shipping_zone_id");

CREATE INDEX IF NOT EXISTS "coupons_seller_id_idx" ON "coupons"("seller_id");
CREATE INDEX IF NOT EXISTS "coupons_code_idx" ON "coupons"("code");
CREATE INDEX IF NOT EXISTS "coupons_valid_period_idx" ON "coupons"("valid_from", "valid_until");

CREATE INDEX IF NOT EXISTS "coupon_usage_coupon_id_idx" ON "coupon_usage"("coupon_id");
CREATE INDEX IF NOT EXISTS "coupon_usage_user_id_idx" ON "coupon_usage"("user_id");

CREATE INDEX IF NOT EXISTS "inventory_movements_product_id_idx" ON "inventory_movements"("product_id");
CREATE INDEX IF NOT EXISTS "inventory_movements_created_at_idx" ON "inventory_movements"("created_at");

CREATE INDEX IF NOT EXISTS "stock_alerts_product_id_idx" ON "stock_alerts"("product_id");
CREATE INDEX IF NOT EXISTS "stock_alerts_seller_id_idx" ON "stock_alerts"("seller_id");
CREATE INDEX IF NOT EXISTS "stock_alerts_is_resolved_idx" ON "stock_alerts"("is_resolved");

CREATE INDEX IF NOT EXISTS "conversations_participants_idx" ON "conversations" USING GIN("participants");
CREATE INDEX IF NOT EXISTS "conversations_last_message_at_idx" ON "conversations"("last_message_at");

CREATE INDEX IF NOT EXISTS "conversation_messages_conversation_id_idx" ON "conversation_messages"("conversation_id");
CREATE INDEX IF NOT EXISTS "conversation_messages_sender_id_idx" ON "conversation_messages"("sender_id");
CREATE INDEX IF NOT EXISTS "conversation_messages_created_at_idx" ON "conversation_messages"("created_at");

-- Add Unique Constraints
CREATE UNIQUE INDEX IF NOT EXISTS "coupons_seller_id_code_unique" ON "coupons"("seller_id", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "seller_analytics_seller_date_unique" ON "seller_analytics"("seller_id", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "bundle_products_bundle_product_unique" ON "bundle_products"("bundle_id", "product_id");

-- Migration Summary
DO $$ 
BEGIN
    RAISE NOTICE 'Enhanced Marketplace Features Migration Completed';
    RAISE NOTICE 'Added 14 new tables:';
    RAISE NOTICE '  - Wishlist system (wishlists, wishlist_items)';
    RAISE NOTICE '  - Search analytics (product_search_analytics)';
    RAISE NOTICE '  - Seller analytics (seller_analytics)';
    RAISE NOTICE '  - Product bundles (product_bundles, bundle_products)';
    RAISE NOTICE '  - Price tracking (price_history)';
    RAISE NOTICE '  - Shipping management (shipping_zones, shipping_rates)';
    RAISE NOTICE '  - Coupon system (coupons, coupon_usage)';
    RAISE NOTICE '  - Inventory management (inventory_movements, stock_alerts)';
    RAISE NOTICE '  - Communication system (conversations, conversation_messages)';
    RAISE NOTICE 'All tables include proper foreign keys, indexes, and constraints';
END $$;