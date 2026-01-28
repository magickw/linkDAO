-- Migration: Add application status tracking to sellers table
-- This adds fields to track the seller onboarding application review process
-- Run this migration before deploying Phase 2 updates

-- Add application status fields
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS application_status varchar(20) DEFAULT 'pending' NOT NULL;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS application_submitted_at timestamp;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS application_reviewed_at timestamp;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS application_reviewed_by uuid;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS application_rejection_reason text;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS application_admin_notes text;

-- Add index for application status queries (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_sellers_application_status ON sellers(application_status);
CREATE INDEX IF NOT EXISTS idx_sellers_application_submitted_at ON sellers(application_submitted_at DESC);

-- Migration data: Set existing sellers as "approved" for backward compatibility
-- Only update if onboarding_completed is true
UPDATE sellers 
SET 
  application_status = 'approved',
  application_submitted_at = created_at,
  application_reviewed_at = updated_at
WHERE 
  onboarding_completed = true 
  AND application_status = 'pending';

-- Add foreign key constraint if admin user tracking is needed
-- ALTER TABLE sellers ADD CONSTRAINT fk_application_reviewed_by 
-- FOREIGN KEY (application_reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- Verify migration
SELECT 
  COUNT(*) as total_sellers,
  COUNT(CASE WHEN application_status = 'approved' THEN 1 END) as approved,
  COUNT(CASE WHEN application_status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN application_status = 'rejected' THEN 1 END) as rejected,
  COUNT(CASE WHEN application_status = 'under_review' THEN 1 END) as under_review
FROM sellers;
