-- ============================================================================
-- Fix conversation_participants table columns
-- ============================================================================
-- Ensures all required columns exist in conversation_participants table
-- as defined in the Drizzle schema

-- Ensure the conversation_participants table exists
-- If it doesn't exist, create it with all required columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'conversation_participants'
    ) THEN
        CREATE TABLE public.conversation_participants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
            user_id UUID,
            role VARCHAR(32) DEFAULT 'member',
            joined_at TIMESTAMP DEFAULT NOW(),
            left_at TIMESTAMP,
            last_read_at TIMESTAMP,
            is_muted BOOLEAN DEFAULT FALSE,
            notifications_enabled BOOLEAN DEFAULT TRUE,
            custom_title VARCHAR(255),
            UNIQUE(conversation_id, user_id)
        );

        CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
        CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
        CREATE INDEX idx_conversation_participants_role ON conversation_participants(role);
        CREATE INDEX idx_conversation_participants_joined_at ON conversation_participants(joined_at);

        RAISE NOTICE 'Created conversation_participants table with all required columns';
    ELSE
        -- Table exists, ensure all columns exist
        -- Add role column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'conversation_participants' AND column_name = 'role'
        ) THEN
            ALTER TABLE conversation_participants
            ADD COLUMN role VARCHAR(32) DEFAULT 'member';
            RAISE NOTICE 'Added role column to conversation_participants';
        END IF;

        -- Add joined_at column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'conversation_participants' AND column_name = 'joined_at'
        ) THEN
            ALTER TABLE conversation_participants
            ADD COLUMN joined_at TIMESTAMP DEFAULT NOW();
            RAISE NOTICE 'Added joined_at column to conversation_participants';
        END IF;

        -- Add left_at column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'conversation_participants' AND column_name = 'left_at'
        ) THEN
            ALTER TABLE conversation_participants
            ADD COLUMN left_at TIMESTAMP;
            RAISE NOTICE 'Added left_at column to conversation_participants';
        END IF;

        -- Add last_read_at column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'conversation_participants' AND column_name = 'last_read_at'
        ) THEN
            ALTER TABLE conversation_participants
            ADD COLUMN last_read_at TIMESTAMP;
            RAISE NOTICE 'Added last_read_at column to conversation_participants';
        END IF;

        -- Add is_muted column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'conversation_participants' AND column_name = 'is_muted'
        ) THEN
            ALTER TABLE conversation_participants
            ADD COLUMN is_muted BOOLEAN DEFAULT FALSE;
            RAISE NOTICE 'Added is_muted column to conversation_participants';
        END IF;

        -- Add notifications_enabled column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'conversation_participants' AND column_name = 'notifications_enabled'
        ) THEN
            ALTER TABLE conversation_participants
            ADD COLUMN notifications_enabled BOOLEAN DEFAULT TRUE;
            RAISE NOTICE 'Added notifications_enabled column to conversation_participants';
        END IF;

        -- Add custom_title column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'conversation_participants' AND column_name = 'custom_title'
        ) THEN
            ALTER TABLE conversation_participants
            ADD COLUMN custom_title VARCHAR(255);
            RAISE NOTICE 'Added custom_title column to conversation_participants';
        END IF;

        -- Create indexes if they don't exist
        CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id
        ON conversation_participants(conversation_id);

        CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id
        ON conversation_participants(user_id);

        CREATE INDEX IF NOT EXISTS idx_conversation_participants_role
        ON conversation_participants(role);

        CREATE INDEX IF NOT EXISTS idx_conversation_participants_joined_at
        ON conversation_participants(joined_at);

        RAISE NOTICE 'Ensured all conversation_participants columns and indexes exist';
    END IF;
END $$;
