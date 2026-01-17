DO $$ 
BEGIN 
    -- Update tips table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tips' AND column_name = 'network_name') THEN
        ALTER TABLE "tips" ADD COLUMN "network_name" varchar(64);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tips' AND column_name = 'chain_id') THEN
        ALTER TABLE "tips" ADD COLUMN "chain_id" integer;
    END IF;

    -- Update status_tips table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_tips' AND column_name = 'network_name') THEN
        ALTER TABLE "status_tips" ADD COLUMN "network_name" varchar(64);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_tips' AND column_name = 'chain_id') THEN
        ALTER TABLE "status_tips" ADD COLUMN "chain_id" integer;
    END IF;

END $$;
