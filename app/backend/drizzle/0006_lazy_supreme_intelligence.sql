DROP TABLE IF EXISTS "appeal_jurors" CASCADE;
--> statement-breakpoint
CREATE TABLE "appeal_jurors" (
	"id" serial PRIMARY KEY NOT NULL,
	"appeal_id" integer NOT NULL,
	"juror_id" uuid NOT NULL,
	"selection_weight" numeric(10, 4) NOT NULL,
	"vote_commitment" varchar(64),
	"vote_reveal" varchar(24),
	"vote_reasoning" text,
	"reward_amount" numeric(20, 8) DEFAULT '0',
	"slashed_amount" numeric(20, 8) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"voted_at" timestamp
);
--> statement-breakpoint
DROP TABLE IF EXISTS "blockchain_events" CASCADE;
--> statement-breakpoint
CREATE TABLE "blockchain_events" (
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
--> statement-breakpoint
DROP TABLE IF EXISTS "cdn_access_logs" CASCADE;
--> statement-breakpoint
CREATE TABLE "cdn_access_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"user_id" uuid,
	"ip_address" varchar(45),
	"user_agent" text,
	"access_time" timestamp DEFAULT now(),
	"response_size" integer,
	"response_time" integer
);
--> statement-breakpoint
DROP TABLE IF EXISTS "content_hashes" CASCADE;
--> statement-breakpoint
CREATE TABLE "content_hashes" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" varchar(64) NOT NULL,
	"content_type" varchar(24) NOT NULL,
	"hash_type" varchar(24) NOT NULL,
	"hash_value" varchar(128) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP TABLE IF EXISTS "content_reports" CASCADE;
--> statement-breakpoint
CREATE TABLE "content_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" varchar(64) NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" varchar(48) NOT NULL,
	"details" text,
	"weight" numeric(5, 4) DEFAULT '1',
	"status" varchar(24) DEFAULT 'open',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP TABLE IF EXISTS "content_verification" CASCADE;
--> statement-breakpoint
CREATE TABLE "content_verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"verification_hash" text NOT NULL,
	"algorithm" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP TABLE IF EXISTS "digital_asset_access_logs" CASCADE;
--> statement-breakpoint
CREATE TABLE "digital_asset_access_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"user_id" uuid,
	"access_type" varchar(20) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"success" boolean NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP TABLE IF EXISTS "digital_asset_analytics" CASCADE;
--> statement-breakpoint
CREATE TABLE "digital_asset_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"views" integer DEFAULT 0,
	"downloads" integer DEFAULT 0,
	"revenue" numeric(20, 8) DEFAULT '0',
	"unique_users" integer DEFAULT 0
);
--> statement-breakpoint
DROP TABLE IF EXISTS "digital_asset_licenses" CASCADE;
--> statement-breakpoint
CREATE TABLE "digital_asset_licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"licensee_id" uuid NOT NULL,
	"license_type" varchar(50) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"price" numeric(20, 8) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP TABLE IF EXISTS "digital_asset_purchases" CASCADE;
--> statement-breakpoint
CREATE TABLE "digital_asset_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"price" numeric(20, 8) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"transaction_hash" varchar(66),
	"status" varchar(20) DEFAULT 'completed',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "digital_asset_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" varchar(100) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "digital_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"file_type" varchar(50) NOT NULL,
	"file_size" integer NOT NULL,
	"encrypted_content_hash" text NOT NULL,
	"preview_hash" text,
	"metadata_hash" text NOT NULL,
	"price" numeric(20, 8),
	"currency" varchar(10) DEFAULT 'USD',
	"license_type" varchar(50) NOT NULL,
	"is_public" boolean DEFAULT false,
	"download_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dmca_takedown_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"evidence" text,
	"status" varchar(20) DEFAULT 'pending',
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "drm_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"encrypted_key" text NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "milestone_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"milestone_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"payment_method" varchar(20) NOT NULL,
	"escrow_contract" varchar(66),
	"payment_processor_id" varchar(100),
	"transaction_hash" varchar(66),
	"status" varchar(20) DEFAULT 'pending',
	"held_until" timestamp,
	"release_conditions" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "moderation_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"content_id" varchar(64) NOT NULL,
	"action" varchar(24) NOT NULL,
	"duration_sec" integer DEFAULT 0,
	"applied_by" varchar(64),
	"rationale" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "moderation_appeals" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"appellant_id" uuid NOT NULL,
	"status" varchar(24) DEFAULT 'open',
	"stake_amount" numeric(20, 8) DEFAULT '0',
	"jury_decision" varchar(24),
	"decision_cid" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "moderation_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer,
	"action_type" varchar(32) NOT NULL,
	"actor_id" varchar(64),
	"actor_type" varchar(24) DEFAULT 'user',
	"old_state" text,
	"new_state" text,
	"reasoning" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "moderation_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" varchar(64) NOT NULL,
	"content_type" varchar(24) NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(24) DEFAULT 'pending',
	"risk_score" numeric(5, 4) DEFAULT '0',
	"decision" varchar(24),
	"reason_code" varchar(48),
	"confidence" numeric(5, 4) DEFAULT '0',
	"vendor_scores" text,
	"evidence_cid" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "moderation_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"metric_type" varchar(32) NOT NULL,
	"metric_name" varchar(64) NOT NULL,
	"metric_value" numeric(15, 6) NOT NULL,
	"dimensions" text,
	"recorded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "moderation_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(48) NOT NULL,
	"severity" varchar(24) NOT NULL,
	"confidence_threshold" numeric(5, 4) NOT NULL,
	"action" varchar(24) NOT NULL,
	"reputation_modifier" numeric(5, 4) DEFAULT '0',
	"description" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "moderation_vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_name" varchar(32) NOT NULL,
	"vendor_type" varchar(24) NOT NULL,
	"api_endpoint" varchar(255),
	"is_enabled" boolean DEFAULT true,
	"weight" numeric(5, 4) DEFAULT '1',
	"cost_per_request" numeric(10, 6) DEFAULT '0',
	"avg_latency_ms" integer DEFAULT 0,
	"success_rate" numeric(5, 4) DEFAULT '1',
	"last_health_check" timestamp,
	"configuration" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "moderation_vendors_vendor_name_unique" UNIQUE("vendor_name")
);
--> statement-breakpoint
CREATE TABLE "nft_auctions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nft_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"starting_price" numeric(20, 8) NOT NULL,
	"reserve_price" numeric(20, 8),
	"current_bid" numeric(20, 8),
	"highest_bidder_id" uuid,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nft_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"contract_address" varchar(66) NOT NULL,
	"name" varchar(255) NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"description" text,
	"image_url" text,
	"banner_url" text,
	"max_supply" integer,
	"current_supply" integer DEFAULT 0,
	"royalty_percentage" numeric(5, 2) DEFAULT '0',
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nft_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nft_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"price" numeric(20, 8) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"listing_type" varchar(20) NOT NULL,
	"start_time" timestamp DEFAULT now(),
	"end_time" timestamp,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nft_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nft_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"price" numeric(20, 8) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nfts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_id" varchar(128) NOT NULL,
	"contract_address" varchar(66) NOT NULL,
	"owner_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"collection_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"image_url" text NOT NULL,
	"metadata_uri" text NOT NULL,
	"attributes" text,
	"rarity" varchar(20),
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"preferences" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_preferences_user_address_unique" UNIQUE("user_address")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" varchar(64),
	"user_address" varchar(66) NOT NULL,
	"type" varchar(64) NOT NULL,
	"message" text NOT NULL,
	"metadata" text,
	"read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer,
	"event_type" varchar(64) NOT NULL,
	"description" text,
	"metadata" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"milestone_id" uuid,
	"user_id" uuid NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"milestone_id" uuid,
	"deliverable_id" uuid,
	"approver_id" uuid NOT NULL,
	"approval_type" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"feedback" text,
	"approved_at" timestamp,
	"auto_approve_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_deliverables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"milestone_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text,
	"deliverable_type" varchar(50) NOT NULL,
	"file_hash" varchar(128),
	"file_name" varchar(255),
	"file_size" integer,
	"file_type" varchar(100),
	"content" text,
	"url" varchar(500),
	"status" varchar(20) DEFAULT 'pending',
	"submitted_at" timestamp,
	"reviewed_at" timestamp,
	"client_feedback" text,
	"revision_notes" text,
	"version_number" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"milestone_id" uuid,
	"deliverable_id" uuid,
	"uploader_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_hash" varchar(128) NOT NULL,
	"file_size" integer NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"version_number" integer DEFAULT 1,
	"is_current_version" boolean DEFAULT true,
	"access_level" varchar(20) DEFAULT 'project',
	"download_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"message_type" varchar(20) DEFAULT 'text',
	"content" text,
	"file_attachments" text,
	"code_language" varchar(50),
	"is_read" boolean DEFAULT false,
	"is_pinned" boolean DEFAULT false,
	"reply_to" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"milestone_id" uuid,
	"thread_type" varchar(30) NOT NULL,
	"title" varchar(255) NOT NULL,
	"is_private" boolean DEFAULT false,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"token" varchar(255) NOT NULL,
	"platform" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reputation_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"change_type" varchar(50) NOT NULL,
	"change_value" integer NOT NULL,
	"previous_score" integer NOT NULL,
	"new_score" integer NOT NULL,
	"reason" text,
	"related_entity_type" varchar(50),
	"related_entity_id" varchar(128),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reputation_impacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"case_id" integer,
	"impact_type" varchar(32) NOT NULL,
	"impact_value" numeric(10, 4) NOT NULL,
	"previous_reputation" numeric(10, 4),
	"new_reputation" numeric(10, 4),
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "review_helpfulness" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_helpful" boolean NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "review_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" varchar(100) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewee_id" uuid NOT NULL,
	"order_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"title" varchar(255),
	"comment" text,
	"is_verified" boolean DEFAULT false,
	"helpful_count" integer DEFAULT 0,
	"report_count" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" varchar(8) NOT NULL,
	"end_time" varchar(8) NOT NULL,
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"is_available" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"booking_type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"scheduled_start" timestamp,
	"scheduled_end" timestamp,
	"actual_start" timestamp,
	"actual_end" timestamp,
	"total_amount" numeric(20, 8) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"payment_status" varchar(20) DEFAULT 'pending',
	"escrow_contract" varchar(66),
	"client_requirements" text,
	"provider_notes" text,
	"meeting_link" varchar(500),
	"location_details" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"parent_id" uuid,
	"icon" varchar(50),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"message_type" varchar(20) DEFAULT 'text',
	"content" text,
	"file_attachments" text[],
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"milestone_number" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"amount" numeric(20, 8) NOT NULL,
	"due_date" timestamp,
	"status" varchar(20) DEFAULT 'pending',
	"deliverables" text[],
	"client_feedback" text,
	"completed_at" timestamp,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_provider_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"business_name" varchar(255),
	"tagline" varchar(500),
	"bio" text,
	"skills" text[],
	"certifications" text[],
	"languages" text[],
	"response_time_hours" integer DEFAULT 24,
	"availability_timezone" varchar(50) DEFAULT 'UTC',
	"portfolio_description" text,
	"years_experience" integer,
	"education" text,
	"website_url" varchar(500),
	"linkedin_url" varchar(500),
	"github_url" varchar(500),
	"is_verified" boolean DEFAULT false,
	"verification_documents" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewee_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"communication_rating" integer,
	"quality_rating" integer,
	"timeliness_rating" integer,
	"title" varchar(200),
	"comment" text,
	"would_recommend" boolean,
	"ipfs_hash" varchar(128),
	"blockchain_tx_hash" varchar(66),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"short_description" varchar(500),
	"pricing_model" varchar(20) NOT NULL,
	"base_price" numeric(20, 8) NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"duration_minutes" integer,
	"is_remote" boolean DEFAULT true,
	"location_required" boolean DEFAULT false,
	"service_location" text,
	"tags" text[],
	"requirements" text,
	"deliverables" text,
	"portfolio_items" text[],
	"status" varchar(20) DEFAULT 'active',
	"featured" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sync_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(64) NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "sync_status_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "time_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"milestone_id" uuid,
	"provider_id" uuid NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration_minutes" integer,
	"description" text,
	"is_billable" boolean DEFAULT true,
	"hourly_rate" numeric(20, 8),
	"total_amount" numeric(20, 8),
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tracking_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer,
	"tracking_number" varchar(128) NOT NULL,
	"carrier" varchar(32) NOT NULL,
	"status" varchar(64),
	"events" text,
	"created_at" timestamp DEFAULT now(),
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "watermark_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"template_type" varchar(20) NOT NULL,
	"template_data" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "appeal_jurors" ADD CONSTRAINT "appeal_jurors_appeal_id_moderation_appeals_id_fk" FOREIGN KEY ("appeal_id") REFERENCES "public"."moderation_appeals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeal_jurors" ADD CONSTRAINT "appeal_jurors_juror_id_users_id_fk" FOREIGN KEY ("juror_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdn_access_logs" ADD CONSTRAINT "cdn_access_logs_asset_id_digital_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdn_access_logs" ADD CONSTRAINT "cdn_access_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_verification" ADD CONSTRAINT "content_verification_asset_id_digital_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_asset_access_logs" ADD CONSTRAINT "digital_asset_access_logs_asset_id_digital_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_asset_access_logs" ADD CONSTRAINT "digital_asset_access_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_asset_analytics" ADD CONSTRAINT "digital_asset_analytics_asset_id_digital_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_asset_licenses" ADD CONSTRAINT "digital_asset_licenses_asset_id_digital_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_asset_licenses" ADD CONSTRAINT "digital_asset_licenses_licensee_id_users_id_fk" FOREIGN KEY ("licensee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_asset_purchases" ADD CONSTRAINT "digital_asset_purchases_asset_id_digital_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_asset_purchases" ADD CONSTRAINT "digital_asset_purchases_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_asset_reports" ADD CONSTRAINT "digital_asset_reports_asset_id_digital_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_asset_reports" ADD CONSTRAINT "digital_asset_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD CONSTRAINT "digital_assets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dmca_takedown_requests" ADD CONSTRAINT "dmca_takedown_requests_asset_id_digital_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dmca_takedown_requests" ADD CONSTRAINT "dmca_takedown_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dmca_takedown_requests" ADD CONSTRAINT "dmca_takedown_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drm_keys" ADD CONSTRAINT "drm_keys_asset_id_digital_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drm_keys" ADD CONSTRAINT "drm_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_payments" ADD CONSTRAINT "milestone_payments_milestone_id_service_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."service_milestones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_payments" ADD CONSTRAINT "milestone_payments_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_appeals" ADD CONSTRAINT "moderation_appeals_case_id_moderation_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."moderation_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_appeals" ADD CONSTRAINT "moderation_appeals_appellant_id_users_id_fk" FOREIGN KEY ("appellant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_audit_log" ADD CONSTRAINT "moderation_audit_log_case_id_moderation_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."moderation_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_auctions" ADD CONSTRAINT "nft_auctions_nft_id_nfts_id_fk" FOREIGN KEY ("nft_id") REFERENCES "public"."nfts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_auctions" ADD CONSTRAINT "nft_auctions_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_auctions" ADD CONSTRAINT "nft_auctions_highest_bidder_id_users_id_fk" FOREIGN KEY ("highest_bidder_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_collections" ADD CONSTRAINT "nft_collections_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_listings" ADD CONSTRAINT "nft_listings_nft_id_nfts_id_fk" FOREIGN KEY ("nft_id") REFERENCES "public"."nfts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_listings" ADD CONSTRAINT "nft_listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_offers" ADD CONSTRAINT "nft_offers_nft_id_nfts_id_fk" FOREIGN KEY ("nft_id") REFERENCES "public"."nfts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_offers" ADD CONSTRAINT "nft_offers_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfts" ADD CONSTRAINT "nfts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfts" ADD CONSTRAINT "nfts_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_milestone_id_service_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."service_milestones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_approvals" ADD CONSTRAINT "project_approvals_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_approvals" ADD CONSTRAINT "project_approvals_milestone_id_service_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."service_milestones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_approvals" ADD CONSTRAINT "project_approvals_deliverable_id_project_deliverables_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."project_deliverables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_approvals" ADD CONSTRAINT "project_approvals_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_deliverables" ADD CONSTRAINT "project_deliverables_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_deliverables" ADD CONSTRAINT "project_deliverables_milestone_id_service_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."service_milestones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_milestone_id_service_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."service_milestones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_deliverable_id_project_deliverables_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."project_deliverables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_uploader_id_users_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_messages" ADD CONSTRAINT "project_messages_thread_id_project_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."project_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_messages" ADD CONSTRAINT "project_messages_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_messages" ADD CONSTRAINT "project_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_threads" ADD CONSTRAINT "project_threads_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_threads" ADD CONSTRAINT "project_threads_milestone_id_service_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."service_milestones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_threads" ADD CONSTRAINT "project_threads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reputation_history" ADD CONSTRAINT "reputation_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reputation_impacts" ADD CONSTRAINT "reputation_impacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reputation_impacts" ADD CONSTRAINT "reputation_impacts_case_id_moderation_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."moderation_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_helpfulness" ADD CONSTRAINT "review_helpfulness_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_helpfulness" ADD CONSTRAINT "review_helpfulness_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewee_id_users_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_availability" ADD CONSTRAINT "service_availability_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_parent_id_service_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."service_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_messages" ADD CONSTRAINT "service_messages_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_messages" ADD CONSTRAINT "service_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_messages" ADD CONSTRAINT "service_messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_milestones" ADD CONSTRAINT "service_milestones_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_provider_profiles" ADD CONSTRAINT "service_provider_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_reviewee_id_users_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_tracking" ADD CONSTRAINT "time_tracking_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_tracking" ADD CONSTRAINT "time_tracking_milestone_id_service_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."service_milestones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_tracking" ADD CONSTRAINT "time_tracking_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_records" ADD CONSTRAINT "tracking_records_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watermark_templates" ADD CONSTRAINT "watermark_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_appeal_jurors_appeal_id" ON "appeal_jurors" USING btree ("appeal_id");--> statement-breakpoint
CREATE INDEX "idx_appeal_jurors_juror_id" ON "appeal_jurors" USING btree ("juror_id");--> statement-breakpoint
CREATE INDEX "idx_content_hashes_content_id" ON "content_hashes" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "idx_content_hashes_hash_value" ON "content_hashes" USING btree ("hash_value");--> statement-breakpoint
CREATE INDEX "idx_content_hashes_hash_type" ON "content_hashes" USING btree ("hash_type");--> statement-breakpoint
CREATE INDEX "idx_content_reports_content_id" ON "content_reports" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "idx_content_reports_reporter_id" ON "content_reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "idx_content_reports_status" ON "content_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_content_reports_created_at" ON "content_reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_content_reports_content_status" ON "content_reports" USING btree ("content_id","status");--> statement-breakpoint
CREATE INDEX "milestone_payments_milestone_id_idx" ON "milestone_payments" USING btree ("milestone_id");--> statement-breakpoint
CREATE INDEX "milestone_payments_status_idx" ON "milestone_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_moderation_actions_user_id" ON "moderation_actions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_moderation_actions_content_id" ON "moderation_actions" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "idx_moderation_actions_created_at" ON "moderation_actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_moderation_actions_user_created" ON "moderation_actions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_moderation_appeals_case_id" ON "moderation_appeals" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "idx_moderation_appeals_appellant_id" ON "moderation_appeals" USING btree ("appellant_id");--> statement-breakpoint
CREATE INDEX "idx_moderation_appeals_status" ON "moderation_appeals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_moderation_audit_log_case_id" ON "moderation_audit_log" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "idx_moderation_audit_log_created_at" ON "moderation_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_moderation_audit_log_actor_id" ON "moderation_audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_moderation_cases_content_id" ON "moderation_cases" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "idx_moderation_cases_user_id" ON "moderation_cases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_moderation_cases_status" ON "moderation_cases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_moderation_cases_created_at" ON "moderation_cases" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_moderation_cases_risk_score" ON "moderation_cases" USING btree ("risk_score");--> statement-breakpoint
CREATE INDEX "idx_moderation_cases_user_status" ON "moderation_cases" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_moderation_metrics_metric_type" ON "moderation_metrics" USING btree ("metric_type");--> statement-breakpoint
CREATE INDEX "idx_moderation_metrics_recorded_at" ON "moderation_metrics" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "project_activities_booking_id_idx" ON "project_activities" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "project_activities_created_at_idx" ON "project_activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "project_approvals_booking_id_idx" ON "project_approvals" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "project_approvals_status_idx" ON "project_approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_deliverables_booking_id_idx" ON "project_deliverables" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "project_deliverables_milestone_id_idx" ON "project_deliverables" USING btree ("milestone_id");--> statement-breakpoint
CREATE INDEX "project_deliverables_status_idx" ON "project_deliverables" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_files_booking_id_idx" ON "project_files" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "project_files_file_hash_idx" ON "project_files" USING btree ("file_hash");--> statement-breakpoint
CREATE INDEX "project_messages_thread_id_idx" ON "project_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "project_messages_booking_id_idx" ON "project_messages" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "project_threads_booking_id_idx" ON "project_threads" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_reputation_impacts_user_id" ON "reputation_impacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_reputation_impacts_case_id" ON "reputation_impacts" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "idx_reputation_impacts_created_at" ON "reputation_impacts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "service_availability_service_id_idx" ON "service_availability" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "service_bookings_client_id_idx" ON "service_bookings" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "service_bookings_provider_id_idx" ON "service_bookings" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "service_bookings_status_idx" ON "service_bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "service_messages_booking_id_idx" ON "service_messages" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "service_milestones_booking_id_idx" ON "service_milestones" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "service_provider_profiles_user_id_unique" ON "service_provider_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "service_reviews_service_id_idx" ON "service_reviews" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "services_provider_id_idx" ON "services" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "services_category_id_idx" ON "services" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "services_status_idx" ON "services" USING btree ("status");--> statement-breakpoint
CREATE INDEX "time_tracking_booking_id_idx" ON "time_tracking" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "time_tracking_provider_id_idx" ON "time_tracking" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "time_tracking_start_time_idx" ON "time_tracking" USING btree ("start_time");