-- Email Preferences and Analytics Migration
-- This migration adds email preference controls and analytics tracking

-- 1. Update security_alerts_config for email preferences
ALTER TABLE security_alerts_config 
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS email_frequency VARCHAR(20) DEFAULT 'immediate', -- 'immediate', 'hourly', 'daily', 'weekly', 'off'
ADD COLUMN IF NOT EXISTS digest_time TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS unsubscribe_token VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS transaction_threshold DECIMAL(10, 2) DEFAULT 1000.00;

-- 2. Create email_analytics table for tracking
CREATE TABLE IF NOT EXISTS email_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_type VARCHAR(50) NOT NULL,
    email_subject VARCHAR(255),
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    tracking_id VARCHAR(255) UNIQUE NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for email_analytics
CREATE INDEX IF NOT EXISTS idx_email_analytics_user_id ON email_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_email_analytics_tracking_id ON email_analytics(tracking_id);
CREATE INDEX IF NOT EXISTS idx_email_analytics_sent_at ON email_analytics(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_analytics_email_type ON email_analytics(email_type);

-- 3. Create email_digest_queue table for batched emails
CREATE TABLE IF NOT EXISTS email_digest_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    scheduled_for TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for email_digest_queue
CREATE INDEX IF NOT EXISTS idx_email_digest_queue_user_id ON email_digest_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_email_digest_queue_scheduled_for ON email_digest_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_digest_queue_sent_at ON email_digest_queue(sent_at);

-- 4. Add comments for documentation
COMMENT ON COLUMN security_alerts_config.email_notifications_enabled IS 'Master switch for all email notifications';
COMMENT ON COLUMN security_alerts_config.email_frequency IS 'How often to send emails: immediate, hourly, daily, weekly, off';
COMMENT ON COLUMN security_alerts_config.digest_time IS 'Time of day to send digest emails (for daily/weekly frequency)';
COMMENT ON COLUMN security_alerts_config.unsubscribed_at IS 'Timestamp when user unsubscribed from non-critical emails';
COMMENT ON COLUMN security_alerts_config.unsubscribe_token IS 'Unique token for unsubscribe links';
COMMENT ON COLUMN security_alerts_config.transaction_threshold IS 'Threshold amount for large transaction alerts (in USD)';

COMMENT ON TABLE email_analytics IS 'Tracks email delivery, opens, and clicks for analytics';
COMMENT ON COLUMN email_analytics.tracking_id IS 'Unique identifier for tracking opens and clicks';

COMMENT ON TABLE email_digest_queue IS 'Queue for batched/digest email delivery';
