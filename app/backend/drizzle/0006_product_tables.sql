-- Migration: Add Product Management Tables
-- This migration adds the core product management functionality including:
-- - categories: Product categories with hierarchical structure
-- - products: Main product table with comprehensive metadata
-- - product_tags: Tag system for efficient product searching

-- Create Categories Table
DROP TABLE IF EXISTS "categories" CASCADE;
CREATE TABLE IF NOT EXISTS "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"parent_id" uuid,
	"path" text NOT NULL,
	"image_url" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);

-- Create Products Table
DROP TABLE IF EXISTS "products" CASCADE;
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text NOT NULL,
	"price_amount" numeric(20, 8) NOT NULL,
	"price_currency" varchar(10) NOT NULL,
	"category_id" uuid NOT NULL,
	"images" text NOT NULL,
	"metadata" text NOT NULL,
	"inventory" integer DEFAULT 0 NOT NULL,
	"status" varchar(32) DEFAULT 'active',
	"tags" text,
	"shipping" text,
	"nft" text,
	"views" integer DEFAULT 0,
	"favorites" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Create Product Tags Table for efficient searching
CREATE TABLE IF NOT EXISTS "product_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"tag" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now()
);

-- Add Foreign Key Constraints
DO $$ BEGIN
	ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" 
	FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "products" ADD CONSTRAINT "products_seller_id_users_id_fk" 
	FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" 
	FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_product_id_products_id_fk" 
	FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS "product_tag_idx" ON "product_tags" USING btree ("product_id","tag");
CREATE INDEX IF NOT EXISTS "tag_idx" ON "product_tags" USING btree ("tag");
CREATE INDEX IF NOT EXISTS "product_title_idx" ON "products" USING btree ("title");
CREATE INDEX IF NOT EXISTS "product_status_idx" ON "products" USING btree ("status");
CREATE INDEX IF NOT EXISTS "product_category_idx" ON "products" USING btree ("category_id");
CREATE INDEX IF NOT EXISTS "product_seller_idx" ON "products" USING btree ("seller_id");
CREATE INDEX IF NOT EXISTS "product_price_idx" ON "products" USING btree ("price_amount");
CREATE INDEX IF NOT EXISTS "product_created_at_idx" ON "products" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "product_inventory_idx" ON "products" USING btree ("inventory");

-- Add product_id column to existing listings table to link with products
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "product_id" uuid;
DO $$ BEGIN
	ALTER TABLE "listings" ADD CONSTRAINT "listings_product_id_products_id_fk" 
	FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

-- Insert some default categories
INSERT INTO "categories" ("name", "slug", "description", "path", "sort_order") VALUES
	('Electronics', 'electronics', 'Electronic devices and accessories', '["Electronics"]', 1),
	('Computers', 'computers', 'Computers and computer accessories', '["Electronics", "Computers"]', 1),
	('Smartphones', 'smartphones', 'Mobile phones and accessories', '["Electronics", "Smartphones"]', 2),
	('Gaming', 'gaming', 'Gaming consoles and accessories', '["Electronics", "Gaming"]', 3),
	('Fashion', 'fashion', 'Clothing and fashion accessories', '["Fashion"]', 2),
	('Home & Garden', 'home-garden', 'Home improvement and garden supplies', '["Home & Garden"]', 3),
	('Books', 'books', 'Books and educational materials', '["Books"]', 4),
	('Sports', 'sports', 'Sports equipment and accessories', '["Sports"]', 5),
	('Art & Collectibles', 'art-collectibles', 'Artwork and collectible items', '["Art & Collectibles"]', 6),
	('Digital Assets', 'digital-assets', 'NFTs and digital collectibles', '["Digital Assets"]', 7)
ON CONFLICT (slug) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE "categories" IS 'Product categories with hierarchical structure';
COMMENT ON TABLE "products" IS 'Main product catalog with comprehensive metadata';
COMMENT ON TABLE "product_tags" IS 'Tag system for efficient product searching and filtering';

COMMENT ON COLUMN "categories"."path" IS 'JSON array representing the full category path for breadcrumbs';
COMMENT ON COLUMN "products"."images" IS 'JSON array of IPFS hashes for product images';
COMMENT ON COLUMN "products"."metadata" IS 'JSON object containing detailed product metadata (weight, dimensions, etc.)';
COMMENT ON COLUMN "products"."tags" IS 'JSON array of product tags for searching';
COMMENT ON COLUMN "products"."shipping" IS 'JSON object containing shipping information';
COMMENT ON COLUMN "products"."nft" IS 'JSON object containing NFT-specific information if applicable';