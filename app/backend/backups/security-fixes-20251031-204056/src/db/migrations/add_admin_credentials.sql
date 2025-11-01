-- Migration: Add admin credentials support
-- Date: 2025-10-27
-- Description: Adds email and password fields to users table for admin credential-based authentication

-- Add email field (unique, for admin logins)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Create index on role for admin queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role IN ('admin', 'super_admin', 'moderator');

-- Add permissions field (JSON array of permission strings)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- Create index on permissions for permission checking
CREATE INDEX IF NOT EXISTS idx_users_permissions ON users USING GIN(permissions);

-- Update existing admin users with default permissions
UPDATE users
SET permissions = CASE
  WHEN role = 'super_admin' THEN '["*"]'::jsonb
  WHEN role = 'admin' THEN '["content.moderate", "users.manage", "disputes.resolve", "marketplace.seller_review", "system.analytics"]'::jsonb
  WHEN role = 'moderator' THEN '["content.moderate", "users.view", "disputes.view"]'::jsonb
  ELSE '[]'::jsonb
END
WHERE permissions = '[]'::jsonb OR permissions IS NULL;

-- Add admin session tracking table
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at) WHERE is_active = TRUE;

-- Add admin audit log table (if not exists)
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_resource ON admin_audit_log(resource_type, resource_id);

-- Add comment explaining the migration
COMMENT ON COLUMN users.email IS 'Email address for credential-based authentication (primarily for admin users)';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hash of password for credential-based authentication';
COMMENT ON COLUMN users.permissions IS 'JSON array of permission strings for fine-grained access control';
COMMENT ON TABLE admin_sessions IS 'Tracks active admin sessions for security and session management';
COMMENT ON TABLE admin_audit_log IS 'Audit log of all administrative actions';
