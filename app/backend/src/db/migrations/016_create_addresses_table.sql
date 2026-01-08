-- Migration to populate user_addresses from users profile data
-- This replaces the previous 'create addresses' migration

-- Drop the addresses table if it was created by the previous plan
DROP TABLE IF EXISTS addresses;

-- user_addresses table should already exist via previous migrations (see 010_add_buyer_address_to_orders.sql / schema)
-- But just in case, we ensure it exists (this matches buyerDataSchema.ts definition)
CREATE TABLE IF NOT EXISTS user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address_type VARCHAR(20) NOT NULL, -- 'shipping' | 'billing' | 'both'
    label VARCHAR(100),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(255),
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'US',
    is_default BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP,
    delivery_instructions TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);

-- Index if not exists
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);

-- Migrate Billing Addresses
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
WHERE billing_address1 IS NOT NULL AND billing_address1 != '';

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
WHERE shipping_address1 IS NOT NULL AND shipping_address1 != '';
