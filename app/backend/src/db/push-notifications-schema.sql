-- Push notification subscriptions table
CREATE TABLE IF NOT EXISTS push_notification_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    endpoint TEXT NOT NULL,
    keys JSONB NOT NULL,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_endpoint UNIQUE (user_id, endpoint)
);

-- Index for efficient lookup of active subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active ON push_notification_subscriptions (user_id, is_active);

-- Index for cleanup of inactive subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_last_used ON push_notification_subscriptions (last_used_at);

-- User notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL UNIQUE,
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user preference lookup
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences (user_id);

-- Notification logs for analytics
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    community_id UUID,
    post_id UUID,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for notification analytics
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs (type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_community_id ON notification_logs (community_id);

-- Insert default notification preferences function
CREATE OR REPLACE FUNCTION insert_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.preferences = '{}'::jsonb THEN
        NEW.preferences := '{
            "communityUpdates": true,
            "newPosts": true,
            "mentions": true,
            "replies": true,
            "communityInvites": true,
            "governanceProposals": true,
            "proposalResults": true,
            "moderatorActions": false,
            "systemUpdates": true
        }'::jsonb;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set default preferences
CREATE TRIGGER set_default_notification_preferences
    BEFORE INSERT ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION insert_default_notification_preferences();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_push_notification_subscriptions_updated_at
    BEFORE UPDATE ON push_notification_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();