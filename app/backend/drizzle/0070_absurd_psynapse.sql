CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "category_return_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"total_returns" integer DEFAULT 0,
	"total_orders" integer DEFAULT 0,
	"return_rate" numeric(5, 2),
	"total_refund_amount" numeric(20, 8) DEFAULT '0',
	"avg_refund_amount" numeric(20, 8) DEFAULT '0',
	"top_return_reasons" jsonb,
	"defect_rate" numeric(5, 2),
	"damage_rate" numeric(5, 2),
	"misdescription_rate" numeric(5, 2),
	"return_rate_trend" varchar(20),
	"trend_percentage" numeric(5, 2),
	"industry_benchmark_return_rate" numeric(5, 2),
	"performance_vs_benchmark" varchar(20),
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fraud_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern_type" varchar(50) NOT NULL,
	"severity" varchar(10) NOT NULL,
	"description" text NOT NULL,
	"detection_criteria" jsonb NOT NULL,
	"detection_count" integer DEFAULT 0,
	"first_detected" timestamp DEFAULT now() NOT NULL,
	"last_detected" timestamp DEFAULT now() NOT NULL,
	"affected_users" jsonb DEFAULT '[]',
	"affected_returns" jsonb DEFAULT '[]',
	"is_active" boolean DEFAULT true,
	"resolved_at" timestamp,
	"resolved_by" uuid,
	"resolution_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"highlights" jsonb DEFAULT '[]'::jsonb,
	"metrics" jsonb DEFAULT '{}'::jsonb,
	"media_cids" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "idx_monthly_updates_unique_month" UNIQUE("community_id","year","month")
);
--> statement-breakpoint
CREATE TABLE "refund_batch_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"refund_record_id" uuid NOT NULL,
	"processing_order" integer NOT NULL,
	"item_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refund_batch_processing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" varchar(100) NOT NULL,
	"provider_name" varchar(50) NOT NULL,
	"total_refunds" integer NOT NULL,
	"successful_refunds" integer DEFAULT 0,
	"failed_refunds" integer DEFAULT 0,
	"pending_refunds" integer DEFAULT 0,
	"total_amount" numeric(20, 8) NOT NULL,
	"processed_amount" numeric(20, 8) DEFAULT '0',
	"batch_status" varchar(30) DEFAULT 'processing' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"error_summary" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refund_batch_processing_batch_id_unique" UNIQUE("batch_id")
);
--> statement-breakpoint
CREATE TABLE "refund_financial_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_id" uuid NOT NULL,
	"refund_id" varchar(255) NOT NULL,
	"original_amount" numeric(20, 8) NOT NULL,
	"refund_amount" numeric(20, 8) NOT NULL,
	"processing_fee" numeric(20, 8) DEFAULT '0' NOT NULL,
	"platform_fee_impact" numeric(20, 8) DEFAULT '0' NOT NULL,
	"seller_impact" numeric(20, 8) DEFAULT '0' NOT NULL,
	"payment_provider" varchar(50) NOT NULL,
	"provider_transaction_id" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp,
	"reconciled" boolean DEFAULT false NOT NULL,
	"reconciled_at" timestamp,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"refund_method" varchar(50),
	"failure_reason" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refund_provider_performance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(30) NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_refunds" integer DEFAULT 0,
	"successful_refunds" integer DEFAULT 0,
	"failed_refunds" integer DEFAULT 0,
	"pending_refunds" integer DEFAULT 0,
	"success_rate" numeric(5, 2),
	"total_refund_amount" numeric(20, 8) DEFAULT '0',
	"total_fees" numeric(20, 8) DEFAULT '0',
	"avg_refund_amount" numeric(20, 8) DEFAULT '0',
	"avg_processing_time_minutes" numeric(10, 2),
	"median_processing_time_minutes" numeric(10, 2),
	"p95_processing_time_minutes" numeric(10, 2),
	"uptime_percentage" numeric(5, 2),
	"error_rate" numeric(5, 2),
	"retry_rate" numeric(5, 2),
	"error_breakdown" jsonb,
	"top_errors" jsonb,
	"operational_status" varchar(20),
	"last_successful_refund" timestamp,
	"last_failure" timestamp,
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "refund_provider_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"refund_record_id" uuid NOT NULL,
	"provider_name" varchar(50) NOT NULL,
	"provider_transaction_id" varchar(255) NOT NULL,
	"provider_status" varchar(50) NOT NULL,
	"provider_response" jsonb,
	"transaction_type" varchar(50) NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"fee_amount" numeric(20, 8) DEFAULT '0',
	"net_amount" numeric(20, 8) NOT NULL,
	"exchange_rate" numeric(20, 8),
	"destination_account" varchar(255),
	"source_account" varchar(255),
	"blockchain_tx_hash" varchar(66),
	"blockchain_network" varchar(50),
	"confirmation_count" integer DEFAULT 0,
	"estimated_completion" timestamp,
	"completed_at" timestamp,
	"failed_at" timestamp,
	"failure_code" varchar(50),
	"failure_message" text,
	"webhook_received" boolean DEFAULT false,
	"webhook_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refund_reconciliation_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"refund_record_id" uuid NOT NULL,
	"reconciliation_date" date NOT NULL,
	"reconciliation_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"expected_amount" numeric(20, 8) NOT NULL,
	"actual_amount" numeric(20, 8),
	"discrepancy_amount" numeric(20, 8) DEFAULT '0',
	"discrepancy_reason" text,
	"reconciled_by" uuid,
	"reconciliation_notes" text,
	"supporting_documents" jsonb,
	"resolution_status" varchar(30),
	"resolution_notes" text,
	"resolved_at" timestamp,
	"resolved_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refund_transaction_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"refund_record_id" uuid NOT NULL,
	"action_type" varchar(50) NOT NULL,
	"action_description" text NOT NULL,
	"performed_by" uuid,
	"performed_by_role" varchar(30),
	"previous_state" jsonb,
	"new_state" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "return_admin_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_type" varchar(50) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"affected_entity_type" varchar(30),
	"affected_entity_id" uuid,
	"trigger_metric" varchar(50),
	"trigger_threshold" numeric(20, 8),
	"actual_value" numeric(20, 8),
	"context_data" jsonb DEFAULT '{}',
	"recommended_actions" jsonb,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"acknowledged_at" timestamp,
	"acknowledged_by" uuid,
	"resolved_at" timestamp,
	"resolved_by" uuid,
	"resolution_notes" text,
	"notified_admins" jsonb,
	"notification_sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "return_admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"admin_email" varchar(255),
	"admin_role" varchar(50),
	"action_type" varchar(50) NOT NULL,
	"action_category" varchar(30) NOT NULL,
	"entity_type" varchar(30) NOT NULL,
	"entity_id" uuid,
	"before_state" jsonb,
	"after_state" jsonb,
	"changes" jsonb,
	"reason" text,
	"justification" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"session_id" varchar(100),
	"requires_approval" boolean DEFAULT false,
	"approved_by" uuid,
	"approved_at" timestamp,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "return_analytics_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"total_returns" integer DEFAULT 0,
	"new_returns" integer DEFAULT 0,
	"approved_returns" integer DEFAULT 0,
	"rejected_returns" integer DEFAULT 0,
	"completed_returns" integer DEFAULT 0,
	"cancelled_returns" integer DEFAULT 0,
	"status_requested" integer DEFAULT 0,
	"status_approved" integer DEFAULT 0,
	"status_rejected" integer DEFAULT 0,
	"status_in_transit" integer DEFAULT 0,
	"status_received" integer DEFAULT 0,
	"status_inspected" integer DEFAULT 0,
	"status_refund_processing" integer DEFAULT 0,
	"status_completed" integer DEFAULT 0,
	"total_refund_amount" numeric(20, 8) DEFAULT '0',
	"avg_refund_amount" numeric(20, 8) DEFAULT '0',
	"max_refund_amount" numeric(20, 8) DEFAULT '0',
	"min_refund_amount" numeric(20, 8) DEFAULT '0',
	"total_restocking_fees" numeric(20, 8) DEFAULT '0',
	"total_shipping_costs" numeric(20, 8) DEFAULT '0',
	"net_refund_impact" numeric(20, 8) DEFAULT '0',
	"avg_approval_time" numeric(10, 2),
	"avg_refund_time" numeric(10, 2),
	"avg_total_resolution_time" numeric(10, 2),
	"median_approval_time" numeric(10, 2),
	"p95_approval_time" numeric(10, 2),
	"p99_approval_time" numeric(10, 2),
	"reason_defective" integer DEFAULT 0,
	"reason_wrong_item" integer DEFAULT 0,
	"reason_not_as_described" integer DEFAULT 0,
	"reason_damaged_shipping" integer DEFAULT 0,
	"reason_changed_mind" integer DEFAULT 0,
	"reason_better_price" integer DEFAULT 0,
	"reason_no_longer_needed" integer DEFAULT 0,
	"reason_other" integer DEFAULT 0,
	"high_risk_returns" integer DEFAULT 0,
	"medium_risk_returns" integer DEFAULT 0,
	"low_risk_returns" integer DEFAULT 0,
	"flagged_for_review" integer DEFAULT 0,
	"fraud_detected" integer DEFAULT 0,
	"avg_risk_score" numeric(5, 2),
	"avg_satisfaction_score" numeric(3, 2),
	"satisfaction_responses" integer DEFAULT 0,
	"nps_score" integer,
	"return_rate" numeric(5, 2),
	"total_orders" integer DEFAULT 0,
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "return_analytics_daily_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "return_analytics_hourly" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hour_timestamp" timestamp NOT NULL,
	"total_returns" integer DEFAULT 0,
	"new_returns" integer DEFAULT 0,
	"approved_returns" integer DEFAULT 0,
	"rejected_returns" integer DEFAULT 0,
	"completed_returns" integer DEFAULT 0,
	"cancelled_returns" integer DEFAULT 0,
	"status_requested" integer DEFAULT 0,
	"status_approved" integer DEFAULT 0,
	"status_rejected" integer DEFAULT 0,
	"status_in_transit" integer DEFAULT 0,
	"status_received" integer DEFAULT 0,
	"status_inspected" integer DEFAULT 0,
	"status_refund_processing" integer DEFAULT 0,
	"status_completed" integer DEFAULT 0,
	"total_refund_amount" numeric(20, 8) DEFAULT '0',
	"avg_refund_amount" numeric(20, 8) DEFAULT '0',
	"max_refund_amount" numeric(20, 8) DEFAULT '0',
	"min_refund_amount" numeric(20, 8) DEFAULT '0',
	"total_restocking_fees" numeric(20, 8) DEFAULT '0',
	"total_shipping_costs" numeric(20, 8) DEFAULT '0',
	"avg_approval_time" numeric(10, 2),
	"avg_refund_time" numeric(10, 2),
	"avg_total_resolution_time" numeric(10, 2),
	"median_approval_time" numeric(10, 2),
	"p95_approval_time" numeric(10, 2),
	"reason_defective" integer DEFAULT 0,
	"reason_wrong_item" integer DEFAULT 0,
	"reason_not_as_described" integer DEFAULT 0,
	"reason_damaged_shipping" integer DEFAULT 0,
	"reason_changed_mind" integer DEFAULT 0,
	"reason_better_price" integer DEFAULT 0,
	"reason_no_longer_needed" integer DEFAULT 0,
	"reason_other" integer DEFAULT 0,
	"high_risk_returns" integer DEFAULT 0,
	"medium_risk_returns" integer DEFAULT 0,
	"low_risk_returns" integer DEFAULT 0,
	"flagged_for_review" integer DEFAULT 0,
	"fraud_detected" integer DEFAULT 0,
	"avg_satisfaction_score" numeric(3, 2),
	"satisfaction_responses" integer DEFAULT 0,
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "return_analytics_hourly_hour_timestamp_unique" UNIQUE("hour_timestamp")
);
--> statement-breakpoint
CREATE TABLE "return_analytics_monthly" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"month_start" date NOT NULL,
	"month_end" date NOT NULL,
	"total_returns" integer DEFAULT 0,
	"new_returns" integer DEFAULT 0,
	"approved_returns" integer DEFAULT 0,
	"rejected_returns" integer DEFAULT 0,
	"completed_returns" integer DEFAULT 0,
	"cancelled_returns" integer DEFAULT 0,
	"status_requested" integer DEFAULT 0,
	"status_approved" integer DEFAULT 0,
	"status_rejected" integer DEFAULT 0,
	"status_in_transit" integer DEFAULT 0,
	"status_received" integer DEFAULT 0,
	"status_inspected" integer DEFAULT 0,
	"status_refund_processing" integer DEFAULT 0,
	"status_completed" integer DEFAULT 0,
	"total_refund_amount" numeric(20, 8) DEFAULT '0',
	"avg_refund_amount" numeric(20, 8) DEFAULT '0',
	"max_refund_amount" numeric(20, 8) DEFAULT '0',
	"min_refund_amount" numeric(20, 8) DEFAULT '0',
	"total_restocking_fees" numeric(20, 8) DEFAULT '0',
	"total_shipping_costs" numeric(20, 8) DEFAULT '0',
	"net_refund_impact" numeric(20, 8) DEFAULT '0',
	"avg_approval_time" numeric(10, 2),
	"avg_refund_time" numeric(10, 2),
	"avg_total_resolution_time" numeric(10, 2),
	"median_approval_time" numeric(10, 2),
	"p95_approval_time" numeric(10, 2),
	"p99_approval_time" numeric(10, 2),
	"reason_defective" integer DEFAULT 0,
	"reason_wrong_item" integer DEFAULT 0,
	"reason_not_as_described" integer DEFAULT 0,
	"reason_damaged_shipping" integer DEFAULT 0,
	"reason_changed_mind" integer DEFAULT 0,
	"reason_better_price" integer DEFAULT 0,
	"reason_no_longer_needed" integer DEFAULT 0,
	"reason_other" integer DEFAULT 0,
	"high_risk_returns" integer DEFAULT 0,
	"medium_risk_returns" integer DEFAULT 0,
	"low_risk_returns" integer DEFAULT 0,
	"flagged_for_review" integer DEFAULT 0,
	"fraud_detected" integer DEFAULT 0,
	"avg_risk_score" numeric(5, 2),
	"avg_satisfaction_score" numeric(3, 2),
	"satisfaction_responses" integer DEFAULT 0,
	"nps_score" integer,
	"return_rate_change" numeric(5, 2),
	"volume_change" numeric(5, 2),
	"refund_amount_change" numeric(5, 2),
	"yoy_return_rate_change" numeric(5, 2),
	"yoy_volume_change" numeric(5, 2),
	"yoy_refund_amount_change" numeric(5, 2),
	"return_rate" numeric(5, 2),
	"total_orders" integer DEFAULT 0,
	"is_seasonal_peak" boolean DEFAULT false,
	"seasonal_factor" numeric(5, 2),
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "return_analytics_weekly" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_start" date NOT NULL,
	"week_end" date NOT NULL,
	"week_number" integer NOT NULL,
	"year" integer NOT NULL,
	"total_returns" integer DEFAULT 0,
	"new_returns" integer DEFAULT 0,
	"approved_returns" integer DEFAULT 0,
	"rejected_returns" integer DEFAULT 0,
	"completed_returns" integer DEFAULT 0,
	"cancelled_returns" integer DEFAULT 0,
	"status_requested" integer DEFAULT 0,
	"status_approved" integer DEFAULT 0,
	"status_rejected" integer DEFAULT 0,
	"status_in_transit" integer DEFAULT 0,
	"status_received" integer DEFAULT 0,
	"status_inspected" integer DEFAULT 0,
	"status_refund_processing" integer DEFAULT 0,
	"status_completed" integer DEFAULT 0,
	"total_refund_amount" numeric(20, 8) DEFAULT '0',
	"avg_refund_amount" numeric(20, 8) DEFAULT '0',
	"max_refund_amount" numeric(20, 8) DEFAULT '0',
	"min_refund_amount" numeric(20, 8) DEFAULT '0',
	"total_restocking_fees" numeric(20, 8) DEFAULT '0',
	"total_shipping_costs" numeric(20, 8) DEFAULT '0',
	"net_refund_impact" numeric(20, 8) DEFAULT '0',
	"avg_approval_time" numeric(10, 2),
	"avg_refund_time" numeric(10, 2),
	"avg_total_resolution_time" numeric(10, 2),
	"median_approval_time" numeric(10, 2),
	"p95_approval_time" numeric(10, 2),
	"p99_approval_time" numeric(10, 2),
	"reason_defective" integer DEFAULT 0,
	"reason_wrong_item" integer DEFAULT 0,
	"reason_not_as_described" integer DEFAULT 0,
	"reason_damaged_shipping" integer DEFAULT 0,
	"reason_changed_mind" integer DEFAULT 0,
	"reason_better_price" integer DEFAULT 0,
	"reason_no_longer_needed" integer DEFAULT 0,
	"reason_other" integer DEFAULT 0,
	"high_risk_returns" integer DEFAULT 0,
	"medium_risk_returns" integer DEFAULT 0,
	"low_risk_returns" integer DEFAULT 0,
	"flagged_for_review" integer DEFAULT 0,
	"fraud_detected" integer DEFAULT 0,
	"avg_risk_score" numeric(5, 2),
	"avg_satisfaction_score" numeric(3, 2),
	"satisfaction_responses" integer DEFAULT 0,
	"nps_score" integer,
	"return_rate_change" numeric(5, 2),
	"volume_change" numeric(5, 2),
	"refund_amount_change" numeric(5, 2),
	"return_rate" numeric(5, 2),
	"total_orders" integer DEFAULT 0,
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "return_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"event_category" varchar(30) NOT NULL,
	"event_data" jsonb DEFAULT '{}' NOT NULL,
	"previous_state" jsonb,
	"new_state" jsonb,
	"actor_id" uuid,
	"actor_role" varchar(20),
	"actor_ip_address" varchar(45),
	"actor_user_agent" text,
	"session_id" varchar(100),
	"automated" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}',
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "return_metrics_realtime" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp NOT NULL,
	"active_returns" integer DEFAULT 0,
	"pending_approval" integer DEFAULT 0,
	"pending_refund" integer DEFAULT 0,
	"in_transit_returns" integer DEFAULT 0,
	"returns_per_minute" numeric(10, 2) DEFAULT '0',
	"approvals_per_minute" numeric(10, 2) DEFAULT '0',
	"refunds_per_minute" numeric(10, 2) DEFAULT '0',
	"manual_review_queue_depth" integer DEFAULT 0,
	"refund_processing_queue_depth" integer DEFAULT 0,
	"inspection_queue_depth" integer DEFAULT 0,
	"volume_spike_detected" boolean DEFAULT false,
	"processing_delay_detected" boolean DEFAULT false,
	"refund_failure_spike_detected" boolean DEFAULT false,
	"avg_api_response_time_ms" integer,
	"error_rate" numeric(5, 2),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "return_metrics_realtime_timestamp_unique" UNIQUE("timestamp")
);
--> statement-breakpoint
CREATE TABLE "risk_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"risk_score" integer NOT NULL,
	"risk_level" varchar(10) NOT NULL,
	"confidence" numeric(5, 4) NOT NULL,
	"flags" jsonb DEFAULT '[]',
	"features" jsonb NOT NULL,
	"model_version" varchar(50) NOT NULL,
	"model_type" varchar(50) NOT NULL,
	"recommendation" varchar(20) NOT NULL,
	"recommendation_reason" text,
	"assessment_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"feature_name" varchar(100) NOT NULL,
	"feature_value" text NOT NULL,
	"feature_type" varchar(20) NOT NULL,
	"weight" numeric(5, 4) NOT NULL,
	"contribution" numeric(8, 4) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_return_performance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"period_type" varchar(20) NOT NULL,
	"total_returns" integer DEFAULT 0,
	"approved_returns" integer DEFAULT 0,
	"rejected_returns" integer DEFAULT 0,
	"approval_rate" numeric(5, 2),
	"total_refund_amount" numeric(20, 8) DEFAULT '0',
	"total_revenue" numeric(20, 8) DEFAULT '0',
	"refund_to_revenue_ratio" numeric(5, 4),
	"avg_approval_time_hours" numeric(10, 2),
	"avg_refund_time_hours" numeric(10, 2),
	"sla_compliance_rate" numeric(5, 2),
	"return_rate" numeric(5, 2),
	"defect_rate" numeric(5, 2),
	"customer_satisfaction" numeric(3, 2),
	"fraud_incidents" integer DEFAULT 0,
	"policy_violations" integer DEFAULT 0,
	"avg_risk_score" numeric(5, 2),
	"policy_compliant" boolean DEFAULT true,
	"compliance_score" numeric(5, 2),
	"violations" jsonb DEFAULT '[]',
	"performance_rank" integer,
	"category_rank" integer,
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_chat_messages" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"chat_session_id" varchar(36) NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"is_agent" boolean DEFAULT false,
	"read" boolean DEFAULT false,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_chat_sessions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"agent_id" uuid,
	"status" varchar(20) DEFAULT 'waiting',
	"initial_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_faq" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"category" varchar(100) DEFAULT 'general',
	"priority" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"subject" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(100) DEFAULT 'general',
	"priority" varchar(20) DEFAULT 'medium',
	"status" varchar(20) DEFAULT 'open',
	"assigned_to" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_fraud_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_returns" integer DEFAULT 0,
	"high_risk_returns" integer DEFAULT 0,
	"approved_returns" integer DEFAULT 0,
	"rejected_returns" integer DEFAULT 0,
	"total_return_value" numeric(12, 2) DEFAULT '0',
	"average_return_value" numeric(10, 2) DEFAULT '0',
	"average_risk_score" numeric(5, 2) DEFAULT '0',
	"fraud_confirmations" integer DEFAULT 0,
	"false_positives" integer DEFAULT 0,
	"return_frequency" numeric(5, 2) DEFAULT '0',
	"last_return_date" timestamp,
	"account_age" integer,
	"detected_patterns" jsonb DEFAULT '[]',
	"trust_score" integer DEFAULT 50,
	"is_blacklisted" boolean DEFAULT false,
	"blacklisted_at" timestamp,
	"blacklist_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_fraud_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "workflow_approval_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"entity_type" varchar(50) NOT NULL,
	"max_risk_score" integer,
	"max_amount" numeric(10, 2),
	"require_positive_history" boolean DEFAULT false,
	"require_fraud_check" boolean DEFAULT false,
	"priority" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workflow_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"decision_type" varchar(50) NOT NULL,
	"reason" text NOT NULL,
	"confidence" numeric(5, 4) NOT NULL,
	"risk_score" integer NOT NULL,
	"risk_level" varchar(10) NOT NULL,
	"criteria" text[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "order_events" ALTER COLUMN "order_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "seller_transactions" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "is_pinned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "pinned_at" timestamp;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "pinned_by" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sales_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_updates" ADD CONSTRAINT "monthly_updates_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_batch_items" ADD CONSTRAINT "refund_batch_items_batch_id_refund_batch_processing_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."refund_batch_processing"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_batch_items" ADD CONSTRAINT "refund_batch_items_refund_record_id_refund_financial_records_id_fk" FOREIGN KEY ("refund_record_id") REFERENCES "public"."refund_financial_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_provider_transactions" ADD CONSTRAINT "refund_provider_transactions_refund_record_id_refund_financial_records_id_fk" FOREIGN KEY ("refund_record_id") REFERENCES "public"."refund_financial_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_reconciliation_records" ADD CONSTRAINT "refund_reconciliation_records_refund_record_id_refund_financial_records_id_fk" FOREIGN KEY ("refund_record_id") REFERENCES "public"."refund_financial_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_transaction_audit_log" ADD CONSTRAINT "refund_transaction_audit_log_refund_record_id_refund_financial_records_id_fk" FOREIGN KEY ("refund_record_id") REFERENCES "public"."refund_financial_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_return_id_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_features" ADD CONSTRAINT "risk_features_assessment_id_risk_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."risk_assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_chat_messages" ADD CONSTRAINT "support_chat_messages_chat_session_id_support_chat_sessions_id_fk" FOREIGN KEY ("chat_session_id") REFERENCES "public"."support_chat_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_chat_messages" ADD CONSTRAINT "support_chat_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_chat_sessions" ADD CONSTRAINT "support_chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_chat_sessions" ADD CONSTRAINT "support_chat_sessions_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_fraud_profiles" ADD CONSTRAINT "user_fraud_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_announcements_community_id" ON "announcements" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX "idx_announcements_is_active" ON "announcements" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_category_return_analytics_category_id" ON "category_return_analytics" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_category_return_analytics_period" ON "category_return_analytics" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "idx_category_return_analytics_return_rate" ON "category_return_analytics" USING btree ("return_rate");--> statement-breakpoint
CREATE INDEX "idx_fraud_patterns_pattern_type" ON "fraud_patterns" USING btree ("pattern_type");--> statement-breakpoint
CREATE INDEX "idx_fraud_patterns_severity" ON "fraud_patterns" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_fraud_patterns_is_active" ON "fraud_patterns" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_fraud_patterns_last_detected" ON "fraud_patterns" USING btree ("last_detected");--> statement-breakpoint
CREATE INDEX "idx_monthly_updates_community_id" ON "monthly_updates" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX "idx_monthly_updates_year_month" ON "monthly_updates" USING btree ("year","month");--> statement-breakpoint
CREATE INDEX "idx_monthly_updates_is_published" ON "monthly_updates" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "idx_monthly_updates_published_at" ON "monthly_updates" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_batch_items_batch_id" ON "refund_batch_items" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "idx_batch_items_refund_record" ON "refund_batch_items" USING btree ("refund_record_id");--> statement-breakpoint
CREATE INDEX "idx_batch_items_status" ON "refund_batch_items" USING btree ("item_status");--> statement-breakpoint
CREATE INDEX "idx_batch_processing_batch_id" ON "refund_batch_processing" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "idx_batch_processing_provider" ON "refund_batch_processing" USING btree ("provider_name");--> statement-breakpoint
CREATE INDEX "idx_batch_processing_status" ON "refund_batch_processing" USING btree ("batch_status");--> statement-breakpoint
CREATE INDEX "idx_batch_processing_started_at" ON "refund_batch_processing" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_refund_records_return_id" ON "refund_financial_records" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "idx_refund_records_refund_id" ON "refund_financial_records" USING btree ("refund_id");--> statement-breakpoint
CREATE INDEX "idx_refund_records_status" ON "refund_financial_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_refund_records_provider" ON "refund_financial_records" USING btree ("payment_provider");--> statement-breakpoint
CREATE INDEX "idx_refund_records_reconciled" ON "refund_financial_records" USING btree ("reconciled");--> statement-breakpoint
CREATE INDEX "idx_refund_records_created_at" ON "refund_financial_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_refund_records_processed_at" ON "refund_financial_records" USING btree ("processed_at");--> statement-breakpoint
CREATE INDEX "idx_refund_records_provider_tx_id" ON "refund_financial_records" USING btree ("provider_transaction_id");--> statement-breakpoint
CREATE INDEX "idx_refund_provider_performance_provider" ON "refund_provider_performance" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "idx_refund_provider_performance_period" ON "refund_provider_performance" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "idx_refund_provider_performance_status" ON "refund_provider_performance" USING btree ("operational_status");--> statement-breakpoint
CREATE INDEX "idx_provider_tx_refund_record" ON "refund_provider_transactions" USING btree ("refund_record_id");--> statement-breakpoint
CREATE INDEX "idx_provider_tx_provider_name" ON "refund_provider_transactions" USING btree ("provider_name");--> statement-breakpoint
CREATE INDEX "idx_provider_tx_provider_tx_id" ON "refund_provider_transactions" USING btree ("provider_transaction_id");--> statement-breakpoint
CREATE INDEX "idx_provider_tx_status" ON "refund_provider_transactions" USING btree ("provider_status");--> statement-breakpoint
CREATE INDEX "idx_provider_tx_blockchain_hash" ON "refund_provider_transactions" USING btree ("blockchain_tx_hash");--> statement-breakpoint
CREATE INDEX "idx_provider_tx_created_at" ON "refund_provider_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_reconciliation_refund_record" ON "refund_reconciliation_records" USING btree ("refund_record_id");--> statement-breakpoint
CREATE INDEX "idx_reconciliation_date" ON "refund_reconciliation_records" USING btree ("reconciliation_date");--> statement-breakpoint
CREATE INDEX "idx_reconciliation_status" ON "refund_reconciliation_records" USING btree ("reconciliation_status");--> statement-breakpoint
CREATE INDEX "idx_reconciliation_discrepancy" ON "refund_reconciliation_records" USING btree ("discrepancy_amount");--> statement-breakpoint
CREATE INDEX "idx_audit_log_refund_record" ON "refund_transaction_audit_log" USING btree ("refund_record_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_action_type" ON "refund_transaction_audit_log" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "idx_audit_log_performed_by" ON "refund_transaction_audit_log" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX "idx_audit_log_timestamp" ON "refund_transaction_audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_return_admin_alerts_type" ON "return_admin_alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "idx_return_admin_alerts_severity" ON "return_admin_alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_return_admin_alerts_status" ON "return_admin_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_return_admin_alerts_created_at" ON "return_admin_alerts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_return_admin_audit_log_admin_id" ON "return_admin_audit_log" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "idx_return_admin_audit_log_action_type" ON "return_admin_audit_log" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "idx_return_admin_audit_log_entity" ON "return_admin_audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_return_admin_audit_log_timestamp" ON "return_admin_audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_return_analytics_daily_date" ON "return_analytics_daily" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_return_analytics_hourly_timestamp" ON "return_analytics_hourly" USING btree ("hour_timestamp");--> statement-breakpoint
CREATE INDEX "idx_return_analytics_monthly_month" ON "return_analytics_monthly" USING btree ("month","year");--> statement-breakpoint
CREATE INDEX "idx_return_analytics_monthly_year" ON "return_analytics_monthly" USING btree ("year");--> statement-breakpoint
CREATE INDEX "idx_return_analytics_weekly_week" ON "return_analytics_weekly" USING btree ("week_start","year");--> statement-breakpoint
CREATE INDEX "idx_return_analytics_weekly_year_week" ON "return_analytics_weekly" USING btree ("year","week_number");--> statement-breakpoint
CREATE INDEX "idx_return_events_return_id" ON "return_events" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "idx_return_events_event_type" ON "return_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_return_events_event_category" ON "return_events" USING btree ("event_category");--> statement-breakpoint
CREATE INDEX "idx_return_events_timestamp" ON "return_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_return_events_actor_id" ON "return_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_return_events_automated" ON "return_events" USING btree ("automated");--> statement-breakpoint
CREATE INDEX "idx_return_events_composite" ON "return_events" USING btree ("return_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_return_metrics_realtime_timestamp" ON "return_metrics_realtime" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_risk_assessments_return_id" ON "risk_assessments" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "idx_risk_assessments_user_id" ON "risk_assessments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_risk_assessments_risk_level" ON "risk_assessments" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX "idx_risk_assessments_recommendation" ON "risk_assessments" USING btree ("recommendation");--> statement-breakpoint
CREATE INDEX "idx_risk_assessments_assessment_date" ON "risk_assessments" USING btree ("assessment_date");--> statement-breakpoint
CREATE INDEX "idx_risk_features_assessment_id" ON "risk_features" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "idx_risk_features_feature_name" ON "risk_features" USING btree ("feature_name");--> statement-breakpoint
CREATE INDEX "idx_seller_return_performance_seller_id" ON "seller_return_performance" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "idx_seller_return_performance_period" ON "seller_return_performance" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "idx_seller_return_performance_rank" ON "seller_return_performance" USING btree ("performance_rank");--> statement-breakpoint
CREATE INDEX "idx_seller_return_performance_compliance" ON "seller_return_performance" USING btree ("policy_compliant","compliance_score");--> statement-breakpoint
CREATE INDEX "idx_support_chat_messages_timestamp" ON "support_chat_messages" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_support_chat_messages_read" ON "support_chat_messages" USING btree ("read");--> statement-breakpoint
CREATE INDEX "idx_support_chat_sessions_status" ON "support_chat_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_support_chat_sessions_created_at" ON "support_chat_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_support_faq_category" ON "support_faq" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_support_faq_priority" ON "support_faq" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_support_faq_is_active" ON "support_faq" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_support_tickets_status" ON "support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_support_tickets_priority" ON "support_tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_support_tickets_category" ON "support_tickets" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_user_fraud_profiles_user_id" ON "user_fraud_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_fraud_profiles_trust_score" ON "user_fraud_profiles" USING btree ("trust_score");--> statement-breakpoint
CREATE INDEX "idx_user_fraud_profiles_is_blacklisted" ON "user_fraud_profiles" USING btree ("is_blacklisted");--> statement-breakpoint
CREATE INDEX "workflow_approval_criteria_entity_type_idx" ON "workflow_approval_criteria" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "workflow_approval_criteria_priority_idx" ON "workflow_approval_criteria" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "workflow_approval_criteria_active_idx" ON "workflow_approval_criteria" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "workflow_decisions_entity_idx" ON "workflow_decisions" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "workflow_decisions_type_idx" ON "workflow_decisions" USING btree ("decision_type");--> statement-breakpoint
CREATE INDEX "workflow_decisions_risk_score_idx" ON "workflow_decisions" USING btree ("risk_score");--> statement-breakpoint
CREATE INDEX "workflow_decisions_created_at_idx" ON "workflow_decisions" USING btree ("created_at");