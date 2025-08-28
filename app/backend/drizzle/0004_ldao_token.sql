-- Add reward_epochs table for tracking reward distribution epochs
CREATE TABLE IF NOT EXISTS "reward_epochs" (
	"id" serial PRIMARY KEY NOT NULL,
	"epoch" integer NOT NULL,
	"funded_amount" numeric DEFAULT '0',
	"start_at" timestamp,
	"end_at" timestamp
);

-- Add creator_rewards table for tracking creator rewards
CREATE TABLE IF NOT EXISTS "creator_rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"epoch" integer NOT NULL,
	"user_id" uuid,
	"earned" numeric DEFAULT '0',
	"claimed_at" timestamp,
	CONSTRAINT "creator_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "creator_rewards_user_id_idx" ON "creator_rewards" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "creator_rewards_epoch_idx" ON "creator_rewards" USING btree ("epoch");
CREATE INDEX IF NOT EXISTS "reward_epochs_epoch_idx" ON "reward_epochs" USING btree ("epoch");

-- Update tips table to ensure it has the correct structure
ALTER TABLE "tips" ADD COLUMN IF NOT EXISTS "post_id" integer;
ALTER TABLE "tips" ADD COLUMN IF NOT EXISTS "from_user_id" uuid;
ALTER TABLE "tips" ADD COLUMN IF NOT EXISTS "to_user_id" uuid;
ALTER TABLE "tips" ADD COLUMN IF NOT EXISTS "token" varchar(64) NOT NULL DEFAULT 'LDAO';
ALTER TABLE "tips" ADD COLUMN IF NOT EXISTS "amount" numeric NOT NULL;
ALTER TABLE "tips" ADD COLUMN IF NOT EXISTS "message" text;
ALTER TABLE "tips" ADD COLUMN IF NOT EXISTS "tx_hash" varchar(66);
ALTER TABLE "tips" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();

-- Add foreign key constraints to tips table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tips_post_id_posts_id_fk') THEN
        ALTER TABLE "tips" ADD CONSTRAINT "tips_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tips_from_user_id_users_id_fk') THEN
        ALTER TABLE "tips" ADD CONSTRAINT "tips_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tips_to_user_id_users_id_fk') THEN
        ALTER TABLE "tips" ADD CONSTRAINT "tips_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;

-- Add indexes to tips table
CREATE INDEX IF NOT EXISTS "tips_post_id_idx" ON "tips" USING btree ("post_id");
CREATE INDEX IF NOT EXISTS "tips_from_user_id_idx" ON "tips" USING btree ("from_user_id");
CREATE INDEX IF NOT EXISTS "tips_to_user_id_idx" ON "tips" USING btree ("to_user_id");
CREATE INDEX IF NOT EXISTS "tips_token_idx" ON "tips" USING btree ("token");