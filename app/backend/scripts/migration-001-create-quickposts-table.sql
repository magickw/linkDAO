-- Create quickPosts table for home/feed posts
-- These are short-form posts that don't require title or community

CREATE TABLE IF NOT EXISTS quick_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_cid TEXT NOT NULL,
  parent_id UUID REFERENCES quick_posts(id) ON DELETE CASCADE, -- For replies
  media_cids TEXT, -- JSON array of media IPFS CIDs
  tags TEXT, -- JSON array of tags
  staked_value NUMERIC DEFAULT '0', -- Total tokens staked on this post
  reputation_score INTEGER DEFAULT 0, -- Author's reputation score at time of posting
  is_token_gated BOOLEAN DEFAULT false, -- Whether this post is token gated
  gated_content_preview TEXT, -- Preview content for gated posts
  moderation_status VARCHAR(24) DEFAULT 'active', -- 'active' | 'limited' | 'pending_review' | 'blocked'
  moderation_warning TEXT,
  risk_score NUMERIC(5, 4) DEFAULT '0',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quick_posts_author_id ON quick_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_quick_posts_created_at ON quick_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_quick_posts_moderation_status ON quick_posts(moderation_status);

-- Tags table for quick posts
CREATE TABLE IF NOT EXISTS quick_post_tags (
  id SERIAL PRIMARY KEY,
  quick_post_id UUID NOT NULL REFERENCES quick_posts(id) ON DELETE CASCADE,
  tag VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quick_post_tag ON quick_post_tag(quick_post_id, tag);

-- Reactions for quick posts
CREATE TABLE IF NOT EXISTS quick_post_reactions (
  id SERIAL PRIMARY KEY,
  quick_post_id UUID NOT NULL REFERENCES quick_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(32) NOT NULL, -- 'hot', 'diamond', 'bullish', 'governance', 'art'
  amount NUMERIC NOT NULL, -- Amount of tokens staked
  rewards_earned NUMERIC DEFAULT '0', -- Rewards earned by the post author
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quick_post_reaction_user ON quick_post_reactions(quick_post_id, user_id);

-- Tips for quick posts
CREATE TABLE IF NOT EXISTS quick_post_tips (
  id SERIAL PRIMARY KEY,
  quick_post_id UUID NOT NULL REFERENCES quick_posts(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL, -- e.g. USDC, LNK
  amount NUMERIC NOT NULL,
  message TEXT, -- Optional message with the tip
  tx_hash VARCHAR(66), -- Blockchain transaction hash
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quick_post_tip ON quick_post_tips(quick_post_id);

-- Views tracking for quick posts
CREATE TABLE IF NOT EXISTS quick_post_views (
  id SERIAL PRIMARY KEY,
  quick_post_id UUID NOT NULL REFERENCES quick_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Nullable for anonymous views
  ip_address VARCHAR(45), -- IPv4 or IPv6
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quick_post_view_post_user ON quick_post_views(quick_post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_quick_post_view_created_at ON quick_post_views(created_at);

-- Bookmarks for quick posts
CREATE TABLE IF NOT EXISTS quick_post_bookmarks (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quick_post_id UUID NOT NULL REFERENCES quick_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, quick_post_id)
);

CREATE INDEX IF NOT EXISTS idx_quick_post_bookmark_user ON quick_post_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_post_bookmark_post ON quick_post_bookmarks(quick_post_id);

-- Shares for quick posts
CREATE TABLE IF NOT EXISTS quick_post_shares (
  id SERIAL PRIMARY KEY,
  quick_post_id UUID NOT NULL REFERENCES quick_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(32) NOT NULL, -- 'community', 'dm', 'external'
  target_id UUID, -- Community ID or User ID for DMs
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quick_post_share_post_user ON quick_post_shares(quick_post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_quick_post_share_created_at ON quick_post_shares(created_at);