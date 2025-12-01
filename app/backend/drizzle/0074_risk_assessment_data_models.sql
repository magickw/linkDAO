-- Risk Assessment Data Models for Return and Refund Admin Monitoring
-- Comprehensive fraud detection and risk management schema
-- Part of Task 1.1: Database Schema and Models

-- ============================================================================
-- RISK ASSESSMENTS TABLE - Core risk scoring and assessment
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entity being assessed
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Risk scoring
  risk_score DECIMAL(5, 2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  confidence_score DECIMAL(5, 2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  
  -- Model information
  model_version VARCHAR(50) NOT NULL,
  model_type VARCHAR(30) NOT NULL CHECK (model_type IN ('rule_based', 'ml_model', 'hybrid')),
  
  -- Assessment results
  recommendation VARCHAR(30) NOT NULL CHECK (recommendation IN (
    'auto_approve', 'manual_review', 'reject', 'escalate', 'flag_for_investigation'
  )),
  explanation TEXT, -- Human-readable explanation of the risk assessment
  
  -- Feature contributions (which factors contributed most to the score)
  feature_contributions JSONB NOT NULL DEFAULT '[]', -- Array of {feature, weight, contribution}
  
  -- Prediction details
  predicted_fraud_probability DECIMAL(5, 4), -- 0.0000 to 1.0000
  predicted_outcome VARCHAR(30), -- 'legitimate', 'suspicious', 'fraudulent'
  
  -- Review status
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_outcome VARCHAR(30) CHECK (review_outcome IN ('confirmed', 'overridden', 'escalated')),
  review_notes TEXT,
  
  -- Actual outcome (for model training)
  actual_outcome VARCHAR(30) CHECK (actual_outcome IN ('legitimate', 'fraudulent', 'unknown')),
  outcome_confirmed_at TIMESTAMP,
  outcome_confirmed_by UUID REFERENCES users(id),
  
  -- Metadata
  assessment_context JSONB DEFAULT '{}', -- Additional context data
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for risk assessments
CREATE INDEX idx_risk_assessments_return_id ON risk_assessments(return_id);
CREATE INDEX idx_risk_assessments_user_id ON risk_assessments(user_id);
CREATE INDEX idx_risk_assessments_risk_level ON risk_assessments(risk_level);
CREATE INDEX idx_risk_assessments_risk_score ON risk_assessments(risk_score DESC);
CREATE INDEX idx_risk_assessments_recommendation ON risk_assessments(recommendation);
CREATE INDEX idx_risk_assessments_reviewed ON risk_assessments(reviewed);
CREATE INDEX idx_risk_assessments_created_at ON risk_assessments(created_at DESC);
CREATE INDEX idx_risk_assessments_model_version ON risk_assessments(model_version);
CREATE INDEX idx_risk_assessments_high_risk ON risk_assessments(risk_level, created_at DESC) 
  WHERE risk_level IN ('high', 'critical');

-- ============================================================================
-- RISK FEATURES TABLE - Individual risk factors and signals
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
  
  -- Feature identification
  feature_name VARCHAR(100) NOT NULL,
  feature_category VARCHAR(50) NOT NULL CHECK (feature_category IN (
    'user_history', 'order_characteristics', 'behavioral', 'temporal', 
    'financial', 'device', 'network', 'pattern'
  )),
  
  -- Feature value and analysis
  feature_value JSONB NOT NULL, -- Actual value of the feature
  normalized_value DECIMAL(10, 6), -- Normalized value for ML models
  
  -- Risk contribution
  weight DECIMAL(5, 4) NOT NULL, -- Weight in the model (0.0000 to 1.0000)
  contribution DECIMAL(10, 6) NOT NULL, -- Contribution to final risk score
  risk_indicator VARCHAR(20) CHECK (risk_indicator IN ('positive', 'negative', 'neutral')),
  
  -- Feature metadata
  description TEXT, -- Human-readable description
  threshold_exceeded BOOLEAN DEFAULT false,
  threshold_value DECIMAL(20, 8),
  
  -- Statistical context
  population_mean DECIMAL(20, 8), -- Mean value in population
  population_stddev DECIMAL(20, 8), -- Standard deviation
  z_score DECIMAL(10, 4), -- How many standard deviations from mean
  percentile DECIMAL(5, 2), -- Percentile rank (0-100)
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for risk features
CREATE INDEX idx_risk_features_assessment_id ON risk_features(assessment_id);
CREATE INDEX idx_risk_features_feature_name ON risk_features(feature_name);
CREATE INDEX idx_risk_features_feature_category ON risk_features(feature_category);
CREATE INDEX idx_risk_features_contribution ON risk_features(contribution DESC);
CREATE INDEX idx_risk_features_threshold_exceeded ON risk_features(threshold_exceeded) 
  WHERE threshold_exceeded = true;

-- ============================================================================
-- FRAUD PATTERNS TABLE - Detected fraud patterns and behaviors
-- ============================================================================

CREATE TABLE IF NOT EXISTS fraud_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pattern identification
  pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN (
    'high_frequency_returns', 'high_value_returns', 'reason_abuse', 
    'timing_abuse', 'wardrobing', 'bracketing', 'serial_returner',
    'coordinated_fraud', 'account_takeover', 'friendly_fraud',
    'return_fraud_ring', 'policy_exploitation'
  )),
  pattern_name VARCHAR(100) NOT NULL,
  
  -- Pattern scope
  scope VARCHAR(30) NOT NULL CHECK (scope IN ('user', 'seller', 'system', 'network')),
  entity_id UUID, -- User ID, Seller ID, or NULL for system-wide
  
  -- Pattern details
  description TEXT NOT NULL,
  detection_method VARCHAR(50) NOT NULL CHECK (detection_method IN (
    'rule_based', 'statistical', 'ml_model', 'manual_flag'
  )),
  
  -- Pattern metrics
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  confidence DECIMAL(5, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  frequency INTEGER DEFAULT 1, -- How many times pattern detected
  
  -- Evidence
  evidence JSONB NOT NULL DEFAULT '[]', -- Array of evidence items
  affected_returns JSONB DEFAULT '[]', -- Array of return IDs
  affected_users JSONB DEFAULT '[]', -- Array of user IDs
  
  -- Pattern characteristics
  first_detected_at TIMESTAMP NOT NULL,
  last_detected_at TIMESTAMP NOT NULL,
  detection_window_days INTEGER, -- Time span of pattern
  
  -- Financial impact
  estimated_loss DECIMAL(20, 8),
  actual_loss DECIMAL(20, 8),
  prevented_loss DECIMAL(20, 8),
  
  -- Status and actions
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'investigating', 'confirmed', 'false_positive', 'resolved'
  )),
  action_taken VARCHAR(50) CHECK (action_taken IN (
    'none', 'flagged', 'manual_review', 'account_restricted', 
    'account_suspended', 'reported_authorities', 'legal_action'
  )),
  action_taken_at TIMESTAMP,
  action_taken_by UUID REFERENCES users(id),
  
  -- Investigation
  investigated_by UUID REFERENCES users(id),
  investigation_notes TEXT,
  investigation_completed_at TIMESTAMP,
  
  -- Related patterns
  related_patterns JSONB DEFAULT '[]', -- Array of related pattern IDs
  pattern_cluster_id UUID, -- Group related patterns
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fraud patterns
CREATE INDEX idx_fraud_patterns_pattern_type ON fraud_patterns(pattern_type);
CREATE INDEX idx_fraud_patterns_scope ON fraud_patterns(scope);
CREATE INDEX idx_fraud_patterns_entity_id ON fraud_patterns(entity_id);
CREATE INDEX idx_fraud_patterns_severity ON fraud_patterns(severity);
CREATE INDEX idx_fraud_patterns_status ON fraud_patterns(status);
CREATE INDEX idx_fraud_patterns_first_detected ON fraud_patterns(first_detected_at DESC);
CREATE INDEX idx_fraud_patterns_last_detected ON fraud_patterns(last_detected_at DESC);
CREATE INDEX idx_fraud_patterns_active ON fraud_patterns(status, severity) 
  WHERE status IN ('active', 'investigating');
CREATE INDEX idx_fraud_patterns_cluster ON fraud_patterns(pattern_cluster_id) 
  WHERE pattern_cluster_id IS NOT NULL;

-- ============================================================================
-- USER RISK PROFILES TABLE - Historical risk data per user
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_risk_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Overall risk assessment
  current_risk_score DECIMAL(5, 2) NOT NULL DEFAULT 0 CHECK (current_risk_score >= 0 AND current_risk_score <= 100),
  current_risk_level VARCHAR(20) NOT NULL DEFAULT 'low' CHECK (current_risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_trend VARCHAR(20) CHECK (risk_trend IN ('increasing', 'decreasing', 'stable')),
  
  -- Return history metrics
  total_returns INTEGER DEFAULT 0,
  approved_returns INTEGER DEFAULT 0,
  rejected_returns INTEGER DEFAULT 0,
  fraudulent_returns INTEGER DEFAULT 0,
  approval_rate DECIMAL(5, 2), -- Percentage
  
  -- Financial metrics
  total_refund_amount DECIMAL(20, 8) DEFAULT 0,
  avg_refund_amount DECIMAL(20, 8) DEFAULT 0,
  max_refund_amount DECIMAL(20, 8) DEFAULT 0,
  total_orders_value DECIMAL(20, 8) DEFAULT 0,
  refund_to_purchase_ratio DECIMAL(5, 4), -- Ratio
  
  -- Behavioral patterns
  return_frequency_score DECIMAL(5, 2), -- How frequently user returns
  high_value_return_count INTEGER DEFAULT 0,
  reason_diversity_score DECIMAL(5, 2), -- Variety of return reasons used
  timing_pattern_score DECIMAL(5, 2), -- Suspicious timing patterns
  
  -- Fraud indicators
  fraud_flags INTEGER DEFAULT 0, -- Number of times flagged
  confirmed_fraud_incidents INTEGER DEFAULT 0,
  false_positive_flags INTEGER DEFAULT 0,
  last_fraud_incident_at TIMESTAMP,
  
  -- Account status
  account_status VARCHAR(30) DEFAULT 'active' CHECK (account_status IN (
    'active', 'monitored', 'restricted', 'suspended', 'banned'
  )),
  restriction_reason TEXT,
  restricted_at TIMESTAMP,
  restricted_by UUID REFERENCES users(id),
  
  -- Trust indicators
  trust_score DECIMAL(5, 2) CHECK (trust_score >= 0 AND trust_score <= 100),
  account_age_days INTEGER,
  verified_identity BOOLEAN DEFAULT false,
  verified_payment_methods INTEGER DEFAULT 0,
  
  -- Historical data
  first_return_at TIMESTAMP,
  last_return_at TIMESTAMP,
  last_assessment_at TIMESTAMP,
  
  -- Watchlist
  on_watchlist BOOLEAN DEFAULT false,
  watchlist_reason TEXT,
  watchlist_added_at TIMESTAMP,
  watchlist_added_by UUID REFERENCES users(id),
  
  -- Notes and flags
  admin_notes TEXT,
  special_handling_required BOOLEAN DEFAULT false,
  special_handling_instructions TEXT,
  
  -- Metadata
  profile_data JSONB DEFAULT '{}', -- Additional profile data
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for user risk profiles
CREATE INDEX idx_user_risk_profiles_user_id ON user_risk_profiles(user_id);
CREATE INDEX idx_user_risk_profiles_risk_level ON user_risk_profiles(current_risk_level);
CREATE INDEX idx_user_risk_profiles_risk_score ON user_risk_profiles(current_risk_score DESC);
CREATE INDEX idx_user_risk_profiles_account_status ON user_risk_profiles(account_status);
CREATE INDEX idx_user_risk_profiles_watchlist ON user_risk_profiles(on_watchlist) 
  WHERE on_watchlist = true;
CREATE INDEX idx_user_risk_profiles_high_risk ON user_risk_profiles(current_risk_level, current_risk_score DESC) 
  WHERE current_risk_level IN ('high', 'critical');
CREATE INDEX idx_user_risk_profiles_fraud_incidents ON user_risk_profiles(confirmed_fraud_incidents DESC) 
  WHERE confirmed_fraud_incidents > 0;

-- ============================================================================
-- RISK RULES TABLE - Configurable risk detection rules
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rule identification
  rule_name VARCHAR(100) NOT NULL UNIQUE,
  rule_code VARCHAR(50) NOT NULL UNIQUE,
  rule_category VARCHAR(50) NOT NULL CHECK (rule_category IN (
    'frequency', 'value', 'timing', 'behavior', 'pattern', 'threshold'
  )),
  
  -- Rule definition
  description TEXT NOT NULL,
  condition JSONB NOT NULL, -- Rule condition in structured format
  threshold_value DECIMAL(20, 8),
  threshold_operator VARCHAR(10) CHECK (threshold_operator IN ('>', '<', '>=', '<=', '=', '!=')),
  
  -- Risk impact
  risk_score_impact DECIMAL(5, 2) NOT NULL, -- How much this rule adds to risk score
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Rule behavior
  is_active BOOLEAN DEFAULT true,
  auto_flag BOOLEAN DEFAULT false, -- Automatically flag for review
  auto_reject BOOLEAN DEFAULT false, -- Automatically reject
  requires_manual_review BOOLEAN DEFAULT false,
  
  -- Execution
  execution_order INTEGER DEFAULT 0, -- Order in which rules are evaluated
  execution_frequency VARCHAR(20) DEFAULT 'always' CHECK (execution_frequency IN (
    'always', 'first_time', 'periodic', 'conditional'
  )),
  
  -- Performance tracking
  times_triggered INTEGER DEFAULT 0,
  true_positives INTEGER DEFAULT 0,
  false_positives INTEGER DEFAULT 0,
  precision DECIMAL(5, 4), -- true_positives / (true_positives + false_positives)
  
  -- Configuration
  configuration JSONB DEFAULT '{}', -- Additional rule configuration
  lookback_period_days INTEGER, -- How far back to look for pattern
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_triggered_at TIMESTAMP
);

-- Indexes for risk rules
CREATE INDEX idx_risk_rules_rule_code ON risk_rules(rule_code);
CREATE INDEX idx_risk_rules_rule_category ON risk_rules(rule_category);
CREATE INDEX idx_risk_rules_is_active ON risk_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_risk_rules_execution_order ON risk_rules(execution_order);
CREATE INDEX idx_risk_rules_severity ON risk_rules(severity);

-- ============================================================================
-- RISK RULE EXECUTIONS TABLE - Track rule execution history
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_rule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rule and assessment
  rule_id UUID NOT NULL REFERENCES risk_rules(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  
  -- Execution result
  triggered BOOLEAN NOT NULL,
  threshold_value DECIMAL(20, 8),
  actual_value DECIMAL(20, 8),
  
  -- Impact
  risk_score_added DECIMAL(5, 2),
  action_taken VARCHAR(50),
  
  -- Execution details
  execution_time_ms INTEGER, -- How long rule took to execute
  error_occurred BOOLEAN DEFAULT false,
  error_message TEXT,
  
  -- Metadata
  execution_context JSONB DEFAULT '{}',
  executed_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for risk rule executions
CREATE INDEX idx_risk_rule_executions_rule_id ON risk_rule_executions(rule_id);
CREATE INDEX idx_risk_rule_executions_assessment_id ON risk_rule_executions(assessment_id);
CREATE INDEX idx_risk_rule_executions_return_id ON risk_rule_executions(return_id);
CREATE INDEX idx_risk_rule_executions_triggered ON risk_rule_executions(triggered) 
  WHERE triggered = true;
CREATE INDEX idx_risk_rule_executions_executed_at ON risk_rule_executions(executed_at DESC);

-- ============================================================================
-- FRAUD INVESTIGATION CASES TABLE - Track fraud investigations
-- ============================================================================

CREATE TABLE IF NOT EXISTS fraud_investigation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Case identification
  case_number VARCHAR(50) NOT NULL UNIQUE,
  case_type VARCHAR(50) NOT NULL CHECK (case_type IN (
    'return_fraud', 'refund_fraud', 'account_fraud', 'coordinated_fraud', 
    'policy_abuse', 'identity_theft', 'other'
  )),
  
  -- Subjects
  primary_user_id UUID REFERENCES users(id),
  related_user_ids JSONB DEFAULT '[]', -- Array of related user IDs
  related_return_ids JSONB DEFAULT '[]', -- Array of return IDs
  related_pattern_ids JSONB DEFAULT '[]', -- Array of fraud pattern IDs
  
  -- Case details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'investigating', 'pending_evidence', 'pending_review', 
    'resolved', 'closed', 'escalated'
  )),
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  assigned_at TIMESTAMP,
  investigation_team JSONB DEFAULT '[]', -- Array of investigator IDs
  
  -- Evidence
  evidence_collected JSONB DEFAULT '[]', -- Array of evidence items
  evidence_summary TEXT,
  
  -- Financial impact
  estimated_loss DECIMAL(20, 8),
  confirmed_loss DECIMAL(20, 8),
  recovered_amount DECIMAL(20, 8),
  
  -- Resolution
  resolution VARCHAR(50) CHECK (resolution IN (
    'confirmed_fraud', 'false_positive', 'insufficient_evidence', 
    'policy_violation', 'user_error', 'system_error'
  )),
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id),
  
  -- Actions taken
  actions_taken JSONB DEFAULT '[]', -- Array of actions
  account_actions VARCHAR(50) CHECK (account_actions IN (
    'none', 'warning', 'restriction', 'suspension', 'termination'
  )),
  legal_action_required BOOLEAN DEFAULT false,
  law_enforcement_notified BOOLEAN DEFAULT false,
  law_enforcement_case_number VARCHAR(100),
  
  -- Timeline
  opened_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  
  -- Metadata
  case_notes TEXT,
  internal_notes TEXT, -- Private notes not visible to user
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fraud investigation cases
CREATE INDEX idx_fraud_investigation_cases_case_number ON fraud_investigation_cases(case_number);
CREATE INDEX idx_fraud_investigation_cases_case_type ON fraud_investigation_cases(case_type);
CREATE INDEX idx_fraud_investigation_cases_primary_user ON fraud_investigation_cases(primary_user_id);
CREATE INDEX idx_fraud_investigation_cases_status ON fraud_investigation_cases(status);
CREATE INDEX idx_fraud_investigation_cases_severity ON fraud_investigation_cases(severity);
CREATE INDEX idx_fraud_investigation_cases_assigned_to ON fraud_investigation_cases(assigned_to);
CREATE INDEX idx_fraud_investigation_cases_opened_at ON fraud_investigation_cases(opened_at DESC);
CREATE INDEX idx_fraud_investigation_cases_active ON fraud_investigation_cases(status, priority) 
  WHERE status IN ('open', 'investigating', 'pending_evidence', 'pending_review');

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_risk_assessment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at
CREATE TRIGGER risk_assessments_updated_at
  BEFORE UPDATE ON risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_assessment_updated_at();

CREATE TRIGGER fraud_patterns_updated_at
  BEFORE UPDATE ON fraud_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_assessment_updated_at();

CREATE TRIGGER user_risk_profiles_updated_at
  BEFORE UPDATE ON user_risk_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_assessment_updated_at();

CREATE TRIGGER risk_rules_updated_at
  BEFORE UPDATE ON risk_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_assessment_updated_at();

CREATE TRIGGER fraud_investigation_cases_updated_at
  BEFORE UPDATE ON fraud_investigation_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_assessment_updated_at();

-- Function to update user risk profile when assessment is created
CREATE OR REPLACE FUNCTION update_user_risk_profile_on_assessment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_risk_profiles (user_id, current_risk_score, current_risk_level, last_assessment_at)
  VALUES (NEW.user_id, NEW.risk_score, NEW.risk_level, NEW.created_at)
  ON CONFLICT (user_id) DO UPDATE SET
    current_risk_score = NEW.risk_score,
    current_risk_level = NEW.risk_level,
    last_assessment_at = NEW.created_at,
    total_returns = user_risk_profiles.total_returns + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to risk_assessments
CREATE TRIGGER update_user_risk_profile_trigger
  AFTER INSERT ON risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_user_risk_profile_on_assessment();

-- Function to increment rule trigger count
CREATE OR REPLACE FUNCTION increment_rule_trigger_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.triggered = true THEN
    UPDATE risk_rules
    SET 
      times_triggered = times_triggered + 1,
      last_triggered_at = NEW.executed_at
    WHERE id = NEW.rule_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to risk_rule_executions
CREATE TRIGGER increment_rule_trigger_count_trigger
  AFTER INSERT ON risk_rule_executions
  FOR EACH ROW
  EXECUTE FUNCTION increment_rule_trigger_count();

-- ============================================================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ============================================================================

-- High-risk users summary view
CREATE MATERIALIZED VIEW high_risk_users_summary AS
SELECT
  urp.user_id,
  u.wallet_address,
  u.handle,
  urp.current_risk_score,
  urp.current_risk_level,
  urp.total_returns,
  urp.fraudulent_returns,
  urp.confirmed_fraud_incidents,
  urp.account_status,
  urp.on_watchlist,
  COUNT(DISTINCT ra.id) as total_assessments,
  COUNT(DISTINCT fp.id) as associated_patterns,
  MAX(ra.created_at) as last_assessment_date,
  NOW() as last_updated
FROM user_risk_profiles urp
JOIN users u ON urp.user_id = u.id
LEFT JOIN risk_assessments ra ON urp.user_id = ra.user_id
LEFT JOIN fraud_patterns fp ON fp.entity_id = urp.user_id AND fp.scope = 'user'
WHERE urp.current_risk_level IN ('high', 'critical')
  OR urp.on_watchlist = true
  OR urp.confirmed_fraud_incidents > 0
GROUP BY urp.user_id, u.wallet_address, u.handle, urp.current_risk_score, 
         urp.current_risk_level, urp.total_returns, urp.fraudulent_returns,
         urp.confirmed_fraud_incidents, urp.account_status, urp.on_watchlist;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_high_risk_users_summary_user_id ON high_risk_users_summary(user_id);
CREATE INDEX idx_high_risk_users_summary_risk_score ON high_risk_users_summary(current_risk_score DESC);

-- Active fraud patterns summary view
CREATE MATERIALIZED VIEW active_fraud_patterns_summary AS
SELECT
  fp.pattern_type,
  fp.severity,
  COUNT(*) as pattern_count,
  SUM(fp.frequency) as total_occurrences,
  SUM(fp.estimated_loss) as total_estimated_loss,
  SUM(fp.actual_loss) as total_actual_loss,
  SUM(fp.prevented_loss) as total_prevented_loss,
  MIN(fp.first_detected_at) as earliest_detection,
  MAX(fp.last_detected_at) as latest_detection,
  NOW() as last_updated
FROM fraud_patterns fp
WHERE fp.status IN ('active', 'investigating')
GROUP BY fp.pattern_type, fp.severity;

-- Create index on materialized view
CREATE INDEX idx_active_fraud_patterns_summary_type ON active_fraud_patterns_summary(pattern_type);
CREATE INDEX idx_active_fraud_patterns_summary_severity ON active_fraud_patterns_summary(severity);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE risk_assessments IS 'Core risk scoring and assessment for each return request';
COMMENT ON TABLE risk_features IS 'Individual risk factors and their contributions to risk scores';
COMMENT ON TABLE fraud_patterns IS 'Detected fraud patterns and suspicious behaviors';
COMMENT ON TABLE user_risk_profiles IS 'Historical risk data and behavioral patterns per user';
COMMENT ON TABLE risk_rules IS 'Configurable rules for risk detection and scoring';
COMMENT ON TABLE risk_rule_executions IS 'Execution history and results of risk rules';
COMMENT ON TABLE fraud_investigation_cases IS 'Formal fraud investigation case management';

COMMENT ON COLUMN risk_assessments.risk_score IS 'Calculated risk score from 0-100';
COMMENT ON COLUMN risk_assessments.confidence_score IS 'Model confidence in the assessment 0-100';
COMMENT ON COLUMN risk_assessments.feature_contributions IS 'Array of features with their weights and contributions';
COMMENT ON COLUMN risk_features.z_score IS 'Standard deviations from population mean';
COMMENT ON COLUMN fraud_patterns.pattern_cluster_id IS 'Groups related patterns for coordinated fraud detection';
COMMENT ON COLUMN user_risk_profiles.refund_to_purchase_ratio IS 'Ratio of refunds to total purchase value';
COMMENT ON COLUMN risk_rules.precision IS 'True positives divided by all positives (accuracy metric)';

-- ============================================================================
-- INITIAL SETUP
-- ============================================================================

-- Insert default risk rules
INSERT INTO risk_rules (rule_name, rule_code, rule_category, description, condition, risk_score_impact, severity, is_active)
VALUES
  ('High Frequency Returns', 'HIGH_FREQ_RETURNS', 'frequency', 
   'User has more than 5 returns in the last 30 days', 
   '{"metric": "return_count_30d", "operator": ">", "value": 5}'::jsonb, 
   25.0, 'high', true),
  
  ('High Value Return', 'HIGH_VALUE_RETURN', 'value', 
   'Return value exceeds $500', 
   '{"metric": "refund_amount", "operator": ">", "value": 500}'::jsonb, 
   15.0, 'medium', true),
  
  ('Rapid Return Pattern', 'RAPID_RETURN', 'timing', 
   'Return requested within 24 hours of delivery', 
   '{"metric": "hours_since_delivery", "operator": "<", "value": 24}'::jsonb, 
   10.0, 'low', true),
  
  ('Reason Abuse Pattern', 'REASON_ABUSE', 'pattern', 
   'User has used same return reason more than 3 times', 
   '{"metric": "same_reason_count", "operator": ">", "value": 3}'::jsonb, 
   20.0, 'high', true),
  
  ('New Account High Value', 'NEW_ACCOUNT_HIGH_VALUE', 'behavior', 
   'Account less than 30 days old with return over $200', 
   '{"conditions": [{"metric": "account_age_days", "operator": "<", "value": 30}, {"metric": "refund_amount", "operator": ">", "value": 200}]}'::jsonb, 
   30.0, 'high', true);

-- Grant appropriate permissions
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO admin_readonly;
-- GRANT SELECT, INSERT, UPDATE ON risk_assessments TO admin_user;
-- GRANT SELECT, INSERT, UPDATE ON fraud_patterns TO admin_user;
-- GRANT SELECT, INSERT, UPDATE ON user_risk_profiles TO admin_user;
