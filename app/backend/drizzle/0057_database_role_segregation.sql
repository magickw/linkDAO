-- Database Role Segregation for Enhanced Security
-- Creates separate roles with minimal required permissions
-- Implements principle of least privilege

-- ============================================
-- 1. CREATE READ-ONLY ROLE
-- ============================================

-- Create read-only role for query-heavy endpoints
CREATE ROLE readonly_api LOGIN PASSWORD '${READONLY_PASSWORD}';

-- Grant CONNECT privilege
GRANT CONNECT ON DATABASE ${DATABASE_NAME} TO readonly_api;

-- Grant USAGE on schema
GRANT USAGE ON SCHEMA public TO readonly_api;

-- Grant SELECT on all existing tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_api;

-- Automatically grant SELECT on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO readonly_api;

-- Grant SELECT on specific sequences if needed for pagination
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO readonly_api;

COMMENT ON ROLE readonly_api IS 'Read-only database access for query endpoints';

-- ============================================
-- 2. CREATE APPLICATION ROLE (Main API)
-- ============================================

-- Create main application role with read/write access
CREATE ROLE app_api LOGIN PASSWORD '${APP_PASSWORD}';

-- Grant CONNECT privilege
GRANT CONNECT ON DATABASE ${DATABASE_NAME} TO app_api;

-- Grant USAGE on schema
GRANT USAGE ON SCHEMA public TO app_api;

-- Grant SELECT, INSERT, UPDATE, DELETE on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_api;

-- Grant access to sequences (for auto-increment IDs)
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO app_api;

-- Automatically grant permissions on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_api;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO app_api;

-- Restrict DDL operations (no CREATE, DROP, ALTER)
-- app_api can only manipulate data, not schema

COMMENT ON ROLE app_api IS 'Main application role with read/write access to data';

-- ============================================
-- 3. CREATE ADMIN ROLE
-- ============================================

-- Create admin role for schema migrations and maintenance
CREATE ROLE admin_api LOGIN PASSWORD '${ADMIN_PASSWORD}';

-- Grant CONNECT privilege
GRANT CONNECT ON DATABASE ${DATABASE_NAME} TO admin_api;

-- Grant full privileges on schema
GRANT ALL PRIVILEGES ON SCHEMA public TO admin_api;

-- Grant full privileges on all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_api;

-- Grant full privileges on sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin_api;

-- Grant CREATE privilege for schema changes
GRANT CREATE ON SCHEMA public TO admin_api;

-- Automatically grant full permissions on future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO admin_api;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO admin_api;

COMMENT ON ROLE admin_api IS 'Administrative role for schema migrations and maintenance';

-- ============================================
-- 4. CREATE ANALYTICS ROLE
-- ============================================

-- Create analytics role for reporting and analysis
CREATE ROLE analytics_api LOGIN PASSWORD '${ANALYTICS_PASSWORD}';

-- Grant CONNECT privilege
GRANT CONNECT ON DATABASE ${DATABASE_NAME} TO analytics_api;

-- Grant USAGE on schema
GRANT USAGE ON SCHEMA public TO analytics_api;

-- Grant SELECT on all tables for analytics
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_api;

-- Allow analytics role to create temporary tables for complex queries
GRANT TEMPORARY ON DATABASE ${DATABASE_NAME} TO analytics_api;

-- Automatically grant SELECT on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO analytics_api;

COMMENT ON ROLE analytics_api IS 'Analytics role for reporting and data analysis';

-- ============================================
-- 5. RESTRICT SENSITIVE TABLES
-- ============================================

-- Revoke access to sensitive verification data from non-admin roles
REVOKE ALL ON seller_verifications FROM readonly_api, app_api, analytics_api;
REVOKE ALL ON seller_verification_documents FROM readonly_api, app_api, analytics_api;
REVOKE ALL ON seller_verification_attempts FROM readonly_api, app_api, analytics_api;

-- Grant limited access to app_api for verification operations
GRANT SELECT, INSERT, UPDATE ON seller_verifications TO app_api;
GRANT SELECT, INSERT ON seller_verification_attempts TO app_api;

-- Analytics can read verification status but not sensitive details
GRANT SELECT ON seller_verification_public TO analytics_api;
GRANT SELECT ON seller_verification_public TO readonly_api;

COMMENT ON TABLE seller_verifications IS 'Restricted: Admin and app_api only';

-- ============================================
-- 6. CREATE ROW-LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on sensitive tables
ALTER TABLE seller_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_verification_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own verification data
CREATE POLICY user_verification_access ON seller_verifications
  FOR SELECT
  USING (
    seller_wallet_address = current_setting('app.current_user_wallet', true)
  );

-- Policy: Admin can see all verification data
CREATE POLICY admin_verification_access ON seller_verifications
  FOR ALL
  USING (
    current_user = 'admin_api'
  );

-- Policy: App can insert/update verifications for any user
CREATE POLICY app_verification_write ON seller_verifications
  FOR INSERT
  WITH CHECK (current_user = 'app_api');

CREATE POLICY app_verification_update ON seller_verifications
  FOR UPDATE
  USING (current_user = 'app_api');

-- Similar policies for verification attempts
CREATE POLICY user_attempts_access ON seller_verification_attempts
  FOR SELECT
  USING (
    seller_wallet_address = current_setting('app.current_user_wallet', true)
    OR current_user = 'admin_api'
  );

-- ============================================
-- 7. CREATE AUDIT TRAIL
-- ============================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  database_role VARCHAR(50) NOT NULL,
  operation VARCHAR(10) NOT NULL, -- SELECT, INSERT, UPDATE, DELETE
  table_name VARCHAR(100) NOT NULL,
  record_id TEXT,
  ip_address VARCHAR(45),
  query_text TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Index for audit log queries
CREATE INDEX idx_audit_log_timestamp ON security_audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_role ON security_audit_log(database_role);
CREATE INDEX idx_audit_log_table ON security_audit_log(table_name);

-- Only admin can access audit log
GRANT SELECT ON security_audit_log TO admin_api;
GRANT INSERT ON security_audit_log TO app_api, readonly_api, analytics_api;

-- ============================================
-- 8. CONNECTION LIMITS
-- ============================================

-- Set connection limits for each role
ALTER ROLE readonly_api CONNECTION LIMIT 20;
ALTER ROLE app_api CONNECTION LIMIT 50;
ALTER ROLE admin_api CONNECTION LIMIT 5;
ALTER ROLE analytics_api CONNECTION LIMIT 10;

-- ============================================
-- 9. USAGE INSTRUCTIONS
-- ============================================

/*
To use these roles in your application:

1. Set environment variables:
   - READONLY_DB_URL: Connection string with readonly_api credentials
   - APP_DB_URL: Connection string with app_api credentials (main)
   - ADMIN_DB_URL: Connection string with admin_api credentials (migrations)
   - ANALYTICS_DB_URL: Connection string with analytics_api credentials

2. In application code:
   - Use READONLY_DB_URL for:
     * Public listing endpoints
     * Search queries
     * Profile views
     * Feed generation

   - Use APP_DB_URL for:
     * User authentication
     * Creating posts/listings
     * Updating user data
     * Order management

   - Use ADMIN_DB_URL for:
     * Database migrations
     * Schema changes
     * Manual data fixes

   - Use ANALYTICS_DB_URL for:
     * Reporting dashboards
     * Data analysis
     * Complex aggregation queries

3. Example connection switching in code:

   ```typescript
   import postgres from 'postgres';

   // Read-only connection for queries
   const readOnlyConn = postgres(process.env.READONLY_DB_URL!);

   // Main app connection
   const appConn = postgres(process.env.APP_DB_URL!);

   // Use appropriate connection based on operation
   export function getDbConnection(operation: 'read' | 'write') {
     return operation === 'read' ? readOnlyConn : appConn;
   }
   ```

4. Set current user wallet for RLS:
   ```sql
   SET app.current_user_wallet = '0x1234...';
   ```
*/

-- ============================================
-- 10. VERIFICATION QUERIES
-- ============================================

-- Verify role permissions
SELECT
  r.rolname,
  r.rolcanlogin,
  r.rolconnlimit,
  ARRAY_AGG(DISTINCT p.privilege_type) as privileges
FROM pg_roles r
LEFT JOIN information_schema.role_table_grants p
  ON r.rolname = p.grantee
WHERE r.rolname IN ('readonly_api', 'app_api', 'admin_api', 'analytics_api')
GROUP BY r.rolname, r.rolcanlogin, r.rolconnlimit
ORDER BY r.rolname;

-- List tables accessible to readonly_api
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'readonly_api'
AND table_schema = 'public'
ORDER BY table_name;
