-- Create a test category if it doesn't exist
INSERT INTO categories (id, name, slug, description, path, is_active, sort_order)
VALUES (
  'cat-electronics-001',
  'Electronics',
  'electronics',
  'Electronic devices and gadgets',
  '["Electronics"]',
  true,
  0
)
ON CONFLICT (slug) DO NOTHING;

-- Create a test user
INSERT INTO users (id, wallet_address)
VALUES (
  'user-test-001',
  '0x1234567890123456789012345678901234567890'
)
ON CONFLICT (wallet_address) DO NOTHING;

-- Create a seller profile
INSERT INTO sellers (wallet_address, display_name, store_name, bio, is_online, tier)
VALUES (
  '0x1234567890123456789012345678901234567890',
  'Test Seller',
  'Test Store',
  'This is a test seller',
  true,
  'standard'
)
ON CONFLICT (wallet_address) DO NOTHING;

-- Create a test product
INSERT INTO products (
  id, seller_id, title, description, price_amount, price_currency, 
  category_id, images, metadata, inventory, status, tags
)
VALUES (
  'prod-test-001',
  'user-test-001',
  'Test Product',
  'This is a test product for marketplace testing',
  '99.99',
  'USD',
  'cat-electronics-001',
  '["https://placehold.co/600x400"]',
  '{"condition": "new", "brand": "TestBrand", "model": "TestModel"}',
  10,
  'active',
  '["test", "electronics"]'
)
ON CONFLICT (id) DO NOTHING;