-- Custom Scam Detection System Migration
-- This migration adds tables and configurations for custom scam detection models

-- Scam detection patterns configuration
DROP TABLE IF EXISTS "scam_detection_patterns" CASCADE;
CREATE TABLE scam_detection_patterns (
    id SERIAL PRIMARY KEY,
    pattern_type VARCHAR(32) NOT NULL CHECK (pattern_type IN ('seed_phrase', 'crypto_scam', 'impersonation', 'market_manipulation', 'phishing')),
    pattern_name VARCHAR(64) NOT NULL,
    pattern_regex TEXT,
    pattern_keywords TEXT[], -- Array of keywords for pattern matching
    confidence_weight DECIMAL(10,4) DEFAULT 0.5 CHECK (confidence_weight >= 0 AND confidence_weight <= 1),
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(pattern_type, pattern_name)
);

-- Scam detection results cache
DROP TABLE IF EXISTS "scam_detection_cache" CASCADE;
CREATE TABLE scam_detection_cache (
    id SERIAL PRIMARY KEY,
    content_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA256 hash of content
    detection_result JSONB NOT NULL, -- Cached ScamDetectionResult
    patterns_detected TEXT[], -- Array of detected pattern names
    confidence DECIMAL(10,4) NOT NULL,
    is_scam BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours') -- Cache for 24 hours
);

-- Known scam addresses and entities
DROP TABLE IF EXISTS "scam_entities" CASCADE;
CREATE TABLE scam_entities (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(24) NOT NULL CHECK (entity_type IN ('wallet_address', 'domain', 'handle', 'email', 'phone')),
    entity_value VARCHAR(255) NOT NULL,
    scam_category VARCHAR(32) NOT NULL,
    confidence DECIMAL(10,4) DEFAULT 1.0,
    source VARCHAR(64), -- Where this was reported from
    verified_by VARCHAR(64), -- Who verified this as scam
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(entity_type, entity_value)
);

-- BIP39 word list for seed phrase detection
DROP TABLE IF EXISTS "bip39_words" CASCADE;
CREATE TABLE bip39_words (
    id SERIAL PRIMARY KEY,
    word VARCHAR(16) NOT NULL UNIQUE,
    word_index INTEGER NOT NULL UNIQUE CHECK (word_index >= 0 AND word_index < 2048),
    language VARCHAR(8) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Impersonation targets (known figures and brands to protect)
DROP TABLE IF EXISTS "impersonation_targets" CASCADE;
CREATE TABLE impersonation_targets (
    id SERIAL PRIMARY KEY,
    target_type VARCHAR(24) NOT NULL CHECK (target_type IN ('person', 'brand', 'organization')),
    target_name VARCHAR(128) NOT NULL,
    aliases TEXT[], -- Alternative names/spellings
    official_handles JSONB DEFAULT '{}', -- Official social media handles
    verification_patterns TEXT[], -- Patterns that indicate impersonation
    protection_level VARCHAR(16) DEFAULT 'medium' CHECK (protection_level IN ('low', 'medium', 'high', 'critical')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Market manipulation detection rules
DROP TABLE IF EXISTS "market_manipulation_rules" CASCADE;
CREATE TABLE market_manipulation_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(64) NOT NULL UNIQUE,
    rule_type VARCHAR(32) NOT NULL CHECK (rule_type IN ('pump_dump', 'coordinated_trading', 'insider_trading', 'fake_signals')),
    detection_patterns TEXT[] NOT NULL,
    confidence_threshold DECIMAL(10,4) DEFAULT 0.7,
    action_threshold DECIMAL(10,4) DEFAULT 0.8, -- Threshold for taking action
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Phishing domain patterns and blacklists
DROP TABLE IF EXISTS "phishing_domains" CASCADE;
CREATE TABLE phishing_domains (
    id SERIAL PRIMARY KEY,
    domain_pattern VARCHAR(255) NOT NULL,
    domain_type VARCHAR(24) DEFAULT 'exact' CHECK (domain_type IN ('exact', 'wildcard', 'regex')),
    target_brand VARCHAR(64), -- What brand this is trying to impersonate
    risk_level VARCHAR(16) DEFAULT 'high' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    source VARCHAR(64), -- Where this was reported from
    verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_scam_detection_patterns_type ON scam_detection_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_scam_detection_patterns_active ON scam_detection_patterns(is_active);

CREATE INDEX IF NOT EXISTS idx_scam_detection_cache_hash ON scam_detection_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_scam_detection_cache_expires ON scam_detection_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_scam_detection_cache_scam ON scam_detection_cache(is_scam);

CREATE INDEX IF NOT EXISTS idx_scam_entities_type ON scam_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_scam_entities_value ON scam_entities(entity_value);
CREATE INDEX IF NOT EXISTS idx_scam_entities_category ON scam_entities(scam_category);
CREATE INDEX IF NOT EXISTS idx_scam_entities_active ON scam_entities(is_active);

CREATE INDEX IF NOT EXISTS idx_bip39_words_word ON bip39_words(word);
CREATE INDEX IF NOT EXISTS idx_bip39_words_index ON bip39_words(word_index);

CREATE INDEX IF NOT EXISTS idx_impersonation_targets_type ON impersonation_targets(target_type);
CREATE INDEX IF NOT EXISTS idx_impersonation_targets_name ON impersonation_targets(target_name);
CREATE INDEX IF NOT EXISTS idx_impersonation_targets_active ON impersonation_targets(is_active);

CREATE INDEX IF NOT EXISTS idx_market_manipulation_rules_type ON market_manipulation_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_market_manipulation_rules_active ON market_manipulation_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_phishing_domains_pattern ON phishing_domains(domain_pattern);
CREATE INDEX IF NOT EXISTS idx_phishing_domains_brand ON phishing_domains(target_brand);
CREATE INDEX IF NOT EXISTS idx_phishing_domains_active ON phishing_domains(is_active);

-- Composite indices for common queries
CREATE INDEX IF NOT EXISTS idx_scam_entities_type_active ON scam_entities(entity_type, is_active);
CREATE INDEX IF NOT EXISTS idx_scam_detection_patterns_type_active ON scam_detection_patterns(pattern_type, is_active);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_scam_detection_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM scam_detection_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_scam_detection_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
DROP TRIGGER IF EXISTS trigger_scam_detection_patterns_timestamp ON scam_detection_patterns;
CREATE TRIGGER trigger_scam_detection_patterns_timestamp
    BEFORE UPDATE ON scam_detection_patterns
    FOR EACH ROW EXECUTE FUNCTION update_scam_detection_timestamp();

DROP TRIGGER IF EXISTS trigger_scam_entities_timestamp ON scam_entities;
CREATE TRIGGER trigger_scam_entities_timestamp
    BEFORE UPDATE ON scam_entities
    FOR EACH ROW EXECUTE FUNCTION update_scam_detection_timestamp();

DROP TRIGGER IF EXISTS trigger_impersonation_targets_timestamp ON impersonation_targets;
CREATE TRIGGER trigger_impersonation_targets_timestamp
    BEFORE UPDATE ON impersonation_targets
    FOR EACH ROW EXECUTE FUNCTION update_scam_detection_timestamp();

DROP TRIGGER IF EXISTS trigger_market_manipulation_rules_timestamp ON market_manipulation_rules;
CREATE TRIGGER trigger_market_manipulation_rules_timestamp
    BEFORE UPDATE ON market_manipulation_rules
    FOR EACH ROW EXECUTE FUNCTION update_scam_detection_timestamp();

DROP TRIGGER IF EXISTS trigger_phishing_domains_timestamp ON phishing_domains;
CREATE TRIGGER trigger_phishing_domains_timestamp
    BEFORE UPDATE ON phishing_domains
    FOR EACH ROW EXECUTE FUNCTION update_scam_detection_timestamp();

-- Insert default scam detection patterns
INSERT INTO scam_detection_patterns (pattern_type, pattern_name, pattern_regex, confidence_weight, description) VALUES
('seed_phrase', 'bip39_sequence', '\b(?:abandon|ability|able|about|above|absent|absorb|abstract|absurd|abuse)(?:\s+\w+){11,23}\b', 0.9, 'Detects sequences of BIP39 words'),
('seed_phrase', 'private_key_hex', '\b[0-9a-fA-F]{64}\b', 0.95, 'Detects 64-character hexadecimal private keys'),
('seed_phrase', 'recovery_phrase_indicators', '\b(?:seed phrase|mnemonic|recovery phrase|backup phrase|wallet words)\b', 0.8, 'Detects seed phrase indicators'),

('crypto_scam', 'fake_giveaway', '\b(?:free|giving away|giveaway)\s+(?:\d+\s+)?(?:btc|eth|bitcoin|ethereum|usdt|usdc)\b', 0.85, 'Detects fake crypto giveaways'),
('crypto_scam', 'double_crypto', '\bdouble your (?:btc|eth|bitcoin|ethereum|crypto)\b', 0.9, 'Detects crypto doubling scams'),
('crypto_scam', 'celebrity_giveaway', '\b(?:elon|musk|vitalik|bezos|gates)\s+(?:giveaway|giving)\b', 0.8, 'Detects celebrity impersonation giveaways'),

('impersonation', 'verification_claims', '\bverified\s+(?:account|profile|user)\b', 0.7, 'Detects false verification claims'),
('impersonation', 'official_claims', '\bofficial\s+(?:account|profile|page)\b', 0.75, 'Detects false official account claims'),
('impersonation', 'ceo_claims', '\bceo\s+of\b', 0.8, 'Detects false CEO claims'),

('market_manipulation', 'pump_dump', '\bpump\s+(?:and\s+)?dump\b', 0.85, 'Detects pump and dump schemes'),
('market_manipulation', 'guaranteed_profit', '\bguaranteed\s+(?:profit|gains?)\b', 0.8, 'Detects guaranteed profit claims'),
('market_manipulation', 'insider_info', '\binsider\s+(?:info|information|tip)\b', 0.9, 'Detects insider trading claims'),

('phishing', 'wallet_verification', '\bverify\s+your\s+wallet\b', 0.8, 'Detects wallet verification phishing'),
('phishing', 'urgent_action', '\bimmediate\s+action\s+required\b', 0.75, 'Detects urgency-based phishing'),
('phishing', 'security_breach', '\bsecurity\s+breach\s+detected\b', 0.85, 'Detects fake security breach notifications');

-- Insert BIP39 word list (first 50 words as example)
INSERT INTO bip39_words (word, word_index) VALUES
('abandon', 0), ('ability', 1), ('able', 2), ('about', 3), ('above', 4),
('absent', 5), ('absorb', 6), ('abstract', 7), ('absurd', 8), ('abuse', 9),
('access', 10), ('accident', 11), ('account', 12), ('accuse', 13), ('achieve', 14),
('acid', 15), ('acoustic', 16), ('acquire', 17), ('across', 18), ('act', 19),
('action', 20), ('actor', 21), ('actress', 22), ('actual', 23), ('adapt', 24),
('add', 25), ('addict', 26), ('address', 27), ('adjust', 28), ('admit', 29),
('adult', 30), ('advance', 31), ('advice', 32), ('aerobic', 33), ('affair', 34),
('afford', 35), ('afraid', 36), ('again', 37), ('age', 38), ('agent', 39),
('agree', 40), ('ahead', 41), ('aim', 42), ('air', 43), ('airport', 44),
('aisle', 45), ('alarm', 46), ('album', 47), ('alcohol', 48), ('alert', 49);

-- Insert known impersonation targets
INSERT INTO impersonation_targets (target_type, target_name, aliases, protection_level) VALUES
('person', 'Elon Musk', ARRAY['elon', 'musk', 'elonmusk'], 'critical'),
('person', 'Vitalik Buterin', ARRAY['vitalik', 'buterin', 'vitalikbuterin'], 'critical'),
('person', 'Satoshi Nakamoto', ARRAY['satoshi', 'nakamoto'], 'critical'),
('brand', 'Coinbase', ARRAY['coinbase', 'coinbase pro'], 'high'),
('brand', 'Binance', ARRAY['binance', 'bnb'], 'high'),
('brand', 'MetaMask', ARRAY['metamask', 'meta mask'], 'high'),
('brand', 'OpenSea', ARRAY['opensea', 'open sea'], 'medium'),
('organization', 'Tesla', ARRAY['tesla', 'tesla motors'], 'high'),
('organization', 'SpaceX', ARRAY['spacex', 'space x'], 'high');

-- Insert market manipulation rules
INSERT INTO market_manipulation_rules (rule_name, rule_type, detection_patterns, confidence_threshold, description) VALUES
('pump_and_dump_basic', 'pump_dump', ARRAY['pump and dump', 'pump & dump', 'pnd'], 0.8, 'Basic pump and dump detection'),
('coordinated_buying', 'coordinated_trading', ARRAY['everyone buy', 'all buy now', 'mass purchase'], 0.75, 'Coordinated buying activity'),
('fake_signals', 'fake_signals', ARRAY['guaranteed signal', '100% accurate', 'never lose'], 0.85, 'Fake trading signals'),
('moon_talk', 'pump_dump', ARRAY['to the moon', 'mooning', 'moon mission'], 0.6, 'Pump-related moon terminology');

-- Insert known phishing domains
INSERT INTO phishing_domains (domain_pattern, domain_type, target_brand, risk_level) VALUES
('metamask-wallet.com', 'exact', 'MetaMask', 'critical'),
('coinbase-secure.com', 'exact', 'Coinbase', 'critical'),
('binance-verify.com', 'exact', 'Binance', 'critical'),
('opensea-nft.com', 'exact', 'OpenSea', 'high'),
('uniswap-defi.com', 'exact', 'Uniswap', 'high'),
('*.metamask-*.com', 'wildcard', 'MetaMask', 'high'),
('*.coinbase-*.com', 'wildcard', 'Coinbase', 'high');

-- Create a scheduled job to clean cache (requires pg_cron extension)
-- SELECT cron.schedule('clean-scam-cache', '0 */6 * * *', 'SELECT clean_scam_detection_cache();');