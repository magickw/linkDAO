#!/usr/bin/env tsx

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
dotenv.config();

async function runProductMigration() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  console.log("🚀 Starting product tables migration...");

  try {
    // Create connection
    const sql = postgres(connectionString, {
      max: 1,
      onnotice: () => {}, // Suppress notices
    });

    const db = drizzle(sql);

    // Execute migration step by step
    console.log("📝 Executing product migration...");

    // Step 1: Create Categories Table
    console.log("   1/6: Creating categories table...");
    try {
      await sql`
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
        )
      `;
    } catch (error: any) {
      if (error.code !== '42P07') throw error;
      console.log("   ⚠️  Categories table already exists");
    }

    // Step 2: Create Products Table
    console.log("   2/6: Creating products table...");
    try {
      await sql`
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
        )
      `;
    } catch (error: any) {
      if (error.code !== '42P07') throw error;
      console.log("   ⚠️  Products table already exists");
    }

    // Step 3: Create Product Tags Table
    console.log("   3/6: Creating product_tags table...");
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS "product_tags" (
          "id" serial PRIMARY KEY NOT NULL,
          "product_id" uuid NOT NULL,
          "tag" varchar(100) NOT NULL,
          "created_at" timestamp DEFAULT now()
        )
      `;
    } catch (error: any) {
      if (error.code !== '42P07') throw error;
      console.log("   ⚠️  Product tags table already exists");
    }

    // Step 4: Add Foreign Key Constraints
    console.log("   4/6: Adding foreign key constraints...");
    const constraints = [
      {
        name: "categories_parent_id_categories_id_fk",
        sql: `ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" 
              FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE ON UPDATE CASCADE`
      },
      {
        name: "products_seller_id_users_id_fk", 
        sql: `ALTER TABLE "products" ADD CONSTRAINT "products_seller_id_users_id_fk" 
              FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE`
      },
      {
        name: "products_category_id_categories_id_fk",
        sql: `ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" 
              FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE`
      },
      {
        name: "product_tags_product_id_products_id_fk",
        sql: `ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_product_id_products_id_fk" 
              FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE`
      }
    ];

    for (const constraint of constraints) {
      try {
        await sql.unsafe(constraint.sql);
      } catch (error: any) {
        if (error.code === '42710') {
          console.log(`   ⚠️  Constraint ${constraint.name} already exists`);
        } else {
          throw error;
        }
      }
    }

    // Step 5: Create Indexes
    console.log("   5/6: Creating indexes...");
    const indexes = [
      'CREATE INDEX IF NOT EXISTS "product_tag_idx" ON "product_tags" USING btree ("product_id","tag")',
      'CREATE INDEX IF NOT EXISTS "tag_idx" ON "product_tags" USING btree ("tag")',
      'CREATE INDEX IF NOT EXISTS "product_title_idx" ON "products" USING btree ("title")',
      'CREATE INDEX IF NOT EXISTS "product_status_idx" ON "products" USING btree ("status")',
      'CREATE INDEX IF NOT EXISTS "product_category_idx" ON "products" USING btree ("category_id")',
      'CREATE INDEX IF NOT EXISTS "product_seller_idx" ON "products" USING btree ("seller_id")',
      'CREATE INDEX IF NOT EXISTS "product_price_idx" ON "products" USING btree ("price_amount")',
      'CREATE INDEX IF NOT EXISTS "product_created_at_idx" ON "products" USING btree ("created_at")',
      'CREATE INDEX IF NOT EXISTS "product_inventory_idx" ON "products" USING btree ("inventory")'
    ];

    for (const indexSql of indexes) {
      try {
        await sql.unsafe(indexSql);
      } catch (error: any) {
        if (error.code === '42P07') {
          console.log(`   ⚠️  Index already exists`);
        } else {
          throw error;
        }
      }
    }

    // Step 6: Add product_id to listings table and insert default categories
    console.log("   6/6: Adding product_id to listings and inserting default categories...");
    
    try {
      await sql`ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "product_id" uuid`;
      await sql`
        ALTER TABLE "listings" 
        ADD CONSTRAINT "listings_product_id_products_id_fk" 
        FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE
      `;
    } catch (error: any) {
      if (error.code === '42701' || error.code === '42710') {
        console.log(`   ⚠️  Listings modifications already exist`);
      } else {
        throw error;
      }
    }

    // Insert default categories
    try {
      await sql`
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
        ON CONFLICT (slug) DO NOTHING
      `;
    } catch (error: any) {
      console.log(`   ⚠️  Default categories may already exist: ${error.message}`);
    }

    // Verify tables were created
    console.log("🔍 Verifying table creation...");
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('categories', 'products', 'product_tags')
      ORDER BY table_name;
    `;

    console.log("✅ Created tables:");
    tables.forEach((table: any) => {
      console.log(`   - ${table.table_name}`);
    });

    // Check category count
    const categoryCount = await sql`SELECT COUNT(*) as count FROM categories`;
    console.log(`📊 Default categories inserted: ${categoryCount[0].count}`);

    await sql.end();
    console.log("🎉 Product migration completed successfully!");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  runProductMigration();
}

export { runProductMigration };