-- Migration: Add device tokens and notification preferences tables
-- Created: 2026-01-14
-- Purpose: Support push notifications for mobile app

-- Create device_tokens table
CREATE TABLE IF NOT EXISTS device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
    device_info JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    UNIQUE(user_id, token)
);

-- Create index for faster lookups
CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_token ON device_tokens(token);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    comments BOOLEAN NOT NULL DEFAULT true,
    reactions BOOLEAN NOT NULL DEFAULT true,
    tips BOOLEAN NOT NULL DEFAULT true,
    mentions BOOLEAN NOT NULL DEFAULT true,
    community_updates BOOLEAN NOT NULL DEFAULT true,
    moderation BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP
);

-- Add comments
COMMENT ON TABLE device_tokens IS 'Stores device tokens for push notifications';
COMMENT ON TABLE notification_preferences IS 'User notification preferences';

COMMENT ON COLUMN device_tokens.token IS 'Expo push token';
COMMENT ON COLUMN device_tokens.platform IS 'Device platform (ios or android)';
COMMENT ON COLUMN device_tokens.device_info IS 'Additional device information (brand, model, OS version)';
