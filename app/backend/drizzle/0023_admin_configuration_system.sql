-- Admin Configuration System Migration
-- This migration creates tables for policy configuration, threshold management, and admin interfaces

-- Policy configuration table for managing moderation rules
DROP TABLE IF EXISTS "policy_configurations" CASCADE;
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

-- Threshold configurations for different content types and user reputation levels
DROP TABLE IF EXISTS "threshold_configurations" CASCADE;
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

-- Vendor configuration for AI service management
DROP TABLE IF EXISTS "vendor_configurations" CASCADE;
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

-- System metrics for real-time monitoring
DROP TABLE IF EXISTS "system_metrics" CASCADE;
CREATE TABLE IF NOT EXISTS "system_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"metric_name" varchar(64) NOT NULL,
	"metric_value" numeric NOT NULL,
	"metric_type" varchar(24) NOT NULL,
	"tags" jsonb DEFAULT '{}',
	"timestamp" timestamp DEFAULT now()
);

-- Admin audit logs for configuration changes
DROP TABLE IF EXISTS "admin_audit_logs" CASCADE;
CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" varchar(64) NOT NULL,
	"action" varchar(48) NOT NULL,
	"resource_type" varchar(32) NOT NULL,
	"resource_id" varchar(64),
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" inet,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now()
);

-- System alerts configuration
DROP TABLE IF EXISTS "alert_configurations" CASCADE;
CREATE TABLE IF NOT EXISTS "alert_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"alert_name" varchar(64) NOT NULL,
	"metric_name" varchar(64) NOT NULL,
	"condition_type" varchar(24) NOT NULL,
	"threshold_value" numeric NOT NULL,
	"severity" varchar(24) NOT NULL,
	"notification_channels" jsonb DEFAULT '[]',
	"is_active" boolean DEFAULT true,
	"cooldown_minutes" integer DEFAULT 60,
	"created_by" varchar(64),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS "idx_policy_configurations_category" ON "policy_configurations" ("category");
CREATE INDEX IF NOT EXISTS "idx_policy_configurations_active" ON "policy_configurations" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_threshold_configurations_content_type" ON "threshold_configurations" ("content_type");
CREATE INDEX IF NOT EXISTS "idx_threshold_configurations_reputation_tier" ON "threshold_configurations" ("reputation_tier");
CREATE INDEX IF NOT EXISTS "idx_vendor_configurations_vendor_name" ON "vendor_configurations" ("vendor_name");
CREATE INDEX IF NOT EXISTS "idx_vendor_configurations_enabled" ON "vendor_configurations" ("is_enabled");
CREATE INDEX IF NOT EXISTS "idx_system_metrics_name_timestamp" ON "system_metrics" ("metric_name", "timestamp");
CREATE INDEX IF NOT EXISTS "idx_admin_audit_logs_admin_timestamp" ON "admin_audit_logs" ("admin_id", "timestamp");
CREATE INDEX IF NOT EXISTS "idx_alert_configurations_active" ON "alert_configurations" ("is_active");

-- Add foreign key constraints
ALTER TABLE "vendor_configurations" ADD CONSTRAINT "fk_vendor_fallback" 
	FOREIGN KEY ("fallback_vendor_id") REFERENCES "vendor_configurations"("id");