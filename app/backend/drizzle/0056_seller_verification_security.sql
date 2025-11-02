-- Seller Verification System with Enhanced Security
-- Stores verification data separately with restricted access
-- Only exposes verification status, not raw documents

-- Create seller verifications table
CREATE TABLE IF NOT EXISTS seller_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,

  -- Verification Status
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'under_review', 'verified', 'rejected', 'expired')),
  verification_tier VARCHAR(20) CHECK (verification_tier IN ('basic', 'business', 'enterprise')),

  -- Business Information (verified data only, no raw documents)
  verified_business_name VARCHAR(255),
  verified_business_type VARCHAR(100),
  verified_ein_hash VARCHAR(64), -- Store hash of EIN, not actual EIN for security
  verified_country VARCHAR(3), -- ISO 3166-1 alpha-3 country code
  verified_state VARCHAR(100),
  verified_city VARCHAR(100),

  -- Verification Provider Information
  verification_provider VARCHAR(50) NOT NULL, -- e.g., 'trulioo', 'irs_api', 'opencorporates'
  verification_reference_id VARCHAR(255), -- External provider's reference ID
  verification_score INTEGER, -- Confidence score from provider (0-100)

  -- Timestamps
  submission_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  verification_date TIMESTAMP WITH TIME ZONE,
  expiry_date TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Verification Method
  verification_method VARCHAR(50), -- e.g., 'api', 'manual_review', 'document_upload'

  -- Additional Security
  verification_attempts INTEGER DEFAULT 0,
  max_verification_attempts INTEGER DEFAULT 3,
  locked_until TIMESTAMP WITH TIME ZONE,

  -- Metadata (stored as JSONB for flexibility without exposing sensitive data)
  metadata JSONB DEFAULT '{}',

  -- Audit Trail
  verified_by VARCHAR(42), -- Wallet address of admin who verified (if manual)
  rejection_reason TEXT,

  -- Indexes
  CONSTRAINT unique_seller_verification UNIQUE(seller_wallet_address),
  CONSTRAINT check_verification_date CHECK (
    verification_status = 'verified' AND verification_date IS NOT NULL
    OR verification_status != 'verified'
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_seller_verifications_wallet ON seller_verifications(seller_wallet_address);
CREATE INDEX IF NOT EXISTS idx_seller_verifications_status ON seller_verifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_seller_verifications_expiry ON seller_verifications(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seller_verifications_tier ON seller_verifications(verification_tier);

-- Create verification attempts log table
CREATE TABLE IF NOT EXISTS seller_verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  attempt_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  verification_provider VARCHAR(50) NOT NULL,
  attempt_status VARCHAR(20) NOT NULL CHECK (attempt_status IN ('success', 'failed', 'error', 'pending')),
  error_code VARCHAR(50),
  error_message TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Index for verification attempts
CREATE INDEX IF NOT EXISTS idx_verification_attempts_wallet ON seller_verification_attempts(seller_wallet_address);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_date ON seller_verification_attempts(attempt_date DESC);

-- Create verification documents table (for secure document storage references only)
CREATE TABLE IF NOT EXISTS seller_verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES seller_verifications(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL, -- e.g., 'business_license', 'tax_id', 'incorporation_cert'
  document_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of document for integrity verification
  storage_reference VARCHAR(500), -- Reference to secure storage (e.g., encrypted S3 key)
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  document_status VARCHAR(20) DEFAULT 'pending' CHECK (document_status IN ('pending', 'verified', 'rejected')),
  encryption_key_id VARCHAR(100), -- Reference to encryption key (never store actual key here)

  -- Security: Never store actual document content in database
  -- Documents should be stored in encrypted cloud storage
  CONSTRAINT no_document_content CHECK (storage_reference IS NOT NULL)
);

-- Index for documents
CREATE INDEX IF NOT EXISTS idx_verification_documents_verification ON seller_verification_documents(verification_id);
CREATE INDEX IF NOT EXISTS idx_verification_documents_status ON seller_verification_documents(document_status);

-- Create view for public verification status (only expose safe data)
CREATE OR REPLACE VIEW seller_verification_public AS
SELECT
  sv.seller_wallet_address,
  sv.verification_status,
  sv.verification_tier,
  sv.verified_business_name,
  sv.verified_business_type,
  sv.verified_country,
  sv.verification_date,
  sv.expiry_date,
  -- Verification score tier (not exact score)
  CASE
    WHEN sv.verification_score >= 90 THEN 'high'
    WHEN sv.verification_score >= 70 THEN 'medium'
    WHEN sv.verification_score >= 50 THEN 'low'
    ELSE 'very_low'
  END AS trust_level,
  -- Is verification current?
  CASE
    WHEN sv.verification_status = 'verified'
      AND (sv.expiry_date IS NULL OR sv.expiry_date > NOW())
    THEN true
    ELSE false
  END AS is_verified_current
FROM seller_verifications sv
WHERE sv.verification_status IN ('verified', 'expired');

-- Grant permissions (adjust based on your role structure)
-- Read-only role can only access the public view
-- GRANT SELECT ON seller_verification_public TO readonly_api;

-- Create function to automatically expire verifications
CREATE OR REPLACE FUNCTION expire_old_verifications()
RETURNS void AS $$
BEGIN
  UPDATE seller_verifications
  SET verification_status = 'expired'
  WHERE verification_status = 'verified'
    AND expiry_date IS NOT NULL
    AND expiry_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_seller_verification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER seller_verification_update_timestamp
  BEFORE UPDATE ON seller_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_verification_timestamp();

-- Add comments for documentation
COMMENT ON TABLE seller_verifications IS 'Stores seller verification data with security best practices. EINs are hashed, documents are stored externally with encryption.';
COMMENT ON COLUMN seller_verifications.verified_ein_hash IS 'SHA-256 hash of EIN for verification matching without storing actual EIN';
COMMENT ON TABLE seller_verification_documents IS 'References to encrypted documents in secure storage. Never stores actual document content.';
COMMENT ON VIEW seller_verification_public IS 'Public view of seller verification status without exposing sensitive verification details';
