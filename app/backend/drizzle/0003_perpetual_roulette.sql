-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "bots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128),
	"persona" text,
	"scopes" text,
	"model" varchar(64),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"object_type" varchar(32),
	"object_id" integer,
	"embedding" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" uuid,
	"content_cid" text NOT NULL,
	"parent_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"dao_id" uuid,
	"title_cid" text,
	"body_cid" text,
	"start_block" integer,
	"end_block" integer,
	"status" varchar(32) DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"from" uuid,
	"to" uuid,
	"token" varchar(64) NOT NULL,
	"amount" varchar(128) NOT NULL,
	"tx_hash" varchar(66),
	"memo" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reputations" (
	"address" varchar(66) PRIMARY KEY NOT NULL,
	"score" integer NOT NULL,
	"dao_approved" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" varchar(66) NOT NULL,
	"handle" varchar(64),
	"profile_cid" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_address_unique" UNIQUE("address"),
	CONSTRAINT "users_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer,
	"tag" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "escrows" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" integer,
	"buyer_id" uuid,
	"seller_id" uuid,
	"amount" numeric NOT NULL,
	"buyer_approved" boolean DEFAULT false,
	"seller_approved" boolean DEFAULT false,
	"dispute_opened" boolean DEFAULT false,
	"resolver_address" varchar(66),
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"delivery_info" text,
	"delivery_confirmed" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" integer,
	"buyer_id" uuid,
	"amount" numeric NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"accepted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" serial PRIMARY KEY NOT NULL,
	"escrow_id" integer,
	"reporter_id" uuid,
	"reason" text,
	"status" varchar(32) DEFAULT 'open',
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"resolution" text,
	"evidence" text
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" integer,
	"buyer_id" uuid,
	"seller_id" uuid,
	"escrow_id" integer,
	"amount" numeric NOT NULL,
	"payment_token" varchar(66),
	"status" varchar(32) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer,
	"user_id" uuid,
	"type" varchar(32) NOT NULL,
	"amount" numeric NOT NULL,
	"rewards_earned" numeric DEFAULT '0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tips" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer,
	"from_user_id" uuid,
	"to_user_id" uuid,
	"token" varchar(64) NOT NULL,
	"amount" numeric NOT NULL,
	"message" text,
	"tx_hash" varchar(66),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_moderation" (
	"id" serial PRIMARY KEY NOT NULL,
	"object_type" varchar(32) NOT NULL,
	"object_id" integer NOT NULL,
	"status" varchar(32) DEFAULT 'pending',
	"ai_analysis" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_id" uuid,
	"token_address" varchar(66) NOT NULL,
	"price" numeric NOT NULL,
	"quantity" integer NOT NULL,
	"item_type" varchar(32) NOT NULL,
	"listing_type" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'active',
	"start_time" timestamp DEFAULT now(),
	"end_time" timestamp,
	"metadata_uri" text NOT NULL,
	"is_escrowed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"nft_standard" varchar(32),
	"token_id" varchar(128),
	"highest_bid" numeric,
	"highest_bidder" varchar(66),
	"reserve_price" numeric,
	"min_increment" numeric,
	"reserve_met" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "bids" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" integer,
	"bidder_id" uuid,
	"amount" numeric NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "follows_follower_id_following_id_pk" PRIMARY KEY("follower_id","following_id")
);
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_from_users_id_fk" FOREIGN KEY ("from") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_to_users_id_fk" FOREIGN KEY ("to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_bidder_id_users_id_fk" FOREIGN KEY ("bidder_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "follow_idx" ON "follows" USING btree ("follower_id" uuid_ops,"following_id" uuid_ops);
*/