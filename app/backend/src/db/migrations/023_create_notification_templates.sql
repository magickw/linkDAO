-- Migration: 023 - Create notification_templates and notification_logs tables
-- Description: Adds database support for dynamic notification templates and tracking

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  channel VARCHAR(20) NOT NULL, -- 'email', 'push', 'sms'

  -- Template content
  subject_template TEXT,
  body_template TEXT NOT NULL,

  -- Variable definitions
  variables JSONB NOT NULL DEFAULT '[]', -- Array of {name, type, required, defaultValue}

  -- Status and versioning
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,

  -- Metadata
  description TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT valid_channel CHECK (channel IN ('email', 'push', 'sms'))
);

-- Create indexes for template lookup
CREATE INDEX IF NOT EXISTS idx_notification_templates_name ON notification_templates(name);
CREATE INDEX IF NOT EXISTS idx_notification_templates_channel ON notification_templates(channel);
CREATE INDEX IF NOT EXISTS idx_notification_templates_is_active ON notification_templates(is_active);

-- Create notification logs table for tracking sent notifications
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  template_name VARCHAR(100),
  channel VARCHAR(20) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  subject TEXT,
  body TEXT,
  variables JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, sent, failed, bounced

  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  failed_at TIMESTAMP,

  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed', 'bounced'))
);

-- Create indexes for notification log queries
CREATE INDEX IF NOT EXISTS idx_notification_logs_template_id ON notification_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient ON notification_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel ON notification_logs(channel);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);

-- Create table for template version history
CREATE TABLE IF NOT EXISTS notification_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES notification_templates(id) ON DELETE CASCADE,
  template_name VARCHAR(100) NOT NULL,
  version INTEGER NOT NULL,
  subject_template TEXT,
  body_template TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]',
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_template_versions_template_id ON notification_template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_notification_template_versions_template_name ON notification_template_versions(template_name);

-- Add trigger to update notification_templates timestamp
CREATE OR REPLACE FUNCTION update_notification_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_templates_timestamp_trigger ON notification_templates;
CREATE TRIGGER notification_templates_timestamp_trigger
BEFORE UPDATE ON notification_templates
FOR EACH ROW
EXECUTE FUNCTION update_notification_templates_timestamp();

-- Add trigger to create version history when template is updated
CREATE OR REPLACE FUNCTION create_notification_template_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.version > OLD.version THEN
    INSERT INTO notification_template_versions
    (template_id, template_name, version, subject_template, body_template, variables, description)
    VALUES
    (NEW.id, NEW.name, OLD.version, OLD.subject_template, OLD.body_template, OLD.variables, OLD.description);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_template_version_trigger ON notification_templates;
CREATE TRIGGER notification_template_version_trigger
AFTER UPDATE ON notification_templates
FOR EACH ROW
EXECUTE FUNCTION create_notification_template_version();
