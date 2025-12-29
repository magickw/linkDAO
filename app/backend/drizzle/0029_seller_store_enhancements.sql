-- Create sellers table if it doesn't exist
CREATE TABLE IF NOT EXISTS sellers (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(66) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    store_name VARCHAR(255),
    bio TEXT,
    description TEXT,
    tier VARCHAR(32) DEFAULT 'basic',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add new columns to sellers table for enhanced store page functionality
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS seller_story TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}';
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS verification_levels JSONB DEFAULT '{}';
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP;

-- Create seller_activities table for activity timeline
CREATE TABLE IF NOT EXISTS seller_activities (
    id SERIAL PRIMARY KEY,
    seller_wallet_address VARCHAR(42) NOT NULL,
    activity_type VARCHAR(50) NOT NULL, -- 'sale', 'listing', 'review', 'dao_action', 'achievement'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_wallet_address) REFERENCES sellers(wallet_address) ON DELETE CASCADE
);

-- Create seller_badges table for performance badges
CREATE TABLE IF NOT EXISTS seller_badges (
    id SERIAL PRIMARY KEY,
    seller_wallet_address VARCHAR(42) NOT NULL,
    badge_type VARCHAR(50) NOT NULL, -- 'performance', 'achievement', 'verification'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(50),
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    FOREIGN KEY (seller_wallet_address) REFERENCES sellers(wallet_address) ON DELETE CASCADE
);

-- Create seller_dao_endorsements table
CREATE TABLE IF NOT EXISTS seller_dao_endorsements (
    id SERIAL PRIMARY KEY,
    seller_wallet_address VARCHAR(42) NOT NULL,
    endorser_address VARCHAR(42) NOT NULL,
    endorser_ens VARCHAR(255),
    proposal_hash VARCHAR(66),
    vote_count INTEGER DEFAULT 0,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_wallet_address) REFERENCES sellers(wallet_address) ON DELETE CASCADE
);

-- Create seller_transactions table for transaction history
CREATE TABLE IF NOT EXISTS seller_transactions (
    id SERIAL PRIMARY KEY,
    seller_wallet_address VARCHAR(42) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- 'sale', 'purchase'
    amount DECIMAL(20, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'ETH',
    counterparty_address VARCHAR(42),
    transaction_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_wallet_address) REFERENCES sellers(wallet_address) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_seller_activities_wallet ON seller_activities(seller_wallet_address);
CREATE INDEX IF NOT EXISTS idx_seller_activities_type ON seller_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_seller_badges_wallet ON seller_badges(seller_wallet_address);
CREATE INDEX IF NOT EXISTS idx_seller_dao_endorsements_wallet ON seller_dao_endorsements(seller_wallet_address);
CREATE INDEX IF NOT EXISTS idx_seller_transactions_wallet ON seller_transactions(seller_wallet_address);
CREATE INDEX IF NOT EXISTS idx_seller_transactions_type ON seller_transactions(transaction_type);

-- Update existing sellers with default values
UPDATE sellers SET 
    social_links = COALESCE(social_links, '{"twitter": "", "linkedin": "", "website": ""}'),
    performance_metrics = COALESCE(performance_metrics, '{"avgDeliveryTime": "2-3 days", "customerSatisfaction": 4.5, "returnRate": 2.0, "repeatCustomerRate": 45, "responseTime": "< 4 hours", "trend": "stable", "trendValue": "0%"}'),
    verification_levels = COALESCE(verification_levels, '{"identity": {"type": "BASIC", "verified": false}, "business": {"type": "BASIC", "verified": false}, "kyc": {"type": "BASIC", "verified": false}}'),
    is_online = COALESCE(is_online, false);