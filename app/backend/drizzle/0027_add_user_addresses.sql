-- Migration: Add billing and shipping addresses to users table
-- Created: 2025-01-27

-- Add billing address columns to users table
ALTER TABLE users ADD COLUMN billing_first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN billing_last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN billing_company VARCHAR(200);
ALTER TABLE users ADD COLUMN billing_address1 VARCHAR(255);
ALTER TABLE users ADD COLUMN billing_address2 VARCHAR(255);
ALTER TABLE users ADD COLUMN billing_city VARCHAR(100);
ALTER TABLE users ADD COLUMN billing_state VARCHAR(100);
ALTER TABLE users ADD COLUMN billing_zip_code VARCHAR(20);
ALTER TABLE users ADD COLUMN billing_country VARCHAR(2);
ALTER TABLE users ADD COLUMN billing_phone VARCHAR(20);

-- Add shipping address columns to users table
ALTER TABLE users ADD COLUMN shipping_first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN shipping_last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN shipping_company VARCHAR(200);
ALTER TABLE users ADD COLUMN shipping_address1 VARCHAR(255);
ALTER TABLE users ADD COLUMN shipping_address2 VARCHAR(255);
ALTER TABLE users ADD COLUMN shipping_city VARCHAR(100);
ALTER TABLE users ADD COLUMN shipping_state VARCHAR(100);
ALTER TABLE users ADD COLUMN shipping_zip_code VARCHAR(20);
ALTER TABLE users ADD COLUMN shipping_country VARCHAR(2);
ALTER TABLE users ADD COLUMN shipping_phone VARCHAR(20);
ALTER TABLE users ADD COLUMN shipping_same_as_billing BOOLEAN DEFAULT true;

-- Add indexes for performance
CREATE INDEX idx_users_billing_country ON users(billing_country);
CREATE INDEX idx_users_shipping_country ON users(shipping_country);

-- Add comments for documentation
COMMENT ON COLUMN users.billing_first_name IS 'Billing address first name';
COMMENT ON COLUMN users.billing_last_name IS 'Billing address last name';
COMMENT ON COLUMN users.billing_company IS 'Billing address company (optional)';
COMMENT ON COLUMN users.billing_address1 IS 'Billing address line 1';
COMMENT ON COLUMN users.billing_address2 IS 'Billing address line 2 (optional)';
COMMENT ON COLUMN users.billing_city IS 'Billing address city';
COMMENT ON COLUMN users.billing_state IS 'Billing address state/province';
COMMENT ON COLUMN users.billing_zip_code IS 'Billing address ZIP/postal code';
COMMENT ON COLUMN users.billing_country IS 'Billing address country code (ISO 3166-1 alpha-2)';
COMMENT ON COLUMN users.billing_phone IS 'Billing address phone number';

COMMENT ON COLUMN users.shipping_first_name IS 'Shipping address first name';
COMMENT ON COLUMN users.shipping_last_name IS 'Shipping address last name';
COMMENT ON COLUMN users.shipping_company IS 'Shipping address company (optional)';
COMMENT ON COLUMN users.shipping_address1 IS 'Shipping address line 1';
COMMENT ON COLUMN users.shipping_address2 IS 'Shipping address line 2 (optional)';
COMMENT ON COLUMN users.shipping_city IS 'Shipping address city';
COMMENT ON COLUMN users.shipping_state IS 'Shipping address state/province';
COMMENT ON COLUMN users.shipping_zip_code IS 'Shipping address ZIP/postal code';
COMMENT ON COLUMN users.shipping_country IS 'Shipping address country code (ISO 3166-1 alpha-2)';
COMMENT ON COLUMN users.shipping_phone IS 'Shipping address phone number';
COMMENT ON COLUMN users.shipping_same_as_billing IS 'Whether shipping address is same as billing address';