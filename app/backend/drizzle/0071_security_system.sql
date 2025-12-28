-- Security System Tables Migration
-- Created: 2025-12-27
-- Description: Adds comprehensive security features including 2FA, session management, activity logging, trusted devices, and security alerts

-- Two-Factor Authentication
CREATE TABLE IF NOT EXISTS "two_factor_auth" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "method" varchar(20) NOT NULL, -- 'totp' | 'email'
  "secret" text, -- Encrypted TOTP secret
  "backup_codes" jsonb, -- Array of encrypted backup codes
  "is_enabled" boolean DEFAULT false,
  "verified_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_2fa_user_id" ON "two_factor_auth"("user_id");

-- User Sessions
CREATE TABLE IF NOT EXISTS "user_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "session_token" varchar(255) NOT NULL UNIQUE,
  "device_info" jsonb, -- { browser, os, device }
  "ip_address" varchar(45),
  "user_agent" text,
  "location" jsonb, -- { city, country, coordinates }
  "is_active" boolean DEFAULT true,
  "last_activity_at" timestamp DEFAULT now(),
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "user_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_sessions_token" ON "user_sessions"("session_token");
CREATE INDEX IF NOT EXISTS "idx_sessions_active" ON "user_sessions"("is_active");

-- User Activity Log
CREATE TABLE IF NOT EXISTS "user_activity_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "activity_type" varchar(50) NOT NULL, -- 'login', 'logout', 'profile_update', 'security_change', etc.
  "description" text NOT NULL,
  "metadata" jsonb, -- Additional context data
  "ip_address" varchar(45),
  "user_agent" text,
  "session_id" uuid REFERENCES "user_sessions"("id") ON DELETE SET NULL,
  "severity" varchar(20) DEFAULT 'info', -- 'info' | 'warning' | 'critical'
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_activity_user_id" ON "user_activity_log"("user_id");
CREATE INDEX IF NOT EXISTS "idx_activity_type" ON "user_activity_log"("activity_type");
CREATE INDEX IF NOT EXISTS "idx_activity_created_at" ON "user_activity_log"("created_at");
CREATE INDEX IF NOT EXISTS "idx_activity_severity" ON "user_activity_log"("severity");

-- Trusted Devices
CREATE TABLE IF NOT EXISTS "trusted_devices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "device_fingerprint" varchar(255) NOT NULL,
  "device_name" varchar(255), -- User-friendly name
  "device_info" jsonb, -- { browser, os, device }
  "ip_address" varchar(45),
  "last_used_at" timestamp DEFAULT now(),
  "is_trusted" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_trusted_devices_user_id" ON "trusted_devices"("user_id");
CREATE INDEX IF NOT EXISTS "idx_trusted_devices_fingerprint" ON "trusted_devices"("device_fingerprint");
CREATE INDEX IF NOT EXISTS "idx_trusted_devices_is_trusted" ON "trusted_devices"("is_trusted");

-- Security Alerts Configuration
CREATE TABLE IF NOT EXISTS "security_alerts_config" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "new_device_alerts" boolean DEFAULT true,
  "suspicious_activity_alerts" boolean DEFAULT true,
  "large_transaction_alerts" boolean DEFAULT false,
  "large_transaction_threshold" varchar(50) DEFAULT '1000', -- In USD equivalent
  "security_change_alerts" boolean DEFAULT true,
  "login_alerts" boolean DEFAULT false,
  "alert_channels" jsonb DEFAULT '["email"]', -- ['email', 'push', 'sms']
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_security_alerts_user_id" ON "security_alerts_config"("user_id");

-- Security Alerts (triggered alerts)
CREATE TABLE IF NOT EXISTS "security_alerts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "alert_type" varchar(50) NOT NULL, -- 'new_device', 'suspicious_activity', 'large_transaction', etc.
  "severity" varchar(20) NOT NULL, -- 'low' | 'medium' | 'high' | 'critical'
  "title" varchar(255) NOT NULL,
  "message" text NOT NULL,
  "metadata" jsonb, -- Additional context
  "is_read" boolean DEFAULT false,
  "is_resolved" boolean DEFAULT false,
  "resolved_at" timestamp,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_security_alerts_user_id" ON "security_alerts"("user_id");
CREATE INDEX IF NOT EXISTS "idx_security_alerts_type" ON "security_alerts"("alert_type");
CREATE INDEX IF NOT EXISTS "idx_security_alerts_severity" ON "security_alerts"("severity");
CREATE INDEX IF NOT EXISTS "idx_security_alerts_is_read" ON "security_alerts"("is_read");
CREATE INDEX IF NOT EXISTS "idx_security_alerts_created_at" ON "security_alerts"("created_at");

-- Privacy Settings
CREATE TABLE IF NOT EXISTS "privacy_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "hide_transaction_history" boolean DEFAULT false,
  "anonymous_mode" boolean DEFAULT false,
  "show_wallet_balance" boolean DEFAULT false,
  "public_profile" boolean DEFAULT true,
  "allow_data_sharing" boolean DEFAULT false,
  "marketing_emails" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_privacy_settings_user_id" ON "privacy_settings"("user_id");

-- Comments
COMMENT ON TABLE "two_factor_auth" IS 'Stores two-factor authentication settings and secrets for users';
COMMENT ON TABLE "user_sessions" IS 'Tracks active user sessions with device and location information';
COMMENT ON TABLE "user_activity_log" IS 'Comprehensive log of all user security-related activities';
COMMENT ON TABLE "trusted_devices" IS 'Manages trusted devices for enhanced security';
COMMENT ON TABLE "security_alerts_config" IS 'User preferences for security alert notifications';
COMMENT ON TABLE "security_alerts" IS 'Triggered security alerts for users';
COMMENT ON TABLE "privacy_settings" IS 'User privacy preferences and settings';
