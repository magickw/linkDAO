-- Add inspection columns to returns table
ALTER TABLE returns ADD COLUMN IF NOT EXISTS inspected_by uuid;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS item_condition varchar(20);
ALTER TABLE returns ADD COLUMN IF NOT EXISTS inspection_notes text;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS inspection_photos text;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS inspection_passed boolean;