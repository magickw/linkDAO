-- Add banner, website, and social links fields to users table
-- Migration: 007_add_banner_website_social_links

-- Add banner_cid column for profile banner images
ALTER TABLE users ADD COLUMN banner_cid TEXT;

-- Add website column for primary website URL
ALTER TABLE users ADD COLUMN website VARCHAR(500);

-- Add social_links column as JSONB for storing array of social media links
ALTER TABLE users ADD COLUMN social_links JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN users.banner_cid IS 'Banner image CID or URL for user profile header';
COMMENT ON COLUMN users.website IS 'Primary website URL for user (marketing/social purpose)';
COMMENT ON COLUMN users.social_links IS 'JSON array of social media links with platform, url, and username fields';

-- Create index on social_links for faster JSON queries
CREATE INDEX idx_users_social_links ON users USING GIN (social_links);
