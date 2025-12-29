CREATE TABLE "contact_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"icon" varchar(50),
	"color" varchar(7),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_tags" (
	"contact_id" uuid NOT NULL,
	"tag" varchar(64) NOT NULL,
	CONSTRAINT "contact_tags_contact_id_tag_pk" PRIMARY KEY("contact_id","tag")
);
--> statement-breakpoint
CREATE TABLE "contact_to_groups" (
	"contact_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	CONSTRAINT "contact_to_groups_contact_id_group_id_pk" PRIMARY KEY("contact_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"wallet_address" varchar(66) NOT NULL,
	"nickname" varchar(255) NOT NULL,
	"ens_name" varchar(255),
	"avatar" text,
	"notes" text,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gold_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(66) NOT NULL,
	"amount" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"price" numeric(10, 2),
	"payment_method" varchar(50),
	"payment_intent_id" varchar(255),
	"reference_id" varchar(255),
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"metadata" jsonb,
	"order_id" varchar(255),
	"network" varchar(50),
	"transaction_hash" varchar(66),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "gold_transaction_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"held_by" uuid,
	"quantity" integer NOT NULL,
	"order_id" varchar(255),
	"hold_type" varchar(50) DEFAULT 'order_pending',
	"expires_at" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"metadata" text,
	"release_reason" varchar(50),
	"released_at" timestamp,
	"checkout_session_id" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reaction_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"reaction_type" varchar(32) NOT NULL,
	"price" numeric(20, 8) NOT NULL,
	"author_earnings" numeric(20, 8) NOT NULL,
	"treasury_fee" numeric(20, 8) NOT NULL,
	"post_author" varchar(66) NOT NULL,
	"tx_hash" varchar(66),
	"purchased_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "seller_tier_benefits" (
	"id" serial PRIMARY KEY NOT NULL,
	"tier" varchar(20) NOT NULL,
	"benefit_type" varchar(50) NOT NULL,
	"benefit_value" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "seller_tier_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_wallet_address" varchar(66) NOT NULL,
	"from_tier" varchar(20) NOT NULL,
	"to_tier" varchar(20) NOT NULL,
	"upgrade_reason" text,
	"auto_upgraded" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "seller_tier_progression" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_wallet_address" varchar(66) NOT NULL,
	"current_tier" varchar(20) NOT NULL,
	"next_eligible_tier" varchar(20),
	"progress_percentage" numeric(5, 2) DEFAULT '0',
	"requirements_met" integer DEFAULT 0,
	"total_requirements" integer DEFAULT 0,
	"last_evaluation_at" timestamp DEFAULT now(),
	"next_evaluation_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "seller_tier_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"tier" varchar(20) NOT NULL,
	"requirement_type" varchar(50) NOT NULL,
	"required_value" numeric(20, 8) NOT NULL,
	"current_value" numeric(20, 8) DEFAULT '0',
	"description" text,
	"is_met" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_gold_balance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(66) NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"total_purchased" integer DEFAULT 0 NOT NULL,
	"total_spent" integer DEFAULT 0 NOT NULL,
	"last_purchase_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_gold_balance_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "org_verification" (
	"org_id" uuid NOT NULL,
	"status" varchar(32) DEFAULT 'verified' NOT NULL,
	"badge_type" varchar(32) DEFAULT 'gold_check' NOT NULL,
	"verified_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"contact_email" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "org_verification_org_id_pk" PRIMARY KEY("org_id")
);
--> statement-breakpoint
CREATE TABLE "user_verification" (
	"user_id" uuid NOT NULL,
	"status" varchar(32) DEFAULT 'verified' NOT NULL,
	"badge_type" varchar(32) DEFAULT 'blue_check' NOT NULL,
	"verified_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"verification_method" varchar(64),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_verification_user_id_pk" PRIMARY KEY("user_id")
);
--> statement-breakpoint
CREATE TABLE "verification_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"document_type" varchar(64) NOT NULL,
	"document_url" text NOT NULL,
	"document_hash" varchar(128),
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "verification_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(32) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(32) NOT NULL,
	"actor_id" uuid,
	"prev_status" varchar(32),
	"new_status" varchar(32),
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "verification_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_type" varchar(32) NOT NULL,
	"entity_id" uuid,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"category" varchar(64),
	"description" text,
	"website" varchar(500),
	"social_proof" jsonb,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"rejection_reason" text,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "dispute_judges" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketplace_analytics" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketplace_disputes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketplace_orders" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketplace_products" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketplace_reviews" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "review_helpfulness" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "review_reports" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "dispute_judges" CASCADE;--> statement-breakpoint
DROP TABLE "marketplace_analytics" CASCADE;--> statement-breakpoint
DROP TABLE "marketplace_disputes" CASCADE;--> statement-breakpoint
DROP TABLE "marketplace_orders" CASCADE;--> statement-breakpoint
DROP TABLE "marketplace_products" CASCADE;--> statement-breakpoint
DROP TABLE "marketplace_reviews" CASCADE;--> statement-breakpoint
DROP TABLE "review_helpfulness" CASCADE;--> statement-breakpoint
DROP TABLE "review_reports" CASCADE;--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_listing_id_listings_id_fk";
--> statement-breakpoint
DROP INDEX "idx_ens_verifications_ens_handle";--> statement-breakpoint
DROP INDEX "idx_ens_verifications_is_active";--> statement-breakpoint
DROP INDEX "idx_ens_verifications_unique_active";--> statement-breakpoint
ALTER TABLE "bookmarks" ALTER COLUMN "post_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "post_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "community_creator_rewards" ALTER COLUMN "post_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "community_token_gated_content" ALTER COLUMN "post_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "ens_verifications" ALTER COLUMN "verified_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "ens_verifications" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ens_verifications" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "polls" ALTER COLUMN "post_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "post_tags" ALTER COLUMN "post_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "reactions" ALTER COLUMN "post_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "seller_verifications" ALTER COLUMN "current_tier" SET DEFAULT 'bronze';--> statement-breakpoint
ALTER TABLE "seller_verifications" ALTER COLUMN "status" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "seller_verifications" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "seller_verifications" ALTER COLUMN "verification_method" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "seller_verifications" ALTER COLUMN "risk_score" SET DATA TYPE varchar(10);--> statement-breakpoint
ALTER TABLE "seller_verifications" ALTER COLUMN "progress_status" SET DATA TYPE varchar(30);--> statement-breakpoint
ALTER TABLE "seller_verifications" ALTER COLUMN "progress_status" SET DEFAULT 'submitted';--> statement-breakpoint
ALTER TABLE "sellers" ALTER COLUMN "tier" SET DEFAULT 'bronze';--> statement-breakpoint
ALTER TABLE "shares" ALTER COLUMN "post_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "tips" ALTER COLUMN "post_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "views" ALTER COLUMN "post_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "is_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "ens_verifications" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "ens_verifications" ADD COLUMN "ens_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "ens_verifications" ADD COLUMN "resolved_address" varchar(66) NOT NULL;--> statement-breakpoint
ALTER TABLE "ens_verifications" ADD COLUMN "is_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ens_verifications" ADD COLUMN "last_checked_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "ens_verifications" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "inventory_holds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "buyer_address" varchar(66);--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD COLUMN "items" jsonb;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD COLUMN "subtotal" numeric(20, 8) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD COLUMN "shipping" numeric(20, 8) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD COLUMN "tax" numeric(20, 8) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD COLUMN "seller_name" varchar(255);--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD COLUMN "tokens_purchased" varchar(255);--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD COLUMN "price_per_token" varchar(50);--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "share_id" varchar(16);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "inventory_holds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "main_category" varchar(50);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sub_category" varchar(100);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_physical" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "price_fiat" numeric(20, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "metadata_uri" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "defi_protocol" varchar(100);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "defi_asset_type" varchar(50);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "underlying_assets" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "current_apy" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "lock_period" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "maturity_date" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "risk_level" varchar(20) DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "weight" numeric(10, 3);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "dimensions" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "condition" varchar(20) DEFAULT 'new';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "service_duration" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "delivery_method" varchar(20);--> statement-breakpoint
ALTER TABLE "quick_posts" ADD COLUMN "share_id" varchar(16) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_employee" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "employee_status" varchar(20) DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invited_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invited_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "contact_groups" ADD CONSTRAINT "contact_groups_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_to_groups" ADD CONSTRAINT "contact_to_groups_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_to_groups" ADD CONSTRAINT "contact_to_groups_group_id_contact_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."contact_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_holds" ADD CONSTRAINT "inventory_holds_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_holds" ADD CONSTRAINT "inventory_holds_held_by_users_id_fk" FOREIGN KEY ("held_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaction_purchases" ADD CONSTRAINT "reaction_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_verification" ADD CONSTRAINT "user_verification_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_request_id_verification_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."verification_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_contact_groups_owner_name" ON "contact_groups" USING btree ("owner_id","name");--> statement-breakpoint
CREATE INDEX "idx_contacts_owner_wallet" ON "contacts" USING btree ("owner_id","wallet_address");--> statement-breakpoint
CREATE INDEX "idx_contacts_owner_id" ON "contacts" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_gold_transaction_user" ON "gold_transaction" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gold_transaction_type" ON "gold_transaction" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_gold_transaction_status" ON "gold_transaction" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_gold_transaction_created" ON "gold_transaction" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_gold_transaction_network" ON "gold_transaction" USING btree ("network");--> statement-breakpoint
CREATE INDEX "idx_gold_transaction_hash" ON "gold_transaction" USING btree ("transaction_hash");--> statement-breakpoint
CREATE INDEX "idx_gold_transaction_order_network" ON "gold_transaction" USING btree ("order_id","network");--> statement-breakpoint
CREATE INDEX "idx_inventory_holds_product_id" ON "inventory_holds" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_holds_held_by" ON "inventory_holds" USING btree ("held_by");--> statement-breakpoint
CREATE INDEX "idx_inventory_holds_order_id" ON "inventory_holds" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_holds_expires_at" ON "inventory_holds" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_inventory_holds_status" ON "inventory_holds" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_inventory_holds_hold_type" ON "inventory_holds" USING btree ("hold_type");--> statement-breakpoint
CREATE INDEX "idx_reaction_purchases_post_id" ON "reaction_purchases" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_reaction_purchases_user_id" ON "reaction_purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_reaction_purchases_user_address" ON "reaction_purchases" USING btree ("user_address");--> statement-breakpoint
CREATE INDEX "idx_reaction_purchases_post_author" ON "reaction_purchases" USING btree ("post_author");--> statement-breakpoint
CREATE INDEX "idx_reaction_purchases_reaction_type" ON "reaction_purchases" USING btree ("reaction_type");--> statement-breakpoint
CREATE INDEX "idx_reaction_purchases_purchased_at" ON "reaction_purchases" USING btree ("purchased_at");--> statement-breakpoint
CREATE INDEX "idx_reaction_purchases_tx_hash" ON "reaction_purchases" USING btree ("tx_hash");--> statement-breakpoint
CREATE INDEX "idx_reaction_purchases_post_type" ON "reaction_purchases" USING btree ("post_id","reaction_type");--> statement-breakpoint
CREATE INDEX "idx_reaction_purchases_user_post" ON "reaction_purchases" USING btree ("user_id","post_id");--> statement-breakpoint
CREATE INDEX "idx_reaction_purchases_author_earnings" ON "reaction_purchases" USING btree ("post_author","purchased_at");--> statement-breakpoint
CREATE INDEX "idx_seller_tier_benefits_tier" ON "seller_tier_benefits" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "idx_seller_tier_benefits_type" ON "seller_tier_benefits" USING btree ("benefit_type");--> statement-breakpoint
CREATE INDEX "idx_seller_tier_history_seller" ON "seller_tier_history" USING btree ("seller_wallet_address");--> statement-breakpoint
CREATE INDEX "idx_seller_tier_history_created_at" ON "seller_tier_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_seller_tier_progression_seller" ON "seller_tier_progression" USING btree ("seller_wallet_address");--> statement-breakpoint
CREATE INDEX "idx_seller_tier_progression_current_tier" ON "seller_tier_progression" USING btree ("current_tier");--> statement-breakpoint
CREATE INDEX "idx_seller_tier_progression_next_evaluation" ON "seller_tier_progression" USING btree ("next_evaluation_at");--> statement-breakpoint
CREATE INDEX "idx_seller_tier_requirements_tier" ON "seller_tier_requirements" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "idx_seller_tier_requirements_type" ON "seller_tier_requirements" USING btree ("requirement_type");--> statement-breakpoint
CREATE INDEX "idx_user_gold_balance_user" ON "user_gold_balance" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_org_verif_status" ON "org_verification" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_user_verif_status" ON "user_verification" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_verif_doc_request" ON "verification_documents" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_verif_hist_entity" ON "verification_history" USING btree ("entity_id","entity_type");--> statement-breakpoint
CREATE INDEX "idx_verif_req_user_status" ON "verification_requests" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_verif_req_status" ON "verification_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_verif_req_entity_type" ON "verification_requests" USING btree ("entity_type");--> statement-breakpoint
ALTER TABLE "ens_verifications" ADD CONSTRAINT "ens_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_listing_id_products_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ens_verifications_user_id" ON "ens_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ens_verifications_ens_name" ON "ens_verifications" USING btree ("ens_name");--> statement-breakpoint
CREATE INDEX "idx_ens_verifications_is_verified" ON "ens_verifications" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX "idx_orders_buyer_address" ON "orders" USING btree ("buyer_address");--> statement-breakpoint
CREATE INDEX "idx_payment_receipts_seller_name" ON "payment_receipts" USING btree ("seller_name");--> statement-breakpoint
CREATE INDEX "idx_payment_receipts_tokens_purchased" ON "payment_receipts" USING btree ("tokens_purchased");--> statement-breakpoint
CREATE INDEX "idx_payment_receipts_price_per_token" ON "payment_receipts" USING btree ("price_per_token");--> statement-breakpoint
CREATE INDEX "idx_posts_share_id" ON "posts" USING btree ("share_id");--> statement-breakpoint
CREATE INDEX "idx_products_main_category" ON "products" USING btree ("main_category");--> statement-breakpoint
CREATE INDEX "idx_quick_posts_share_id" ON "quick_posts" USING btree ("share_id");--> statement-breakpoint
ALTER TABLE "ens_verifications" DROP COLUMN "ens_handle";--> statement-breakpoint
ALTER TABLE "ens_verifications" DROP COLUMN "verification_method";--> statement-breakpoint
ALTER TABLE "ens_verifications" DROP COLUMN "verification_data";--> statement-breakpoint
ALTER TABLE "ens_verifications" DROP COLUMN "verification_tx_hash";--> statement-breakpoint
ALTER TABLE "ens_verifications" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "quick_posts" ADD CONSTRAINT "quick_posts_share_id_unique" UNIQUE("share_id");