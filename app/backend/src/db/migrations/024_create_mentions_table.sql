-- Migration: 024 - Create mentions table
-- Description: Track @mentions in posts and statuses for notifications and search

CREATE TABLE IF NOT EXISTS mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What was mentioned
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  status_id UUID REFERENCES statuses(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,

  -- Who was mentioned
  mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Who created the mention
  mentioning_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Context
  content_snippet TEXT, -- The surrounding text where the mention occurred
  mention_text VARCHAR(255) NOT NULL, -- The actual @handle or @address used

  -- Status
  is_notified BOOLEAN DEFAULT FALSE, -- Whether the user has been notified
  notified_at TIMESTAMP,
  is_read BOOLEAN DEFAULT FALSE, -- Whether the user has viewed the mention
  read_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT mentions_content_check CHECK (
    (post_id IS NOT NULL)::integer +
    (status_id IS NOT NULL)::integer +
    (comment_id IS NOT NULL)::integer = 1
  ), -- Exactly one of post_id, status_id, or comment_id must be set

  CONSTRAINT mentions_users_different CHECK (mentioned_user_id != mentioning_user_id) -- Can't mention yourself
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_user_id ON mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_mentions_mentioning_user_id ON mentions(mentioning_user_id);
CREATE INDEX IF NOT EXISTS idx_mentions_post_id ON mentions(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentions_status_id ON mentions(status_id) WHERE status_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentions_comment_id ON mentions(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentions_created_at ON mentions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentions_unread ON mentions(mentioned_user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_mentions_unnotified ON mentions(mentioned_user_id, is_notified) WHERE is_notified = FALSE;

-- Composite index for "mentions of me" query
CREATE INDEX IF NOT EXISTS idx_mentions_user_created ON mentions(mentioned_user_id, created_at DESC);

COMMENT ON TABLE mentions IS 'Tracks @mentions in posts, statuses, and comments';
COMMENT ON COLUMN mentions.mention_text IS 'The actual text used in the mention (e.g., @alice or @0x123...)';
COMMENT ON COLUMN mentions.content_snippet IS 'Surrounding text context for the mention';
COMMENT ON COLUMN mentions.is_notified IS 'Whether the mentioned user has been notified';
COMMENT ON COLUMN mentions.is_read IS 'Whether the mentioned user has viewed the content with the mention';
