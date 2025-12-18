CREATE TABLE "cached_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"content_type" varchar(20) NOT NULL,
	"content_id" varchar(255) NOT NULL,
	"content_data" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"priority" integer DEFAULT 5,
	"accessed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "offline_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"action_type" varchar(20) NOT NULL,
	"action_data" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"retry_count" integer DEFAULT 0,
	"last_attempt_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referral_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_key" varchar(100) NOT NULL,
	"config_value" text NOT NULL,
	"config_type" varchar(20) DEFAULT 'string' NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referral_config_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "workflow_escalations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"escalation_reason" varchar(255) NOT NULL,
	"escalation_level" integer DEFAULT 1 NOT NULL,
	"escalated_to" uuid,
	"escalated_by" uuid,
	"escalated_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"resolution_notes" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "disputes" ALTER COLUMN "escrow_id" SET DATA TYPE uuid USING escrow_id::text::uuid;--> statement-breakpoint
ALTER TABLE "order_payment_events" ALTER COLUMN "order_id" SET DATA TYPE uuid USING order_id::text::uuid;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "escrow_id" SET DATA TYPE uuid USING escrow_id::text::uuid;--> statement-breakpoint
ALTER TABLE "payment_receipts" ALTER COLUMN "order_id" SET DATA TYPE uuid USING order_id::text::uuid;--> statement-breakpoint
ALTER TABLE "payment_transactions" ALTER COLUMN "order_id" SET DATA TYPE uuid USING order_id::text::uuid;--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "order_id" SET DATA TYPE uuid USING order_id::text::uuid;--> statement-breakpoint
ALTER TABLE "tracking_records" ALTER COLUMN "order_id" SET DATA TYPE uuid USING order_id::text::uuid;--> statement-breakpoint
ALTER TABLE "bridge_transactions" ADD COLUMN "validator_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "community_members" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "community_members" ADD COLUMN "banned_at" timestamp;--> statement-breakpoint
ALTER TABLE "community_members" ADD COLUMN "ban_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "community_members" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "content_reports" ADD COLUMN "target_type" varchar(32);--> statement-breakpoint
ALTER TABLE "content_reports" ADD COLUMN "target_id" varchar(64);--> statement-breakpoint
ALTER TABLE "content_reports" ADD COLUMN "report_type" varchar(32);--> statement-breakpoint
ALTER TABLE "content_reports" ADD COLUMN "reporter_weight" numeric DEFAULT '1';--> statement-breakpoint
ALTER TABLE "content_reports" ADD COLUMN "resolution" text;--> statement-breakpoint
ALTER TABLE "content_reports" ADD COLUMN "moderator_notes" text;--> statement-breakpoint
ALTER TABLE "content_reports" ADD COLUMN "consensus_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "content_reports" ADD COLUMN "validated_at" timestamp;--> statement-breakpoint
ALTER TABLE "content_reports" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "earning_activities" ADD COLUMN "base_reward" numeric(20, 8) NOT NULL;--> statement-breakpoint
ALTER TABLE "earning_activities" ADD COLUMN "quality_score" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "earning_activities" ADD COLUMN "premium_bonus_amount" numeric(20, 8) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "marketplace_verifications" ADD COLUMN "kyc_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "nft_collections" ADD COLUMN "image_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "nft_listings" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "nfts" ADD COLUMN "metadata_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "nfts" ADD COLUMN "verifier_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "transaction_type" varchar(50);--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "request_payload" text;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "webhook_received" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "media_urls" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "status" varchar(24) DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "refund_provider_transactions" ADD COLUMN "provider_refund_id" varchar(255);--> statement-breakpoint
ALTER TABLE "refund_provider_transactions" ADD COLUMN "response_payload" jsonb;--> statement-breakpoint
ALTER TABLE "refund_provider_transactions" ADD COLUMN "processing_time_ms" integer;--> statement-breakpoint
ALTER TABLE "refund_transactions" ADD COLUMN "response_payload" jsonb;--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "reason" varchar(255);--> statement-breakpoint
ALTER TABLE "staking_positions" ADD COLUMN "start_time" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "staking_positions" ADD COLUMN "is_fixed_term" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "staking_positions" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "staking_positions" ADD COLUMN "tier_id" varchar(64);--> statement-breakpoint
ALTER TABLE "staking_positions" ADD COLUMN "accumulated_rewards" numeric(20, 8) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "staking_positions" ADD COLUMN "last_reward_claim" timestamp;--> statement-breakpoint
ALTER TABLE "staking_positions" ADD COLUMN "transaction_hash" varchar(66);--> statement-breakpoint
ALTER TABLE "workflow_escalations" ADD CONSTRAINT "workflow_escalations_assignment_id_workflow_task_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."workflow_task_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_escalations" ADD CONSTRAINT "workflow_escalations_escalated_to_users_id_fk" FOREIGN KEY ("escalated_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_escalations" ADD CONSTRAINT "workflow_escalations_escalated_by_users_id_fk" FOREIGN KEY ("escalated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cached_content_user" ON "cached_content" USING btree ("user_address");--> statement-breakpoint
CREATE INDEX "idx_cached_content_type" ON "cached_content" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX "idx_offline_actions_user" ON "offline_actions" USING btree ("user_address");--> statement-breakpoint
CREATE INDEX "idx_offline_actions_status" ON "offline_actions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_referral_config_config_key" ON "referral_config" USING btree ("config_key");--> statement-breakpoint
CREATE INDEX "workflow_escalations_assignment_idx" ON "workflow_escalations" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "workflow_escalations_status_idx" ON "workflow_escalations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workflow_escalations_escalated_to_idx" ON "workflow_escalations" USING btree ("escalated_to");--> statement-breakpoint
ALTER TABLE "nfts" ADD CONSTRAINT "nfts_verifier_id_users_id_fk" FOREIGN KEY ("verifier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;