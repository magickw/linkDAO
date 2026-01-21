#!/usr/bin/env node

/**
 * Script to check if a shareId exists in the database
 */

const { statuses } = require('./app/backend/src/db/schema');
const { databaseService } = require('./app/backend/src/services/databaseService');
const { eq } = require('drizzle-orm');

async function checkShareId(shareId) {
  try {
    console.log(`Checking for shareId: ${shareId}`);

    const db = databaseService.getDatabase();

    // Check statuses table
    const statusResult = await db
      .select({
        id: statuses.id,
        shareId: statuses.shareId,
        authorId: statuses.authorId,
        content: statuses.content,
        createdAt: statuses.createdAt,
      })
      .from(statuses)
      .where(eq(statuses.shareId, shareId))
      .limit(1);

    if (statusResult.length > 0) {
      console.log('✅ Found in statuses table:');
      console.log(JSON.stringify(statusResult[0], null, 2));
      return;
    }

    console.log('❌ Not found in statuses table');

    // Check if there are any statuses at all
    const allStatuses = await db.select({ count: statuses.id }).from(statuses).limit(5);
    console.log(`\n📊 Total statuses in database: ${allStatuses.length}`);
    if (allStatuses.length > 0) {
      console.log('Sample statuses:');
      console.log(JSON.stringify(allStatuses, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

const shareId = process.argv[2] || 'T6NN5OsI';
checkShareId(shareId);
