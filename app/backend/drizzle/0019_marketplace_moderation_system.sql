-- Marketplace-specific moderation tables
-- Migration: 0019_marketplace_moderation_system.sql

-- Marketplace verification records
CREATE TABLE IF NOT EXISTS "marketplace_verifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "listing_id" varchar(64) NOT NULL,
  "verification_level" varchar(24) NOT NULL DEFAULT 'basic',
  "seller_tier" varchar(24) NOT NULL DEFAULT 'unverified',
  "risk_score" numeric(3,2) NOT NULL DEFAULT 0,
  "proof_of_ownership" jsonb,
  "brand_verification" jsonb,
  "verification_status" varchar(24) NOT NULL DEFAULT 'pending',
  "verified_by" varchar(64),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Counterfeit detection results
CREATE TABLE IF NOT EXISTS "counterfeit_detections" (
  "id" serial PRIMARY KEY NOT NULL,
  "listing_id" varchar(64) NOT NULL,
  "brand_keywords" text[], -- Array of detected brand keywords
  "suspicious_terms" text[], -- Array of suspicious terms
  "image_analysis" jsonb, -- Image analysis results
  "price_analysis" jsonb, -- Price analysis results
  "confidence_score" numeric(3,2) NOT NULL DEFAULT 0,
  "is_counterfeit" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);

-- Scam pattern detection results
CREATE TABLE IF NOT EXISTS "scam_patterns" (
  "id" serial PRIMARY KEY NOT NULL,
  "listing_id" varchar(64) NOT NULL,
  "pattern_type" varchar(32) NOT NULL,
  "confidence" numeric(3,2) NOT NULL DEFAULT 0,
  "indicators" text[] NOT NULL,
  "description" text,
  "created_at" timestamp DEFAULT now()
);

-- Seller verification tiers and history
CREATE TABLE IF NOT EXISTS "seller_verifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "wallet_address" varchar(66) NOT NULL UNIQUE,
  "current_tier" varchar(24) NOT NULL DEFAULT 'unverified',
  "kyc_verified" boolean DEFAULT false,
  "kyc_verified_at" timestamp,
  "reputation_score" integer DEFAULT 0,
  "total_volume" numeric(20,8) DEFAULT 0,
  "successful_transactions" integer DEFAULT 0,
  "dispute_rate" numeric(3,2) DEFAULT 0,
  "last_tier_update" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Proof of ownership records
CREATE TABLE IF NOT EXISTS "ownership_proofs" (
  "id" serial PRIMARY KEY NOT NULL,
  "listing_id" varchar(64) NOT NULL,
  "token_address" varchar(66) NOT NULL,
  "token_id" varchar(128) NOT NULL,
  "wallet_address" varchar(66) NOT NULL,
  "signature" text NOT NULL,
  "message" text NOT NULL,
  "timestamp" bigint NOT NULL,
  "is_valid" boolean DEFAULT false,
  "verified_at" timestamp,
  "created_at" timestamp DEFAULT now()
);

-- Brand keyword database for counterfeit detection
CREATE TABLE IF NOT EXISTS "brand_keywords" (
  "id" serial PRIMARY KEY NOT NULL,
  "brand_name" varchar(100) NOT NULL,
  "keywords" text[] NOT NULL,
  "category" varchar(50),
  "estimated_price_range" jsonb, -- Min/max price ranges
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Marketplace moderation rules and thresholds
CREATE TABLE IF NOT EXISTS "marketplace_moderation_rules" (
  "id" serial PRIMARY KEY NOT NULL,
  "rule_name" varchar(100) NOT NULL,
  "rule_type" varchar(32) NOT NULL, -- 'verification', 'counterfeit', 'scam'
  "conditions" jsonb NOT NULL,
  "action" varchar(24) NOT NULL, -- 'allow', 'review', 'block'
  "threshold" numeric(3,2) DEFAULT 0.5,
  "is_active" boolean DEFAULT true,
  "priority" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Stolen NFT database
CREATE TABLE IF NOT EXISTS "stolen_nfts" (
  "id" serial PRIMARY KEY NOT NULL,
  "token_address" varchar(66) NOT NULL,
  "token_id" varchar(128) NOT NULL,
  "reported_by" varchar(66),
  "report_reason" text,
  "evidence" jsonb,
  "status" varchar(24) DEFAULT 'reported', -- 'reported', 'verified', 'resolved'
  "verified_by" varchar(64),
  "verified_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Marketplace moderation decisions
CREATE TABLE IF NOT EXISTS "marketplace_moderation_decisions" (
  "id" serial PRIMARY KEY NOT NULL,
  "listing_id" varchar(64) NOT NULL,
  "decision" varchar(24) NOT NULL, -- 'allow', 'review', 'block'
  "confidence" numeric(3,2) NOT NULL DEFAULT 0,
  "primary_category" varchar(48),
  "reasoning" text,
  "vendor_results" jsonb,
  "moderator_id" varchar(64),
  "is_automated" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);

-- Marketplace appeals
CREATE TABLE IF NOT EXISTS "marketplace_appeals" (
  "id" serial PRIMARY KEY NOT NULL,
  "listing_id" varchar(64) NOT NULL,
  "decision_id" integer REFERENCES "marketplace_moderation_decisions"("id"),
  "appellant_address" varchar(66) NOT NULL,
  "appeal_reason" text NOT NULL,
  "evidence" jsonb,
  "status" varchar(24) DEFAULT 'open', -- 'open', 'under_review', 'approved', 'denied'
  "reviewed_by" varchar(64),
  "review_notes" text,
  "created_at" timestamp DEFAULT now(),
  "resolved_at" timestamp
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "marketplace_verifications_listing_idx" ON "marketplace_verifications" ("listing_id");
CREATE INDEX IF NOT EXISTS "marketplace_verifications_tier_idx" ON "marketplace_verifications" ("seller_tier");
CREATE INDEX IF NOT EXISTS "marketplace_verifications_risk_idx" ON "marketplace_verifications" ("risk_score");

CREATE INDEX IF NOT EXISTS "counterfeit_detections_listing_idx" ON "counterfeit_detections" ("listing_id");
CREATE INDEX IF NOT EXISTS "counterfeit_detections_confidence_idx" ON "counterfeit_detections" ("confidence_score");
CREATE INDEX IF NOT EXISTS "counterfeit_detections_brands_idx" ON "counterfeit_detections" USING GIN ("brand_keywords");

CREATE INDEX IF NOT EXISTS "scam_patterns_listing_idx" ON "scam_patterns" ("listing_id");
CREATE INDEX IF NOT EXISTS "scam_patterns_type_idx" ON "scam_patterns" ("pattern_type");
CREATE INDEX IF NOT EXISTS "scam_patterns_confidence_idx" ON "scam_patterns" ("confidence");

CREATE INDEX IF NOT EXISTS "seller_verifications_wallet_idx" ON "seller_verifications" ("wallet_address");
CREATE INDEX IF NOT EXISTS "seller_verifications_tier_idx" ON "seller_verifications" ("current_tier");
CREATE INDEX IF NOT EXISTS "seller_verifications_kyc_idx" ON "seller_verifications" ("kyc_verified");

CREATE INDEX IF NOT EXISTS "ownership_proofs_listing_idx" ON "ownership_proofs" ("listing_id");
CREATE INDEX IF NOT EXISTS "ownership_proofs_token_idx" ON "ownership_proofs" ("token_address", "token_id");
CREATE INDEX IF NOT EXISTS "ownership_proofs_wallet_idx" ON "ownership_proofs" ("wallet_address");

CREATE INDEX IF NOT EXISTS "brand_keywords_name_idx" ON "brand_keywords" ("brand_name");
CREATE INDEX IF NOT EXISTS "brand_keywords_active_idx" ON "brand_keywords" ("is_active");

CREATE INDEX IF NOT EXISTS "stolen_nfts_token_idx" ON "stolen_nfts" ("token_address", "token_id");
CREATE INDEX IF NOT EXISTS "stolen_nfts_status_idx" ON "stolen_nfts" ("status");

CREATE INDEX IF NOT EXISTS "marketplace_decisions_listing_idx" ON "marketplace_moderation_decisions" ("listing_id");
CREATE INDEX IF NOT EXISTS "marketplace_decisions_decision_idx" ON "marketplace_moderation_decisions" ("decision");
CREATE INDEX IF NOT EXISTS "marketplace_decisions_confidence_idx" ON "marketplace_moderation_decisions" ("confidence");

CREATE INDEX IF NOT EXISTS "marketplace_appeals_listing_idx" ON "marketplace_appeals" ("listing_id");
CREATE INDEX IF NOT EXISTS "marketplace_appeals_status_idx" ON "marketplace_appeals" ("status");
CREATE INDEX IF NOT EXISTS "marketplace_appeals_appellant_idx" ON "marketplace_appeals" ("appellant_address");

-- Insert default brand keywords for counterfeit detection
INSERT INTO "brand_keywords" ("brand_name", "keywords", "category", "estimated_price_range") VALUES
('Nike', ARRAY['nike', 'air jordan', 'swoosh', 'just do it'], 'footwear', '{"min": 50, "max": 500}'),
('Adidas', ARRAY['adidas', 'three stripes', 'yeezy', 'boost'], 'footwear', '{"min": 40, "max": 400}'),
('Gucci', ARRAY['gucci', 'gg', 'bamboo', 'horsebit'], 'luxury', '{"min": 300, "max": 5000}'),
('Louis Vuitton', ARRAY['louis vuitton', 'lv', 'monogram', 'damier'], 'luxury', '{"min": 500, "max": 10000}'),
('Rolex', ARRAY['rolex', 'submariner', 'datejust', 'daytona'], 'watches', '{"min": 2000, "max": 50000}'),
('Supreme', ARRAY['supreme', 'box logo', 'bogo'], 'streetwear', '{"min": 100, "max": 1000}'),
('Off-White', ARRAY['off-white', 'off white', 'virgil abloh', 'zip tie'], 'streetwear', '{"min": 200, "max": 2000}'),
('Chanel', ARRAY['chanel', 'cc', 'quilted', 'camellia'], 'luxury', '{"min": 1000, "max": 15000}'),
('Hermès', ARRAY['hermes', 'birkin', 'kelly', 'h logo'], 'luxury', '{"min": 2000, "max": 100000}'),
('Apple', ARRAY['apple', 'iphone', 'ipad', 'macbook', 'airpods'], 'electronics', '{"min": 100, "max": 3000}');

-- Insert default marketplace moderation rules
INSERT INTO "marketplace_moderation_rules" ("rule_name", "rule_type", "conditions", "action", "threshold") VALUES
('High Value NFT Verification', 'verification', '{"min_value": 1000, "requires_proof": true}', 'review', 0.7),
('Counterfeit Brand Detection', 'counterfeit', '{"suspicious_terms_threshold": 2, "price_deviation_threshold": 0.7}', 'block', 0.6),
('Phishing Pattern Detection', 'scam', '{"pattern_types": ["phishing"], "min_indicators": 2}', 'block', 0.8),
('Unverified Seller High Value', 'verification', '{"seller_tier": "unverified", "min_value": 500}', 'review', 0.5),
('Stolen NFT Check', 'scam', '{"check_stolen_db": true}', 'block', 0.5);