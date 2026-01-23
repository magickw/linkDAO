-- Add individual shipping address columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_name varchar(255),
ADD COLUMN IF NOT EXISTS shipping_phone varchar(50),
ADD COLUMN IF NOT EXISTS shipping_street text,
ADD COLUMN IF NOT EXISTS shipping_city varchar(100),
ADD COLUMN IF NOT EXISTS shipping_state varchar(100),
ADD COLUMN IF NOT EXISTS shipping_postal_code varchar(20),
ADD COLUMN IF NOT EXISTS shipping_country varchar(100);

-- Create index for shipping country for analytics
CREATE INDEX IF NOT EXISTS idx_orders_shipping_country ON orders(shipping_country);
