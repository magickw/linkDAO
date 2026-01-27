import { drizzle } from "drizzle-orm/postgres-js";
import { safeLogger } from '../utils/safeLogger';
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const connectionString = process.env.DATABASE_URL || "postgresql://username:password@localhost:5432/linkdao";
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);

  safeLogger.info("Running cart system migration...");
  
  try {
    // Cart system migration SQL
    const cartMigrationSQL = `
      -- Cart system tables for shopping cart functionality

      -- Cart table to store user shopping carts
      CREATE TABLE IF NOT EXISTS "carts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "session_id" varchar(255),
        "status" varchar(20) DEFAULT 'active' NOT NULL,
        "metadata" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );

      -- Cart items table to store individual items in carts
      CREATE TABLE IF NOT EXISTS "cart_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "cart_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "price_at_time" numeric(20,8) NOT NULL,
        "currency" varchar(10) NOT NULL,
        "metadata" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS "idx_carts_user_id" ON "carts" ("user_id");
      CREATE INDEX IF NOT EXISTS "idx_carts_session_id" ON "carts" ("session_id");
      CREATE INDEX IF NOT EXISTS "idx_carts_status" ON "carts" ("status");
      CREATE INDEX IF NOT EXISTS "idx_cart_items_cart_id" ON "cart_items" ("cart_id");
      CREATE INDEX IF NOT EXISTS "idx_cart_items_product_id" ON "cart_items" ("product_id");

      -- Add foreign key constraints
      DO $$ BEGIN
       ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
       ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
       ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;

      -- Add unique constraint to prevent duplicate items in the same cart
      DO $$ BEGIN
       ALTER TABLE "cart_items" ADD CONSTRAINT "unique_cart_product" UNIQUE ("cart_id", "product_id");
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `;

    await client.unsafe(cartMigrationSQL);
    safeLogger.info("Cart system migration completed successfully!");
  } catch (error) {
    safeLogger.error("Error running cart migration:", error);
  } finally {
    await client.end();
  }
}

main();
