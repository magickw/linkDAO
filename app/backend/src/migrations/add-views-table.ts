/**
 * Migration: Add Views Table
 *
 * Adds view tracking for posts with deduplication support
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('🔄 Running migration: Add Views Table...\n');

  try {
    // Create views table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS views (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL,
        user_id UUID,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW(),

        CONSTRAINT fk_views_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        CONSTRAINT fk_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Created views table');

    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS view_post_user_idx ON views(post_id, user_id)
    `);
    console.log('✅ Created view_post_user_idx index');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS view_post_created_idx ON views(post_id, created_at)
    `);
    console.log('✅ Created view_post_created_idx index');

    // Add comments
    await db.execute(sql`
      COMMENT ON TABLE views IS 'Tracks post views with user and anonymous tracking'
    `);
    await db.execute(sql`
      COMMENT ON COLUMN views.user_id IS 'Nullable - allows tracking anonymous views'
    `);
    await db.execute(sql`
      COMMENT ON COLUMN views.ip_address IS 'Used for deduplication of anonymous views'
    `);
    console.log('✅ Added table comments');

    console.log('\n✅ Migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
runMigration();
