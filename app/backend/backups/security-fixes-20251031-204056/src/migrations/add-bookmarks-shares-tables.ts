/**
 * Migration: Add Bookmarks and Shares Tables
 *
 * Adds user bookmarking and share tracking functionality
 */

import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

async function runMigration() {
  safeLogger.info('🔄 Running migration: Add Bookmarks and Shares Tables...\n');

  try {
    // Create bookmarks table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bookmarks (
        user_id UUID NOT NULL,
        post_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),

        PRIMARY KEY (user_id, post_id),
        CONSTRAINT fk_bookmarks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_bookmarks_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      )
    `);
    safeLogger.info('✅ Created bookmarks table');

    // Create bookmark indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS bookmark_user_idx ON bookmarks(user_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS bookmark_post_idx ON bookmarks(post_id)
    `);
    safeLogger.info('✅ Created bookmark indexes');

    // Create shares table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS shares (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL,
        user_id UUID NOT NULL,
        target_type VARCHAR(32) NOT NULL,
        target_id UUID,
        message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),

        CONSTRAINT fk_shares_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        CONSTRAINT fk_shares_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    safeLogger.info('✅ Created shares table');

    // Create share indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS share_post_user_idx ON shares(post_id, user_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS share_post_created_idx ON shares(post_id, created_at)
    `);
    safeLogger.info('✅ Created share indexes');

    // Add comments
    await db.execute(sql`
      COMMENT ON TABLE bookmarks IS 'User-saved posts for later reading'
    `);
    await db.execute(sql`
      COMMENT ON TABLE shares IS 'Tracks when and how users share posts'
    `);
    safeLogger.info('✅ Added table comments');

    safeLogger.info('\n✅ Migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    safeLogger.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
runMigration();
