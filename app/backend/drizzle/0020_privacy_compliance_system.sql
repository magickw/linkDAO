-- Privacy and Compliance System Migration
-- Task 14: Implement privacy and compliance features

-- User consent management table
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
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Data retention policies table
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Data retention audit logs table
CREATE TABLE IF NOT EXISTS "data_retention_logs" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"policy_id" varchar(64) NOT NULL,
	"action" varchar(16) NOT NULL,
	"record_count" integer DEFAULT 0 NOT NULL,
	"data_type" varchar(64) NOT NULL,
	"executed_at" timestamp DEFAULT now() NOT NULL,
	"executed_by" varchar(64) NOT NULL,
	"success" boolean DEFAULT false NOT NULL,
	"error_message" text,
	"execution_time_ms" integer DEFAULT 0 NOT NULL
);

-- Privacy evidence storage table
CREATE TABLE IF NOT EXISTS "privacy_evidence" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"evidence_type" varchar(32) DEFAULT 'moderation_decision' NOT NULL,
	"safe_content" text NOT NULL,
	"model_outputs" jsonb DEFAULT '{}' NOT NULL,
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Evidence access logs table
CREATE TABLE IF NOT EXISTS "evidence_access_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"evidence_id" varchar(64) NOT NULL,
	"accessed_by" varchar(64) NOT NULL,
	"accessed_at" timestamp DEFAULT now() NOT NULL,
	"purpose" varchar(128) NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"user_agent" text NOT NULL,
	"access_granted" boolean DEFAULT true NOT NULL
);

-- Geofencing rules table
CREATE TABLE IF NOT EXISTS "geofencing_rules" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"regions" jsonb DEFAULT '[]' NOT NULL,
	"action" varchar(16) NOT NULL,
	"content_types" jsonb DEFAULT '[]' NOT NULL,
	"reason" text NOT NULL,
	"priority" integer DEFAULT 50 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- PII detection results table (for audit and improvement)
CREATE TABLE IF NOT EXISTS "pii_detection_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"detected_types" jsonb DEFAULT '[]' NOT NULL,
	"confidence" numeric(3,2) DEFAULT 0 NOT NULL,
	"redaction_applied" boolean DEFAULT false NOT NULL,
	"sensitivity_level" varchar(16) DEFAULT 'medium' NOT NULL,
	"processing_time_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Regional compliance configurations table
CREATE TABLE IF NOT EXISTS "regional_compliance" (
	"region" varchar(16) PRIMARY KEY NOT NULL,
	"country" varchar(8) NOT NULL,
	"gdpr_applicable" boolean DEFAULT false NOT NULL,
	"ccpa_applicable" boolean DEFAULT false NOT NULL,
	"data_localization" boolean DEFAULT false NOT NULL,
	"content_restrictions" jsonb DEFAULT '[]' NOT NULL,
	"retention_period_days" integer DEFAULT 730 NOT NULL,
	"consent_required" boolean DEFAULT false NOT NULL,
	"right_to_erasure" boolean DEFAULT false NOT NULL,
	"data_portability" boolean DEFAULT false NOT NULL,
	"minor_protections" boolean DEFAULT true NOT NULL,
	"crypto_regulations" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_user_consents_user_id" ON "user_consents" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_consents_type_status" ON "user_consents" ("consent_type", "status");
CREATE INDEX IF NOT EXISTS "idx_user_consents_expires_at" ON "user_consents" ("expires_at");

CREATE INDEX IF NOT EXISTS "idx_data_retention_policies_data_type" ON "data_retention_policies" ("data_type");
CREATE INDEX IF NOT EXISTS "idx_data_retention_policies_region" ON "data_retention_policies" ("region");
CREATE INDEX IF NOT EXISTS "idx_data_retention_policies_active" ON "data_retention_policies" ("active");

CREATE INDEX IF NOT EXISTS "idx_data_retention_logs_policy_id" ON "data_retention_logs" ("policy_id");
CREATE INDEX IF NOT EXISTS "idx_data_retention_logs_executed_at" ON "data_retention_logs" ("executed_at");

CREATE INDEX IF NOT EXISTS "idx_privacy_evidence_case_id" ON "privacy_evidence" ("case_id");
CREATE INDEX IF NOT EXISTS "idx_privacy_evidence_content_hash" ON "privacy_evidence" ("content_hash");
CREATE INDEX IF NOT EXISTS "idx_privacy_evidence_retention_expires" ON "privacy_evidence" ("retention_expires_at");
CREATE INDEX IF NOT EXISTS "idx_privacy_evidence_region" ON "privacy_evidence" ("region");

CREATE INDEX IF NOT EXISTS "idx_evidence_access_logs_evidence_id" ON "evidence_access_logs" ("evidence_id");
CREATE INDEX IF NOT EXISTS "idx_evidence_access_logs_accessed_at" ON "evidence_access_logs" ("accessed_at");

CREATE INDEX IF NOT EXISTS "idx_geofencing_rules_active" ON "geofencing_rules" ("active");
CREATE INDEX IF NOT EXISTS "idx_geofencing_rules_priority" ON "geofencing_rules" ("priority");

CREATE INDEX IF NOT EXISTS "idx_pii_detection_content_hash" ON "pii_detection_results" ("content_hash");
CREATE INDEX IF NOT EXISTS "idx_pii_detection_created_at" ON "pii_detection_results" ("created_at");

-- Insert default regional compliance configurations
INSERT INTO "regional_compliance" ("region", "country", "gdpr_applicable", "ccpa_applicable", "data_localization", "content_restrictions", "retention_period_days", "consent_required", "right_to_erasure", "data_portability", "minor_protections", "crypto_regulations") VALUES
('EU', 'MULTIPLE', true, false, true, '["hate_speech", "terrorist_content", "child_exploitation"]', 365, true, true, true, true, '["MiCA", "AML5"]'),
('US_CA', 'US', false, true, false, '["child_exploitation"]', 1095, false, true, true, true, '["BSA", "FinCEN"]'),
('US_OTHER', 'US', false, false, false, '["child_exploitation"]', 2555, false, false, false, true, '["BSA", "FinCEN"]'),
('CN', 'CN', false, false, true, '["political_content", "crypto_trading", "gambling"]', 180, true, false, false, true, '["CRYPTO_BAN"]'),
('DEFAULT', 'UNKNOWN', false, false, false, '["child_exploitation", "terrorism"]', 730, false, false, false, true, '[]')
ON CONFLICT ("region") DO NOTHING;

-- Insert default data retention policies
INSERT INTO "data_retention_policies" ("id", "name", "data_type", "retention_period_days", "region", "auto_delete", "archive_before_delete", "encrypt_archive", "notify_before_delete", "notification_days", "active") VALUES
('moderation_cases_eu', 'EU Moderation Cases', 'moderation_cases', 365, 'EU', true, true, true, true, 30, true),
('moderation_cases_us', 'US Moderation Cases', 'moderation_cases', 1095, 'US', true, true, false, false, 0, true),
('content_reports_global', 'Global Content Reports', 'content_reports', 730, NULL, true, false, false, false, 0, true),
('moderation_actions_global', 'Global Moderation Actions', 'moderation_actions', 2555, NULL, false, true, true, true, 90, true),
('appeals_global', 'Global Appeals', 'moderation_appeals', 1825, NULL, true, true, true, true, 60, true)
ON CONFLICT ("id") DO NOTHING;

-- Insert default geofencing rules
INSERT INTO "geofencing_rules" ("id", "name", "regions", "action", "content_types", "reason", "priority", "active") VALUES
('eu_gdpr_dm_scanning', 'EU GDPR DM Scanning Consent', '["EU"]', 'require_consent', '["dm", "private_message"]', 'GDPR requires explicit consent for private message scanning', 100, true),
('china_crypto_block', 'China Crypto Content Block', '["CN"]', 'block', '["marketplace_listing", "crypto_discussion"]', 'Crypto trading content blocked in China', 90, true),
('minor_protection_global', 'Global Minor Protection', '["*"]', 'restrict', '["adult_content", "gambling"]', 'Enhanced protection for users under 18', 80, true),
('eu_right_to_erasure', 'EU Right to Erasure', '["EU"]', 'allow', '["*"]', 'GDPR Article 17 - Right to Erasure', 70, true)
ON CONFLICT ("id") DO NOTHING;

-- Add foreign key constraints
ALTER TABLE "data_retention_logs" ADD CONSTRAINT "fk_retention_logs_policy" FOREIGN KEY ("policy_id") REFERENCES "data_retention_policies"("id") ON DELETE CASCADE;
ALTER TABLE "evidence_access_logs" ADD CONSTRAINT "fk_access_logs_evidence" FOREIGN KEY ("evidence_id") REFERENCES "privacy_evidence"("id") ON DELETE CASCADE;
ALTER TABLE "privacy_evidence" ADD CONSTRAINT "fk_privacy_evidence_case" FOREIGN KEY ("case_id") REFERENCES "moderation_cases"("id") ON DELETE CASCADE;

-- Add check constraints for data validation
ALTER TABLE "user_consents" ADD CONSTRAINT "chk_consent_status" CHECK ("status" IN ('granted', 'denied', 'withdrawn', 'expired', 'pending'));
ALTER TABLE "user_consents" ADD CONSTRAINT "chk_consent_type" CHECK ("consent_type" IN ('dm_scanning', 'content_analysis', 'data_processing', 'marketing', 'analytics', 'third_party_sharing', 'biometric_processing', 'location_tracking'));

ALTER TABLE "data_retention_policies" ADD CONSTRAINT "chk_retention_period" CHECK ("retention_period_days" > 0);
ALTER TABLE "data_retention_policies" ADD CONSTRAINT "chk_notification_days" CHECK ("notification_days" >= 0);

ALTER TABLE "privacy_evidence" ADD CONSTRAINT "chk_evidence_type" CHECK ("evidence_type" IN ('moderation_decision', 'appeal_evidence', 'audit_trail'));
ALTER TABLE "privacy_evidence" ADD CONSTRAINT "chk_data_classification" CHECK ("data_classification" IN ('public', 'internal', 'confidential', 'restricted'));

ALTER TABLE "geofencing_rules" ADD CONSTRAINT "chk_geofencing_action" CHECK ("action" IN ('allow', 'block', 'restrict', 'require_consent'));
ALTER TABLE "geofencing_rules" ADD CONSTRAINT "chk_geofencing_priority" CHECK ("priority" >= 0 AND "priority" <= 100);

-- Create views for common queries
CREATE OR REPLACE VIEW "active_consents" AS
SELECT 
    uc.*,
    CASE 
        WHEN uc.expires_at IS NOT NULL AND uc.expires_at < NOW() THEN 'expired'
        ELSE uc.status
    END as effective_status
FROM "user_consents" uc
WHERE uc.status IN ('granted', 'expired');

CREATE OR REPLACE VIEW "privacy_compliance_summary" AS
SELECT 
    rc.region,
    rc.country,
    COUNT(pe.id) as evidence_count,
    COUNT(CASE WHEN pe.pii_redaction_applied THEN 1 END) as pii_redacted_count,
    COUNT(CASE WHEN pe.encryption_key_hash IS NOT NULL THEN 1 END) as encrypted_count,
    AVG(EXTRACT(EPOCH FROM (pe.retention_expires_at - pe.created_at))/86400) as avg_retention_days
FROM "regional_compliance" rc
LEFT JOIN "privacy_evidence" pe ON pe.region = rc.region
GROUP BY rc.region, rc.country;

-- Add comments for documentation
COMMENT ON TABLE "user_consents" IS 'Stores user consent records for various data processing purposes';
COMMENT ON TABLE "data_retention_policies" IS 'Defines data retention policies by data type and region';
COMMENT ON TABLE "privacy_evidence" IS 'Stores privacy-compliant evidence with encryption and PII redaction';
COMMENT ON TABLE "evidence_access_logs" IS 'Audit trail for evidence access and retrieval';
COMMENT ON TABLE "geofencing_rules" IS 'Regional compliance rules for content and data processing';
COMMENT ON TABLE "regional_compliance" IS 'Regional compliance configurations (GDPR, CCPA, etc.)';

COMMENT ON COLUMN "user_consents"."legal_basis" IS 'Legal basis for processing: consent, legitimate_interest, contract, legal_obligation, vital_interests, public_task';
COMMENT ON COLUMN "privacy_evidence"."data_classification" IS 'Data classification level: public, internal, confidential, restricted';
COMMENT ON COLUMN "privacy_evidence"."encryption_key_hash" IS 'Hash of encryption key used for sensitive data (key stored separately)';
COMMENT ON COLUMN "geofencing_rules"."priority" IS 'Rule priority (0-100, higher number = higher priority)';

-- Grant appropriate permissions (adjust based on your user roles)
-- GRANT SELECT, INSERT, UPDATE ON "user_consents" TO moderator_role;
-- GRANT SELECT ON "regional_compliance" TO moderator_role;
-- GRANT SELECT, INSERT ON "evidence_access_logs" TO moderator_role;