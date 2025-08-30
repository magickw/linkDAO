-- Migration: Rename address to walletAddress and add physicalAddress
-- This migration renames the 'address' column to 'wallet_address' in users and reputations tables
-- and adds a 'physical_address' column to the users table for shipping/billing addresses

-- Step 1: Add new columns
ALTER TABLE "users" ADD COLUMN "wallet_address" varchar(66);
ALTER TABLE "users" ADD COLUMN "physical_address" text;
ALTER TABLE "reputations" ADD COLUMN "wallet_address" varchar(66);

-- Step 2: Copy data from old columns to new columns
UPDATE "users" SET "wallet_address" = "address";
UPDATE "reputations" SET "wallet_address" = "address";

-- Step 3: Add constraints to new columns
ALTER TABLE "users" ALTER COLUMN "wallet_address" SET NOT NULL;
ALTER TABLE "users" ADD CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address");
ALTER TABLE "reputations" ALTER COLUMN "wallet_address" SET NOT NULL;

-- Step 4: Drop old constraints and columns
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_address_unique";
ALTER TABLE "users" DROP COLUMN "address";
ALTER TABLE "reputations" DROP COLUMN "address";

-- Step 5: Set primary key for reputations table
ALTER TABLE "reputations" DROP CONSTRAINT IF EXISTS "reputations_pkey";
ALTER TABLE "reputations" ADD CONSTRAINT "reputations_pkey" PRIMARY KEY ("wallet_address");

-- Step 6: Update any indexes that referenced the old column names
-- Note: Drizzle will handle index recreation based on the new schema