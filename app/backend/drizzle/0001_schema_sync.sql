-- Migration to sync database with current schema.ts
-- This adds missing tables and fields to match the latest schema definition

-- Add missing NFT and auction fields to listings table
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "nft_standard" VARCHAR(32);
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "token_id" VARCHAR(128);
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "highest_bid" NUMERIC;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "highest_bidder" VARCHAR(66);
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "reserve_price" NUMERIC;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "min_increment" NUMERIC;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "reserve_met" BOOLEAN NOT NULL DEFAULT false;

-- Add delivery tracking fields to escrows table  
ALTER TABLE "escrows" ADD COLUMN IF NOT EXISTS "delivery_info" TEXT;
ALTER TABLE "escrows" ADD COLUMN IF NOT EXISTS "delivery_confirmed" BOOLEAN NOT NULL DEFAULT false;

-- Create missing offers table
CREATE TABLE IF NOT EXISTS "offers" (
    "id" SERIAL NOT NULL,
    "listing_id" INTEGER,
    "buyer_id" UUID,
    "amount" NUMERIC NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    
    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- Create missing disputes table
CREATE TABLE IF NOT EXISTS "disputes" (
    "id" SERIAL NOT NULL,
    "escrow_id" INTEGER,
    "reporter_id" UUID,
    "reason" TEXT,
    "status" VARCHAR(32) DEFAULT 'open',
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP,
    "resolution" TEXT,
    
    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- Add evidence tracking field to disputes table
ALTER TABLE "disputes" ADD COLUMN IF NOT EXISTS "evidence" TEXT;

-- Create missing AI moderation table
CREATE TABLE IF NOT EXISTS "ai_moderation" (
    "id" SERIAL NOT NULL,
    "object_type" VARCHAR(32) NOT NULL,
    "object_id" INTEGER NOT NULL,
    "status" VARCHAR(32) DEFAULT 'pending',
    "ai_analysis" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "ai_moderation_pkey" PRIMARY KEY ("id")
);

-- Create missing orders table  
CREATE TABLE IF NOT EXISTS "orders" (
    "id" SERIAL NOT NULL,
    "listing_id" INTEGER,
    "buyer_id" UUID,
    "seller_id" UUID,
    "escrow_id" INTEGER,
    "amount" NUMERIC NOT NULL,
    "payment_token" VARCHAR(66),
    "status" VARCHAR(32) DEFAULT 'pending',
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints for new tables

-- Offers foreign keys
ALTER TABLE "offers" ADD CONSTRAINT "offers_listing_id_fkey" 
    FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "offers" ADD CONSTRAINT "offers_buyer_id_fkey" 
    FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Disputes foreign keys  
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_escrow_id_fkey" 
    FOREIGN KEY ("escrow_id") REFERENCES "escrows"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_reporter_id_fkey" 
    FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Orders foreign keys
ALTER TABLE "orders" ADD CONSTRAINT "orders_listing_id_fkey" 
    FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_fkey" 
    FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_fkey" 
    FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_escrow_id_fkey" 
    FOREIGN KEY ("escrow_id") REFERENCES "escrows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update existing numeric fields from VARCHAR to NUMERIC for better precision
-- Note: This requires careful data migration if existing data is present

-- Update listings price field
DO $$ 
BEGIN
  -- Only attempt if the column is VARCHAR type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'price' AND data_type = 'character varying'
  ) THEN
    ALTER TABLE "listings" ALTER COLUMN "price" TYPE NUMERIC USING "price"::NUMERIC;
  END IF;
END $$;

-- Update bids amount field  
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bids' AND column_name = 'amount' AND data_type = 'character varying'
  ) THEN
    ALTER TABLE "bids" ALTER COLUMN "amount" TYPE NUMERIC USING "amount"::NUMERIC;
  END IF;
END $$;

-- Update escrows amount field
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'escrows' AND column_name = 'amount' AND data_type = 'character varying'
  ) THEN
    ALTER TABLE "escrows" ALTER COLUMN "amount" TYPE NUMERIC USING "amount"::NUMERIC;
  END IF;
END $$;

-- Update embeddings table to use TEXT instead of vector for cross-compatibility
-- This allows the schema to work without pgvector extension
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'embeddings' AND column_name = 'embedding' AND data_type != 'text'
  ) THEN
    -- First create a backup column
    ALTER TABLE "embeddings" ADD COLUMN IF NOT EXISTS "embedding_backup" vector(1536);
    UPDATE "embeddings" SET "embedding_backup" = "embedding";
    
    -- Change to text type 
    ALTER TABLE "embeddings" ALTER COLUMN "embedding" TYPE TEXT;
    
    -- Note: Manual data migration may be needed to convert vector to JSON text format
  END IF;
END $$;