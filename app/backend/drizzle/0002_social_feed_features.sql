-- Migration for social feed features
-- Add new columns to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_cids TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS staked_value NUMERIC DEFAULT '0';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS dao VARCHAR(64);

-- Update existing posts to have empty titles
UPDATE posts SET title = '' WHERE title IS NULL;

-- Create post_tags table
CREATE TABLE IF NOT EXISTS post_tags (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id),
    tag VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on post_tags
CREATE INDEX IF NOT EXISTS post_tag_idx ON post_tags(post_id, tag);

-- Create reactions table
CREATE TABLE IF NOT EXISTS reactions (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id),
    user_id UUID REFERENCES users(id),
    type VARCHAR(32) NOT NULL,
    amount NUMERIC NOT NULL,
    rewards_earned NUMERIC DEFAULT '0',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on reactions
CREATE INDEX IF NOT EXISTS reaction_post_user_idx ON reactions(post_id, user_id);

-- Create tips table
CREATE TABLE IF NOT EXISTS tips (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id),
    from_user_id UUID REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    token VARCHAR(64) NOT NULL,
    amount NUMERIC NOT NULL,
    message TEXT,
    tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on tips
CREATE INDEX IF NOT EXISTS tip_post_idx ON tips(post_id);