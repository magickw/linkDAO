-- Authentication System Migration
-- Create auth_sessions table for wallet authentication and session management

CREATE TABLE IF NOT EXISTS "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(66) NOT NULL,
	"session_token" varchar(255) NOT NULL UNIQUE,
	"refresh_token" varchar(255) NOT NULL UNIQUE,
	"expires_at" timestamp NOT NULL,
	"refresh_expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"user_agent" text,
	"ip_address" varchar(45),
	"last_used_at" timestamp DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_auth_sessions_wallet_address" ON "auth_sessions" ("wallet_address");
CREATE INDEX IF NOT EXISTS "idx_auth_sessions_session_token" ON "auth_sessions" ("session_token");
CREATE INDEX IF NOT EXISTS "idx_auth_sessions_refresh_token" ON "auth_sessions" ("refresh_token");
CREATE INDEX IF NOT EXISTS "idx_auth_sessions_expires_at" ON "auth_sessions" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_auth_sessions_is_active" ON "auth_sessions" ("is_active");

-- Create wallet authentication attempts table for security tracking
CREATE TABLE IF NOT EXISTS "wallet_auth_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(66) NOT NULL,
	"attempt_type" varchar(32) NOT NULL, -- 'login', 'refresh', 'logout'
	"success" boolean NOT NULL,
	"error_message" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create index for auth attempts
CREATE INDEX IF NOT EXISTS "idx_wallet_auth_attempts_wallet_address" ON "wallet_auth_attempts" ("wallet_address");
CREATE INDEX IF NOT EXISTS "idx_wallet_auth_attempts_created_at" ON "wallet_auth_attempts" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_wallet_auth_attempts_success" ON "wallet_auth_attempts" ("success");

-- Create wallet nonces table for signature verification
CREATE TABLE IF NOT EXISTS "wallet_nonces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(66) NOT NULL,
	"nonce" varchar(255) NOT NULL UNIQUE,
	"message" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for nonces
CREATE INDEX IF NOT EXISTS "idx_wallet_nonces_wallet_address" ON "wallet_nonces" ("wallet_address");
CREATE INDEX IF NOT EXISTS "idx_wallet_nonces_nonce" ON "wallet_nonces" ("nonce");
CREATE INDEX IF NOT EXISTS "idx_wallet_nonces_expires_at" ON "wallet_nonces" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_wallet_nonces_used" ON "wallet_nonces" ("used");

-- Add cleanup function for expired sessions and nonces
CREATE OR REPLACE FUNCTION cleanup_expired_auth_data()
RETURNS void AS $$
BEGIN
    -- Delete expired sessions
    DELETE FROM auth_sessions 
    WHERE expires_at < NOW() OR refresh_expires_at < NOW();
    
    -- Delete expired nonces
    DELETE FROM wallet_nonces 
    WHERE expires_at < NOW();
    
    -- Delete old auth attempts (keep last 30 days)
    DELETE FROM wallet_auth_attempts 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_auth_sessions_updated_at
    BEFORE UPDATE ON auth_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();