-- Add role column to users table
ALTER TABLE "users" ADD COLUMN "role" varchar(32) DEFAULT 'user';

-- Create index for role column for better query performance
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" ("role");