-- Create mobile device tokens table for push notifications
CREATE TABLE IF NOT EXISTS "mobile_device_tokens" (
  "id" serial PRIMARY KEY,
  "user_address" varchar(66) NOT NULL,
  "token" varchar(255) NOT NULL,
  "platform" varchar(32) NOT NULL,
  "last_used_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create indexes for mobile device tokens
CREATE INDEX IF NOT EXISTS "idx_mobile_device_tokens_user_token" ON "mobile_device_tokens" ("user_address", "token");
CREATE INDEX IF NOT EXISTS "idx_mobile_device_tokens_platform" ON "mobile_device_tokens" ("platform");

-- Create offline content cache table
CREATE TABLE IF NOT EXISTS "offline_content_cache" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_address" varchar(66) NOT NULL,
  "content_type" varchar(50) NOT NULL,
  "content_id" varchar(64) NOT NULL,
  "content_data" text NOT NULL,
  "expires_at" timestamp,
  "priority" integer DEFAULT 0,
  "accessed_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now()
);

-- Create indexes for offline content cache
CREATE INDEX IF NOT EXISTS "idx_offline_content_cache_user_content" ON "offline_content_cache" ("user_address", "content_type", "content_id");
CREATE INDEX IF NOT EXISTS "idx_offline_content_cache_expires_at" ON "offline_content_cache" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_offline_content_cache_priority" ON "offline_content_cache" ("priority");

-- Create offline action queue table
CREATE TABLE IF NOT EXISTS "offline_action_queue" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_address" varchar(66) NOT NULL,
  "action_type" varchar(50) NOT NULL,
  "action_data" text NOT NULL,
  "status" varchar(20) DEFAULT 'pending',
  "retry_count" integer DEFAULT 0,
  "last_attempt_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now()
);

-- Create indexes for offline action queue
CREATE INDEX IF NOT EXISTS "idx_offline_action_queue_user_action" ON "offline_action_queue" ("user_address", "action_type");
CREATE INDEX IF NOT EXISTS "idx_offline_action_queue_status" ON "offline_action_queue" ("status");
CREATE INDEX IF NOT EXISTS "idx_offline_action_queue_created_at" ON "offline_action_queue" ("created_at");

-- Create mobile governance sessions table
CREATE TABLE IF NOT EXISTS "mobile_governance_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_address" varchar(66) NOT NULL,
  "session_id" varchar(64) NOT NULL,
  "proposal_id" uuid REFERENCES "proposals"("id"),
  "action_type" varchar(50),
  "biometric_used" boolean DEFAULT false,
  "session_start" timestamp DEFAULT now(),
  "session_end" timestamp,
  "actions_performed" integer DEFAULT 0
);

-- Create indexes for mobile governance sessions
CREATE INDEX IF NOT EXISTS "idx_mobile_governance_sessions_user_session" ON "mobile_governance_sessions" ("user_address", "session_id");
CREATE INDEX IF NOT EXISTS "idx_mobile_governance_sessions_proposal" ON "mobile_governance_sessions" ("proposal_id");
CREATE INDEX IF NOT EXISTS "idx_mobile_governance_sessions_start" ON "mobile_governance_sessions" ("session_start");