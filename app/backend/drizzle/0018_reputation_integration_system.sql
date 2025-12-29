-- Reputation Integration System Migration
-- This migration enhances the reputation system for AI content moderation

-- Enhanced reputation tracking with detailed metrics
DROP TABLE IF EXISTS "user_reputation_scores" CASCADE;
CREATE TABLE user_reputation_scores (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
    overall_score DECIMAL(10,4) DEFAULT 1000 CHECK (overall_score >= 0), -- Base score of 1000
    moderation_score DECIMAL(10,4) DEFAULT 1000 CHECK (moderation_score >= 0),
    reporting_score DECIMAL(10,4) DEFAULT 1000 CHECK (reporting_score >= 0),
    jury_score DECIMAL(10,4) DEFAULT 1000 CHECK (jury_score >= 0),
    violation_count INTEGER DEFAULT 0,
    helpful_reports_count INTEGER DEFAULT 0,
    false_reports_count INTEGER DEFAULT 0,
    successful_appeals_count INTEGER DEFAULT 0,
    jury_decisions_count INTEGER DEFAULT 0,
    jury_accuracy_rate DECIMAL(10,4) DEFAULT 0 CHECK (jury_accuracy_rate >= 0 AND jury_accuracy_rate <= 1),
    last_violation_at TIMESTAMP,
    reputation_tier VARCHAR(24) DEFAULT 'bronze' CHECK (reputation_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Reputation change events with detailed tracking
DROP TABLE IF EXISTS "reputation_change_events" CASCADE;
CREATE TABLE reputation_change_events (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    event_type VARCHAR(32) NOT NULL CHECK (event_type IN (
        'policy_violation', 'helpful_report', 'false_report', 'successful_appeal', 
        'failed_appeal', 'jury_accurate_vote', 'jury_inaccurate_vote', 'jury_participation',
        'content_approved', 'content_restored', 'penalty_applied', 'penalty_lifted'
    )),
    score_change DECIMAL(10,4) NOT NULL, -- Can be negative for penalties
    previous_score DECIMAL(10,4) NOT NULL,
    new_score DECIMAL(10,4) NOT NULL,
    severity_multiplier DECIMAL(10,4) DEFAULT 1,
    case_id INTEGER REFERENCES moderation_cases(id),
    appeal_id INTEGER REFERENCES moderation_appeals(id),
    report_id INTEGER REFERENCES content_reports(id),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Progressive penalty system
DROP TABLE IF EXISTS "reputation_penalties" CASCADE;
CREATE TABLE reputation_penalties (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    penalty_type VARCHAR(32) NOT NULL CHECK (penalty_type IN (
        'rate_limit', 'content_review', 'posting_restriction', 'temporary_ban', 'permanent_ban'
    )),
    severity_level INTEGER NOT NULL CHECK (severity_level >= 1 AND severity_level <= 5),
    violation_count INTEGER NOT NULL, -- Number of violations that triggered this penalty
    penalty_start TIMESTAMP DEFAULT NOW(),
    penalty_end TIMESTAMP, -- NULL for permanent penalties
    is_active BOOLEAN DEFAULT true,
    case_id INTEGER REFERENCES moderation_cases(id),
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Reputation thresholds configuration
DROP TABLE IF EXISTS "reputation_thresholds" CASCADE;
CREATE TABLE reputation_thresholds (
    id SERIAL PRIMARY KEY,
    threshold_type VARCHAR(32) NOT NULL CHECK (threshold_type IN (
        'moderation_strictness', 'auto_approve', 'jury_eligibility', 'reporting_weight'
    )),
    min_score DECIMAL(10,4) NOT NULL,
    max_score DECIMAL(10,4),
    multiplier DECIMAL(10,4) DEFAULT 1,
    description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Juror performance tracking
DROP TABLE IF EXISTS "juror_performance" CASCADE;
CREATE TABLE juror_performance (
    id SERIAL PRIMARY KEY,
    juror_id UUID NOT NULL REFERENCES users(id),
    appeal_id INTEGER NOT NULL REFERENCES moderation_appeals(id),
    vote VARCHAR(24) NOT NULL CHECK (vote IN ('uphold', 'overturn', 'partial')),
    was_majority BOOLEAN NOT NULL,
    was_correct BOOLEAN, -- Determined after final outcome
    stake_amount DECIMAL(20,8) NOT NULL,
    reward_earned DECIMAL(20,8) DEFAULT 0,
    penalty_applied DECIMAL(20,8) DEFAULT 0,
    response_time_minutes INTEGER,
    quality_score DECIMAL(10,4) CHECK (quality_score >= 0 AND quality_score <= 1),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Reporter performance tracking
DROP TABLE IF EXISTS "reporter_performance" CASCADE;
CREATE TABLE reporter_performance (
    id SERIAL PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES users(id),
    report_id INTEGER NOT NULL REFERENCES content_reports(id),
    report_accuracy VARCHAR(24) CHECK (report_accuracy IN ('accurate', 'inaccurate', 'pending')),
    moderator_agreement BOOLEAN,
    final_case_outcome VARCHAR(24),
    weight_applied DECIMAL(10,4) NOT NULL,
    reputation_impact DECIMAL(10,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Reputation rewards configuration
DROP TABLE IF EXISTS "reputation_rewards" CASCADE;
CREATE TABLE reputation_rewards (
    id SERIAL PRIMARY KEY,
    reward_type VARCHAR(32) NOT NULL CHECK (reward_type IN (
        'helpful_report', 'accurate_jury_vote', 'content_quality', 'community_contribution'
    )),
    base_reward DECIMAL(10,4) NOT NULL,
    multiplier_min DECIMAL(10,4) DEFAULT 1,
    multiplier_max DECIMAL(10,4) DEFAULT 3,
    requirements JSONB DEFAULT '{}',
    description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance optimization indices
CREATE INDEX IF NOT EXISTS idx_user_reputation_scores_user_id ON user_reputation_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reputation_scores_overall_score ON user_reputation_scores(overall_score);
CREATE INDEX IF NOT EXISTS idx_user_reputation_scores_tier ON user_reputation_scores(reputation_tier);

CREATE INDEX IF NOT EXISTS idx_reputation_change_events_user_id ON reputation_change_events(user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_change_events_event_type ON reputation_change_events(event_type);
CREATE INDEX IF NOT EXISTS idx_reputation_change_events_created_at ON reputation_change_events(created_at);
CREATE INDEX IF NOT EXISTS idx_reputation_change_events_case_id ON reputation_change_events(case_id);

CREATE INDEX IF NOT EXISTS idx_reputation_penalties_user_id ON reputation_penalties(user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_penalties_active ON reputation_penalties(is_active);
CREATE INDEX IF NOT EXISTS idx_reputation_penalties_penalty_end ON reputation_penalties(penalty_end);

CREATE INDEX IF NOT EXISTS idx_juror_performance_juror_id ON juror_performance(juror_id);
CREATE INDEX IF NOT EXISTS idx_juror_performance_appeal_id ON juror_performance(appeal_id);
CREATE INDEX IF NOT EXISTS idx_juror_performance_was_correct ON juror_performance(was_correct);

CREATE INDEX IF NOT EXISTS idx_reporter_performance_reporter_id ON reporter_performance(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reporter_performance_accuracy ON reporter_performance(report_accuracy);

-- Composite indices for common queries
CREATE INDEX IF NOT EXISTS idx_reputation_change_events_user_type ON reputation_change_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_reputation_penalties_user_active ON reputation_penalties(user_id, is_active);

-- Function to calculate reputation tier based on score
CREATE OR REPLACE FUNCTION calculate_reputation_tier(score DECIMAL)
RETURNS VARCHAR AS $$
BEGIN
    IF score >= 5000 THEN RETURN 'diamond';
    ELSIF score >= 3000 THEN RETURN 'platinum';
    ELSIF score >= 2000 THEN RETURN 'gold';
    ELSIF score >= 1000 THEN RETURN 'silver';
    ELSE RETURN 'bronze';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update reputation scores
CREATE OR REPLACE FUNCTION update_reputation_score()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_reputation_scores 
    SET 
        overall_score = NEW.new_score,
        reputation_tier = calculate_reputation_tier(NEW.new_score),
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    -- Update specific score types based on event type
    IF NEW.event_type IN ('policy_violation', 'successful_appeal', 'failed_appeal') THEN
        UPDATE user_reputation_scores 
        SET moderation_score = GREATEST(0, moderation_score + NEW.score_change)
        WHERE user_id = NEW.user_id;
    ELSIF NEW.event_type IN ('helpful_report', 'false_report') THEN
        UPDATE user_reputation_scores 
        SET reporting_score = GREATEST(0, reporting_score + NEW.score_change)
        WHERE user_id = NEW.user_id;
    ELSIF NEW.event_type IN ('jury_accurate_vote', 'jury_inaccurate_vote', 'jury_participation') THEN
        UPDATE user_reputation_scores 
        SET jury_score = GREATEST(0, jury_score + NEW.score_change)
        WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic reputation updates
DROP TRIGGER IF EXISTS trigger_update_reputation_score ON reputation_change_events;
CREATE TRIGGER trigger_update_reputation_score
    AFTER INSERT ON reputation_change_events
    FOR EACH ROW EXECUTE FUNCTION update_reputation_score();

-- Function to update reputation counters
CREATE OR REPLACE FUNCTION update_reputation_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_type = 'policy_violation' THEN
        UPDATE user_reputation_scores 
        SET 
            violation_count = violation_count + 1,
            last_violation_at = NOW()
        WHERE user_id = NEW.user_id;
    ELSIF NEW.event_type = 'helpful_report' THEN
        UPDATE user_reputation_scores 
        SET helpful_reports_count = helpful_reports_count + 1
        WHERE user_id = NEW.user_id;
    ELSIF NEW.event_type = 'false_report' THEN
        UPDATE user_reputation_scores 
        SET false_reports_count = false_reports_count + 1
        WHERE user_id = NEW.user_id;
    ELSIF NEW.event_type = 'successful_appeal' THEN
        UPDATE user_reputation_scores 
        SET successful_appeals_count = successful_appeals_count + 1
        WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for counter updates
DROP TRIGGER IF EXISTS trigger_update_reputation_counters ON reputation_change_events;
CREATE TRIGGER trigger_update_reputation_counters
    AFTER INSERT ON reputation_change_events
    FOR EACH ROW EXECUTE FUNCTION update_reputation_counters();

-- Insert default reputation thresholds
INSERT INTO reputation_thresholds (threshold_type, min_score, max_score, multiplier, description) VALUES
('moderation_strictness', 0, 500, 2.0, 'High strictness for low reputation users'),
('moderation_strictness', 500, 1000, 1.5, 'Medium strictness for average users'),
('moderation_strictness', 1000, 2000, 1.0, 'Normal strictness for good users'),
('moderation_strictness', 2000, 999999, 0.8, 'Reduced strictness for high reputation users'),
('auto_approve', 2500, 999999, 1.0, 'Auto-approve content for trusted users'),
('jury_eligibility', 1500, 999999, 1.0, 'Minimum score for jury participation'),
('reporting_weight', 0, 500, 0.5, 'Reduced weight for low reputation reporters'),
('reporting_weight', 500, 1500, 1.0, 'Normal weight for average reporters'),
('reporting_weight', 1500, 999999, 1.5, 'Increased weight for high reputation reporters');

-- Insert default reputation rewards
INSERT INTO reputation_rewards (reward_type, base_reward, multiplier_min, multiplier_max, description) VALUES
('helpful_report', 50, 1.0, 2.0, 'Reward for accurate content reports'),
('accurate_jury_vote', 100, 1.0, 3.0, 'Reward for correct jury decisions'),
('content_quality', 25, 1.0, 1.5, 'Reward for high-quality content creation'),
('community_contribution', 75, 1.0, 2.5, 'Reward for positive community contributions');

-- Initialize reputation scores for existing users
INSERT INTO user_reputation_scores (user_id, overall_score, moderation_score, reporting_score, jury_score)
SELECT 
    id,
    1000, -- Base score
    1000,
    1000,
    1000
FROM users
ON CONFLICT (user_id) DO NOTHING;