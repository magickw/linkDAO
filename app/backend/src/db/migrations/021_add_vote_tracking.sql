-- Create post_votes table to track individual upvotes/downvotes on posts
CREATE TABLE IF NOT EXISTS post_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id) -- Ensure one vote per user per post
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_post_votes_post_id ON post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_votes_user_id ON post_votes(user_id);

-- Create status_votes table to track individual upvotes/downvotes on statuses
CREATE TABLE IF NOT EXISTS status_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id UUID NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(status_id, user_id) -- Ensure one vote per user per status
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_status_votes_status_id ON status_votes(status_id);
CREATE INDEX IF NOT EXISTS idx_status_votes_user_id ON status_votes(user_id);

-- Update existing posts upvotes/downvotes based on post_votes table
-- First, recalculate from scratch to ensure accuracy
UPDATE posts p
SET
  upvotes = COALESCE((SELECT COUNT(*) FROM post_votes pv WHERE pv.post_id = p.id AND pv.vote_type = 'upvote'), 0),
  downvotes = COALESCE((SELECT COUNT(*) FROM post_votes pv WHERE pv.post_id = p.id AND pv.vote_type = 'downvote'), 0);

-- Update existing statuses upvotes/downvotes based on status_votes table
UPDATE statuses s
SET
  upvotes = COALESCE((SELECT COUNT(*) FROM status_votes sv WHERE sv.status_id = s.id AND sv.vote_type = 'upvote'), 0),
  downvotes = COALESCE((SELECT COUNT(*) FROM status_votes sv WHERE sv.status_id = s.id AND sv.vote_type = 'downvote'), 0);