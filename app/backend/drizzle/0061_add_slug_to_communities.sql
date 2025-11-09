-- Add slug column to communities table
ALTER TABLE communities ADD COLUMN slug varchar(64) NOT NULL DEFAULT '';

-- Create unique index on slug
CREATE UNIQUE INDEX communities_slug_unique ON communities(slug);

-- Generate slugs for existing communities based on name
UPDATE communities 
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug = '';

-- Ensure all slugs are unique by appending numbers if needed
DO $$
DECLARE
    community_record RECORD;
    counter INTEGER := 1;
    base_slug TEXT;
    new_slug TEXT;
BEGIN
    FOR community_record IN 
        SELECT id, name, slug FROM communities
    LOOP
        base_slug := LOWER(REGEXP_REPLACE(community_record.name, '[^a-zA-Z0-9]+', '-', 'g'));
        new_slug := base_slug;
        
        -- Check if slug already exists (excluding current record)
        WHILE EXISTS (SELECT 1 FROM communities WHERE slug = new_slug AND id != community_record.id) LOOP
            new_slug := base_slug || '-' || counter;
            counter := counter + 1;
        END LOOP;
        
        -- Update the slug if it changed
        IF new_slug != community_record.slug THEN
            UPDATE communities SET slug = new_slug WHERE id = community_record.id;
        END IF;
        
        counter := 1;
    END LOOP;
END $$;