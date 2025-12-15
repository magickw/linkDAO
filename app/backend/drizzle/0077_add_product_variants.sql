-- Migration: Add product variants system for colors, sizes, and SKU tracking

-- Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  listing_id UUID,
  sku VARCHAR(100) UNIQUE NOT NULL,
  
  -- Variant attributes
  color VARCHAR(50),
  color_hex VARCHAR(7), -- e.g., #FF5733
  size VARCHAR(50),
  
  -- Pricing
  price_adjustment DECIMAL(10, 2) DEFAULT 0, -- Additional cost for this variant (can be negative)
  
  -- Inventory
  inventory INTEGER DEFAULT 0,
  reserved_inventory INTEGER DEFAULT 0, -- Items in pending orders
  
  -- Images specific to this variant
  image_urls TEXT[], -- Array of image URLs for this variant
  primary_image_url TEXT, -- Main image for this variant
  
  -- Availability
  is_available BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Mark one variant as default
  
  -- Metadata
  weight DECIMAL(10, 2), -- Weight in grams
  dimensions JSONB, -- {length, width, height} in cm
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign keys
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_listing_id ON product_variants(listing_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_color ON product_variants(color);
CREATE INDEX IF NOT EXISTS idx_product_variants_size ON product_variants(size);
CREATE INDEX IF NOT EXISTS idx_product_variants_available ON product_variants(is_available);

-- Add variant tracking to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS variant_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS variant_sku VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS selected_color VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS selected_size VARCHAR(50);

ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS variant_id UUID;
ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS variant_sku VARCHAR(100);
ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS selected_color VARCHAR(50);
ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS selected_size VARCHAR(50);

-- Add foreign keys for variant_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_variant_fk'
  ) THEN
    ALTER TABLE orders 
    ADD CONSTRAINT orders_variant_fk 
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'marketplace_orders_variant_fk'
  ) THEN
    ALTER TABLE marketplace_orders 
    ADD CONSTRAINT marketplace_orders_variant_fk 
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add variant tracking to cart items (if cart_items table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cart_items') THEN
    ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS variant_id UUID;
    ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS variant_sku VARCHAR(100);
    ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS selected_color VARCHAR(50);
    ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS selected_size VARCHAR(50);
  END IF;
END $$;

-- Add has_variants flag to products/listings for quick filtering
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false;

-- Create trigger to update product.has_variants when variants are added/removed
CREATE OR REPLACE FUNCTION update_product_has_variants()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE products SET has_variants = true WHERE id = NEW.product_id;
    UPDATE listings SET has_variants = true WHERE id = NEW.listing_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products SET has_variants = (
      SELECT COUNT(*) > 0 FROM product_variants WHERE product_id = OLD.product_id
    ) WHERE id = OLD.product_id;
    UPDATE listings SET has_variants = (
      SELECT COUNT(*) > 0 FROM product_variants WHERE listing_id = OLD.listing_id
    ) WHERE id = OLD.listing_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_has_variants
AFTER INSERT OR DELETE ON product_variants
FOR EACH ROW
EXECUTE FUNCTION update_product_has_variants();
