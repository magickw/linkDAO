-- Link Safety and URL Analysis System Migration
-- This migration adds tables for link safety, URL analysis, and domain reputation tracking

-- URL Analysis Results Table
CREATE TABLE IF NOT EXISTS "url_analysis_results" (
  "id" SERIAL PRIMARY KEY,
  "url" TEXT NOT NULL,
  "url_hash" VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of normalized URL
  "domain" VARCHAR(255) NOT NULL,
  "status" VARCHAR(24) DEFAULT 'pending', -- pending, safe, suspicious, malicious, error
  "risk_score" NUMERIC(5,2) DEFAULT 0.00, -- 0-100 risk score
  "analysis_results" JSONB DEFAULT '{}', -- Vendor analysis results
  "unfurled_content" JSONB DEFAULT '{}', -- Title, description, image, etc.
  "last_analyzed" TIMESTAMP DEFAULT NOW(),
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Domain Reputation Table
CREATE TABLE IF NOT EXISTS "domain_reputation" (
  "id" SERIAL PRIMARY KEY,
  "domain" VARCHAR(255) NOT NULL UNIQUE,
  "reputation_score" NUMERIC(5,2) DEFAULT 50.00, -- 0-100 reputation score
  "category" VARCHAR(32), -- social, marketplace, defi, news, etc.
  "is_verified" BOOLEAN DEFAULT FALSE,
  "is_blacklisted" BOOLEAN DEFAULT FALSE,
  "blacklist_reason" TEXT,
  "first_seen" TIMESTAMP DEFAULT NOW(),
  "last_updated" TIMESTAMP DEFAULT NOW(),
  "analysis_count" INTEGER DEFAULT 0,
  "malicious_count" INTEGER DEFAULT 0
);

-- Custom Blacklist Table
CREATE TABLE IF NOT EXISTS "custom_blacklist" (
  "id" SERIAL PRIMARY KEY,
  "entry_type" VARCHAR(16) NOT NULL, -- domain, url, pattern
  "entry_value" TEXT NOT NULL,
  "category" VARCHAR(32) NOT NULL, -- crypto_scam, phishing, malware, etc.
  "severity" VARCHAR(16) DEFAULT 'medium', -- low, medium, high, critical
  "description" TEXT,
  "source" VARCHAR(64), -- manual, community_report, automated
  "added_by" UUID REFERENCES "users"("id"),
  "is_active" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Link Safety Vendor Results Table
CREATE TABLE IF NOT EXISTS "link_safety_vendor_results" (
  "id" SERIAL PRIMARY KEY,
  "url_analysis_id" INTEGER REFERENCES "url_analysis_results"("id"),
  "vendor_name" VARCHAR(32) NOT NULL, -- google_safe_browsing, phishfort, etc.
  "vendor_status" VARCHAR(24), -- safe, malicious, suspicious, error
  "threat_types" TEXT[], -- Array of threat types
  "confidence" NUMERIC(5,2) DEFAULT 0.00,
  "raw_response" JSONB DEFAULT '{}',
  "analysis_time_ms" INTEGER,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Content Link Associations Table
CREATE TABLE IF NOT EXISTS "content_links" (
  "id" SERIAL PRIMARY KEY,
  "content_id" VARCHAR(64) NOT NULL,
  "content_type" VARCHAR(24) NOT NULL, -- post, comment, listing, dm
  "url_analysis_id" INTEGER REFERENCES "url_analysis_results"("id"),
  "position_in_content" INTEGER, -- Position of link in content
  "link_text" TEXT, -- Anchor text or surrounding context
  "is_shortened" BOOLEAN DEFAULT FALSE,
  "original_url" TEXT, -- If shortened, store original
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Real-time Link Monitoring Table
CREATE TABLE IF NOT EXISTS "link_monitoring_alerts" (
  "id" SERIAL PRIMARY KEY,
  "url_analysis_id" INTEGER REFERENCES "url_analysis_results"("id"),
  "alert_type" VARCHAR(32) NOT NULL, -- reputation_change, new_threat, domain_compromised
  "severity" VARCHAR(16) DEFAULT 'medium',
  "description" TEXT,
  "affected_content_count" INTEGER DEFAULT 0,
  "is_resolved" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "resolved_at" TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_url_analysis_url_hash" ON "url_analysis_results"("url_hash");
CREATE INDEX IF NOT EXISTS "idx_url_analysis_domain" ON "url_analysis_results"("domain");
CREATE INDEX IF NOT EXISTS "idx_url_analysis_status" ON "url_analysis_results"("status");
CREATE INDEX IF NOT EXISTS "idx_url_analysis_last_analyzed" ON "url_analysis_results"("last_analyzed");

CREATE INDEX IF NOT EXISTS "idx_domain_reputation_domain" ON "domain_reputation"("domain");
CREATE INDEX IF NOT EXISTS "idx_domain_reputation_score" ON "domain_reputation"("reputation_score");
CREATE INDEX IF NOT EXISTS "idx_domain_reputation_blacklisted" ON "domain_reputation"("is_blacklisted");

CREATE INDEX IF NOT EXISTS "idx_custom_blacklist_type_value" ON "custom_blacklist"("entry_type", "entry_value");
CREATE INDEX IF NOT EXISTS "idx_custom_blacklist_category" ON "custom_blacklist"("category");
CREATE INDEX IF NOT EXISTS "idx_custom_blacklist_active" ON "custom_blacklist"("is_active");

CREATE INDEX IF NOT EXISTS "idx_link_safety_vendor_url_analysis" ON "link_safety_vendor_results"("url_analysis_id");
CREATE INDEX IF NOT EXISTS "idx_link_safety_vendor_name" ON "link_safety_vendor_results"("vendor_name");

CREATE INDEX IF NOT EXISTS "idx_content_links_content" ON "content_links"("content_id", "content_type");
CREATE INDEX IF NOT EXISTS "idx_content_links_url_analysis" ON "content_links"("url_analysis_id");

CREATE INDEX IF NOT EXISTS "idx_link_monitoring_alerts_type" ON "link_monitoring_alerts"("alert_type");
CREATE INDEX IF NOT EXISTS "idx_link_monitoring_alerts_resolved" ON "link_monitoring_alerts"("is_resolved");