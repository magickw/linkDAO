-- Order Events Table
CREATE TABLE IF NOT EXISTS "order_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer,
	"event_type" varchar(64) NOT NULL,
	"description" text,
	"metadata" text,
	"timestamp" timestamp DEFAULT now()
);

-- Tracking Records Table
CREATE TABLE IF NOT EXISTS "tracking_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer,
	"tracking_number" varchar(128) NOT NULL,
	"carrier" varchar(32) NOT NULL,
	"status" varchar(64),
	"events" text,
	"created_at" timestamp DEFAULT now(),
	"last_updated" timestamp DEFAULT now()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" varchar(64),
	"user_address" varchar(66) NOT NULL,
	"type" varchar(64) NOT NULL,
	"message" text NOT NULL,
	"metadata" text,
	"read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"preferences" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_preferences_user_address_unique" UNIQUE("user_address")
);

-- Push Tokens Table
CREATE TABLE IF NOT EXISTS "push_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"token" varchar(255) NOT NULL,
	"platform" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now()
);

-- Blockchain Events Table
CREATE TABLE IF NOT EXISTS "blockchain_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" varchar(64),
	"escrow_id" varchar(64),
	"event_type" varchar(64) NOT NULL,
	"transaction_hash" varchar(66) NOT NULL,
	"block_number" integer NOT NULL,
	"timestamp" timestamp NOT NULL,
	"data" text,
	"created_at" timestamp DEFAULT now()
);

-- Sync Status Table
CREATE TABLE IF NOT EXISTS "sync_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(64) NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "sync_status_key_unique" UNIQUE("key")
);

-- Add Foreign Key Constraints
DO $$ BEGIN
 ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "tracking_records" ADD CONSTRAINT "tracking_records_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS "idx_order_events_order_id" ON "order_events"("order_id");
CREATE INDEX IF NOT EXISTS "idx_order_events_timestamp" ON "order_events"("timestamp");
CREATE INDEX IF NOT EXISTS "idx_tracking_records_order_id" ON "tracking_records"("order_id");
CREATE INDEX IF NOT EXISTS "idx_tracking_records_tracking_number" ON "tracking_records"("tracking_number");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_address" ON "notifications"("user_address");
CREATE INDEX IF NOT EXISTS "idx_notifications_read" ON "notifications"("read");
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications"("created_at");
CREATE INDEX IF NOT EXISTS "idx_blockchain_events_order_id" ON "blockchain_events"("order_id");
CREATE INDEX IF NOT EXISTS "idx_blockchain_events_escrow_id" ON "blockchain_events"("escrow_id");
CREATE INDEX IF NOT EXISTS "idx_blockchain_events_transaction_hash" ON "blockchain_events"("transaction_hash");
CREATE INDEX IF NOT EXISTS "idx_blockchain_events_block_number" ON "blockchain_events"("block_number");