import { sql } from 'drizzle-orm';
import { db } from '../connection';

/**
 * Migration: Create reaction_purchases table for simplified reaction system
 * This replaces the complex staking system with simple fixed-price purchases
 */
export async function up() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS reaction_purchases (
      id SERIAL PRIMARY KEY,
      post_id VARCHAR(255) NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_address VARCHAR(66) NOT NULL,
      reaction_type VARCHAR(32) NOT NULL,
      price NUMERIC(20, 8) NOT NULL,
      author_earnings NUMERIC(20, 8) NOT NULL,
      treasury_fee NUMERIC(20, 8) NOT NULL,
      post_author VARCHAR(66) NOT NULL,
      tx_hash VARCHAR(66),
      purchased_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create indexes
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_reaction_purchases_post_id ON reaction_purchases(post_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_reaction_purchases_user_id ON reaction_purchases(user_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_reaction_purchases_user_address ON reaction_purchases(user_address);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_reaction_purchases_post_author ON reaction_purchases(post_author);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_reaction_purchases_reaction_type ON reaction_purchases(reaction_type);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_reaction_purchases_purchased_at ON reaction_purchases(purchased_at);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_reaction_purchases_tx_hash ON reaction_purchases(tx_hash);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_reaction_purchases_post_type ON reaction_purchases(post_id, reaction_type);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_reaction_purchases_user_post ON reaction_purchases(user_id, post_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_reaction_purchases_author_earnings ON reaction_purchases(post_author, purchased_at);`);

  // Add comments
  await db.execute(sql`COMMENT ON TABLE reaction_purchases IS 'Stores reaction purchases with 70/30 revenue split between post authors and treasury';`);
  await db.execute(sql`COMMENT ON COLUMN reaction_purchases.price IS 'Fixed price paid for reaction in LDAO tokens';`);
  await db.execute(sql`COMMENT ON COLUMN reaction_purchases.author_earnings IS '70% of price goes to post author';`);
  await db.execute(sql`COMMENT ON COLUMN reaction_purchases.treasury_fee IS '30% of price goes to treasury';`);
}

export async function down() {
  await db.execute(sql`DROP TABLE IF EXISTS reaction_purchases;`);
}