-- Performance Optimization Indexes Migration
-- This migration adds indexes for frequently queried fields to improve API performance

-- Seller profile indexes
DO $$ BEGIN 
  CREATE INDEX IF NOT EXISTS idx_sellers_wallet_address_btree ON sellers USING btree(wallet_address);
EXCEPTION WHEN others THEN RAISE NOTICE 'Skipping idx_sellers_wallet_address_btree'; END $$;

DO $$ BEGIN 
  CREATE INDEX IF NOT EXISTS idx_sellers_created_at_desc ON sellers(created_at DESC);
EXCEPTION WHEN others THEN RAISE NOTICE 'Skipping idx_sellers_created_at_desc'; END $$;

DO $$ BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sellers' AND column_name='onboarding_completed') THEN
    CREATE INDEX IF NOT EXISTS idx_sellers_onboarding_completed ON sellers(onboarding_completed) WHERE onboarding_completed = true;
  END IF;
END $$;

DO $$ BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sellers' AND column_name='ens_handle') THEN
    CREATE INDEX IF NOT EXISTS idx_sellers_ens_handle ON sellers(ens_handle) WHERE ens_handle IS NOT NULL;
  END IF;
END $$;

-- Marketplace listings indexes
DO $$ BEGIN 
  CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller_active_date ON marketplace_listings(seller_address, is_active, created_at DESC);
EXCEPTION WHEN others THEN RAISE NOTICE 'Skipping idx_marketplace_listings_seller_active_date'; END $$;

DO $$ BEGIN 
  CREATE INDEX IF NOT EXISTS idx_marketplace_listings_active_only ON marketplace_listings(created_at DESC, price) WHERE is_active = true;
EXCEPTION WHEN others THEN RAISE NOTICE 'Skipping idx_marketplace_listings_active_only'; END $$;

-- Auth sessions indexes
DO $$ BEGIN 
  CREATE INDEX IF NOT EXISTS idx_auth_sessions_wallet_address ON auth_sessions(wallet_address);
EXCEPTION WHEN others THEN RAISE NOTICE 'Skipping idx_auth_sessions_wallet_address'; END $$;

DO $$ BEGIN 
  CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
EXCEPTION WHEN others THEN RAISE NOTICE 'Skipping idx_auth_sessions_expires_at'; END $$;

DO $$ BEGIN 
  CREATE INDEX IF NOT EXISTS idx_auth_sessions_session_token_hash ON auth_sessions USING hash(session_token);
EXCEPTION WHEN others THEN RAISE NOTICE 'Skipping idx_auth_sessions_session_token_hash'; END $$;

DO $$ BEGIN 
  CREATE INDEX IF NOT EXISTS idx_auth_sessions_refresh_token_hash ON auth_sessions USING hash(refresh_token);
EXCEPTION WHEN others THEN RAISE NOTICE 'Skipping idx_auth_sessions_refresh_token_hash'; END $$;

-- User reputation indexes
DO $$ BEGIN 
  CREATE INDEX IF NOT EXISTS idx_user_reputation_wallet_address ON user_reputation(wallet_address);
EXCEPTION WHEN others THEN RAISE NOTICE 'Skipping idx_user_reputation_wallet_address'; END $$;

DO $$ BEGIN 
  CREATE INDEX IF NOT EXISTS idx_user_reputation_score_desc ON user_reputation(reputation_score DESC);
EXCEPTION WHEN others THEN RAISE NOTICE 'Skipping idx_user_reputation_score_desc'; END $$;

DO $$ BEGIN 
  CREATE INDEX IF NOT EXISTS idx_user_reputation_last_calculated ON user_reputation(last_calculated DESC);
EXCEPTION WHEN others THEN RAISE NOTICE 'Skipping idx_user_reputation_last_calculated'; END $$;

-- Products table optimization
DO $$ BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='status') THEN
    CREATE INDEX IF NOT EXISTS idx_products_seller_status_created ON products(seller_id, status, created_at DESC);
  END IF;
END $$;

DO $$ BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='status') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='category_id') THEN
    CREATE INDEX IF NOT EXISTS idx_products_category_price ON products(category_id, price_amount) WHERE status = 'active';
  END IF;
END $$;

DO $$ BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='listing_status') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='published_at') THEN
    CREATE INDEX IF NOT EXISTS idx_products_listing_status_published ON products(listing_status, published_at DESC) WHERE listing_status = 'published';
  END IF;
END $$;

DO $$ BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='search_vector') THEN
    CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING gin(search_vector);
  END IF;
EXCEPTION WHEN others THEN 
  -- Fallback to standard GIN index if search_vector doesn't exist
  RAISE NOTICE 'Skipping search_vector index';
END $$;

-- Users table indexes
DO $$ BEGIN 
  CREATE INDEX IF NOT EXISTS idx_users_wallet_address_btree ON users USING btree(wallet_address);
EXCEPTION WHEN others THEN RAISE NOTICE 'Skipping idx_users_wallet_address_btree'; END $$;

DO $$ BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='handle') THEN
    CREATE INDEX IF NOT EXISTS idx_users_handle ON users(handle) WHERE handle IS NOT NULL;
  END IF;
END $$;

-- Posts table indexes
DO $$ BEGIN 
  CREATE INDEX IF NOT EXISTS idx_posts_author_created_at ON posts(author_id, created_at DESC);
EXCEPTION WHEN others THEN RAISE NOTICE 'Skipping idx_posts_author_created_at'; END $$;

-- Orders table indexes
DO $$ BEGIN 
  CREATE INDEX IF NOT EXISTS idx_orders_buyer_created_at ON orders(buyer_id, created_at DESC);
EXCEPTION WHEN others THEN RAISE NOTICE 'Skipping idx_orders_buyer_created_at'; END $$;

DO $$ BEGIN 
  CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at DESC);
EXCEPTION WHEN others THEN RAISE NOTICE 'Skipping idx_orders_status_created_at'; END $$;

-- Statistics collection
ANALYZE sellers;
ANALYZE marketplace_listings;
ANALYZE auth_sessions;
ANALYZE user_reputation;
ANALYZE products;
ANALYZE users;
ANALYZE posts;
ANALYZE orders;
