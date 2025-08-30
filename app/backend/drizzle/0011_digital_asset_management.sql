-- Digital Asset Management System
-- Extends NFT functionality with DRM, licensing, and copyright protection

-- Digital Assets table for managing downloadable/streamable content
CREATE TABLE digital_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nft_id UUID REFERENCES nfts(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    asset_type VARCHAR(32) NOT NULL, -- 'image', 'video', 'audio', 'document', 'software', 'ebook', etc.
    file_size BIGINT NOT NULL, -- in bytes
    file_format VARCHAR(32) NOT NULL, -- 'mp4', 'jpg', 'pdf', etc.
    content_hash VARCHAR(128) NOT NULL UNIQUE, -- SHA-256 hash for integrity
    encrypted_content_hash VARCHAR(128) NOT NULL, -- Hash of encrypted content
    encryption_key_hash VARCHAR(128) NOT NULL, -- Hash of encryption key (stored separately)
    preview_hash VARCHAR(128), -- IPFS hash for preview/thumbnail
    metadata_hash VARCHAR(128) NOT NULL, -- IPFS hash for metadata
    drm_enabled BOOLEAN DEFAULT true,
    license_type VARCHAR(32) NOT NULL DEFAULT 'standard', -- 'standard', 'commercial', 'creative_commons', 'custom'
    license_terms TEXT, -- Custom license terms
    copyright_notice TEXT,
    usage_restrictions TEXT, -- JSON object with usage restrictions
    download_limit INTEGER DEFAULT -1, -- -1 for unlimited
    streaming_enabled BOOLEAN DEFAULT false,
    watermark_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Digital Asset Licenses table for managing different license types
CREATE TABLE digital_asset_licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES digital_assets(id) ON DELETE CASCADE,
    license_name VARCHAR(100) NOT NULL,
    license_type VARCHAR(32) NOT NULL, -- 'personal', 'commercial', 'extended', 'exclusive'
    price VARCHAR(128) NOT NULL, -- in wei
    currency VARCHAR(66) NOT NULL, -- 'ETH' or token contract address
    usage_rights TEXT NOT NULL, -- JSON object describing allowed uses
    restrictions TEXT, -- JSON object describing restrictions
    duration_days INTEGER, -- NULL for perpetual license
    max_downloads INTEGER DEFAULT -1, -- -1 for unlimited
    max_users INTEGER DEFAULT 1, -- for multi-user licenses
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Digital Asset Purchases table for tracking license purchases
CREATE TABLE digital_asset_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES digital_assets(id),
    license_id UUID NOT NULL REFERENCES digital_asset_licenses(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    transaction_hash VARCHAR(66) NOT NULL,
    price_paid VARCHAR(128) NOT NULL,
    currency VARCHAR(66) NOT NULL,
    license_key VARCHAR(128) NOT NULL UNIQUE, -- Unique key for accessing content
    expires_at TIMESTAMP, -- NULL for perpetual licenses
    downloads_remaining INTEGER DEFAULT -1, -- -1 for unlimited
    is_active BOOLEAN DEFAULT true,
    purchased_at TIMESTAMP DEFAULT NOW()
);

-- Digital Asset Access Logs for tracking usage and analytics
CREATE TABLE digital_asset_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES digital_asset_purchases(id),
    asset_id UUID NOT NULL REFERENCES digital_assets(id),
    user_id UUID NOT NULL REFERENCES users(id),
    access_type VARCHAR(32) NOT NULL, -- 'download', 'stream', 'preview'
    ip_address INET,
    user_agent TEXT,
    file_size_accessed BIGINT, -- for partial downloads/streams
    duration_seconds INTEGER, -- for streaming
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    accessed_at TIMESTAMP DEFAULT NOW()
);

-- DMCA Takedown Requests table for copyright protection
CREATE TABLE dmca_takedown_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES digital_assets(id),
    reporter_id UUID REFERENCES users(id), -- NULL for external reporters
    reporter_name VARCHAR(255) NOT NULL,
    reporter_email VARCHAR(255) NOT NULL,
    reporter_organization VARCHAR(255),
    copyright_holder_name VARCHAR(255) NOT NULL,
    original_work_description TEXT NOT NULL,
    infringement_description TEXT NOT NULL,
    evidence_urls TEXT[], -- Array of evidence URLs
    evidence_ipfs_hashes TEXT[], -- Array of IPFS hashes for evidence
    sworn_statement TEXT NOT NULL,
    contact_information TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'pending', -- 'pending', 'under_review', 'approved', 'rejected', 'resolved'
    admin_notes TEXT,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Digital Asset Reports table for community reporting
CREATE TABLE digital_asset_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES digital_assets(id),
    reporter_id UUID NOT NULL REFERENCES users(id),
    report_type VARCHAR(32) NOT NULL, -- 'copyright', 'inappropriate', 'malware', 'spam', 'other'
    description TEXT NOT NULL,
    evidence_ipfs_hash VARCHAR(128),
    status VARCHAR(32) DEFAULT 'pending', -- 'pending', 'under_review', 'resolved', 'dismissed'
    moderator_id UUID REFERENCES users(id),
    moderator_notes TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Digital Asset Analytics table for aggregated statistics
CREATE TABLE digital_asset_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES digital_assets(id),
    date DATE NOT NULL,
    total_downloads INTEGER DEFAULT 0,
    total_streams INTEGER DEFAULT 0,
    total_previews INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    total_revenue VARCHAR(128) DEFAULT '0', -- in wei
    currency VARCHAR(66) DEFAULT 'ETH',
    bandwidth_used BIGINT DEFAULT 0, -- in bytes
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(asset_id, date)
);

-- Content Delivery Network (CDN) Logs for performance tracking
CREATE TABLE cdn_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES digital_assets(id),
    user_id UUID REFERENCES users(id),
    cdn_node VARCHAR(100) NOT NULL, -- CDN node identifier
    request_type VARCHAR(32) NOT NULL, -- 'download', 'stream', 'preview'
    response_time_ms INTEGER NOT NULL,
    bytes_transferred BIGINT NOT NULL,
    cache_hit BOOLEAN DEFAULT false,
    ip_address INET,
    country_code VARCHAR(2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Digital Rights Management (DRM) Keys table
CREATE TABLE drm_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES digital_assets(id),
    purchase_id UUID NOT NULL REFERENCES digital_asset_purchases(id),
    key_type VARCHAR(32) NOT NULL, -- 'encryption', 'watermark', 'access'
    key_data TEXT NOT NULL, -- Encrypted key data
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Watermark Templates table for content protection
CREATE TABLE watermark_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    template_type VARCHAR(32) NOT NULL, -- 'text', 'image', 'video_overlay'
    template_data TEXT NOT NULL, -- JSON configuration
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Content Verification table for authenticity checks
CREATE TABLE content_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES digital_assets(id),
    verification_type VARCHAR(32) NOT NULL, -- 'hash_check', 'signature_verify', 'ai_detection'
    verification_data TEXT NOT NULL, -- JSON with verification details
    status VARCHAR(32) NOT NULL, -- 'verified', 'failed', 'pending'
    verified_at TIMESTAMP DEFAULT NOW(),
    verified_by UUID REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_digital_assets_creator_id ON digital_assets(creator_id);
CREATE INDEX idx_digital_assets_asset_type ON digital_assets(asset_type);
CREATE INDEX idx_digital_assets_created_at ON digital_assets(created_at);
CREATE INDEX idx_digital_asset_purchases_buyer_id ON digital_asset_purchases(buyer_id);
CREATE INDEX idx_digital_asset_purchases_asset_id ON digital_asset_purchases(asset_id);
CREATE INDEX idx_digital_asset_access_logs_user_id ON digital_asset_access_logs(user_id);
CREATE INDEX idx_digital_asset_access_logs_accessed_at ON digital_asset_access_logs(accessed_at);
CREATE INDEX idx_dmca_takedown_requests_status ON dmca_takedown_requests(status);
CREATE INDEX idx_digital_asset_analytics_date ON digital_asset_analytics(date);
CREATE INDEX idx_cdn_access_logs_created_at ON cdn_access_logs(created_at);