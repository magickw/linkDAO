CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" varchar(64) NOT NULL,
	"action" varchar(48) NOT NULL,
	"resource_type" varchar(32) NOT NULL,
	"resource_id" varchar(64),
	"old_values" text,
	"new_values" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" varchar(66) NOT NULL,
	"preferences" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "admin_notification_preferences_admin_id_unique" UNIQUE("admin_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" varchar(66) NOT NULL,
	"type" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"action_url" text,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"category" varchar(20) DEFAULT 'system' NOT NULL,
	"metadata" text,
	"read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_moderation" (
	"id" serial PRIMARY KEY NOT NULL,
	"object_type" varchar(32) NOT NULL,
	"object_id" uuid NOT NULL,
	"status" varchar(32) DEFAULT 'pending',
	"ai_analysis" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alert_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"alert_name" varchar(64) NOT NULL,
	"metric_name" varchar(64) NOT NULL,
	"condition_type" varchar(24) NOT NULL,
	"threshold_value" numeric NOT NULL,
	"severity" varchar(24) NOT NULL,
	"notification_channels" text,
	"is_active" boolean DEFAULT true,
	"cooldown_minutes" integer DEFAULT 60,
	"created_by" varchar(64),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP TABLE IF EXISTS "appeal_jurors" CASCADE;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appeal_jurors" (
	"id" serial PRIMARY KEY NOT NULL,
	"appeal_id" integer NOT NULL,
	"juror_id" uuid NOT NULL,
	"selection_round" integer NOT NULL,
	"status" varchar(24) DEFAULT 'selected',
	"stake_amount" numeric DEFAULT '0',
	"vote_commitment" text,
	"vote_reveal" varchar(24),
	"vote_timestamp" timestamp,
	"reward_amount" numeric DEFAULT '0',
	"slashed_amount" numeric DEFAULT '0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(66) NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"refresh_token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"refresh_expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"user_agent" text,
	"ip_address" varchar(45),
	"last_used_at" timestamp DEFAULT now(),
	CONSTRAINT "auth_sessions_session_token_unique" UNIQUE("session_token"),
	CONSTRAINT "auth_sessions_refresh_token_unique" UNIQUE("refresh_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bids" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" uuid,
	"bidder_id" uuid,
	"amount" numeric NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blocked_users" (
	"blocker_address" varchar(66) NOT NULL,
	"blocked_address" varchar(66) NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "blocked_users_blocker_address_blocked_address_pk" PRIMARY KEY("blocker_address","blocked_address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bookmarks" (
	"user_id" uuid NOT NULL,
	"post_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "bookmarks_user_id_post_id_pk" PRIMARY KEY("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128),
	"persona" text,
	"scopes" text,
	"model" varchar(64),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "brand_keywords" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_name" varchar(100) NOT NULL,
	"keywords" text,
	"category" varchar(50),
	"estimated_price_range" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bridge_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"from_chain" varchar(50) NOT NULL,
	"to_chain" varchar(50) NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"bridge_provider" varchar(50) NOT NULL,
	"source_tx_hash" varchar(66),
	"destination_tx_hash" varchar(66),
	"bridge_id" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"fees" numeric(20, 8) DEFAULT '0',
	"estimated_time" integer,
	"actual_time" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"price_at_time" numeric(20, 8) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" varchar(255),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"parent_id" uuid,
	"path" text NOT NULL,
	"image_url" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cdn_access_logs" (
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
CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_address" varchar(66) NOT NULL,
	"content" text NOT NULL,
	"message_type" varchar(32) DEFAULT 'text',
	"encryption_metadata" jsonb,
	"reply_to_id" uuid,
	"attachments" jsonb,
	"timestamp" timestamp DEFAULT now(),
	"edited_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(64) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"description" text,
	"rules" text,
	"member_count" integer DEFAULT 0 NOT NULL,
	"post_count" integer DEFAULT 0 NOT NULL,
	"avatar" text,
	"banner" text,
	"category" varchar(100) NOT NULL,
	"tags" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"moderators" text,
	"treasury_address" varchar(66),
	"governance_token" varchar(66),
	"settings" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "communities_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_automated_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"execution_type" varchar(50) NOT NULL,
	"execution_time" timestamp,
	"recurrence_pattern" varchar(100),
	"dependency_proposal_id" uuid,
	"execution_status" varchar(32) DEFAULT 'pending',
	"execution_result" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(100),
	"color" varchar(7),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_categories_name_unique" UNIQUE("name"),
	CONSTRAINT "community_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_creator_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"post_id" integer,
	"creator_address" varchar(66) NOT NULL,
	"reward_amount" numeric(20, 8) NOT NULL,
	"token_address" varchar(66) NOT NULL,
	"token_symbol" varchar(20) NOT NULL,
	"distribution_type" varchar(30) NOT NULL,
	"transaction_hash" varchar(66),
	"status" varchar(20) DEFAULT 'pending',
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"distributed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_delegations" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"delegator_address" varchar(66) NOT NULL,
	"delegate_address" varchar(66) NOT NULL,
	"voting_power" numeric(20, 8) DEFAULT '0' NOT NULL,
	"is_revocable" boolean DEFAULT true,
	"expiry_date" timestamp,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_delegations_community_id_delegator_address_pk" PRIMARY KEY("community_id","delegator_address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"event_type" varchar(50) NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"location" text,
	"is_recurring" boolean DEFAULT false,
	"recurrence_pattern" varchar(100),
	"max_attendees" integer,
	"rsvp_required" boolean DEFAULT false,
	"rsvp_deadline" timestamp,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_governance_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"proposer_address" varchar(66) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" varchar(32) DEFAULT 'pending',
	"voting_start_time" timestamp NOT NULL,
	"voting_end_time" timestamp NOT NULL,
	"execution_eta" timestamp,
	"executed_at" timestamp,
	"cancelled_at" timestamp,
	"yes_votes" numeric(20, 8) DEFAULT '0',
	"no_votes" numeric(20, 8) DEFAULT '0',
	"abstain_votes" numeric(20, 8) DEFAULT '0',
	"total_votes" numeric(20, 8) DEFAULT '0',
	"quorum" numeric(20, 8) DEFAULT '0',
	"quorum_reached" boolean DEFAULT false,
	"required_majority" integer DEFAULT 50,
	"required_stake" numeric(20, 8) DEFAULT '0',
	"execution_delay" integer,
	"required_signatures" integer DEFAULT 1,
	"signatures_obtained" integer DEFAULT 0,
	"multi_sig_enabled" boolean DEFAULT false,
	"auto_execute" boolean DEFAULT false,
	"execution_template" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_governance_votes" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"voter_address" varchar(66) NOT NULL,
	"vote_choice" varchar(10) NOT NULL,
	"voting_power" numeric(20, 8) DEFAULT '0' NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_governance_votes_proposal_id_voter_address_pk" PRIMARY KEY("proposal_id","voter_address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_members" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"role" varchar(32) DEFAULT 'member' NOT NULL,
	"reputation" integer DEFAULT 0 NOT NULL,
	"contributions" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_members_community_id_user_address_pk" PRIMARY KEY("community_id","user_address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"moderator_address" varchar(66) NOT NULL,
	"action" varchar(20) NOT NULL,
	"target_type" varchar(20) NOT NULL,
	"target_id" varchar(66) NOT NULL,
	"reason" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_multi_sig_approvals" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"approver_address" varchar(66) NOT NULL,
	"signature" text,
	"approved_at" timestamp DEFAULT now() NOT NULL,
	"metadata" text,
	CONSTRAINT "community_multi_sig_approvals_proposal_id_approver_address_pk" PRIMARY KEY("proposal_id","approver_address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_proxy_votes" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"proxy_address" varchar(66) NOT NULL,
	"voter_address" varchar(66) NOT NULL,
	"vote_choice" varchar(10) NOT NULL,
	"voting_power" numeric(20, 8) DEFAULT '0' NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_proxy_votes_proposal_id_voter_address_pk" PRIMARY KEY("proposal_id","voter_address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_recommendations" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"score" numeric(10, 4) NOT NULL,
	"reasons" text,
	"algorithm_version" varchar(32) DEFAULT 'v1.0',
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_recommendations_user_id_community_id_pk" PRIMARY KEY("user_id","community_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_referral_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"reward_amount" numeric(20, 8) NOT NULL,
	"reward_token" varchar(66) NOT NULL,
	"reward_token_symbol" varchar(20) NOT NULL,
	"referral_limit" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_staking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"staked_amount" numeric(20, 8) NOT NULL,
	"token_address" varchar(66) NOT NULL,
	"token_symbol" varchar(20) NOT NULL,
	"staked_at" timestamp DEFAULT now() NOT NULL,
	"unstaked_at" timestamp,
	"rewards_earned" numeric(20, 8) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_staking_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staking_id" uuid NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"reward_amount" numeric(20, 8) NOT NULL,
	"token_address" varchar(66) NOT NULL,
	"token_symbol" varchar(20) NOT NULL,
	"reward_type" varchar(30) NOT NULL,
	"transaction_hash" varchar(66),
	"status" varchar(20) DEFAULT 'pending',
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"distributed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"active_members_7d" integer DEFAULT 0 NOT NULL,
	"active_members_30d" integer DEFAULT 0 NOT NULL,
	"posts_7d" integer DEFAULT 0 NOT NULL,
	"posts_30d" integer DEFAULT 0 NOT NULL,
	"engagement_rate" numeric(5, 4) DEFAULT '0' NOT NULL,
	"growth_rate_7d" numeric(5, 4) DEFAULT '0' NOT NULL,
	"growth_rate_30d" numeric(5, 4) DEFAULT '0' NOT NULL,
	"trending_score" numeric(10, 4) DEFAULT '0' NOT NULL,
	"last_calculated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_stats_community_id_unique" UNIQUE("community_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_subscription_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"price" numeric(20, 8) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"benefits" text,
	"access_level" varchar(50) NOT NULL,
	"duration_days" integer,
	"is_active" boolean DEFAULT true,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_token_gated_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"post_id" integer,
	"gating_type" varchar(50) NOT NULL,
	"token_address" varchar(66),
	"token_id" varchar(128),
	"minimum_balance" numeric(20, 8),
	"subscription_tier" varchar(50),
	"access_type" varchar(50) DEFAULT 'view',
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_treasury_pools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"token_address" varchar(66) NOT NULL,
	"token_symbol" varchar(20) NOT NULL,
	"balance" numeric(20, 8) DEFAULT '0' NOT NULL,
	"total_contributions" numeric(20, 8) DEFAULT '0' NOT NULL,
	"total_distributions" numeric(20, 8) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_user_content_access" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"access_level" varchar(50) NOT NULL,
	"access_granted_at" timestamp DEFAULT now() NOT NULL,
	"access_expires_at" timestamp,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_user_content_access_content_id_user_address_pk" PRIMARY KEY("content_id","user_address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_user_referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"referrer_address" varchar(66) NOT NULL,
	"referred_address" varchar(66) NOT NULL,
	"reward_amount" numeric(20, 8) NOT NULL,
	"reward_token" varchar(66) NOT NULL,
	"reward_token_symbol" varchar(20) NOT NULL,
	"reward_status" varchar(20) DEFAULT 'pending',
	"transaction_hash" varchar(66),
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"rewarded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_user_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"tier_id" uuid NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"payment_tx_hash" varchar(66),
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" varchar(64) NOT NULL,
	"content_type" varchar(24) NOT NULL,
	"url_analysis_id" integer,
	"position_in_content" integer,
	"link_text" text,
	"is_shortened" boolean DEFAULT false,
	"original_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" varchar(64) NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" varchar(48) NOT NULL,
	"details" text,
	"weight" numeric DEFAULT '1',
	"status" varchar(24) DEFAULT 'open',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"verification_hash" text NOT NULL,
	"algorithm" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"total_messages" integer DEFAULT 0,
	"last_message_at" timestamp,
	"average_response_time" interval,
	"participant_stats" jsonb DEFAULT '{}',
	"message_types" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "conversation_analytics_conversation_id_unique" UNIQUE("conversation_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid,
	"wallet_address" varchar(66) NOT NULL,
	"role" varchar(32) DEFAULT 'member',
	"joined_at" timestamp DEFAULT now(),
	"left_at" timestamp,
	"last_read_at" timestamp,
	"is_muted" boolean DEFAULT false,
	"notifications_enabled" boolean DEFAULT true,
	"custom_title" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_conversation_user" UNIQUE("conversation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255),
	"participants" jsonb NOT NULL,
	"last_message_id" uuid,
	"last_activity" timestamp,
	"unread_count" integer DEFAULT 0,
	"archived_by" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now(),
	"conversation_type" varchar(32) DEFAULT 'general',
	"order_id" integer,
	"product_id" uuid,
	"listing_id" uuid,
	"context_metadata" jsonb DEFAULT '{}',
	"is_automated" boolean DEFAULT false,
	"status" varchar(32) DEFAULT 'active',
	"archived_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "counterfeit_detections" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" varchar(64) NOT NULL,
	"brand_keywords" text,
	"suspicious_terms" text,
	"image_analysis" text,
	"price_analysis" text,
	"confidence_score" numeric(3, 2) DEFAULT '0' NOT NULL,
	"is_counterfeit" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "custom_blacklist" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_type" varchar(16) NOT NULL,
	"entry_value" text NOT NULL,
	"category" varchar(32) NOT NULL,
	"severity" varchar(16) DEFAULT 'medium',
	"description" text,
	"source" varchar(64),
	"added_by" uuid,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_retention_logs" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"policy_id" varchar(64) NOT NULL,
	"action" varchar(16) NOT NULL,
	"record_count" integer DEFAULT 0 NOT NULL,
	"data_type" varchar(64) NOT NULL,
	"executed_at" timestamp DEFAULT now(),
	"executed_by" varchar(64) NOT NULL,
	"success" boolean DEFAULT false NOT NULL,
	"error_message" text,
	"execution_time_ms" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_retention_policies" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"data_type" varchar(64) NOT NULL,
	"retention_period_days" integer NOT NULL,
	"region" varchar(16),
	"auto_delete" boolean DEFAULT false NOT NULL,
	"archive_before_delete" boolean DEFAULT false NOT NULL,
	"encrypt_archive" boolean DEFAULT false NOT NULL,
	"notify_before_delete" boolean DEFAULT false NOT NULL,
	"notification_days" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dex_swap_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"dex_provider" varchar(50) NOT NULL,
	"from_token" varchar(20) NOT NULL,
	"to_token" varchar(20) NOT NULL,
	"amount_in" numeric(20, 8) NOT NULL,
	"amount_out" numeric(20, 8),
	"expected_amount_out" numeric(20, 8),
	"slippage_tolerance" numeric(5, 4) DEFAULT '0.005',
	"price_impact" numeric(5, 4),
	"gas_fee" numeric(20, 8),
	"tx_hash" varchar(66),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "digital_asset_access_logs" (
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
CREATE TABLE IF NOT EXISTS "digital_asset_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"views" integer DEFAULT 0,
	"downloads" integer DEFAULT 0,
	"revenue" numeric(20, 8) DEFAULT '0',
	"unique_users" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "digital_asset_licenses" (
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
CREATE TABLE IF NOT EXISTS "digital_asset_purchases" (
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
-- CREATE TABLE IF NOT EXISTS "digital_asset_reports" (
-- 	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
-- 	"asset_id" uuid NOT NULL,
-- 	"reporter_id" uuid NOT NULL,
-- 	"reason" varchar(100) NOT NULL,
-- 	"description" text,
-- 	"status" varchar(20) DEFAULT 'pending',
-- 	"created_at" timestamp DEFAULT now()
-- );
--> statement-breakpoint
-- CREATE TABLE IF NOT EXISTS "digital_assets" (
-- 	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
-- 	"owner_id" uuid NOT NULL,
-- 	"title" varchar(255) NOT NULL,
-- 	"description" text,
-- 	"file_type" varchar(50) NOT NULL,
-- 	"file_size" integer NOT NULL,
-- 	"encrypted_content_hash" text NOT NULL,
-- 	"preview_hash" text,
-- 	"metadata_hash" text NOT NULL,
-- 	"price" numeric(20, 8),
-- 	"currency" varchar(10) DEFAULT 'USD',
-- 	"license_type" varchar(50) NOT NULL,
-- 	"is_public" boolean DEFAULT false,
-- 	"download_count" integer DEFAULT 0,
-- 	"created_at" timestamp DEFAULT now(),
-- 	"updated_at" timestamp DEFAULT now()
-- );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dispute_judges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dispute_id" uuid NOT NULL,
	"judge_id" uuid NOT NULL,
	"decision" varchar(10),
	"staked_amount" numeric(20, 8) NOT NULL,
	"rewarded" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "disputes" (
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
-- CREATE TABLE IF NOT EXISTS "dmca_takedown_requests" (
-- 	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
-- 	"asset_id" uuid NOT NULL,
-- 	"requester_id" uuid NOT NULL,
-- 	"reason" text NOT NULL,
-- 	"evidence" text,
-- 	"status" varchar(20) DEFAULT 'pending',
-- 	"reviewed_by" uuid,
-- 	"reviewed_at" timestamp,
-- 	"created_at" timestamp DEFAULT now()
-- );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "domain_reputation" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" varchar(255) NOT NULL,
	"reputation_score" numeric(5, 2) DEFAULT '50.00',
	"category" varchar(32),
	"is_verified" boolean DEFAULT false,
	"is_blacklisted" boolean DEFAULT false,
	"blacklist_reason" text,
	"first_seen" timestamp DEFAULT now(),
	"last_updated" timestamp DEFAULT now(),
	"analysis_count" integer DEFAULT 0,
	"malicious_count" integer DEFAULT 0,
	CONSTRAINT "domain_reputation_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
-- CREATE TABLE IF NOT EXISTS "drm_keys" (
-- 	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
-- 	"asset_id" uuid NOT NULL,
-- 	"user_id" uuid NOT NULL,
-- 	"encrypted_key" text NOT NULL,
-- 	"expires_at" timestamp,
-- 	"created_at" timestamp DEFAULT now()
-- );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "earning_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"activity_id" varchar(255) NOT NULL,
	"tokens_earned" numeric(20, 8) NOT NULL,
	"multiplier" numeric(5, 4) DEFAULT '1.0' NOT NULL,
	"is_premium_bonus" boolean DEFAULT false NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"object_type" varchar(32),
	"object_id" integer,
	"embedding" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ens_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(66) NOT NULL,
	"ens_handle" varchar(255) NOT NULL,
	"verification_method" varchar(50) NOT NULL,
	"verification_data" text,
	"verified_at" timestamp DEFAULT now(),
	"verification_tx_hash" varchar(66),
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "escrows" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" uuid,
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
CREATE TABLE IF NOT EXISTS "event_rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'confirmed',
	"attendees_count" integer DEFAULT 1,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_rsvps_event_id_user_id_pk" PRIMARY KEY("event_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evidence_access_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"evidence_id" varchar(64) NOT NULL,
	"accessed_by" varchar(64) NOT NULL,
	"accessed_at" timestamp DEFAULT now(),
	"purpose" varchar(128) NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"user_agent" text NOT NULL,
	"access_granted" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fiat_payment_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_transaction_id" uuid NOT NULL,
	"payment_processor" varchar(50) NOT NULL,
	"processor_payment_id" varchar(255) NOT NULL,
	"amount_fiat" numeric(20, 8) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"exchange_rate" numeric(20, 8) NOT NULL,
	"amount_crypto" numeric(20, 8) NOT NULL,
	"crypto_currency" varchar(20) NOT NULL,
	"processing_fees" numeric(20, 8) DEFAULT '0',
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"webhook_data" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "follows" (
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "follows_follower_id_following_id_pk" PRIMARY KEY("follower_id","following_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "geofencing_rules" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"regions" text,
	"action" varchar(16) NOT NULL,
	"content_types" text,
	"reason" text NOT NULL,
	"priority" integer DEFAULT 50 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "governance_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dao_id" uuid,
	"voting_token_address" varchar(66),
	"voting_delay" integer DEFAULT 86400,
	"voting_period" integer DEFAULT 604800,
	"proposal_threshold" numeric(20, 8) DEFAULT '1000',
	"quorum_percentage" integer DEFAULT 10,
	"execution_delay" integer DEFAULT 172800,
	"required_majority" integer DEFAULT 50,
	"allow_delegation" boolean DEFAULT true,
	"staking_enabled" boolean DEFAULT false,
	"staking_multiplier_max" numeric(5, 2) DEFAULT '2.0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "governance_settings_dao_id_unique" UNIQUE("dao_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "image_storage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ipfs_hash" varchar(255) NOT NULL,
	"cdn_url" varchar(500),
	"original_filename" varchar(255),
	"content_type" varchar(100),
	"file_size" integer,
	"width" integer,
	"height" integer,
	"thumbnails" text,
	"owner_id" uuid,
	"usage_type" varchar(50),
	"usage_reference_id" varchar(255),
	"backup_urls" text,
	"access_count" integer DEFAULT 0,
	"last_accessed" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "image_storage_ipfs_hash_unique" UNIQUE("ipfs_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ipfs_hash" varchar(66) NOT NULL,
	"cid" varchar(66) NOT NULL,
	"url" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "juror_eligibility" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"reputation_score" numeric DEFAULT '1.0',
	"total_stake" numeric DEFAULT '0',
	"active_cases" integer DEFAULT 0,
	"completed_cases" integer DEFAULT 0,
	"correct_decisions" integer DEFAULT 0,
	"incorrect_decisions" integer DEFAULT 0,
	"last_activity" timestamp,
	"is_eligible" boolean DEFAULT true,
	"suspension_until" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "juror_eligibility_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "juror_performance" (
	"id" serial PRIMARY KEY NOT NULL,
	"juror_id" uuid NOT NULL,
	"appeal_id" integer NOT NULL,
	"vote" varchar(24) NOT NULL,
	"was_majority" boolean NOT NULL,
	"was_correct" boolean,
	"stake_amount" numeric(20, 8) NOT NULL,
	"reward_earned" numeric(20, 8) DEFAULT '0',
	"penalty_applied" numeric(20, 8) DEFAULT '0',
	"response_time_minutes" integer,
	"quality_score" numeric(5, 4),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jury_voting_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"appeal_id" integer NOT NULL,
	"session_round" integer NOT NULL,
	"commit_phase_start" timestamp NOT NULL,
	"commit_phase_end" timestamp NOT NULL,
	"reveal_phase_start" timestamp NOT NULL,
	"reveal_phase_end" timestamp NOT NULL,
	"required_jurors" integer DEFAULT 5,
	"selected_jurors" integer DEFAULT 0,
	"committed_votes" integer DEFAULT 0,
	"revealed_votes" integer DEFAULT 0,
	"status" varchar(24) DEFAULT 'setup',
	"final_decision" varchar(24),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ldao_price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"price_usd" numeric(20, 8) NOT NULL,
	"price_eth" numeric(20, 8),
	"volume_24h" numeric(20, 8) DEFAULT '0',
	"market_cap" numeric(20, 8),
	"source" varchar(50) NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "link_monitoring_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"url_analysis_id" integer,
	"alert_type" varchar(32) NOT NULL,
	"severity" varchar(16) DEFAULT 'medium',
	"description" text,
	"affected_content_count" integer DEFAULT 0,
	"is_resolved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "link_safety_vendor_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"url_analysis_id" integer,
	"vendor_name" varchar(32) NOT NULL,
	"vendor_status" varchar(24),
	"threat_types" text,
	"confidence" numeric(5, 2) DEFAULT '0.00',
	"raw_response" text,
	"analysis_time_ms" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid,
	"product_id" uuid,
	"token_address" varchar(66) NOT NULL,
	"price" numeric NOT NULL,
	"quantity" integer NOT NULL,
	"item_type" varchar(32) NOT NULL,
	"listing_type" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'active',
	"start_time" timestamp DEFAULT now(),
	"end_time" timestamp,
	"highest_bid" numeric,
	"highest_bidder" varchar(66),
	"metadata_uri" text NOT NULL,
	"is_escrowed" boolean DEFAULT false,
	"nft_standard" varchar(32),
	"token_id" varchar(128),
	"reserve_price" numeric,
	"min_increment" numeric,
	"reserve_met" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketplace_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"product_id" uuid,
	"event_type" varchar(50) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketplace_appeals" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" varchar(64) NOT NULL,
	"decision_id" integer,
	"appellant_address" varchar(66) NOT NULL,
	"appeal_reason" text NOT NULL,
	"evidence" text,
	"status" varchar(24) DEFAULT 'open',
	"reviewed_by" varchar(64),
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketplace_config" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"config_key" varchar(100) NOT NULL,
	"config_value" text NOT NULL,
	"value_type" varchar(20) NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "marketplace_config_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketplace_disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"raised_by" uuid,
	"status" varchar(20) DEFAULT 'open',
	"evidence" jsonb,
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketplace_health_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"metric_name" varchar(100) NOT NULL,
	"metric_value" numeric(15, 4) NOT NULL,
	"metric_unit" varchar(50),
	"category" varchar(50) NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketplace_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_address" varchar(42) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"price" numeric(18, 8) NOT NULL,
	"currency" varchar(10) DEFAULT 'ETH',
	"images" jsonb,
	"category" varchar(100),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketplace_moderation_decisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" varchar(64) NOT NULL,
	"decision" varchar(24) NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '0' NOT NULL,
	"primary_category" varchar(48),
	"reasoning" text,
	"vendor_results" text,
	"moderator_id" varchar(64),
	"is_automated" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketplace_moderation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_name" varchar(100) NOT NULL,
	"rule_type" varchar(32) NOT NULL,
	"conditions" text,
	"action" varchar(24) NOT NULL,
	"threshold" numeric(3, 2) DEFAULT '0.5',
	"is_active" boolean DEFAULT true,
	"priority" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketplace_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"escrow_contract_address" varchar(66) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"amount" numeric(20, 8) NOT NULL,
	"currency" varchar(10) DEFAULT 'USDC',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketplace_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"category" varchar(100),
	"price_crypto" numeric(20, 8) NOT NULL,
	"price_fiat" numeric(20, 2),
	"currency" varchar(10) DEFAULT 'USDC',
	"metadata_uri" text,
	"is_physical" boolean DEFAULT false,
	"stock" integer DEFAULT 1,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketplace_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewee_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
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
CREATE TABLE IF NOT EXISTS "marketplace_users" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"role" varchar(10) NOT NULL,
	"email" varchar(255),
	"legal_name" varchar(255),
	"country" varchar(2),
	"shipping_address" jsonb,
	"billing_address" jsonb,
	"kyc_verified" boolean DEFAULT false,
	"kyc_verification_date" timestamp,
	"kyc_provider" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketplace_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"verification_level" varchar(20) DEFAULT 'basic' NOT NULL,
	"seller_tier" varchar(20) DEFAULT 'unverified' NOT NULL,
	"risk_score" numeric(3, 2) DEFAULT '0' NOT NULL,
	"proof_of_ownership" jsonb,
	"brand_verification" jsonb,
	"verification_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"verified_by" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_read_status" (
	"message_id" uuid NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"read_at" timestamp DEFAULT now(),
	CONSTRAINT "message_read_status_message_id_user_address_pk" PRIMARY KEY("message_id","user_address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"wallet_address" varchar(66) NOT NULL,
	"name" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"category" varchar(64),
	"tags" jsonb DEFAULT '[]',
	"is_active" boolean DEFAULT true,
	"usage_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "milestone_payments" (
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
CREATE TABLE IF NOT EXISTS "mobile_device_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"token" varchar(255) NOT NULL,
	"platform" varchar(32) NOT NULL,
	"last_used_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mobile_governance_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"proposal_id" uuid,
	"action_type" varchar(50),
	"biometric_used" boolean DEFAULT false,
	"session_start" timestamp DEFAULT now(),
	"session_end" timestamp,
	"actions_performed" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moderation_actions" (
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
CREATE TABLE IF NOT EXISTS "moderation_appeals" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"appellant_id" uuid NOT NULL,
	"status" varchar(24) DEFAULT 'open',
	"stake_amount" numeric DEFAULT '0',
	"jury_decision" varchar(24),
	"decision_cid" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moderation_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"action_type" varchar(64) NOT NULL,
	"actor_id" varchar(64) NOT NULL,
	"actor_type" varchar(24) NOT NULL,
	"target_id" varchar(64),
	"target_type" varchar(24),
	"old_state" text,
	"new_state" text,
	"reasoning" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moderation_cases" (
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nft_auctions" (
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
CREATE TABLE IF NOT EXISTS "nft_collections" (
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
CREATE TABLE IF NOT EXISTS "nft_listings" (
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
CREATE TABLE IF NOT EXISTS "nft_offers" (
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
CREATE TABLE IF NOT EXISTS "nfts" (
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
CREATE TABLE IF NOT EXISTS "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"preferences" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_preferences_user_address_unique" UNIQUE("user_address")
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" uuid,
	"buyer_id" uuid,
	"amount" numeric NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"accepted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "offline_action_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"action_type" varchar(50) NOT NULL,
	"action_data" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"retry_count" integer DEFAULT 0,
	"last_attempt_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "offline_content_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"content_id" varchar(64) NOT NULL,
	"content_data" text NOT NULL,
	"expires_at" timestamp,
	"priority" integer DEFAULT 0,
	"accessed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer,
	"event_type" varchar(64) NOT NULL,
	"description" text,
	"metadata" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_payment_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"transaction_id" varchar(255),
	"event_type" varchar(50) NOT NULL,
	"event_description" text NOT NULL,
	"payment_status" varchar(20),
	"order_status" varchar(20),
	"event_data" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" uuid,
	"buyer_id" uuid,
	"seller_id" uuid,
	"escrow_id" integer,
	"amount" numeric NOT NULL,
	"payment_token" varchar(66),
	"status" varchar(32) DEFAULT 'pending',
	"checkout_session_id" varchar(255),
	"payment_method" varchar(20),
	"payment_details" text,
	"shipping_address" text,
	"billing_address" text,
	"order_notes" text,
	"tracking_number" varchar(100),
	"tracking_carrier" varchar(50),
	"estimated_delivery" timestamp,
	"actual_delivery" timestamp,
	"delivery_confirmation" text,
	"payment_confirmation_hash" varchar(66),
	"escrow_contract_address" varchar(66),
	"total_amount" numeric(20, 8),
	"currency" varchar(10) DEFAULT 'USD',
	"order_metadata" text,
	"stripe_payment_intent_id" varchar(255),
	"stripe_transfer_group" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ownership_proofs" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" varchar(64) NOT NULL,
	"token_address" varchar(66) NOT NULL,
	"token_id" varchar(128) NOT NULL,
	"wallet_address" varchar(66) NOT NULL,
	"signature" text NOT NULL,
	"message" text NOT NULL,
	"timestamp" varchar(20) NOT NULL,
	"is_valid" boolean DEFAULT false,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_method_preference_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"override_type" varchar(50) NOT NULL,
	"payment_method_type" varchar(50) NOT NULL,
	"network_id" integer,
	"priority_boost" integer DEFAULT 0,
	"expires_at" timestamp,
	"reason" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_method_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"encrypted_preferences" text NOT NULL,
	"preferred_methods" jsonb DEFAULT '[]',
	"avoided_methods" jsonb DEFAULT '[]',
	"max_gas_fee_threshold" numeric(10, 2) DEFAULT '50.00',
	"prefer_stablecoins" boolean DEFAULT true,
	"prefer_fiat" boolean DEFAULT false,
	"total_transactions" integer DEFAULT 0,
	"method_usage_counts" jsonb DEFAULT '{}',
	"last_used_methods" jsonb DEFAULT '[]',
	"preference_scores" jsonb DEFAULT '{}',
	"learning_enabled" boolean DEFAULT true,
	"last_preference_update" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_method_usage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"payment_method_type" varchar(50) NOT NULL,
	"transaction_amount" numeric(20, 8),
	"transaction_currency" varchar(10),
	"gas_fee_usd" numeric(10, 2),
	"total_cost_usd" numeric(10, 2),
	"network_id" integer,
	"was_preferred" boolean DEFAULT false,
	"was_suggested" boolean DEFAULT false,
	"context_data" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_receipts" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"transaction_id" varchar(255) NOT NULL,
	"order_id" integer NOT NULL,
	"receipt_number" varchar(100) NOT NULL,
	"payment_method" varchar(20) NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"fees" text NOT NULL,
	"transaction_details" text NOT NULL,
	"receipt_url" varchar(500) NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "payment_receipts_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_transactions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"payment_method" varchar(20) NOT NULL,
	"transaction_hash" varchar(66),
	"payment_intent_id" varchar(255),
	"escrow_id" varchar(255),
	"amount" numeric(20, 8) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"processing_fee" numeric(20, 8) DEFAULT '0',
	"platform_fee" numeric(20, 8) DEFAULT '0',
	"gas_fee" numeric(20, 8) DEFAULT '0',
	"total_fees" numeric(20, 8) DEFAULT '0',
	"receipt_url" varchar(500),
	"receipt_data" text,
	"failure_reason" text,
	"retry_count" integer DEFAULT 0,
	"metadata" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"confirmed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
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
CREATE TABLE IF NOT EXISTS "pii_detection_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"detected_types" text,
	"confidence" numeric(3, 2) DEFAULT '0' NOT NULL,
	"redaction_applied" boolean DEFAULT false NOT NULL,
	"sensitivity_level" varchar(16) DEFAULT 'medium' NOT NULL,
	"processing_time_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"category" varchar(48) NOT NULL,
	"severity" varchar(24) NOT NULL,
	"confidence_threshold" numeric DEFAULT '0.7',
	"action" varchar(24) NOT NULL,
	"reputation_modifier" numeric DEFAULT '0',
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_by" varchar(64),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "poll_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"text" text NOT NULL,
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "poll_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"token_amount" numeric DEFAULT '1',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" integer NOT NULL,
	"question" text NOT NULL,
	"allow_multiple" boolean DEFAULT false,
	"token_weighted" boolean DEFAULT false,
	"min_tokens" numeric DEFAULT '0',
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer,
	"tag" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" uuid,
	"title" text,
	"content_cid" text NOT NULL,
	"parent_id" integer,
	"media_cids" text,
	"tags" text,
	"staked_value" numeric DEFAULT '0',
	"reputation_score" integer DEFAULT 0,
	"dao" varchar(64),
	"community_id" uuid,
	"poll_id" uuid,
	"is_token_gated" boolean DEFAULT false,
	"gated_content_preview" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "privacy_evidence" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"evidence_type" varchar(32) DEFAULT 'moderation_decision' NOT NULL,
	"safe_content" text NOT NULL,
	"model_outputs" text,
	"decision_rationale" text NOT NULL,
	"policy_version" varchar(16) DEFAULT '1.0' NOT NULL,
	"moderator_id" varchar(64),
	"region" varchar(16) NOT NULL,
	"encryption_key_hash" varchar(64),
	"pii_redaction_applied" boolean DEFAULT false NOT NULL,
	"retention_expires_at" timestamp NOT NULL,
	"legal_basis" varchar(32) NOT NULL,
	"data_classification" varchar(16) DEFAULT 'internal' NOT NULL,
	"processing_purpose" varchar(64) NOT NULL,
	"ipfs_cid" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"tag" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text NOT NULL,
	"price_amount" numeric(20, 8) NOT NULL,
	"price_currency" varchar(10) NOT NULL,
	"category_id" uuid NOT NULL,
	"images" text NOT NULL,
	"metadata" text NOT NULL,
	"inventory" integer DEFAULT 0 NOT NULL,
	"status" varchar(32) DEFAULT 'active',
	"tags" text,
	"shipping" text,
	"nft" text,
	"views" integer DEFAULT 0,
	"favorites" integer DEFAULT 0,
	"listing_status" varchar(20) DEFAULT 'draft',
	"published_at" timestamp,
	"search_vector" text,
	"image_ipfs_hashes" text,
	"image_cdn_urls" text,
	"primary_image_index" integer DEFAULT 0,
	"seo_title" varchar(255),
	"seo_description" text,
	"seo_keywords" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_activities" (
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
CREATE TABLE IF NOT EXISTS "project_approvals" (
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
CREATE TABLE IF NOT EXISTS "project_deliverables" (
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
CREATE TABLE IF NOT EXISTS "project_files" (
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
CREATE TABLE IF NOT EXISTS "project_messages" (
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
CREATE TABLE IF NOT EXISTS "project_threads" (
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
CREATE TABLE IF NOT EXISTS "proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"dao_id" uuid,
	"title_cid" text,
	"body_cid" text,
	"start_block" integer,
	"end_block" integer,
	"status" varchar(32) DEFAULT 'pending',
	"yes_votes" numeric(20, 8) DEFAULT '0',
	"no_votes" numeric(20, 8) DEFAULT '0',
	"abstain_votes" numeric(20, 8) DEFAULT '0',
	"total_votes" numeric(20, 8) DEFAULT '0',
	"quorum_reached" boolean DEFAULT false,
	"proposer_id" uuid,
	"execution_eta" timestamp,
	"executed_at" timestamp,
	"cancelled_at" timestamp,
	"proposer_address" varchar(66),
	"category" varchar(32) DEFAULT 'general',
	"quorum" numeric(20, 8),
	"execution_delay" integer,
	"requires_staking" boolean DEFAULT false,
	"min_stake_to_vote" numeric(20, 8) DEFAULT '0',
	"targets" text,
	"values" text,
	"signatures" text,
	"calldatas" text,
	"queued_at" timestamp,
	"required_majority" integer DEFAULT 50
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"payment_method" varchar(20) NOT NULL,
	"payment_token" varchar(20) NOT NULL,
	"price_per_token" numeric(20, 8) NOT NULL,
	"discount_applied" numeric(5, 4) DEFAULT '0' NOT NULL,
	"total_price" numeric(20, 8) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"tx_hash" varchar(66),
	"payment_processor_id" varchar(255),
	"payment_details" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "push_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"token" varchar(255) NOT NULL,
	"platform" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quick_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"wallet_address" varchar(66) NOT NULL,
	"trigger_keywords" jsonb NOT NULL,
	"response_text" text NOT NULL,
	"category" varchar(64),
	"is_active" boolean DEFAULT true,
	"usage_count" integer DEFAULT 0,
	"priority" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer,
	"user_id" uuid,
	"type" varchar(32) NOT NULL,
	"amount" numeric NOT NULL,
	"rewards_earned" numeric DEFAULT '0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" uuid NOT NULL,
	"referee_id" uuid NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"tokens_earned" numeric(20, 8) NOT NULL,
	"tier_level" integer DEFAULT 1 NOT NULL,
	"bonus_percentage" numeric(5, 4) NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "regional_compliance" (
	"region" varchar(16) PRIMARY KEY NOT NULL,
	"country" varchar(8) NOT NULL,
	"gdpr_applicable" boolean DEFAULT false NOT NULL,
	"ccpa_applicable" boolean DEFAULT false NOT NULL,
	"data_localization" boolean DEFAULT false NOT NULL,
	"content_restrictions" text,
	"retention_period_days" integer DEFAULT 730 NOT NULL,
	"consent_required" boolean DEFAULT false NOT NULL,
	"right_to_erasure" boolean DEFAULT false NOT NULL,
	"data_portability" boolean DEFAULT false NOT NULL,
	"minor_protections" boolean DEFAULT true NOT NULL,
	"crypto_regulations" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reporter_performance" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporter_id" uuid NOT NULL,
	"report_id" integer NOT NULL,
	"report_accuracy" varchar(24),
	"moderator_agreement" boolean,
	"final_case_outcome" varchar(24),
	"weight_applied" numeric(5, 4) NOT NULL,
	"reputation_impact" numeric(10, 4) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reputation_calculation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_name" varchar(100) NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"score_impact" numeric(5, 2) NOT NULL,
	"weight_factor" numeric(3, 2) DEFAULT '1.00',
	"min_threshold" integer DEFAULT 0,
	"max_impact" numeric(5, 2),
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reputation_calculation_rules_rule_name_unique" UNIQUE("rule_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reputation_change_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" varchar(32) NOT NULL,
	"score_change" numeric(10, 4) NOT NULL,
	"previous_score" numeric(10, 4) NOT NULL,
	"new_score" numeric(10, 4) NOT NULL,
	"severity_multiplier" numeric(5, 4) DEFAULT '1',
	"case_id" integer,
	"appeal_id" integer,
	"report_id" integer,
	"description" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reputation_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(66) NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"score_change" numeric(5, 2) NOT NULL,
	"previous_score" numeric(5, 2) NOT NULL,
	"new_score" numeric(5, 2) NOT NULL,
	"transaction_id" varchar(100),
	"review_id" uuid,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reputation_penalties" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"penalty_type" varchar(32) NOT NULL,
	"severity_level" integer NOT NULL,
	"violation_count" integer NOT NULL,
	"penalty_start" timestamp DEFAULT now() NOT NULL,
	"penalty_end" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"case_id" integer,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reputation_rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"reward_type" varchar(32) NOT NULL,
	"base_reward" numeric(10, 4) NOT NULL,
	"multiplier_min" numeric(5, 4) DEFAULT '1',
	"multiplier_max" numeric(5, 4) DEFAULT '3',
	"requirements" text,
	"description" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reputation_thresholds" (
	"id" serial PRIMARY KEY NOT NULL,
	"threshold_type" varchar(32) NOT NULL,
	"min_score" numeric(10, 4) NOT NULL,
	"max_score" numeric(10, 4),
	"multiplier" numeric(5, 4) DEFAULT '1',
	"description" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reputations" (
	"wallet_address" varchar(66) PRIMARY KEY NOT NULL,
	"score" integer NOT NULL,
	"dao_approved" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_helpfulness" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_helpful" boolean NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" varchar(100) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reviews" (
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
CREATE TABLE IF NOT EXISTS "scam_patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" varchar(64) NOT NULL,
	"pattern_type" varchar(32) NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '0' NOT NULL,
	"indicators" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seller_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_wallet_address" varchar(66) NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seller_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_wallet_address" varchar(66) NOT NULL,
	"badge_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"color" varchar(50),
	"earned_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seller_dao_endorsements" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_wallet_address" varchar(66) NOT NULL,
	"endorser_address" varchar(66) NOT NULL,
	"endorser_ens" varchar(255),
	"proposal_hash" varchar(66),
	"vote_count" integer DEFAULT 0,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seller_growth_projections" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_wallet_address" varchar(66) NOT NULL,
	"projection_type" varchar(50) NOT NULL,
	"current_value" numeric(15, 4) NOT NULL,
	"projected_value" numeric(15, 4) NOT NULL,
	"confidence_interval" numeric(5, 2) NOT NULL,
	"projection_period_months" integer NOT NULL,
	"success_factors" jsonb DEFAULT '[]',
	"improvement_recommendations" jsonb DEFAULT '[]',
	"model_version" varchar(20) DEFAULT '1.0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seller_performance_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_wallet_address" varchar(66) NOT NULL,
	"alert_type" varchar(50) NOT NULL,
	"severity" varchar(20) DEFAULT 'medium' NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"threshold_value" numeric(10, 4),
	"current_value" numeric(10, 4),
	"recommendations" jsonb DEFAULT '[]',
	"is_acknowledged" boolean DEFAULT false,
	"acknowledged_at" timestamp,
	"acknowledged_by" varchar(66),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seller_performance_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_wallet_address" varchar(66) NOT NULL,
	"metric_type" varchar(50) NOT NULL,
	"metric_value" numeric(10, 4) NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seller_risk_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_wallet_address" varchar(66) NOT NULL,
	"overall_risk_score" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"financial_risk" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"operational_risk" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"reputation_risk" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"compliance_risk" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"risk_factors" jsonb DEFAULT '[]',
	"risk_level" varchar(20) DEFAULT 'low',
	"mitigation_recommendations" jsonb DEFAULT '[]',
	"last_assessed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seller_scorecards" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_wallet_address" varchar(66) NOT NULL,
	"overall_score" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"customer_satisfaction" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"order_fulfillment" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"response_time" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"dispute_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"growth_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"performance_tier" varchar(20) DEFAULT 'bronze',
	"last_calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seller_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_wallet_address" varchar(66) NOT NULL,
	"transaction_type" varchar(20) NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"currency" varchar(10) DEFAULT 'ETH',
	"counterparty_address" varchar(66),
	"transaction_hash" varchar(66),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seller_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"current_tier" varchar(20) DEFAULT 'unverified' NOT NULL,
	"kyc_verified" boolean DEFAULT false,
	"kyc_verified_at" timestamp,
	"reputation_score" integer DEFAULT 0,
	"total_volume" numeric(20, 8) DEFAULT '0',
	"successful_transactions" integer DEFAULT 0,
	"dispute_rate" numeric(3, 2) DEFAULT '0',
	"last_tier_update" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sellers" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_address" varchar(66) NOT NULL,
	"display_name" varchar(255),
	"store_name" varchar(255),
	"bio" text,
	"description" text,
	"seller_story" text,
	"location" varchar(255),
	"cover_image_url" text,
	"social_links" text,
	"performance_metrics" text,
	"verification_levels" text,
	"is_online" boolean DEFAULT false,
	"last_seen" timestamp,
	"tier" varchar(32) DEFAULT 'basic',
	"ens_handle" varchar(255),
	"ens_verified" boolean DEFAULT false,
	"ens_last_verified" timestamp,
	"profile_image_ipfs" varchar(255),
	"profile_image_cdn" varchar(500),
	"cover_image_ipfs" varchar(255),
	"cover_image_cdn" varchar(500),
	"website_url" varchar(500),
	"twitter_handle" varchar(100),
	"discord_handle" varchar(100),
	"telegram_handle" varchar(100),
	"store_description" text,
	"is_verified" boolean DEFAULT false,
	"onboarding_completed" boolean DEFAULT false,
	"onboarding_steps" jsonb DEFAULT '{"profile_setup": false, "verification": false, "payout_setup": false, "first_listing": false}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "sellers_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_availability" (
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
CREATE TABLE IF NOT EXISTS "service_bookings" (
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
CREATE TABLE IF NOT EXISTS "service_categories" (
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
CREATE TABLE IF NOT EXISTS "service_messages" (
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
CREATE TABLE IF NOT EXISTS "service_milestones" (
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
CREATE TABLE IF NOT EXISTS "service_provider_profiles" (
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
CREATE TABLE IF NOT EXISTS "service_reviews" (
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
CREATE TABLE IF NOT EXISTS "services" (
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
CREATE TABLE IF NOT EXISTS "shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"target_type" varchar(32) NOT NULL,
	"target_id" uuid,
	"message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staking_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"lock_period" integer NOT NULL,
	"apr_rate" numeric(5, 4) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"is_auto_compound" boolean DEFAULT false NOT NULL,
	"rewards_earned" numeric(20, 8) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"contract_address" varchar(66),
	"tx_hash" varchar(66),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stolen_nfts" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_address" varchar(66) NOT NULL,
	"token_id" varchar(128) NOT NULL,
	"reported_by" varchar(66),
	"report_reason" text,
	"evidence" text,
	"status" varchar(24) DEFAULT 'reported',
	"verified_by" varchar(64),
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(64) NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "sync_status_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"metric_name" varchar(64) NOT NULL,
	"metric_value" numeric NOT NULL,
	"metric_type" varchar(24) NOT NULL,
	"tags" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "threshold_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_type" varchar(24) NOT NULL,
	"reputation_tier" varchar(24) NOT NULL,
	"auto_block_threshold" numeric DEFAULT '0.95',
	"quarantine_threshold" numeric DEFAULT '0.7',
	"publish_threshold" numeric DEFAULT '0.3',
	"escalation_threshold" numeric DEFAULT '0.5',
	"is_active" boolean DEFAULT true,
	"created_by" varchar(64),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "time_tracking" (
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
CREATE TABLE IF NOT EXISTS "tips" (
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trending_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" varchar(32) NOT NULL,
	"content_id" varchar(66) NOT NULL,
	"score" numeric(10, 4) NOT NULL,
	"timeframe" varchar(16) NOT NULL,
	"rank" integer NOT NULL,
	"metadata" text,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trending_content_content_type_content_id_timeframe_pk" PRIMARY KEY("content_type","content_id","timeframe")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "url_analysis_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"url_hash" varchar(64) NOT NULL,
	"domain" varchar(255) NOT NULL,
	"status" varchar(24) DEFAULT 'pending',
	"risk_score" numeric(5, 2) DEFAULT '0.00',
	"analysis_results" text,
	"unfurled_content" text,
	"last_analyzed" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "url_analysis_results_url_hash_unique" UNIQUE("url_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_type" varchar(32) NOT NULL,
	"target_id" varchar(66) NOT NULL,
	"interaction_type" varchar(32) NOT NULL,
	"interaction_value" numeric(10, 4) DEFAULT '1.0',
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_purchase_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"daily_limit" numeric(20, 8) DEFAULT '1000' NOT NULL,
	"monthly_limit" numeric(20, 8) DEFAULT '10000' NOT NULL,
	"daily_spent" numeric(20, 8) DEFAULT '0' NOT NULL,
	"monthly_spent" numeric(20, 8) DEFAULT '0' NOT NULL,
	"kyc_verified" boolean DEFAULT false NOT NULL,
	"kyc_level" varchar(20) DEFAULT 'none' NOT NULL,
	"last_reset_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_purchase_limits_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recommended_user_id" uuid NOT NULL,
	"score" numeric(10, 4) NOT NULL,
	"reasons" text,
	"mutual_connections" integer DEFAULT 0,
	"shared_interests" text,
	"algorithm_version" varchar(32) DEFAULT 'v1.0',
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_recommendations_user_id_recommended_user_id_pk" PRIMARY KEY("user_id","recommended_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_reputation" (
	"wallet_address" varchar(66) PRIMARY KEY NOT NULL,
	"reputation_score" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"total_transactions" integer DEFAULT 0 NOT NULL,
	"positive_reviews" integer DEFAULT 0 NOT NULL,
	"negative_reviews" integer DEFAULT 0 NOT NULL,
	"neutral_reviews" integer DEFAULT 0 NOT NULL,
	"successful_sales" integer DEFAULT 0 NOT NULL,
	"successful_purchases" integer DEFAULT 0 NOT NULL,
	"disputed_transactions" integer DEFAULT 0 NOT NULL,
	"resolved_disputes" integer DEFAULT 0 NOT NULL,
	"average_response_time" numeric(10, 2) DEFAULT '0.00',
	"completion_rate" numeric(5, 2) DEFAULT '100.00',
	"last_calculated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_reputation_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"overall_score" numeric(10, 4) DEFAULT '1000' NOT NULL,
	"moderation_score" numeric(10, 4) DEFAULT '1000' NOT NULL,
	"reporting_score" numeric(10, 4) DEFAULT '1000' NOT NULL,
	"jury_score" numeric(10, 4) DEFAULT '1000' NOT NULL,
	"violation_count" integer DEFAULT 0 NOT NULL,
	"helpful_reports_count" integer DEFAULT 0 NOT NULL,
	"false_reports_count" integer DEFAULT 0 NOT NULL,
	"successful_appeals_count" integer DEFAULT 0 NOT NULL,
	"jury_decisions_count" integer DEFAULT 0 NOT NULL,
	"jury_accuracy_rate" numeric(5, 4) DEFAULT '0' NOT NULL,
	"last_violation_at" timestamp,
	"reputation_tier" varchar(24) DEFAULT 'bronze' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_reputation_scores_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_consents" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"consent_type" varchar(32) NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"purpose" text NOT NULL,
	"legal_basis" varchar(32) NOT NULL,
	"granted_at" timestamp,
	"withdrawn_at" timestamp,
	"expires_at" timestamp,
	"ip_address" varchar(45) NOT NULL,
	"user_agent" text NOT NULL,
	"consent_version" varchar(16) DEFAULT '1.0' NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(66) NOT NULL,
	"handle" varchar(64),
	"profile_cid" text,
	"physical_address" text,
	"role" varchar(32) DEFAULT 'user',
	"email" varchar(255),
	"password_hash" varchar(255),
	"email_verified" boolean DEFAULT false,
	"permissions" jsonb DEFAULT '[]',
	"last_login" timestamp,
	"login_attempts" integer DEFAULT 0,
	"locked_until" timestamp,
	"billing_first_name" varchar(100),
	"billing_last_name" varchar(100),
	"billing_company" varchar(200),
	"billing_address1" varchar(255),
	"billing_address2" varchar(255),
	"billing_city" varchar(100),
	"billing_state" varchar(100),
	"billing_zip_code" varchar(20),
	"billing_country" varchar(2),
	"billing_phone" varchar(20),
	"shipping_first_name" varchar(100),
	"shipping_last_name" varchar(100),
	"shipping_company" varchar(200),
	"shipping_address1" varchar(255),
	"shipping_address2" varchar(255),
	"shipping_city" varchar(100),
	"shipping_state" varchar(100),
	"shipping_zip_code" varchar(20),
	"shipping_country" varchar(2),
	"shipping_phone" varchar(20),
	"shipping_same_as_billing" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address"),
	CONSTRAINT "users_handle_unique" UNIQUE("handle"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_name" varchar(48) NOT NULL,
	"service_type" varchar(32) NOT NULL,
	"api_endpoint" text,
	"api_key_ref" varchar(128),
	"is_enabled" boolean DEFAULT true,
	"priority" integer DEFAULT 1,
	"timeout_ms" integer DEFAULT 30000,
	"retry_attempts" integer DEFAULT 3,
	"rate_limit_per_minute" integer DEFAULT 100,
	"cost_per_request" numeric DEFAULT '0',
	"fallback_vendor_id" integer,
	"health_check_url" text,
	"last_health_check" timestamp,
	"health_status" varchar(24) DEFAULT 'unknown',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "views" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" uuid,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "volume_discount_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"min_amount" numeric(20, 8) NOT NULL,
	"max_amount" numeric(20, 8),
	"discount_percentage" numeric(5, 4) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" integer NOT NULL,
	"voter_id" uuid NOT NULL,
	"vote_choice" varchar(10) NOT NULL,
	"voting_power" numeric(20, 8) DEFAULT '0' NOT NULL,
	"delegated_power" numeric(20, 8) DEFAULT '0',
	"total_power" numeric(20, 8) DEFAULT '0' NOT NULL,
	"transaction_hash" varchar(66),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "votes_proposal_id_voter_id_pk" PRIMARY KEY("proposal_id","voter_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "voting_delegations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delegator_id" uuid NOT NULL,
	"delegate_id" uuid NOT NULL,
	"dao_id" uuid,
	"voting_power" numeric(20, 8) DEFAULT '0' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	CONSTRAINT "voting_delegations_delegator_id_delegate_id_dao_id_pk" PRIMARY KEY("delegator_id","delegate_id","dao_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "voting_power_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"dao_id" uuid,
	"proposal_id" integer,
	"token_balance" numeric(20, 8) DEFAULT '0' NOT NULL,
	"staking_multiplier" numeric(5, 2) DEFAULT '1.0',
	"delegated_power" numeric(20, 8) DEFAULT '0',
	"total_voting_power" numeric(20, 8) DEFAULT '0' NOT NULL,
	"snapshot_block" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallet_auth_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(66) NOT NULL,
	"attempt_type" varchar(32) NOT NULL,
	"success" boolean NOT NULL,
	"error_message" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallet_nonces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(66) NOT NULL,
	"nonce" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_nonces_nonce_unique" UNIQUE("nonce")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "watermark_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"template_type" varchar(20) NOT NULL,
	"template_data" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "appeal_jurors" ADD CONSTRAINT "appeal_jurors_appeal_id_moderation_appeals_id_fk" FOREIGN KEY ("appeal_id") REFERENCES "public"."moderation_appeals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "appeal_jurors" ADD CONSTRAINT "appeal_jurors_juror_id_users_id_fk" FOREIGN KEY ("juror_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "bids" ADD CONSTRAINT "bids_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "bids" ADD CONSTRAINT "bids_bidder_id_users_id_fk" FOREIGN KEY ("bidder_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "bridge_transactions" ADD CONSTRAINT "bridge_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "cdn_access_logs" ADD CONSTRAINT "cdn_access_logs_asset_id_digital_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "cdn_access_logs" ADD CONSTRAINT "cdn_access_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_reply_to_id_chat_messages_id_fk" FOREIGN KEY ("reply_to_id") REFERENCES "public"."chat_messages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_automated_executions" ADD CONSTRAINT "community_automated_executions_proposal_id_community_governance_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."community_governance_proposals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_creator_rewards" ADD CONSTRAINT "community_creator_rewards_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_creator_rewards" ADD CONSTRAINT "community_creator_rewards_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_delegations" ADD CONSTRAINT "community_delegations_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_events" ADD CONSTRAINT "community_events_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_governance_proposals" ADD CONSTRAINT "community_governance_proposals_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_governance_votes" ADD CONSTRAINT "community_governance_votes_proposal_id_community_governance_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."community_governance_proposals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_members" ADD CONSTRAINT "community_members_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_moderation_actions" ADD CONSTRAINT "community_moderation_actions_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_multi_sig_approvals" ADD CONSTRAINT "community_multi_sig_approvals_proposal_id_community_governance_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."community_governance_proposals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_proxy_votes" ADD CONSTRAINT "community_proxy_votes_proposal_id_community_governance_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."community_governance_proposals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_recommendations" ADD CONSTRAINT "community_recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_recommendations" ADD CONSTRAINT "community_recommendations_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_referral_programs" ADD CONSTRAINT "community_referral_programs_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_staking" ADD CONSTRAINT "community_staking_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_staking_rewards" ADD CONSTRAINT "community_staking_rewards_staking_id_community_staking_id_fk" FOREIGN KEY ("staking_id") REFERENCES "public"."community_staking"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_stats" ADD CONSTRAINT "community_stats_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_subscription_tiers" ADD CONSTRAINT "community_subscription_tiers_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_token_gated_content" ADD CONSTRAINT "community_token_gated_content_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_token_gated_content" ADD CONSTRAINT "community_token_gated_content_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_treasury_pools" ADD CONSTRAINT "community_treasury_pools_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_user_content_access" ADD CONSTRAINT "community_user_content_access_content_id_community_token_gated_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."community_token_gated_content"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_user_referrals" ADD CONSTRAINT "community_user_referrals_program_id_community_referral_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."community_referral_programs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_user_subscriptions" ADD CONSTRAINT "community_user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_user_subscriptions" ADD CONSTRAINT "community_user_subscriptions_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "community_user_subscriptions" ADD CONSTRAINT "community_user_subscriptions_tier_id_community_subscription_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."community_subscription_tiers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "content_links" ADD CONSTRAINT "content_links_url_analysis_id_url_analysis_results_id_fk" FOREIGN KEY ("url_analysis_id") REFERENCES "public"."url_analysis_results"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "content_verification" ADD CONSTRAINT "content_verification_asset_id_digital_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "conversation_analytics" ADD CONSTRAINT "conversation_analytics_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "custom_blacklist" ADD CONSTRAINT "custom_blacklist_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "dex_swap_transactions" ADD CONSTRAINT "dex_swap_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "digital_asset_access_logs" ADD CONSTRAINT "digital_asset_access_logs_asset_id_digital_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "digital_asset_access_logs" ADD CONSTRAINT "digital_asset_access_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "digital_asset_analytics" ADD CONSTRAINT "digital_asset_analytics_asset_id_digital_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "digital_asset_licenses" ADD CONSTRAINT "digital_asset_licenses_asset_id_digital_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "digital_asset_licenses" ADD CONSTRAINT "digital_asset_licenses_licensee_id_users_id_fk" FOREIGN KEY ("licensee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "digital_asset_purchases" ADD CONSTRAINT "digital_asset_purchases_asset_id_digital_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "digital_asset_purchases" ADD CONSTRAINT "digital_asset_purchases_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "digital_asset_reports" ADD CONSTRAINT "digital_asset_reports_asset_id_digital_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "digital_asset_reports" ADD CONSTRAINT "digital_asset_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "digital_assets" ADD CONSTRAINT "digital_assets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "dispute_judges" ADD CONSTRAINT "dispute_judges_dispute_id_marketplace_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "public"."marketplace_disputes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "dispute_judges" ADD CONSTRAINT "dispute_judges_judge_id_users_id_fk" FOREIGN KEY ("judge_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "disputes" ADD CONSTRAINT "disputes_escrow_id_escrows_id_fk" FOREIGN KEY ("escrow_id") REFERENCES "public"."escrows"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "disputes" ADD CONSTRAINT "disputes_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "dmca_takedown_requests" ADD CONSTRAINT "dmca_takedown_requests_asset_id_digital_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "dmca_takedown_requests" ADD CONSTRAINT "dmca_takedown_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "dmca_takedown_requests" ADD CONSTRAINT "dmca_takedown_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "drm_keys" ADD CONSTRAINT "drm_keys_asset_id_digital_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "drm_keys" ADD CONSTRAINT "drm_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "earning_activities" ADD CONSTRAINT "earning_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "escrows" ADD CONSTRAINT "escrows_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "escrows" ADD CONSTRAINT "escrows_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "escrows" ADD CONSTRAINT "escrows_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_community_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."community_events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "fiat_payment_records" ADD CONSTRAINT "fiat_payment_records_purchase_transaction_id_purchase_transactions_id_fk" FOREIGN KEY ("purchase_transaction_id") REFERENCES "public"."purchase_transactions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "image_storage" ADD CONSTRAINT "image_storage_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "juror_eligibility" ADD CONSTRAINT "juror_eligibility_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "juror_performance" ADD CONSTRAINT "juror_performance_juror_id_users_id_fk" FOREIGN KEY ("juror_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "jury_voting_sessions" ADD CONSTRAINT "jury_voting_sessions_appeal_id_moderation_appeals_id_fk" FOREIGN KEY ("appeal_id") REFERENCES "public"."moderation_appeals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "link_monitoring_alerts" ADD CONSTRAINT "link_monitoring_alerts_url_analysis_id_url_analysis_results_id_fk" FOREIGN KEY ("url_analysis_id") REFERENCES "public"."url_analysis_results"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "link_safety_vendor_results" ADD CONSTRAINT "link_safety_vendor_results_url_analysis_id_url_analysis_results_id_fk" FOREIGN KEY ("url_analysis_id") REFERENCES "public"."url_analysis_results"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "listings" ADD CONSTRAINT "listings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "marketplace_analytics" ADD CONSTRAINT "marketplace_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "marketplace_analytics" ADD CONSTRAINT "marketplace_analytics_product_id_marketplace_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."marketplace_products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "marketplace_appeals" ADD CONSTRAINT "marketplace_appeals_decision_id_marketplace_moderation_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."marketplace_moderation_decisions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "marketplace_disputes" ADD CONSTRAINT "marketplace_disputes_order_id_marketplace_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "marketplace_disputes" ADD CONSTRAINT "marketplace_disputes_raised_by_users_id_fk" FOREIGN KEY ("raised_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_seller_address_sellers_wallet_address_fk" FOREIGN KEY ("seller_address") REFERENCES "public"."sellers"("wallet_address") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_product_id_marketplace_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."marketplace_products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "marketplace_products" ADD CONSTRAINT "marketplace_products_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_reviewee_id_users_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_order_id_marketplace_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "marketplace_users" ADD CONSTRAINT "marketplace_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "marketplace_verifications" ADD CONSTRAINT "marketplace_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "message_read_status" ADD CONSTRAINT "message_read_status_message_id_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "milestone_payments" ADD CONSTRAINT "milestone_payments_milestone_id_service_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."service_milestones"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "milestone_payments" ADD CONSTRAINT "milestone_payments_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "mobile_governance_sessions" ADD CONSTRAINT "mobile_governance_sessions_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "moderation_appeals" ADD CONSTRAINT "moderation_appeals_case_id_moderation_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."moderation_cases"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "moderation_appeals" ADD CONSTRAINT "moderation_appeals_appellant_id_users_id_fk" FOREIGN KEY ("appellant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "nft_auctions" ADD CONSTRAINT "nft_auctions_nft_id_nfts_id_fk" FOREIGN KEY ("nft_id") REFERENCES "public"."nfts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "nft_auctions" ADD CONSTRAINT "nft_auctions_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "nft_auctions" ADD CONSTRAINT "nft_auctions_highest_bidder_id_users_id_fk" FOREIGN KEY ("highest_bidder_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "nft_collections" ADD CONSTRAINT "nft_collections_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "nft_listings" ADD CONSTRAINT "nft_listings_nft_id_nfts_id_fk" FOREIGN KEY ("nft_id") REFERENCES "public"."nfts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "nft_listings" ADD CONSTRAINT "nft_listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "nft_offers" ADD CONSTRAINT "nft_offers_nft_id_nfts_id_fk" FOREIGN KEY ("nft_id") REFERENCES "public"."nfts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "nft_offers" ADD CONSTRAINT "nft_offers_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "nfts" ADD CONSTRAINT "nfts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "nfts" ADD CONSTRAINT "nfts_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "offers" ADD CONSTRAINT "offers_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "offers" ADD CONSTRAINT "offers_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "order_payment_events" ADD CONSTRAINT "order_payment_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "order_payment_events" ADD CONSTRAINT "order_payment_events_transaction_id_payment_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."payment_transactions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_escrow_id_escrows_id_fk" FOREIGN KEY ("escrow_id") REFERENCES "public"."escrows"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "payment_method_preference_overrides" ADD CONSTRAINT "payment_method_preference_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "payment_method_preferences" ADD CONSTRAINT "payment_method_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "payment_method_usage_history" ADD CONSTRAINT "payment_method_usage_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_transaction_id_payment_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."payment_transactions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_from_users_id_fk" FOREIGN KEY ("from") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_to_users_id_fk" FOREIGN KEY ("to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_option_id_poll_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."poll_options"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "polls" ADD CONSTRAINT "polls_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "posts" ADD CONSTRAINT "posts_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "products" ADD CONSTRAINT "products_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_milestone_id_service_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."service_milestones"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "project_approvals" ADD CONSTRAINT "project_approvals_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "project_approvals" ADD CONSTRAINT "project_approvals_milestone_id_service_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."service_milestones"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "project_approvals" ADD CONSTRAINT "project_approvals_deliverable_id_project_deliverables_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."project_deliverables"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "project_approvals" ADD CONSTRAINT "project_approvals_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "project_deliverables" ADD CONSTRAINT "project_deliverables_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "project_deliverables" ADD CONSTRAINT "project_deliverables_milestone_id_service_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."service_milestones"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "project_files" ADD CONSTRAINT "project_files_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "project_files" ADD CONSTRAINT "project_files_milestone_id_service_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."service_milestones"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "project_files" ADD CONSTRAINT "project_files_deliverable_id_project_deliverables_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."project_deliverables"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "project_files" ADD CONSTRAINT "project_files_uploader_id_users_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "project_messages" ADD CONSTRAINT "project_messages_thread_id_project_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."project_threads"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "project_messages" ADD CONSTRAINT "project_messages_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "project_messages" ADD CONSTRAINT "project_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "project_threads" ADD CONSTRAINT "project_threads_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "project_threads" ADD CONSTRAINT "project_threads_milestone_id_service_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."service_milestones"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "project_threads" ADD CONSTRAINT "project_threads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "proposals" ADD CONSTRAINT "proposals_proposer_id_users_id_fk" FOREIGN KEY ("proposer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "purchase_transactions" ADD CONSTRAINT "purchase_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "quick_replies" ADD CONSTRAINT "quick_replies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "reactions" ADD CONSTRAINT "reactions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "referral_activities" ADD CONSTRAINT "referral_activities_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "referral_activities" ADD CONSTRAINT "referral_activities_referee_id_users_id_fk" FOREIGN KEY ("referee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "reporter_performance" ADD CONSTRAINT "reporter_performance_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "reputation_change_events" ADD CONSTRAINT "reputation_change_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "reputation_history" ADD CONSTRAINT "reputation_history_wallet_address_user_reputation_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."user_reputation"("wallet_address") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "reputation_penalties" ADD CONSTRAINT "reputation_penalties_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "review_helpfulness" ADD CONSTRAINT "review_helpfulness_review_id_marketplace_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."marketplace_reviews"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "review_helpfulness" ADD CONSTRAINT "review_helpfulness_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_review_id_marketplace_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."marketplace_reviews"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewee_id_users_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "seller_activities" ADD CONSTRAINT "seller_activities_seller_wallet_address_sellers_wallet_address_fk" FOREIGN KEY ("seller_wallet_address") REFERENCES "public"."sellers"("wallet_address") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "seller_badges" ADD CONSTRAINT "seller_badges_seller_wallet_address_sellers_wallet_address_fk" FOREIGN KEY ("seller_wallet_address") REFERENCES "public"."sellers"("wallet_address") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "seller_dao_endorsements" ADD CONSTRAINT "seller_dao_endorsements_seller_wallet_address_sellers_wallet_address_fk" FOREIGN KEY ("seller_wallet_address") REFERENCES "public"."sellers"("wallet_address") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "seller_growth_projections" ADD CONSTRAINT "seller_growth_projections_seller_wallet_address_sellers_wallet_address_fk" FOREIGN KEY ("seller_wallet_address") REFERENCES "public"."sellers"("wallet_address") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "seller_performance_alerts" ADD CONSTRAINT "seller_performance_alerts_seller_wallet_address_sellers_wallet_address_fk" FOREIGN KEY ("seller_wallet_address") REFERENCES "public"."sellers"("wallet_address") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "seller_performance_history" ADD CONSTRAINT "seller_performance_history_seller_wallet_address_sellers_wallet_address_fk" FOREIGN KEY ("seller_wallet_address") REFERENCES "public"."sellers"("wallet_address") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "seller_risk_assessments" ADD CONSTRAINT "seller_risk_assessments_seller_wallet_address_sellers_wallet_address_fk" FOREIGN KEY ("seller_wallet_address") REFERENCES "public"."sellers"("wallet_address") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "seller_scorecards" ADD CONSTRAINT "seller_scorecards_seller_wallet_address_sellers_wallet_address_fk" FOREIGN KEY ("seller_wallet_address") REFERENCES "public"."sellers"("wallet_address") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "seller_transactions" ADD CONSTRAINT "seller_transactions_seller_wallet_address_sellers_wallet_address_fk" FOREIGN KEY ("seller_wallet_address") REFERENCES "public"."sellers"("wallet_address") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "seller_verifications" ADD CONSTRAINT "seller_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "service_availability" ADD CONSTRAINT "service_availability_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_parent_id_service_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."service_categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "service_messages" ADD CONSTRAINT "service_messages_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "service_messages" ADD CONSTRAINT "service_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "service_messages" ADD CONSTRAINT "service_messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "service_milestones" ADD CONSTRAINT "service_milestones_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "service_provider_profiles" ADD CONSTRAINT "service_provider_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_reviewee_id_users_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "services" ADD CONSTRAINT "services_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "services" ADD CONSTRAINT "services_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "shares" ADD CONSTRAINT "shares_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "shares" ADD CONSTRAINT "shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "staking_positions" ADD CONSTRAINT "staking_positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "time_tracking" ADD CONSTRAINT "time_tracking_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "time_tracking" ADD CONSTRAINT "time_tracking_milestone_id_service_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."service_milestones"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "time_tracking" ADD CONSTRAINT "time_tracking_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "tips" ADD CONSTRAINT "tips_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "tips" ADD CONSTRAINT "tips_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "tips" ADD CONSTRAINT "tips_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "tracking_records" ADD CONSTRAINT "tracking_records_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "user_interactions" ADD CONSTRAINT "user_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "user_purchase_limits" ADD CONSTRAINT "user_purchase_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "user_recommendations" ADD CONSTRAINT "user_recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "user_recommendations" ADD CONSTRAINT "user_recommendations_recommended_user_id_users_id_fk" FOREIGN KEY ("recommended_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "user_reputation_scores" ADD CONSTRAINT "user_reputation_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "views" ADD CONSTRAINT "views_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "views" ADD CONSTRAINT "views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "votes" ADD CONSTRAINT "votes_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "votes" ADD CONSTRAINT "votes_voter_id_users_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "voting_delegations" ADD CONSTRAINT "voting_delegations_delegator_id_users_id_fk" FOREIGN KEY ("delegator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "voting_delegations" ADD CONSTRAINT "voting_delegations_delegate_id_users_id_fk" FOREIGN KEY ("delegate_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "voting_power_snapshots" ADD CONSTRAINT "voting_power_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "voting_power_snapshots" ADD CONSTRAINT "voting_power_snapshots_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "watermark_templates" ADD CONSTRAINT "watermark_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appeal_jurors_appeal_idx" ON "appeal_jurors" USING btree ("appeal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appeal_jurors_juror_idx" ON "appeal_jurors" USING btree ("juror_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appeal_jurors_status_idx" ON "appeal_jurors" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auth_sessions_wallet_address" ON "auth_sessions" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auth_sessions_session_token" ON "auth_sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auth_sessions_refresh_token" ON "auth_sessions" USING btree ("refresh_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auth_sessions_expires_at" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auth_sessions_is_active" ON "auth_sessions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_blocked_users_blocker" ON "blocked_users" USING btree ("blocker_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_blocked_users_blocked" ON "blocked_users" USING btree ("blocked_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookmark_user_idx" ON "bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookmark_post_idx" ON "bookmarks" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bridge_transactions_user_id" ON "bridge_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bridge_transactions_status" ON "bridge_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bridge_transactions_created_at" ON "bridge_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cart_items_cart_id" ON "cart_items" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cart_items_product_id" ON "cart_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cart_items_unique_cart_product" ON "cart_items" USING btree ("cart_id","product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_carts_user_id" ON "carts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_carts_session_id" ON "carts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_carts_status" ON "carts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_messages_conversation_id_timestamp" ON "chat_messages" USING btree ("conversation_id","timestamp");--> statement-breakpoint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'chat_messages'
        AND column_name = 'reply_to_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS "idx_chat_messages_reply_to"
        ON "chat_messages" USING btree ("reply_to_id");
        RAISE NOTICE 'Created index idx_chat_messages_reply_to';
    ELSE
        RAISE NOTICE 'Column reply_to_id does not exist in chat_messages table, skipping index creation';
    END IF;
END$$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_communities_name" ON "communities" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_communities_category" ON "communities" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_communities_is_public" ON "communities" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_communities_member_count" ON "communities" USING btree ("member_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_communities_created_at" ON "communities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_automated_executions_proposal_id" ON "community_automated_executions" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_automated_executions_type" ON "community_automated_executions" USING btree ("execution_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_automated_executions_time" ON "community_automated_executions" USING btree ("execution_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_automated_executions_status" ON "community_automated_executions" USING btree ("execution_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_automated_executions_dependency" ON "community_automated_executions" USING btree ("dependency_proposal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_categories_slug" ON "community_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_categories_is_active" ON "community_categories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_categories_sort_order" ON "community_categories" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_creator_rewards_community_id" ON "community_creator_rewards" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_creator_rewards_creator_address" ON "community_creator_rewards" USING btree ("creator_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_creator_rewards_post_id" ON "community_creator_rewards" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_creator_rewards_status" ON "community_creator_rewards" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_creator_rewards_created_at" ON "community_creator_rewards" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_delegations_community_id" ON "community_delegations" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_delegations_delegator" ON "community_delegations" USING btree ("delegator_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_delegations_delegate" ON "community_delegations" USING btree ("delegate_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_delegations_expiry" ON "community_delegations" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_events_community_id" ON "community_events" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_events_start_time" ON "community_events" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_events_event_type" ON "community_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_events_is_recurring" ON "community_events" USING btree ("is_recurring");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_governance_proposals_community_id" ON "community_governance_proposals" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_governance_proposals_proposer" ON "community_governance_proposals" USING btree ("proposer_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_governance_proposals_status" ON "community_governance_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_governance_proposals_voting_end_time" ON "community_governance_proposals" USING btree ("voting_end_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_governance_votes_proposal_id" ON "community_governance_votes" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_governance_votes_voter_address" ON "community_governance_votes" USING btree ("voter_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_governance_votes_choice" ON "community_governance_votes" USING btree ("vote_choice");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_members_community_id" ON "community_members" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_members_user_address" ON "community_members" USING btree ("user_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_members_role" ON "community_members" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_members_is_active" ON "community_members" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_members_joined_at" ON "community_members" USING btree ("joined_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_moderation_actions_community_id" ON "community_moderation_actions" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_moderation_actions_moderator" ON "community_moderation_actions" USING btree ("moderator_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_moderation_actions_action" ON "community_moderation_actions" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_moderation_actions_target_type" ON "community_moderation_actions" USING btree ("target_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_moderation_actions_created_at" ON "community_moderation_actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_multi_sig_approvals_proposal_id" ON "community_multi_sig_approvals" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_multi_sig_approvals_approver" ON "community_multi_sig_approvals" USING btree ("approver_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_multi_sig_approvals_approved_at" ON "community_multi_sig_approvals" USING btree ("approved_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_proxy_votes_proposal_id" ON "community_proxy_votes" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_proxy_votes_proxy" ON "community_proxy_votes" USING btree ("proxy_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_proxy_votes_voter" ON "community_proxy_votes" USING btree ("voter_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_recommendations_user_id" ON "community_recommendations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_recommendations_community_id" ON "community_recommendations" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_recommendations_score" ON "community_recommendations" USING btree ("score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_recommendations_expires_at" ON "community_recommendations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_referral_programs_community_id" ON "community_referral_programs" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_referral_programs_is_active" ON "community_referral_programs" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_referral_programs_start_date" ON "community_referral_programs" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_staking_community_id" ON "community_staking" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_staking_user_address" ON "community_staking" USING btree ("user_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_staking_is_active" ON "community_staking" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_staking_staked_at" ON "community_staking" USING btree ("staked_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_staking_rewards_staking_id" ON "community_staking_rewards" USING btree ("staking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_staking_rewards_user_address" ON "community_staking_rewards" USING btree ("user_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_staking_rewards_status" ON "community_staking_rewards" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_staking_rewards_type" ON "community_staking_rewards" USING btree ("reward_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_stats_trending_score" ON "community_stats" USING btree ("trending_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_stats_growth_rate_7d" ON "community_stats" USING btree ("growth_rate_7d");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_stats_last_calculated_at" ON "community_stats" USING btree ("last_calculated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_subscription_tiers_community_id" ON "community_subscription_tiers" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_subscription_tiers_is_active" ON "community_subscription_tiers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_token_gated_content_community_id" ON "community_token_gated_content" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_token_gated_content_post_id" ON "community_token_gated_content" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_token_gated_content_gating_type" ON "community_token_gated_content" USING btree ("gating_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_token_gated_content_token_address" ON "community_token_gated_content" USING btree ("token_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_treasury_pools_community_id" ON "community_treasury_pools" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_treasury_pools_token_address" ON "community_treasury_pools" USING btree ("token_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_treasury_pools_is_active" ON "community_treasury_pools" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_user_content_access_content_id" ON "community_user_content_access" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_user_content_access_user_address" ON "community_user_content_access" USING btree ("user_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_user_content_access_level" ON "community_user_content_access" USING btree ("access_level");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_user_referrals_program_id" ON "community_user_referrals" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_user_referrals_referrer_address" ON "community_user_referrals" USING btree ("referrer_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_user_referrals_referred_address" ON "community_user_referrals" USING btree ("referred_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_user_referrals_reward_status" ON "community_user_referrals" USING btree ("reward_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_user_referrals_unique" ON "community_user_referrals" USING btree ("program_id","referrer_address","referred_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_user_subscriptions_user_id" ON "community_user_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_user_subscriptions_community_id" ON "community_user_subscriptions" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_user_subscriptions_tier_id" ON "community_user_subscriptions" USING btree ("tier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_user_subscriptions_status" ON "community_user_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_content_links_content" ON "content_links" USING btree ("content_id","content_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_content_links_url_analysis" ON "content_links" USING btree ("url_analysis_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_reports_content_idx" ON "content_reports" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_reports_reporter_idx" ON "content_reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversation_analytics_conversation_id" ON "conversation_analytics" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversation_analytics_last_message_at" ON "conversation_analytics" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversation_analytics_updated_at" ON "conversation_analytics" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversation_participants_conversation_id" ON "conversation_participants" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversation_participants_user_id" ON "conversation_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversation_participants_wallet_address" ON "conversation_participants" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversation_participants_role" ON "conversation_participants" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversation_participants_joined_at" ON "conversation_participants" USING btree ("joined_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversations_last_activity" ON "conversations" USING btree ("last_activity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversations_order_id" ON "conversations" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversations_product_id" ON "conversations" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversations_listing_id" ON "conversations" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversations_type" ON "conversations" USING btree ("conversation_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversations_status" ON "conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversations_is_automated" ON "conversations" USING btree ("is_automated");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_custom_blacklist_type_value" ON "custom_blacklist" USING btree ("entry_type","entry_value");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_custom_blacklist_category" ON "custom_blacklist" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_custom_blacklist_active" ON "custom_blacklist" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dex_swap_transactions_user_id" ON "dex_swap_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dex_swap_transactions_status" ON "dex_swap_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dex_swap_transactions_created_at" ON "dex_swap_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_domain_reputation_domain" ON "domain_reputation" USING btree ("domain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_domain_reputation_score" ON "domain_reputation" USING btree ("reputation_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_domain_reputation_blacklisted" ON "domain_reputation" USING btree ("is_blacklisted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_earning_activities_user_id" ON "earning_activities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_earning_activities_activity_type" ON "earning_activities" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_earning_activities_created_at" ON "earning_activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ens_verifications_wallet_address" ON "ens_verifications" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ens_verifications_ens_handle" ON "ens_verifications" USING btree ("ens_handle");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ens_verifications_is_active" ON "ens_verifications" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ens_verifications_expires_at" ON "ens_verifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ens_verifications_unique_active" ON "ens_verifications" USING btree ("wallet_address","ens_handle");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_event_rsvps_event_id" ON "event_rsvps" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_event_rsvps_user_id" ON "event_rsvps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_event_rsvps_status" ON "event_rsvps" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fiat_payment_records_purchase_transaction_id" ON "fiat_payment_records" USING btree ("purchase_transaction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fiat_payment_records_status" ON "fiat_payment_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fiat_payment_records_processor_payment_id" ON "fiat_payment_records" USING btree ("processor_payment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "follow_idx" ON "follows" USING btree ("follower_id","following_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_governance_settings_dao" ON "governance_settings" USING btree ("dao_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_image_storage_ipfs_hash" ON "image_storage" USING btree ("ipfs_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_image_storage_owner_id" ON "image_storage" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_image_storage_usage_type" ON "image_storage" USING btree ("usage_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_image_storage_usage_reference" ON "image_storage" USING btree ("usage_reference_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_image_storage_created_at" ON "image_storage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "juror_eligibility_user_idx" ON "juror_eligibility" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "juror_eligibility_eligible_idx" ON "juror_eligibility" USING btree ("is_eligible");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jury_voting_sessions_appeal_idx" ON "jury_voting_sessions" USING btree ("appeal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jury_voting_sessions_status_idx" ON "jury_voting_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ldao_price_history_timestamp" ON "ldao_price_history" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ldao_price_history_source" ON "ldao_price_history" USING btree ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_link_monitoring_alerts_type" ON "link_monitoring_alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_link_monitoring_alerts_resolved" ON "link_monitoring_alerts" USING btree ("is_resolved");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_link_safety_vendor_url_analysis" ON "link_safety_vendor_results" USING btree ("url_analysis_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_link_safety_vendor_name" ON "link_safety_vendor_results" USING btree ("vendor_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_health_metrics_category" ON "marketplace_health_metrics" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_health_metrics_period" ON "marketplace_health_metrics" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_listings_seller_address" ON "marketplace_listings" USING btree ("seller_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_listings_created_at" ON "marketplace_listings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_listings_price" ON "marketplace_listings" USING btree ("price");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_listings_category" ON "marketplace_listings" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_listings_is_active" ON "marketplace_listings" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_listings_title" ON "marketplace_listings" USING btree ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_listings_active_created" ON "marketplace_listings" USING btree ("is_active","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_listings_seller_active" ON "marketplace_listings" USING btree ("seller_address","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_listings_category_active" ON "marketplace_listings" USING btree ("category","is_active","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_message_read_status_message" ON "message_read_status" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_message_read_status_user" ON "message_read_status" USING btree ("user_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_message_templates_user_id" ON "message_templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_message_templates_wallet_address" ON "message_templates" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_message_templates_category" ON "message_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_message_templates_is_active" ON "message_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_message_templates_created_at" ON "message_templates" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_message_templates_usage_count" ON "message_templates" USING btree ("usage_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "milestone_payments_milestone_id_idx" ON "milestone_payments" USING btree ("milestone_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "milestone_payments_status_idx" ON "milestone_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mobile_device_tokens_user_token" ON "mobile_device_tokens" USING btree ("user_address","token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mobile_device_tokens_platform" ON "mobile_device_tokens" USING btree ("platform");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mobile_governance_sessions_user_session" ON "mobile_governance_sessions" USING btree ("user_address","session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mobile_governance_sessions_proposal" ON "mobile_governance_sessions" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mobile_governance_sessions_start" ON "mobile_governance_sessions" USING btree ("session_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moderation_appeals_case_idx" ON "moderation_appeals" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moderation_appeals_appellant_idx" ON "moderation_appeals" USING btree ("appellant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moderation_appeals_status_idx" ON "moderation_appeals" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moderation_cases_content_idx" ON "moderation_cases" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moderation_cases_user_idx" ON "moderation_cases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moderation_cases_status_idx" ON "moderation_cases" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_offline_action_queue_user_action" ON "offline_action_queue" USING btree ("user_address","action_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_offline_action_queue_status" ON "offline_action_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_offline_action_queue_created_at" ON "offline_action_queue" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_offline_content_cache_user_content" ON "offline_content_cache" USING btree ("user_address","content_type","content_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_offline_content_cache_expires_at" ON "offline_content_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_offline_content_cache_priority" ON "offline_content_cache" USING btree ("priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_payment_events_order_id" ON "order_payment_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_payment_events_transaction_id" ON "order_payment_events" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_payment_events_event_type" ON "order_payment_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_payment_events_payment_status" ON "order_payment_events" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_payment_events_created_at" ON "order_payment_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_checkout_session_id" ON "orders" USING btree ("checkout_session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_payment_method" ON "orders" USING btree ("payment_method");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_tracking_number" ON "orders" USING btree ("tracking_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_estimated_delivery" ON "orders" USING btree ("estimated_delivery");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_payment_confirmation_hash" ON "orders" USING btree ("payment_confirmation_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_preference_overrides_user_id" ON "payment_method_preference_overrides" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_preference_overrides_expires_at" ON "payment_method_preference_overrides" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_preference_overrides_method_type" ON "payment_method_preference_overrides" USING btree ("payment_method_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_preferences_user_id" ON "payment_method_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_preferences_updated_at" ON "payment_method_preferences" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_preferences_learning_enabled" ON "payment_method_preferences" USING btree ("learning_enabled");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_usage_history_user_id" ON "payment_method_usage_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_usage_history_method_type" ON "payment_method_usage_history" USING btree ("payment_method_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_usage_history_created_at" ON "payment_method_usage_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_usage_history_user_method" ON "payment_method_usage_history" USING btree ("user_id","payment_method_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_receipts_transaction_id" ON "payment_receipts" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_receipts_order_id" ON "payment_receipts" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_receipts_receipt_number" ON "payment_receipts" USING btree ("receipt_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_receipts_payment_method" ON "payment_receipts" USING btree ("payment_method");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_receipts_created_at" ON "payment_receipts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_transactions_order_id" ON "payment_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_transactions_payment_method" ON "payment_transactions" USING btree ("payment_method");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_transactions_status" ON "payment_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_transactions_transaction_hash" ON "payment_transactions" USING btree ("transaction_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_transactions_payment_intent_id" ON "payment_transactions" USING btree ("payment_intent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_transactions_escrow_id" ON "payment_transactions" USING btree ("escrow_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_transactions_created_at" ON "payment_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_transactions_confirmed_at" ON "payment_transactions" USING btree ("confirmed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_poll_options_poll_id" ON "poll_options" USING btree ("poll_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_poll_votes_poll_id" ON "poll_votes" USING btree ("poll_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_poll_votes_user_id" ON "poll_votes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_poll_votes_option_id" ON "poll_votes" USING btree ("option_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_poll_votes_unique" ON "poll_votes" USING btree ("poll_id","user_id","option_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_polls_post_id" ON "polls" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_polls_expires_at" ON "polls" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "post_tag_idx" ON "post_tags" USING btree ("post_id","tag");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_posts_community_id" ON "posts" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_posts_token_gated" ON "posts" USING btree ("is_token_gated");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_tag_idx" ON "product_tags" USING btree ("product_id","tag");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tag_idx" ON "product_tags" USING btree ("tag");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_title_idx" ON "products" USING btree ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_seller_idx" ON "products" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_price_idx" ON "products" USING btree ("price_amount");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_products_listing_status" ON "products" USING btree ("listing_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_products_published_at" ON "products" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_activities_booking_id_idx" ON "project_activities" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_activities_created_at_idx" ON "project_activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_approvals_booking_id_idx" ON "project_approvals" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_approvals_status_idx" ON "project_approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_deliverables_booking_id_idx" ON "project_deliverables" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_deliverables_milestone_id_idx" ON "project_deliverables" USING btree ("milestone_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_deliverables_status_idx" ON "project_deliverables" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_files_booking_id_idx" ON "project_files" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_files_file_hash_idx" ON "project_files" USING btree ("file_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_messages_thread_id_idx" ON "project_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_messages_booking_id_idx" ON "project_messages" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_threads_booking_id_idx" ON "project_threads" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_proposals_dao_id" ON "proposals" USING btree ("dao_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_proposals_status" ON "proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_proposals_proposer" ON "proposals" USING btree ("proposer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_proposals_category" ON "proposals" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchase_transactions_user_id" ON "purchase_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchase_transactions_status" ON "purchase_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchase_transactions_created_at" ON "purchase_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchase_transactions_payment_method" ON "purchase_transactions" USING btree ("payment_method");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quick_replies_user_id" ON "quick_replies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quick_replies_wallet_address" ON "quick_replies" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quick_replies_category" ON "quick_replies" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quick_replies_is_active" ON "quick_replies" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quick_replies_priority" ON "quick_replies" USING btree ("priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quick_replies_usage_count" ON "quick_replies" USING btree ("usage_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reaction_post_user_idx" ON "reactions" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_referral_activities_referrer_id" ON "referral_activities" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_referral_activities_referee_id" ON "referral_activities" USING btree ("referee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_referral_activities_created_at" ON "referral_activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reputation_rules_event_type" ON "reputation_calculation_rules" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reputation_rules_active" ON "reputation_calculation_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reputation_history_wallet_address" ON "reputation_history" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reputation_history_event_type" ON "reputation_history" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reputation_history_created_at" ON "reputation_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reputation_history_transaction_id" ON "reputation_history" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seller_growth_projections_wallet" ON "seller_growth_projections" USING btree ("seller_wallet_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seller_growth_projections_type" ON "seller_growth_projections" USING btree ("projection_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seller_performance_alerts_wallet" ON "seller_performance_alerts" USING btree ("seller_wallet_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seller_performance_alerts_type" ON "seller_performance_alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seller_performance_history_wallet_type" ON "seller_performance_history" USING btree ("seller_wallet_address","metric_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seller_performance_history_period" ON "seller_performance_history" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seller_risk_assessments_wallet" ON "seller_risk_assessments" USING btree ("seller_wallet_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seller_risk_assessments_level" ON "seller_risk_assessments" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seller_scorecards_wallet" ON "seller_scorecards" USING btree ("seller_wallet_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seller_scorecards_tier" ON "seller_scorecards" USING btree ("performance_tier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_availability_service_id_idx" ON "service_availability" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_bookings_client_id_idx" ON "service_bookings" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_bookings_provider_id_idx" ON "service_bookings" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_bookings_status_idx" ON "service_bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_messages_booking_id_idx" ON "service_messages" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_milestones_booking_id_idx" ON "service_milestones" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_provider_profiles_user_id_unique" ON "service_provider_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_reviews_service_id_idx" ON "service_reviews" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_provider_id_idx" ON "services" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_category_id_idx" ON "services" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_status_idx" ON "services" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "share_post_user_idx" ON "shares" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "share_post_created_idx" ON "shares" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_staking_positions_user_id" ON "staking_positions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_staking_positions_status" ON "staking_positions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_staking_positions_end_date" ON "staking_positions" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "time_tracking_booking_id_idx" ON "time_tracking" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "time_tracking_provider_id_idx" ON "time_tracking" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "time_tracking_start_time_idx" ON "time_tracking" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tip_post_idx" ON "tips" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trending_content_content_type" ON "trending_content" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trending_content_content_id" ON "trending_content" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trending_content_timeframe" ON "trending_content" USING btree ("timeframe");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trending_content_score" ON "trending_content" USING btree ("score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trending_content_rank" ON "trending_content" USING btree ("rank");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trending_content_calculated_at" ON "trending_content" USING btree ("calculated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_url_analysis_url_hash" ON "url_analysis_results" USING btree ("url_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_url_analysis_domain" ON "url_analysis_results" USING btree ("domain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_url_analysis_status" ON "url_analysis_results" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_url_analysis_last_analyzed" ON "url_analysis_results" USING btree ("last_analyzed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_interactions_user_id" ON "user_interactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_interactions_target_type" ON "user_interactions" USING btree ("target_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_interactions_target_id" ON "user_interactions" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_interactions_interaction_type" ON "user_interactions" USING btree ("interaction_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_interactions_created_at" ON "user_interactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_recommendations_user_id" ON "user_recommendations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_recommendations_recommended_user_id" ON "user_recommendations" USING btree ("recommended_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_recommendations_score" ON "user_recommendations" USING btree ("score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_recommendations_expires_at" ON "user_recommendations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_reputation_score" ON "user_reputation" USING btree ("reputation_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_reputation_total_transactions" ON "user_reputation" USING btree ("total_transactions");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_reputation_updated_at" ON "user_reputation" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "view_post_user_idx" ON "views" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "view_post_created_idx" ON "views" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_volume_discount_tiers_min_amount" ON "volume_discount_tiers" USING btree ("min_amount");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_volume_discount_tiers_is_active" ON "volume_discount_tiers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_votes_proposal_id" ON "votes" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_votes_voter_id" ON "votes" USING btree ("voter_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_votes_created_at" ON "votes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voting_delegations_delegator" ON "voting_delegations" USING btree ("delegator_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voting_delegations_delegate" ON "voting_delegations" USING btree ("delegate_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voting_delegations_dao" ON "voting_delegations" USING btree ("dao_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voting_delegations_active" ON "voting_delegations" USING btree ("active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voting_power_snapshots_user" ON "voting_power_snapshots" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voting_power_snapshots_dao" ON "voting_power_snapshots" USING btree ("dao_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voting_power_snapshots_proposal" ON "voting_power_snapshots" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voting_power_snapshots_block" ON "voting_power_snapshots" USING btree ("snapshot_block");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_auth_attempts_wallet_address" ON "wallet_auth_attempts" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_auth_attempts_created_at" ON "wallet_auth_attempts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_auth_attempts_success" ON "wallet_auth_attempts" USING btree ("success");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_nonces_wallet_address" ON "wallet_nonces" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_nonces_nonce" ON "wallet_nonces" USING btree ("nonce");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_nonces_expires_at" ON "wallet_nonces" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_nonces_used" ON "wallet_nonces" USING btree ("used");