-- Migration to populate user_addresses from users profile data
-- This replaces the previous 'create addresses' migration

-- Drop the addresses table immediately if it was created by the previous plan
DROP TABLE IF EXISTS addresses;

-- user_addresses table should already exist via previous migrations
-- We ensure constraints exist to match the error we saw idx_user_addresses_unique_default_billing
-- We can't easily recreate the unique index if we don't know the exact definition, 
-- but the error confirms it exists.

-- Migrate Billing Addresses
-- We use ON CONFLICT DO NOTHING to avoid the duplicate key error if data already exists
INSERT INTO user_addresses (
    user_id, address_type, label, is_default,
    first_name, last_name, company, address_line1, address_line2, city, state, postal_code, country, phone
)
SELECT 
    id, 'billing', 'Billing Address', true,
    COALESCE(billing_first_name, 'Unknown'), 
    COALESCE(billing_last_name, 'Unknown'), 
    billing_company, 
    billing_address1, 
    billing_address2, 
    billing_city, 
    billing_state, 
    billing_zip_code, 
    COALESCE(billing_country, 'US'), 
    billing_phone
FROM users
WHERE billing_address1 IS NOT NULL AND billing_address1 != ''
ON CONFLICT DO NOTHING;

-- Migrate Shipping Addresses
INSERT INTO user_addresses (
    user_id, address_type, label, is_default,
    first_name, last_name, company, address_line1, address_line2, city, state, postal_code, country, phone
)
SELECT 
    id, 'shipping', 'Shipping Address', true,
    COALESCE(shipping_first_name, 'Unknown'), 
    COALESCE(shipping_last_name, 'Unknown'), 
    shipping_company, 
    shipping_address1, 
    shipping_address2, 
    shipping_city, 
    shipping_state, 
    shipping_zip_code, 
    COALESCE(shipping_country, 'US'), 
    shipping_phone
FROM users
WHERE shipping_address1 IS NOT NULL AND shipping_address1 != ''
ON CONFLICT DO NOTHING;
