const express = require('express');
const { db } = require('./src/db');
const { sql } = require('drizzle-orm');
const { safeLogger } = require('./src/utils/safeLogger');

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Schema fix endpoint
app.post('/fix-schema', async (req, res) => {
  try {
    safeLogger.info('🔄 Applying quick posts schema fix...');
    
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
      await db.execute(sql.raw(fix));
    }

    safeLogger.info('✅ Schema fix completed');
    res.json({ success: true, message: 'Schema fix applied successfully' });
  } catch (error) {
    safeLogger.error('❌ Schema fix failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Schema fix server running on port ${PORT}`);
});