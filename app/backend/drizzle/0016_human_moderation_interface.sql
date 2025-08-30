-- Human Moderation Interface Tables

-- Moderators table
CREATE TABLE IF NOT EXISTS "moderators" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" varchar(20) NOT NULL DEFAULT 'junior' CHECK (role IN ('junior', 'senior', 'lead', 'admin')),
  "permissions" jsonb NOT NULL DEFAULT '{}',
  "is_active" boolean NOT NULL DEFAULT true,
  "specializations" jsonb DEFAULT '[]',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "last_active_at" timestamp DEFAULT now()
);

-- Moderator statistics table
CREATE TABLE IF NOT EXISTS "moderator_stats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "moderator_id" uuid NOT NULL REFERENCES "moderators"("id") ON DELETE CASCADE,
  "total_cases" integer DEFAULT 0,
  "accuracy_score" numeric(5,4) DEFAULT 0,
  "avg_decision_time" numeric(10,2) DEFAULT 0,
  "appeal_rate" numeric(5,4) DEFAULT 0,
  "overturn_rate" numeric(5,4) DEFAULT 0,
  "updated_at" timestamp DEFAULT now()
);

-- Queue assignments table
CREATE TABLE IF NOT EXISTS "queue_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "case_id" integer NOT NULL REFERENCES "moderation_cases"("id") ON DELETE CASCADE,
  "assigned_to" uuid NOT NULL REFERENCES "moderators"("id") ON DELETE CASCADE,
  "assigned_at" timestamp DEFAULT now(),
  "is_active" boolean DEFAULT true,
  "released_at" timestamp,
  "completed_at" timestamp
);

-- Policy templates table
CREATE TABLE IF NOT EXISTS "policy_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL,
  "category" varchar(100) NOT NULL,
  "severity" varchar(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  "action" varchar(20) NOT NULL CHECK (action IN ('allow', 'limit', 'block', 'review')),
  "reason_code" varchar(48) NOT NULL,
  "description" text NOT NULL,
  "rationale" text NOT NULL,
  "duration_sec" integer DEFAULT 0,
  "reputation_impact" integer DEFAULT 0,
  "content_types" text[], -- Array of applicable content types
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Moderator activity logs table
CREATE TABLE IF NOT EXISTS "moderator_activity_logs" (
  "id" varchar(64) PRIMARY KEY,
  "moderator_id" uuid NOT NULL REFERENCES "moderators"("id") ON DELETE CASCADE,
  "action" varchar(64) NOT NULL,
  "details" jsonb DEFAULT '{}',
  "duration" bigint, -- Duration in milliseconds
  "timestamp" timestamp DEFAULT now(),
  "session_id" varchar(128),
  "ip_address" varchar(45),
  "user_agent" text
);

-- Moderator daily metrics table
CREATE TABLE IF NOT EXISTS "moderator_daily_metrics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "moderator_id" uuid NOT NULL REFERENCES "moderators"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "cases_reviewed" integer DEFAULT 0,
  "total_decision_time" bigint DEFAULT 0, -- Total time in milliseconds
  "accuracy_score" numeric(5,4) DEFAULT 0,
  "appeals_received" integer DEFAULT 0,
  "appeals_overturned" integer DEFAULT 0,
  "updated_at" timestamp DEFAULT now(),
  UNIQUE(moderator_id, date)
);

-- Moderation audit log table (enhanced)
CREATE TABLE IF NOT EXISTS "moderation_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "case_id" integer REFERENCES "moderation_cases"("id") ON DELETE SET NULL,
  "action_type" varchar(32) NOT NULL,
  "actor_id" varchar(64),
  "actor_type" varchar(20) DEFAULT 'user' CHECK (actor_type IN ('user', 'moderator', 'system', 'ai')),
  "old_state" jsonb,
  "new_state" jsonb,
  "reasoning" text,
  "ip_address" varchar(45),
  "user_agent" text,
  "created_at" timestamp DEFAULT now()
);

-- Moderation metrics table
CREATE TABLE IF NOT EXISTS "moderation_metrics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "metric_type" varchar(32) NOT NULL,
  "metric_name" varchar(64) NOT NULL,
  "metric_value" numeric NOT NULL,
  "dimensions" jsonb DEFAULT '{}',
  "recorded_at" timestamp DEFAULT now()
);

-- Content hashes table for deduplication
CREATE TABLE IF NOT EXISTS "content_hashes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "content_id" varchar(64) NOT NULL,
  "content_type" varchar(24) NOT NULL,
  "hash_type" varchar(20) NOT NULL CHECK (hash_type IN ('md5', 'sha256', 'perceptual', 'text_similarity')),
  "hash_value" varchar(128) NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- Reputation impacts table
CREATE TABLE IF NOT EXISTS "reputation_impacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "case_id" integer REFERENCES "moderation_cases"("id") ON DELETE SET NULL,
  "impact_type" varchar(32) NOT NULL CHECK (impact_type IN ('violation', 'helpful_report', 'false_report', 'successful_appeal', 'jury_accuracy')),
  "impact_value" integer NOT NULL,
  "previous_reputation" integer,
  "new_reputation" integer,
  "description" text,
  "created_at" timestamp DEFAULT now()
);

-- Appeal jurors table (for DAO jury system)
CREATE TABLE IF NOT EXISTS "appeal_jurors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "appeal_id" integer NOT NULL REFERENCES "moderation_appeals"("id") ON DELETE CASCADE,
  "juror_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "selection_weight" numeric(10,4) NOT NULL DEFAULT 1.0,
  "vote_commitment" varchar(64), -- Hash of the vote for commit-reveal
  "vote_reveal" varchar(20) CHECK (vote_reveal IN ('uphold', 'overturn', 'partial')),
  "vote_reasoning" text,
  "reward_amount" numeric(20,8) DEFAULT 0,
  "slashed_amount" numeric(20,8) DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "voted_at" timestamp
);

-- Moderation vendors table
CREATE TABLE IF NOT EXISTS "moderation_vendors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "vendor_name" varchar(32) NOT NULL UNIQUE,
  "vendor_type" varchar(20) NOT NULL CHECK (vendor_type IN ('text', 'image', 'video', 'link', 'custom')),
  "api_endpoint" varchar(255),
  "is_enabled" boolean DEFAULT true,
  "weight" numeric(3,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
  "cost_per_request" numeric(10,6) DEFAULT 0,
  "avg_latency_ms" integer DEFAULT 0,
  "success_rate" numeric(3,2) DEFAULT 1.0 CHECK (success_rate >= 0 AND success_rate <= 1),
  "last_health_check" timestamp,
  "configuration" jsonb DEFAULT '{}',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Moderation policies table
CREATE TABLE IF NOT EXISTS "moderation_policies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "category" varchar(48) NOT NULL,
  "severity" varchar(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  "confidence_threshold" numeric(3,2) NOT NULL CHECK (confidence_threshold >= 0 AND confidence_threshold <= 1),
  "action" varchar(20) NOT NULL CHECK (action IN ('allow', 'limit', 'block', 'review')),
  "reputation_modifier" numeric(5,2) DEFAULT 0,
  "description" text NOT NULL,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_moderators_user_id" ON "moderators"("user_id");
CREATE INDEX IF NOT EXISTS "idx_moderators_role" ON "moderators"("role");
CREATE INDEX IF NOT EXISTS "idx_moderators_is_active" ON "moderators"("is_active");
CREATE INDEX IF NOT EXISTS "idx_moderators_last_active" ON "moderators"("last_active_at");

CREATE INDEX IF NOT EXISTS "idx_moderator_stats_moderator_id" ON "moderator_stats"("moderator_id");

CREATE INDEX IF NOT EXISTS "idx_queue_assignments_case_id" ON "queue_assignments"("case_id");
CREATE INDEX IF NOT EXISTS "idx_queue_assignments_assigned_to" ON "queue_assignments"("assigned_to");
CREATE INDEX IF NOT EXISTS "idx_queue_assignments_is_active" ON "queue_assignments"("is_active");
CREATE INDEX IF NOT EXISTS "idx_queue_assignments_assigned_at" ON "queue_assignments"("assigned_at");

CREATE INDEX IF NOT EXISTS "idx_policy_templates_category" ON "policy_templates"("category");
CREATE INDEX IF NOT EXISTS "idx_policy_templates_severity" ON "policy_templates"("severity");
CREATE INDEX IF NOT EXISTS "idx_policy_templates_is_active" ON "policy_templates"("is_active");

CREATE INDEX IF NOT EXISTS "idx_moderator_activity_logs_moderator_id" ON "moderator_activity_logs"("moderator_id");
CREATE INDEX IF NOT EXISTS "idx_moderator_activity_logs_action" ON "moderator_activity_logs"("action");
CREATE INDEX IF NOT EXISTS "idx_moderator_activity_logs_timestamp" ON "moderator_activity_logs"("timestamp");
CREATE INDEX IF NOT EXISTS "idx_moderator_activity_logs_session_id" ON "moderator_activity_logs"("session_id");

CREATE INDEX IF NOT EXISTS "idx_moderator_daily_metrics_moderator_date" ON "moderator_daily_metrics"("moderator_id", "date");
CREATE INDEX IF NOT EXISTS "idx_moderator_daily_metrics_date" ON "moderator_daily_metrics"("date");

CREATE INDEX IF NOT EXISTS "idx_moderation_audit_logs_case_id" ON "moderation_audit_logs"("case_id");
CREATE INDEX IF NOT EXISTS "idx_moderation_audit_logs_actor_id" ON "moderation_audit_logs"("actor_id");
CREATE INDEX IF NOT EXISTS "idx_moderation_audit_logs_actor_type" ON "moderation_audit_logs"("actor_type");
CREATE INDEX IF NOT EXISTS "idx_moderation_audit_logs_created_at" ON "moderation_audit_logs"("created_at");

CREATE INDEX IF NOT EXISTS "idx_moderation_metrics_type_name" ON "moderation_metrics"("metric_type", "metric_name");
CREATE INDEX IF NOT EXISTS "idx_moderation_metrics_recorded_at" ON "moderation_metrics"("recorded_at");

CREATE INDEX IF NOT EXISTS "idx_content_hashes_content_id" ON "content_hashes"("content_id");
CREATE INDEX IF NOT EXISTS "idx_content_hashes_hash_type_value" ON "content_hashes"("hash_type", "hash_value");

CREATE INDEX IF NOT EXISTS "idx_reputation_impacts_user_id" ON "reputation_impacts"("user_id");
CREATE INDEX IF NOT EXISTS "idx_reputation_impacts_case_id" ON "reputation_impacts"("case_id");
CREATE INDEX IF NOT EXISTS "idx_reputation_impacts_impact_type" ON "reputation_impacts"("impact_type");
CREATE INDEX IF NOT EXISTS "idx_reputation_impacts_created_at" ON "reputation_impacts"("created_at");

CREATE INDEX IF NOT EXISTS "idx_appeal_jurors_appeal_id" ON "appeal_jurors"("appeal_id");
CREATE INDEX IF NOT EXISTS "idx_appeal_jurors_juror_id" ON "appeal_jurors"("juror_id");

CREATE INDEX IF NOT EXISTS "idx_moderation_vendors_vendor_type" ON "moderation_vendors"("vendor_type");
CREATE INDEX IF NOT EXISTS "idx_moderation_vendors_is_enabled" ON "moderation_vendors"("is_enabled");

CREATE INDEX IF NOT EXISTS "idx_moderation_policies_category" ON "moderation_policies"("category");
CREATE INDEX IF NOT EXISTS "idx_moderation_policies_severity" ON "moderation_policies"("severity");
CREATE INDEX IF NOT EXISTS "idx_moderation_policies_is_active" ON "moderation_policies"("is_active");

-- Insert default policy templates
INSERT INTO "policy_templates" (
  "name", "category", "severity", "action", "reason_code", "description", "rationale", "duration_sec", "reputation_impact", "content_types"
) VALUES 
(
  'Spam Content Block',
  'spam',
  'medium',
  'block',
  'SPAM_CONTENT',
  'Content identified as spam or promotional material',
  'This content appears to be spam, promotional material, or repetitive content that does not add value to the community.',
  0,
  -5,
  ARRAY['post', 'comment']
),
(
  'Harassment Warning',
  'harassment',
  'high',
  'limit',
  'HARASSMENT_WARNING',
  'Content contains harassment or targeted abuse',
  'This content contains language or behavior that could be considered harassment or targeted abuse of other users.',
  86400,
  -10,
  ARRAY['post', 'comment', 'dm']
),
(
  'Hate Speech Block',
  'hate_speech',
  'critical',
  'block',
  'HATE_SPEECH',
  'Content contains hate speech or discriminatory language',
  'This content contains hate speech, discriminatory language, or promotes violence against individuals or groups.',
  0,
  -25,
  ARRAY['post', 'comment', 'listing']
),
(
  'NSFW Content Quarantine',
  'nsfw',
  'medium',
  'limit',
  'NSFW_CONTENT',
  'Content contains adult or inappropriate material',
  'This content contains adult material or inappropriate content that should be restricted.',
  0,
  -3,
  ARRAY['image', 'video', 'post']
),
(
  'Scam Content Block',
  'scam',
  'critical',
  'block',
  'SCAM_CONTENT',
  'Content identified as scam or fraudulent activity',
  'This content appears to be a scam, phishing attempt, or fraudulent activity designed to deceive users.',
  0,
  -50,
  ARRAY['post', 'comment', 'listing', 'dm']
),
(
  'Copyright Violation',
  'copyright',
  'high',
  'block',
  'COPYRIGHT_VIOLATION',
  'Content violates copyright or intellectual property rights',
  'This content appears to violate copyright or intellectual property rights of others.',
  0,
  -15,
  ARRAY['image', 'video', 'listing']
),
(
  'False Information Warning',
  'misinformation',
  'medium',
  'limit',
  'FALSE_INFORMATION',
  'Content contains potentially false or misleading information',
  'This content contains information that may be false, misleading, or requires fact-checking.',
  43200,
  -8,
  ARRAY['post', 'comment']
),
(
  'Violence Content Block',
  'violence',
  'critical',
  'block',
  'VIOLENCE_CONTENT',
  'Content depicts or promotes violence',
  'This content depicts graphic violence, promotes violent behavior, or contains threats of violence.',
  0,
  -30,
  ARRAY['image', 'video', 'post']
);

-- Insert default moderation vendors
INSERT INTO "moderation_vendors" (
  "vendor_name", "vendor_type", "is_enabled", "weight", "cost_per_request", "configuration"
) VALUES 
(
  'OpenAI Moderation',
  'text',
  true,
  0.4,
  0.0002,
  '{"api_version": "v1", "model": "text-moderation-latest"}'
),
(
  'Perspective API',
  'text',
  true,
  0.3,
  0.0001,
  '{"attributes": ["TOXICITY", "SEVERE_TOXICITY", "IDENTITY_ATTACK", "INSULT", "PROFANITY", "THREAT"]}'
),
(
  'Google Vision API',
  'image',
  true,
  0.5,
  0.0015,
  '{"features": ["SAFE_SEARCH_DETECTION", "TEXT_DETECTION"]}'
),
(
  'AWS Rekognition',
  'image',
  true,
  0.3,
  0.001,
  '{"detect_moderation_labels": true, "min_confidence": 50}'
),
(
  'Google Safe Browsing',
  'link',
  true,
  0.8,
  0.0001,
  '{"threat_types": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"]}'
),
(
  'Custom Crypto Scam Detection',
  'custom',
  true,
  0.6,
  0.0005,
  '{"patterns": ["seed_phrase", "private_key", "giveaway_scam", "impersonation"]}'
);

-- Insert default moderation policies
INSERT INTO "moderation_policies" (
  "category", "severity", "confidence_threshold", "action", "reputation_modifier", "description"
) VALUES 
('spam', 'low', 0.7, 'limit', -2, 'Low confidence spam detection'),
('spam', 'medium', 0.8, 'block', -5, 'Medium confidence spam detection'),
('spam', 'high', 0.9, 'block', -10, 'High confidence spam detection'),
('harassment', 'medium', 0.7, 'limit', -8, 'Harassment detection'),
('harassment', 'high', 0.8, 'block', -15, 'Severe harassment detection'),
('hate_speech', 'high', 0.8, 'block', -25, 'Hate speech detection'),
('hate_speech', 'critical', 0.9, 'block', -50, 'Severe hate speech detection'),
('nsfw', 'medium', 0.8, 'limit', -3, 'NSFW content detection'),
('violence', 'high', 0.8, 'block', -20, 'Violence content detection'),
('scam', 'high', 0.7, 'block', -30, 'Scam detection'),
('scam', 'critical', 0.8, 'block', -50, 'High confidence scam detection'),
('copyright', 'medium', 0.8, 'block', -10, 'Copyright violation detection'),
('misinformation', 'medium', 0.7, 'limit', -5, 'Misinformation detection');

-- Create a default admin moderator (this would typically be done through an admin interface)
-- Note: This assumes there's a user with a specific ID - in practice, this would be handled differently
-- INSERT INTO "moderators" (
--   "user_id", "role", "permissions", "specializations"
-- ) VALUES (
--   (SELECT id FROM users WHERE wallet_address = 'ADMIN_WALLET_ADDRESS' LIMIT 1),
--   'admin',
--   '{"canReviewContent": true, "canMakeDecisions": true, "canAccessBulkActions": true, "canViewAnalytics": true, "canManagePolicies": true, "allowedContentTypes": ["*"], "allowedSeverityLevels": ["*"]}',
--   '["all"]'
-- ) ON CONFLICT DO NOTHING;