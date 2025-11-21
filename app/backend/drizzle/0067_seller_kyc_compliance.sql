-- Migration: Add KYC Compliance fields to sellers table
-- This migration adds required business information fields for regulatory compliance

-- Add KYC compliance columns to sellers table
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS legal_business_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS business_type VARCHAR(50) DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS registered_address_street VARCHAR(500),
ADD COLUMN IF NOT EXISTS registered_address_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS registered_address_state VARCHAR(100),
ADD COLUMN IF NOT EXISTS registered_address_postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS registered_address_country VARCHAR(100),
ADD COLUMN IF NOT EXISTS tax_id_encrypted TEXT,
ADD COLUMN IF NOT EXISTS tax_id_type VARCHAR(20) DEFAULT 'ssn',
ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(30) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT;

-- Create index for KYC status queries
CREATE INDEX IF NOT EXISTS idx_sellers_kyc_status ON sellers(kyc_status);

-- Create index for business type filtering
CREATE INDEX IF NOT EXISTS idx_sellers_business_type ON sellers(business_type);

-- Add comments for documentation
COMMENT ON COLUMN sellers.legal_business_name IS 'Legal name of the business or individual for KYC compliance';
COMMENT ON COLUMN sellers.business_type IS 'Type of business: individual, llc, corporation, partnership, nonprofit, other';
COMMENT ON COLUMN sellers.registered_address_street IS 'Street address of registered business location';
COMMENT ON COLUMN sellers.registered_address_city IS 'City of registered business location';
COMMENT ON COLUMN sellers.registered_address_state IS 'State/Province of registered business location';
COMMENT ON COLUMN sellers.registered_address_postal_code IS 'Postal/ZIP code of registered business location';
COMMENT ON COLUMN sellers.registered_address_country IS 'Country of registered business location';
COMMENT ON COLUMN sellers.tax_id_encrypted IS 'Encrypted tax identification number (SSN, EIN, VAT, etc.)';
COMMENT ON COLUMN sellers.tax_id_type IS 'Type of tax ID: ssn, ein, itin, vat, gst, other';
COMMENT ON COLUMN sellers.kyc_status IS 'KYC verification status: pending, submitted, under_review, verified, rejected';
COMMENT ON COLUMN sellers.kyc_submitted_at IS 'Timestamp when KYC information was submitted';
COMMENT ON COLUMN sellers.kyc_verified_at IS 'Timestamp when KYC was verified';
COMMENT ON COLUMN sellers.kyc_rejection_reason IS 'Reason for KYC rejection if applicable';

-- Add constraint for valid business types
ALTER TABLE sellers
ADD CONSTRAINT chk_sellers_business_type
CHECK (business_type IN ('individual', 'llc', 'corporation', 'partnership', 'nonprofit', 'other'));

-- Add constraint for valid tax ID types
ALTER TABLE sellers
ADD CONSTRAINT chk_sellers_tax_id_type
CHECK (tax_id_type IN ('ssn', 'ein', 'itin', 'vat', 'gst', 'other'));

-- Add constraint for valid KYC status
ALTER TABLE sellers
ADD CONSTRAINT chk_sellers_kyc_status
CHECK (kyc_status IN ('pending', 'submitted', 'under_review', 'verified', 'rejected'));
