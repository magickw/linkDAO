-- AI Content Moderation System Migration
-- This migration adds comprehensive content moderation infrastructure

-- Core moderation cases table
DROP TABLE IF EXISTS moderation_cases CASCADE;
CREATE TABLE IF NOT EXISTS moderation_cases (
    id SERIAL PRIMARY KEY,
    content_id VARCHAR(64) NOT NULL,
    content_type VARCHAR(24) NOT NULL CHECK (content_type IN ('post', 'comment', 'listing', 'dm', 'username', 'image', 'video')),
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(24) DEFAULT 'pending' CHECK (status IN ('pending', 'quarantined', 'blocked', 'allowed', 'appealed', 'under_review')),
    risk_score DECIMAL(10,4) DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 1),
    decision VARCHAR(24) CHECK (decision IN ('allow', 'limit', 'block', 'review')),
    reason_code VARCHAR(48),
    confidence DECIMAL(10,4) DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
    vendor_scores JSONB DEFAULT '{}',
    evidence_cid TEXT, -- IPFS evidence bundle hash
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User enforcement actions table
DROP TABLE IF EXISTS moderation_actions CASCADE;
CREATE TABLE IF NOT EXISTS moderation_actions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    content_id VARCHAR(64) NOT NULL,
    action VARCHAR(24) NOT NULL CHECK (action IN ('warn', 'limit', 'suspend', 'ban', 'delete_content', 'quarantine')),
    duration_sec INTEGER DEFAULT 0, -- 0 for permanent actions
    applied_by VARCHAR(64), -- moderator ID or 'system'
    rationale TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Community reports table
DROP TABLE IF EXISTS content_reports CASCADE;
CREATE TABLE IF NOT EXISTS content_reports (
    id SERIAL PRIMARY KEY,
    content_id VARCHAR(64) NOT NULL,
    reporter_id UUID NOT NULL REFERENCES users(id),
    reason VARCHAR(48) NOT NULL CHECK (reason IN ('spam', 'harassment', 'hate_speech', 'violence', 'nsfw', 'scam', 'fake_content', 'copyright', 'other')),
    details TEXT,
    weight DECIMAL(10,4) DEFAULT 1 CHECK (weight >= 0 AND weight <= 10),
    status VARCHAR(24) DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Appeals system table
DROP TABLE IF EXISTS moderation_appeals CASCADE;
CREATE TABLE IF NOT EXISTS moderation_appeals (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL REFERENCES moderation_cases(id),
    appellant_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(24) DEFAULT 'open' CHECK (status IN ('open', 'jury_selection', 'voting', 'decided', 'executed')),
    stake_amount DECIMAL(20,8) DEFAULT 0,
    jury_decision VARCHAR(24) CHECK (jury_decision IN ('uphold', 'overturn', 'partial')),
    decision_cid TEXT, -- IPFS hash of jury decision with evidence
    created_at TIMESTAMP DEFAULT NOW()
);

-- Jury selection and voting for appeals
DROP TABLE IF EXISTS appeal_jurors CASCADE;
CREATE TABLE IF NOT EXISTS appeal_jurors (
    id SERIAL PRIMARY KEY,
    appeal_id INTEGER NOT NULL REFERENCES moderation_appeals(id),
    juror_id UUID NOT NULL REFERENCES users(id),
    selection_weight DECIMAL(10,4) NOT NULL, -- Based on reputation and stake
    vote_commitment VARCHAR(64), -- Hash of vote for commit-reveal
    vote_reveal VARCHAR(24) CHECK (vote_reveal IN ('uphold', 'overturn', 'partial')),
    vote_reasoning TEXT,
    reward_amount DECIMAL(20,8) DEFAULT 0,
    slashed_amount DECIMAL(20,8) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    voted_at TIMESTAMP,
    UNIQUE(appeal_id, juror_id)
);

-- Policy rules configuration
DROP TABLE IF EXISTS moderation_policies CASCADE;
CREATE TABLE IF NOT EXISTS moderation_policies (
    id SERIAL PRIMARY KEY,
    category VARCHAR(48) NOT NULL,
    severity VARCHAR(24) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    confidence_threshold DECIMAL(10,4) NOT NULL CHECK (confidence_threshold >= 0 AND confidence_threshold <= 1),
    action VARCHAR(24) NOT NULL CHECK (action IN ('allow', 'limit', 'block', 'review')),
    reputation_modifier DECIMAL(10,4) DEFAULT 0, -- Adjustment based on user reputation
    description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Vendor API configurations and status
DROP TABLE IF EXISTS moderation_vendors CASCADE;
CREATE TABLE IF NOT EXISTS moderation_vendors (
    id SERIAL PRIMARY KEY,
    vendor_name VARCHAR(32) NOT NULL UNIQUE,
    vendor_type VARCHAR(24) NOT NULL CHECK (vendor_type IN ('text', 'image', 'video', 'link', 'custom')),
    api_endpoint VARCHAR(255),
    is_enabled BOOLEAN DEFAULT true,
    weight DECIMAL(10,4) DEFAULT 1 CHECK (weight >= 0 AND weight <= 1),
    cost_per_request DECIMAL(10,6) DEFAULT 0,
    avg_latency_ms INTEGER DEFAULT 0,
    success_rate DECIMAL(10,4) DEFAULT 1,
    last_health_check TIMESTAMP,
    configuration JSONB DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit log for all moderation decisions
DROP TABLE IF EXISTS moderation_audit_log CASCADE;
CREATE TABLE IF NOT EXISTS moderation_audit_log (
    id SERIAL PRIMARY KEY,
    case_id INTEGER REFERENCES moderation_cases(id),
    action_type VARCHAR(32) NOT NULL,
    actor_id VARCHAR(64), -- user ID or 'system'
    actor_type VARCHAR(24) DEFAULT 'user' CHECK (actor_type IN ('user', 'moderator', 'system', 'ai')),
    old_state JSONB,
    new_state JSONB,
    reasoning TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance metrics and monitoring
DROP TABLE IF EXISTS moderation_metrics CASCADE;
CREATE TABLE IF NOT EXISTS moderation_metrics (
    id SERIAL PRIMARY KEY,
    metric_type VARCHAR(32) NOT NULL,
    metric_name VARCHAR(64) NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    dimensions JSONB DEFAULT '{}', -- Additional metric dimensions
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Content hashes for duplicate detection
DROP TABLE IF EXISTS content_hashes CASCADE;
CREATE TABLE IF NOT EXISTS content_hashes (
    id SERIAL PRIMARY KEY,
    content_id VARCHAR(64) NOT NULL,
    content_type VARCHAR(24) NOT NULL,
    hash_type VARCHAR(24) NOT NULL CHECK (hash_type IN ('md5', 'sha256', 'perceptual', 'text_similarity')),
    hash_value VARCHAR(128) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(content_id, hash_type)
);

-- Reputation impact tracking
DROP TABLE IF EXISTS reputation_impacts CASCADE;
CREATE TABLE IF NOT EXISTS reputation_impacts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    case_id INTEGER REFERENCES moderation_cases(id),
    impact_type VARCHAR(32) NOT NULL CHECK (impact_type IN ('violation', 'helpful_report', 'false_report', 'successful_appeal', 'jury_accuracy')),
    impact_value DECIMAL(10,4) NOT NULL, -- Can be negative for penalties
    previous_reputation DECIMAL(10,4),
    new_reputation DECIMAL(10,4),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance optimization indices
CREATE INDEX IF NOT EXISTS idx_moderation_cases_content_id ON moderation_cases(content_id);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_user_id ON moderation_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_status ON moderation_cases(status);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_created_at ON moderation_cases(created_at);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_risk_score ON moderation_cases(risk_score);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_user_id ON moderation_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_content_id ON moderation_actions(content_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_created_at ON moderation_actions(created_at);

CREATE INDEX IF NOT EXISTS idx_content_reports_content_id ON content_reports(content_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter_id ON content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_created_at ON content_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_moderation_appeals_case_id ON moderation_appeals(case_id);
CREATE INDEX IF NOT EXISTS idx_moderation_appeals_appellant_id ON moderation_appeals(appellant_id);
CREATE INDEX IF NOT EXISTS idx_moderation_appeals_status ON moderation_appeals(status);

CREATE INDEX IF NOT EXISTS idx_appeal_jurors_appeal_id ON appeal_jurors(appeal_id);
CREATE INDEX IF NOT EXISTS idx_appeal_jurors_juror_id ON appeal_jurors(juror_id);

CREATE INDEX IF NOT EXISTS idx_moderation_audit_log_case_id ON moderation_audit_log(case_id);
CREATE INDEX IF NOT EXISTS idx_moderation_audit_log_created_at ON moderation_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_moderation_audit_log_actor_id ON moderation_audit_log(actor_id);

CREATE INDEX IF NOT EXISTS idx_content_hashes_content_id ON content_hashes(content_id);
CREATE INDEX IF NOT EXISTS idx_content_hashes_hash_value ON content_hashes(hash_value);
CREATE INDEX IF NOT EXISTS idx_content_hashes_hash_type ON content_hashes(hash_type);

CREATE INDEX IF NOT EXISTS idx_reputation_impacts_user_id ON reputation_impacts(user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_impacts_case_id ON reputation_impacts(case_id);
CREATE INDEX IF NOT EXISTS idx_reputation_impacts_created_at ON reputation_impacts(created_at);

CREATE INDEX IF NOT EXISTS idx_moderation_metrics_metric_type ON moderation_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_moderation_metrics_recorded_at ON moderation_metrics(recorded_at);

-- Composite indices for common queries
CREATE INDEX IF NOT EXISTS idx_moderation_cases_user_status ON moderation_cases(user_id, status);
CREATE INDEX IF NOT EXISTS idx_content_reports_content_status ON content_reports(content_id, status);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_user_created ON moderation_actions(user_id, created_at);

-- Add triggers for automatic audit logging
CREATE OR REPLACE FUNCTION log_moderation_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO moderation_audit_log (case_id, action_type, actor_id, actor_type, new_state, reasoning)
        VALUES (
            NEW.id,
            TG_TABLE_NAME || '_created',
            'system',
            'system',
            row_to_json(NEW),
            'Record created'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO moderation_audit_log (case_id, action_type, actor_id, actor_type, old_state, new_state, reasoning)
        VALUES (
            NEW.id,
            TG_TABLE_NAME || '_updated',
            'system',
            'system',
            row_to_json(OLD),
            row_to_json(NEW),
            'Record updated'
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for audit logging
CREATE TRIGGER trigger_moderation_cases_audit
    AFTER INSERT OR UPDATE ON moderation_cases
    FOR EACH ROW EXECUTE FUNCTION log_moderation_audit();

CREATE TRIGGER trigger_moderation_appeals_audit
    AFTER INSERT OR UPDATE ON moderation_appeals
    FOR EACH ROW EXECUTE FUNCTION log_moderation_audit();

-- Function to update moderation case timestamps
CREATE OR REPLACE FUNCTION update_moderation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER trigger_moderation_cases_timestamp
    BEFORE UPDATE ON moderation_cases
    FOR EACH ROW EXECUTE FUNCTION update_moderation_timestamp();

CREATE TRIGGER trigger_moderation_policies_timestamp
    BEFORE UPDATE ON moderation_policies
    FOR EACH ROW EXECUTE FUNCTION update_moderation_timestamp();

CREATE TRIGGER trigger_moderation_vendors_timestamp
    BEFORE UPDATE ON moderation_vendors
    FOR EACH ROW EXECUTE FUNCTION update_moderation_timestamp();

-- Insert default moderation policies
INSERT INTO moderation_policies (category, severity, confidence_threshold, action, reputation_modifier, description) VALUES
('hate_speech', 'critical', 0.95, 'block', -0.2, 'Hate speech and discriminatory content'),
('harassment', 'high', 0.90, 'block', -0.15, 'Harassment and bullying behavior'),
('violence', 'critical', 0.95, 'block', -0.2, 'Violence and threats of violence'),
('nsfw', 'high', 0.85, 'limit', -0.1, 'Not safe for work content'),
('spam', 'medium', 0.80, 'limit', -0.05, 'Spam and repetitive content'),
('scam', 'critical', 0.90, 'block', -0.25, 'Scams and fraudulent content'),
('fake_content', 'high', 0.85, 'review', -0.1, 'Misinformation and fake content'),
('copyright', 'high', 0.90, 'block', -0.15, 'Copyright infringement'),
('pii_exposure', 'high', 0.95, 'block', 0, 'Personal information exposure'),
('seed_phrase', 'critical', 0.99, 'block', -0.3, 'Seed phrase or private key exposure');

-- Insert default vendor configurations
-- Ensure description column exists (safe for existing tables)
ALTER TABLE moderation_vendors ADD COLUMN IF NOT EXISTS description TEXT;

INSERT INTO moderation_vendors (vendor_name, vendor_type, is_enabled, weight, description) VALUES
('openai_moderation', 'text', true, 0.4, 'OpenAI Moderation API for text content'),
('perspective_api', 'text', true, 0.3, 'Google Perspective API for toxicity detection'),
('google_vision', 'image', true, 0.5, 'Google Vision API for image content analysis'),
('aws_rekognition', 'image', true, 0.3, 'AWS Rekognition for image moderation'),
('google_safebrowsing', 'link', true, 1.0, 'Google Safe Browsing for malicious URLs'),
('custom_crypto_scam', 'custom', true, 0.2, 'Custom crypto scam detection patterns');