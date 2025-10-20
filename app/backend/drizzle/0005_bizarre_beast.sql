-- Migration: Rename address to walletAddress and add physicalAddress
-- This migration renames the 'address' column to 'wallet_address' in users and reputations tables
-- and adds a 'physical_address' column to the users table for shipping/billing addresses
-- Uses conditional logic to avoid errors if columns already exist

-- Step 1: Add new columns (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='wallet_address') THEN
        ALTER TABLE "users" ADD COLUMN "wallet_address" varchar(66);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='physical_address') THEN
        ALTER TABLE "users" ADD COLUMN "physical_address" text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reputations' AND column_name='wallet_address') THEN
        ALTER TABLE "reputations" ADD COLUMN "wallet_address" varchar(66);
    END IF;
END $$;

-- Step 2: Copy data from old columns to new columns (only if old column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='address') THEN
        UPDATE "users" SET "wallet_address" = "address" WHERE "wallet_address" IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reputations' AND column_name='address') THEN
        UPDATE "reputations" SET "wallet_address" = "address" WHERE "wallet_address" IS NULL;
    END IF;
END $$;

-- Step 3: Add constraints to new columns (only if they don't exist)
DO $$
BEGIN
    -- Add NOT NULL constraint if wallet_address exists and doesn't have it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='wallet_address' AND is_nullable='YES') THEN
        ALTER TABLE "users" ALTER COLUMN "wallet_address" SET NOT NULL;
    END IF;

    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='users' AND constraint_name='users_wallet_address_unique') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address");
    END IF;

    -- Add NOT NULL constraint for reputations
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reputations' AND column_name='wallet_address' AND is_nullable='YES') THEN
        ALTER TABLE "reputations" ALTER COLUMN "wallet_address" SET NOT NULL;
    END IF;
END $$;

-- Step 4: Drop old constraints and columns (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='users' AND constraint_name='users_address_unique') THEN
        ALTER TABLE "users" DROP CONSTRAINT "users_address_unique";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='address') THEN
        ALTER TABLE "users" DROP COLUMN "address";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reputations' AND column_name='address') THEN
        ALTER TABLE "reputations" DROP COLUMN "address";
    END IF;
END $$;

-- Step 5: Set primary key for reputations table (if not already set)
DO $$
BEGIN
    -- Check if wallet_address is already the primary key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'reputations'
        AND tc.constraint_type = 'PRIMARY KEY'
        AND ccu.column_name = 'wallet_address'
    ) THEN
        -- Drop old primary key if exists
        ALTER TABLE "reputations" DROP CONSTRAINT IF EXISTS "reputations_pkey";
        -- Add new primary key
        ALTER TABLE "reputations" ADD CONSTRAINT "reputations_pkey" PRIMARY KEY ("wallet_address");
    END IF;
END $$;

-- Step 6: Update any indexes that referenced the old column names
-- Note: Drizzle will handle index recreation based on the new schema
