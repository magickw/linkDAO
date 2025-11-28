require('dotenv').config();
const { db } = require('./src/db');
const { sql } = require('drizzle-orm');
const { safeLogger } = require('./src/utils/safeLogger');

async function fixProductionQuickPostsSchema() {
  try {
    safeLogger.info('🔄 Starting production quick posts schema fix...');

    // Check if table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'quick_posts'
      );
    `);

    if (!tableCheck[0]?.exists) {
      safeLogger.error('❌ quick_posts table does not exist in production!');
      process.exit(1);
    }

    safeLogger.info('✅ quick_posts table exists, applying schema fixes...');

    // Apply the schema fixes
    const fixes = [
      `ALTER TABLE "quick_posts" ADD COLUMN IF NOT EXISTS "content_cid" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "quick_posts" ADD COLUMN IF NOT EXISTS "content" TEXT`,
      `ALTER TABLE "quick_posts" ADD COLUMN IF NOT EXISTS "media_cids" TEXT`,
      `ALTER TABLE "quick_posts" ADD COLUMN IF NOT EXISTS "tags" TEXT`,
      `ALTER TABLE "quick_posts" ADD COLUMN IF NOT EXISTS "gated_content_preview" TEXT`,
      `ALTER TABLE "quick_posts" ADD COLUMN IF NOT EXISTS "moderation_warning" TEXT`,
      `UPDATE "quick_posts" SET "content_cid" = COALESCE("content_cid", '') WHERE "content_cid" IS NULL OR "content_cid" = ''`
    ];

    for (const fix of fixes) {
      try {
        await db.execute(sql.raw(fix));
        safeLogger.info(`✅ Applied: ${fix.split(' ')[2]}`);
      } catch (error) {
        if (error.message.includes('already exists') || error.code === '42701') {
          safeLogger.info(`⚠️  Column already exists: ${fix.split(' ')[2]}`);
        } else {
          safeLogger.error(`❌ Error applying fix: ${error.message}`);
          throw error;
        }
      }
    }

    // Verify the schema
    const columnsCheck = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'quick_posts' 
      ORDER BY ordinal_position
    `);

    safeLogger.info('📋 Current quick_posts table columns:');
    columnsCheck.forEach(col => {
      safeLogger.info(`   • ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });

    safeLogger.info('🎉 Production quick posts schema fix completed successfully!');
    process.exit(0);
  } catch (error) {
    safeLogger.error('💥 Failed to fix production quick posts schema:', error);
    process.exit(1);
  }
}

fixProductionQuickPostsSchema();