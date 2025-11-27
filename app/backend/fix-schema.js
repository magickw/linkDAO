require('dotenv').config();
const { db } = require('./src/db');
const { sql } = require('drizzle-orm');
const { safeLogger } = require('./src/utils/safeLogger');

async function fixQuickPostsSchema() {
  try {
    safeLogger.info('Starting quick posts schema fix...');

    // Check if table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'quick_posts'
      );
    `);

    if (!tableCheck[0]?.exists) {
      safeLogger.error('quick_posts table does not exist. Please run the migration first.');
      process.exit(1);
    }

    // Add content_cid column if it doesn't exist
    try {
      await db.execute(sql`ALTER TABLE "quick_posts" ADD COLUMN "content_cid" TEXT NOT NULL DEFAULT ''`);
      await db.execute(sql`ALTER TABLE "quick_posts" ALTER COLUMN "content_cid" DROP DEFAULT`);
      safeLogger.info('Added content_cid column');
    } catch (error) {
      if (error.message.includes('already exists') || error.code === '42701' || error.cause?.code === '42701') {
        safeLogger.info('content_cid column already exists');
      } else {
        safeLogger.error('Error adding content_cid column:', error);
        throw error;
      }
    }

    // Add other potentially missing columns
    const columns = [
      { name: 'content', type: 'TEXT' },
      { name: 'media_cids', type: 'TEXT' },
      { name: 'tags', type: 'TEXT' },
      { name: 'gated_content_preview', type: 'TEXT' },
      { name: 'moderation_warning', type: 'TEXT' }
    ];

    for (const column of columns) {
      try {
        await db.execute(sql.raw(`ALTER TABLE "quick_posts" ADD COLUMN "${column.name}" ${column.type}`));
        safeLogger.info(`Added ${column.name} column`);
      } catch (error) {
        if (error.message.includes('already exists') || error.code === '42701' || error.cause?.code === '42701') {
          safeLogger.info(`${column.name} column already exists`);
        } else {
          safeLogger.error(`Error adding ${column.name} column:`, error);
          throw error;
        }
      }
    }

    safeLogger.info('✅ Quick posts schema updated successfully!');
    process.exit(0);
  } catch (error) {
    safeLogger.error('Failed to fix quick posts schema:', error);
    process.exit(1);
  }
}

fixQuickPostsSchema();