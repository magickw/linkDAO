-- Create blocked_users table for user blocking functionality
CREATE TABLE IF NOT EXISTS blocked_users (
    blocker_address VARCHAR(66) NOT NULL,
    blocked_address VARCHAR(66) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blocker_address, blocked_address)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_address);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_address);

-- Add comments for documentation
COMMENT ON TABLE blocked_users IS 'Table storing user blocking relationships for messaging and content filtering';
COMMENT ON COLUMN blocked_users.blocker_address IS 'Address of the user doing the blocking';
COMMENT ON COLUMN blocked_users.blocked_address IS 'Address of the user being blocked';
COMMENT ON COLUMN blocked_users.reason IS 'Optional reason for blocking';
COMMENT ON COLUMN blocked_users.created_at IS 'Timestamp when the block was created';