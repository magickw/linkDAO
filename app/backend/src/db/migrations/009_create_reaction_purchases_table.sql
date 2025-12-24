-- Migration: Create reaction purchases table for simplified reaction system
-- This replaces the complex staking system with simple fixed-price purchases

CREATE TABLE IF NOT EXISTS reaction_purchases (
  id SERIAL PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE, -- Reference to post UUID
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_address VARCHAR(66) NOT NULL,
  reaction_type VARCHAR(32) NOT NULL, -- 'hot', 'diamond', 'bullish', 'love', 'laugh', 'wow'
  price NUMERIC(20, 8) NOT NULL, -- Price paid in LDAO tokens
  author_earnings NUMERIC(20, 8) NOT NULL, -- 70% to post author
  treasury_fee NUMERIC(20, 8) NOT NULL, -- 30% to treasury
  post_author VARCHAR(66) NOT NULL, -- Post author's wallet address
  tx_hash VARCHAR(66), -- Blockchain transaction hash
  purchased_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reaction_purchases_post_id ON reaction_purchases(post_id);
CREATE INDEX IF NOT EXISTS idx_reaction_purchases_user_id ON reaction_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_reaction_purchases_user_address ON reaction_purchases(user_address);
CREATE INDEX IF NOT EXISTS idx_reaction_purchases_post_author ON reaction_purchases(post_author);
CREATE INDEX IF NOT EXISTS idx_reaction_purchases_reaction_type ON reaction_purchases(reaction_type);
CREATE INDEX IF NOT EXISTS idx_reaction_purchases_purchased_at ON reaction_purchases(purchased_at);
CREATE INDEX IF NOT EXISTS idx_reaction_purchases_tx_hash ON reaction_purchases(tx_hash);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reaction_purchases_post_type ON reaction_purchases(post_id, reaction_type);
CREATE INDEX IF NOT EXISTS idx_reaction_purchases_user_post ON reaction_purchases(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_reaction_purchases_author_earnings ON reaction_purchases(post_author, purchased_at);

-- Add comment for documentation
COMMENT ON TABLE reaction_purchases IS 'Stores reaction purchases with 70/30 revenue split between post authors and treasury';
COMMENT ON COLUMN reaction_purchases.price IS 'Fixed price paid for reaction in LDAO tokens';
COMMENT ON COLUMN reaction_purchases.author_earnings IS '70% of price goes to post author';
COMMENT ON COLUMN reaction_purchases.treasury_fee IS '30% of price goes to treasury';