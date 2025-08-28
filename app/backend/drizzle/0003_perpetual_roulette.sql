-- Current sql file was generated after introspecting the database
-- Tables and constraints already exist, so we're just adding any missing indexes or constraints

-- Add missing indexes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'follow_idx') THEN
        CREATE INDEX "follow_idx" ON "follows" USING btree ("follower_id" uuid_ops,"following_id" uuid_ops);
    END IF;
END $$;