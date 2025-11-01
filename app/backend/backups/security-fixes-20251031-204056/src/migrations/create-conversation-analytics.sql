-- Create conversation_analytics table
-- This is the only missing table from the messaging system
-- Run this SQL to complete the messaging tables setup

CREATE TABLE IF NOT EXISTS conversation_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid UNIQUE,
  seller_id uuid,
  buyer_id uuid,
  total_messages integer DEFAULT 0,
  seller_message_count integer DEFAULT 0,
  buyer_message_count integer DEFAULT 0,
  seller_avg_response_time interval,
  buyer_avg_response_time interval,
  first_response_time interval,
  last_activity_at timestamptz,
  converted_to_sale boolean DEFAULT false,
  sale_order_id integer,
  sale_amount numeric(20, 8),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
DO $$ BEGIN
  ALTER TABLE conversation_analytics
    ADD CONSTRAINT conversation_analytics_conversation_id_fk
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE conversation_analytics
    ADD CONSTRAINT conversation_analytics_seller_id_fk
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE conversation_analytics
    ADD CONSTRAINT conversation_analytics_buyer_id_fk
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='id') THEN
    ALTER TABLE conversation_analytics
      ADD CONSTRAINT conversation_analytics_sale_order_id_fk
      FOREIGN KEY (sale_order_id) REFERENCES orders(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_conv_analytics_conversation ON conversation_analytics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_analytics_seller ON conversation_analytics(seller_id);
CREATE INDEX IF NOT EXISTS idx_conv_analytics_buyer ON conversation_analytics(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conv_analytics_converted ON conversation_analytics(converted_to_sale);
CREATE INDEX IF NOT EXISTS idx_conv_analytics_seller_response_time ON conversation_analytics(seller_avg_response_time);

-- Add comments
COMMENT ON TABLE conversation_analytics IS 'Pre-aggregated conversation statistics for seller analytics';
COMMENT ON COLUMN conversation_analytics.seller_avg_response_time IS 'Average time for seller to respond to buyer messages';
COMMENT ON COLUMN conversation_analytics.buyer_avg_response_time IS 'Average time for buyer to respond to seller messages';
COMMENT ON COLUMN conversation_analytics.converted_to_sale IS 'Whether this conversation led to a sale';
COMMENT ON COLUMN conversation_analytics.sale_amount IS 'Total sale amount if converted';

-- Verification
SELECT 'conversation_analytics table created successfully!' AS status;
