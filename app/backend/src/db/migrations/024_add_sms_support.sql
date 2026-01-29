-- Migration: 024 - Add SMS support
-- Description: Extends notification system with SMS capabilities

-- Add SMS columns to notification_logs if not already present
ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS carrier VARCHAR(100),
ADD COLUMN IF NOT EXISTS sms_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS delivery_carrier_status VARCHAR(50);

-- Create SMS metrics table for tracking SMS delivery
CREATE TABLE IF NOT EXISTS sms_delivery_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_sent INTEGER DEFAULT 0,
  successful INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  carrier VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(phone_number, date)
);

-- Create SMS templates table
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  body_template TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  description TEXT,
  max_length INTEGER DEFAULT 160, -- SMS character limit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default SMS templates
INSERT INTO sms_templates (name, body_template, variables, description)
VALUES
  (
    'order_shipped_sms',
    'Your order #{{orderNumber}} has shipped! Track: {{trackingUrl}}',
    '[{"name": "orderNumber", "type": "string", "required": true}, {"name": "trackingUrl", "type": "string", "required": true}]',
    'Order shipment notification via SMS'
  ),
  (
    'receipt_ready_sms',
    'Your receipt #{{receiptNumber}} is ready. Download: {{downloadUrl}}',
    '[{"name": "receiptNumber", "type": "string", "required": true}, {"name": "downloadUrl", "type": "string", "required": true}]',
    'Receipt ready notification via SMS'
  ),
  (
    'verification_code_sms',
    'Your LinkDAO verification code is: {{code}}. Valid for 10 minutes.',
    '[{"name": "code", "type": "string", "required": true}]',
    '2FA verification code via SMS'
  )
ON CONFLICT DO NOTHING;

-- Create indexes for SMS tables
CREATE INDEX IF NOT EXISTS idx_sms_metrics_phone ON sms_delivery_metrics(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_metrics_date ON sms_delivery_metrics(date);
CREATE INDEX IF NOT EXISTS idx_sms_templates_name ON sms_templates(name);
CREATE INDEX IF NOT EXISTS idx_sms_templates_active ON sms_templates(is_active);

-- Add trigger to update sms_templates timestamp
CREATE OR REPLACE FUNCTION update_sms_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sms_templates_timestamp_trigger ON sms_templates;
CREATE TRIGGER sms_templates_timestamp_trigger
BEFORE UPDATE ON sms_templates
FOR EACH ROW
EXECUTE FUNCTION update_sms_templates_timestamp();

-- Add trigger to update sms_delivery_metrics timestamp
CREATE OR REPLACE FUNCTION update_sms_metrics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sms_metrics_timestamp_trigger ON sms_delivery_metrics;
CREATE TRIGGER sms_metrics_timestamp_trigger
BEFORE UPDATE ON sms_delivery_metrics
FOR EACH ROW
EXECUTE FUNCTION update_sms_metrics_timestamp();
