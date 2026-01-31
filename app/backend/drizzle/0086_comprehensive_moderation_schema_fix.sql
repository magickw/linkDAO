-- Comprehensive Moderation Schema Fix
-- This migration addresses all identified schema inconsistencies and adds missing columns

-- ============================================================================
-- FIX 1: Ensure moderation_cases has all required columns
-- ============================================================================

-- Add missing columns if they don't exist
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS assigned_moderator_id VARCHAR(64);
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]';

-- Add index for assigned_moderator_id if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'moderation_cases' AND column_name = 'assigned_moderator_id') THEN
    CREATE INDEX IF NOT EXISTS idx_moderation_cases_assigned_moderator_id ON moderation_cases(assigned_moderator_id);
  END IF;
END $$;

-- ============================================================================
-- FIX 2: Add evidence hash verification column
-- ============================================================================

-- Add column for storing the actual hash of evidence content for verification
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS evidence_content_hash VARCHAR(64);

-- ============================================================================
-- FIX 3: Add CAPTCHA verification to content_reports
-- ============================================================================

-- Add CAPTCHA tracking columns
ALTER TABLE content_reports ADD COLUMN IF NOT EXISTS captcha_token VARCHAR(128);
ALTER TABLE content_reports ADD COLUMN IF NOT EXISTS captcha_verified_at TIMESTAMP;
ALTER TABLE content_reports ADD COLUMN IF NOT EXISTS ip_address INET;

-- Add index for IP-based rate limiting
CREATE INDEX IF NOT EXISTS idx_content_reports_ip_address ON content_reports(ip_address);
CREATE INDEX IF NOT EXISTS idx_content_reports_created_at_ip ON content_reports(created_at, ip_address);

-- ============================================================================
-- FIX 4: Add signature verification to appeal_jurors
-- ============================================================================

-- Add cryptographic signature columns for jury votes
ALTER TABLE appeal_jurors ADD COLUMN IF NOT EXISTS vote_signature VARCHAR(256);
ALTER TABLE appeal_jurors ADD COLUMN IF NOT EXISTS vote_signature_verified BOOLEAN DEFAULT false;
ALTER TABLE appeal_jurors ADD COLUMN IF NOT EXISTS signature_timestamp TIMESTAMP;

-- ============================================================================
-- FIX 5: Add appeal explanation to moderation_appeals
-- ============================================================================

-- Add columns for providing explanations to users about appeal outcomes
ALTER TABLE moderation_appeals ADD COLUMN IF NOT EXISTS explanation_to_appellant TEXT;
ALTER TABLE moderation_appeals ADD COLUMN IF NOT EXISTS explanation_generated_at TIMESTAMP;

-- ============================================================================
-- FIX 6: Add community-specific moderation columns
-- ============================================================================

-- Add community_id to moderation_cases for community-specific rules
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES communities(id);

-- Add index for community-based queries
CREATE INDEX IF NOT EXISTS idx_moderation_cases_community_id ON moderation_cases(community_id);

-- ============================================================================
-- FIX 7: Add performance optimization columns
-- ============================================================================

-- Add priority column for better queue management
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS priority VARCHAR(16) DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low'));

-- Add index for priority-based queries
CREATE INDEX IF NOT EXISTS idx_moderation_cases_priority_status ON moderation_cases(priority, status);

-- Add processing metadata
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS processing_duration_ms INTEGER;

-- ============================================================================
-- FIX 8: Add evidence preview support
-- ============================================================================

-- Add columns to support evidence preview functionality
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS evidence_preview_url TEXT;
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS evidence_preview_generated_at TIMESTAMP;

-- ============================================================================
-- FIX 9: Add multi-language support columns
-- ============================================================================

-- Add language detection and storage
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS detected_language VARCHAR(8) DEFAULT 'en';
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS original_content TEXT;

-- ============================================================================
-- FIX 10: Add vendor performance tracking columns
-- ============================================================================

-- Add detailed vendor performance data to moderation_vendors
ALTER TABLE moderation_vendors ADD COLUMN IF NOT EXISTS total_requests BIGINT DEFAULT 0;
ALTER TABLE moderation_vendors ADD COLUMN IF NOT EXISTS successful_requests BIGINT DEFAULT 0;
ALTER TABLE moderation_vendors ADD COLUMN IF NOT EXISTS failed_requests BIGINT DEFAULT 0;
ALTER TABLE moderation_vendors ADD COLUMN IF NOT EXISTS avg_confidence_score DECIMAL(10,4);

-- ============================================================================
-- FIX 11: Add moderation workflow status tracking
-- ============================================================================

-- Add workflow tracking to moderation_audit_log
ALTER TABLE moderation_audit_log ADD COLUMN IF NOT EXISTS workflow_id VARCHAR(64);
ALTER TABLE moderation_audit_log ADD COLUMN IF NOT EXISTS workflow_step VARCHAR(64);

-- ============================================================================
-- FIX 12: Add user feedback collection
-- ============================================================================

-- Add feedback columns to moderation_cases for collecting user feedback on decisions
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS user_feedback TEXT;
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS user_feedback_rating INTEGER CHECK (user_feedback_rating >= 1 AND user_feedback_rating <= 5);
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS user_feedback_submitted_at TIMESTAMP;

-- ============================================================================
-- FIX 13: Add escalation tracking
-- ============================================================================

-- Add escalation columns to support escalation workflows
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS escalation_count INTEGER DEFAULT 0;
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS escalation_reason TEXT;
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS escalated_to VARCHAR(64);
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP;

-- ============================================================================
-- FIX 14: Add content fingerprint for duplicate detection
-- ============================================================================

-- Add content fingerprint column for improved duplicate detection
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS content_fingerprint VARCHAR(128);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_content_fingerprint ON moderation_cases(content_fingerprint);

-- ============================================================================
-- FIX 15: Add policy enforcement metadata
-- ============================================================================

-- Add policy enforcement tracking
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS enforced_policy_id INTEGER REFERENCES moderation_policies(id);
ALTER TABLE moderation_cases ADD COLUMN IF NOT EXISTS policy_enforced_at TIMESTAMP;

-- ============================================================================
-- FIX 16: Add appeal statistics tracking
-- ============================================================================

-- Add statistics columns to moderation_policies
ALTER TABLE moderation_policies ADD COLUMN IF NOT EXISTS total_enforcements BIGINT DEFAULT 0;
ALTER TABLE moderation_policies ADD COLUMN IF NOT EXISTS successful_appeals BIGINT DEFAULT 0;
ALTER TABLE moderation_policies ADD COLUMN IF NOT EXISTS false_positive_rate DECIMAL(10,4) DEFAULT 0;

-- ============================================================================
-- DATA MIGRATION: Set default values for existing rows
-- ============================================================================

-- Set default priority for existing cases
UPDATE moderation_cases 
SET priority = CASE 
  WHEN risk_score >= 0.8 THEN 'high'
  WHEN risk_score >= 0.5 THEN 'medium'
  ELSE 'low'
END
WHERE priority IS NULL;

-- Set default language for existing cases
UPDATE moderation_cases 
SET detected_language = 'en'
WHERE detected_language IS NULL;

-- Copy content to original_content if original_content is NULL
UPDATE moderation_cases 
SET original_content = content
WHERE original_content IS NULL AND content IS NOT NULL;

-- ============================================================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_moderation_cases_user_status_created ON moderation_cases(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_type_status_priority ON moderation_cases(content_type, status, priority);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_risk_status ON moderation_cases(risk_score, status);

-- Index for vendor performance queries
CREATE INDEX IF NOT EXISTS idx_moderation_vendors_enabled ON moderation_vendors(is_enabled, vendor_type);

-- Index for appeal queries
CREATE INDEX IF NOT EXISTS idx_moderation_appeals_status_created ON moderation_appeals(status, created_at);

-- ============================================================================
-- CONSTRAINTS AND VALIDATIONS
-- ============================================================================

-- Add check constraint for escalation count
ALTER TABLE moderation_cases ADD CONSTRAINT chk_escalation_count_non_negative 
  CHECK (escalation_count >= 0);

-- Add check constraint for user feedback rating
ALTER TABLE moderation_cases ADD CONSTRAINT chk_user_feedback_rating_valid 
  CHECK (user_feedback_rating IS NULL OR (user_feedback_rating >= 1 AND user_feedback_rating <= 5));

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN moderation_cases.assigned_moderator_id IS 'ID of the moderator assigned to review this case';
COMMENT ON COLUMN moderation_cases.content IS 'Original content text for moderation';
COMMENT ON COLUMN moderation_cases.media_urls IS 'Array of media file URLs for moderation';
COMMENT ON COLUMN moderation_cases.evidence_content_hash IS 'Hash of the actual evidence content for verification';
COMMENT ON COLUMN moderation_cases.evidence_preview_url IS 'URL for previewing moderation evidence';
COMMENT ON COLUMN moderation_cases.priority IS 'Priority level for queue management (urgent, high, medium, low)';
COMMENT ON COLUMN moderation_cases.processed_at IS 'Timestamp when case processing completed';
COMMENT ON COLUMN moderation_cases.processing_duration_ms IS 'Processing time in milliseconds';
COMMENT ON COLUMN moderation_cases.detected_language IS 'Detected language code (e.g., en, es, fr)';
COMMENT ON COLUMN moderation_cases.original_content IS 'Original content before any modifications';
COMMENT ON COLUMN moderation_cases.community_id IS 'Community ID for community-specific moderation rules';
COMMENT ON COLUMN moderation_cases.content_fingerprint IS 'Content fingerprint for duplicate detection';
COMMENT ON COLUMN moderation_cases.enforced_policy_id IS 'Reference to the policy that was enforced';
COMMENT ON COLUMN moderation_cases.policy_enforced_at IS 'Timestamp when policy was enforced';
COMMENT ON COLUMN moderation_cases.escalation_count IS 'Number of times this case has been escalated';
COMMENT ON COLUMN moderation_cases.escalation_reason IS 'Reason for escalation';
COMMENT ON COLUMN moderation_cases.escalated_to IS 'ID of who the case was escalated to';
COMMENT ON COLUMN moderation_cases.escalated_at IS 'Timestamp of last escalation';
COMMENT ON COLUMN moderation_cases.user_feedback IS 'User feedback on moderation decision';
COMMENT ON COLUMN moderation_cases.user_feedback_rating IS 'User rating (1-5) of moderation decision';
COMMENT ON COLUMN moderation_cases.user_feedback_submitted_at IS 'Timestamp when user submitted feedback';

COMMENT ON COLUMN content_reports.captcha_token IS 'CAPTCHA token used for verification';
COMMENT ON COLUMN content_reports.captcha_verified_at IS 'Timestamp when CAPTCHA was verified';
COMMENT ON COLUMN content_reports.ip_address IS 'IP address of the reporter for rate limiting';

COMMENT ON COLUMN appeal_jurors.vote_signature IS 'Cryptographic signature of the vote';
COMMENT ON COLUMN appeal_jurors.vote_signature_verified IS 'Whether the vote signature has been verified';
COMMENT ON COLUMN appeal_jurors.signature_timestamp IS 'Timestamp when vote was signed';

COMMENT ON COLUMN moderation_appeals.explanation_to_appellant IS 'Explanation provided to the appellant about the decision';
COMMENT ON COLUMN moderation_appeals.explanation_generated_at IS 'Timestamp when explanation was generated';

COMMENT ON COLUMN moderation_vendors.total_requests IS 'Total number of requests to this vendor';
COMMENT ON COLUMN moderation_vendors.successful_requests IS 'Number of successful requests';
COMMENT ON COLUMN moderation_vendors.failed_requests IS 'Number of failed requests';
COMMENT ON COLUMN moderation_vendors.avg_confidence_score IS 'Average confidence score from this vendor';

COMMENT ON COLUMN moderation_audit_log.workflow_id IS 'ID of the workflow this action belongs to';
COMMENT ON COLUMN moderation_audit_log.workflow_step IS 'Name of the workflow step';

COMMENT ON COLUMN moderation_policies.total_enforcements IS 'Total number of times this policy was enforced';
COMMENT ON COLUMN moderation_policies.successful_appeals IS 'Number of successful appeals against this policy';
COMMENT ON COLUMN moderation_policies.false_positive_rate IS 'Calculated false positive rate for this policy';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all columns exist
DO $$
DECLARE
  column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'moderation_cases';
  
  RAISE NOTICE 'moderation_cases has % columns', column_count;
END $$;

DO $$
DECLARE
  column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'content_reports';
  
  RAISE NOTICE 'content_reports has % columns', column_count;
END $$;

DO $$
DECLARE
  column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'appeal_jurors';
  
  RAISE NOTICE 'appeal_jurors has % columns', column_count;
END $$;