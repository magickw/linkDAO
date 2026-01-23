-- Fix order_cancellations schema to match application logic which expects created_at/updated_at
-- instead of requested_at. This migration ensures the columns exist and preserves data if possible.

DO $$
BEGIN
    -- 1. Ensure created_at exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_cancellations' AND column_name = 'created_at') THEN
        ALTER TABLE order_cancellations ADD COLUMN created_at timestamp DEFAULT now();
    END IF;

    -- 2. Ensure updated_at exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_cancellations' AND column_name = 'updated_at') THEN
        ALTER TABLE order_cancellations ADD COLUMN updated_at timestamp DEFAULT now();
    END IF;

    -- 3. Migrate data from requested_at if it exists (for environments where 014 ran correctly)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_cancellations' AND column_name = 'requested_at') THEN
        -- Use EXECUTE to run dynamic SQL, preventing parse errors if the column doesn't exist
        EXECUTE 'UPDATE order_cancellations SET created_at = requested_at WHERE requested_at IS NOT NULL';
    END IF;

    -- 4. Drop requested_at if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_cancellations' AND column_name = 'requested_at') THEN
        ALTER TABLE order_cancellations DROP COLUMN requested_at;
    END IF;
END $$;

-- 5. Fix indexes
DROP INDEX IF EXISTS order_cancellations_requested_at_idx;
CREATE INDEX IF NOT EXISTS order_cancellations_created_at_idx ON order_cancellations(created_at);
