#!/usr/bin/env node

/**
 * Script to check if a shareId exists in the database
 */

const { databaseService } = require('./dist/services/databaseService.js');

async function checkShareId(shareId) {
  try {
    console.log(`Checking for shareId: ${shareId}`);

    const db = databaseService.getDatabase();

    // Check statuses table
    console.log('\n📋 Checking statuses table...');
    const statusResult = await db.execute(`
      SELECT id, share_id, author_id, content, created_at
      FROM statuses
      WHERE share_id = '${shareId}'
      LIMIT 1
    `);

    if (statusResult && statusResult.rows && statusResult.rows.length > 0) {
      console.log('✅ Found in statuses table:');
      console.log(JSON.stringify(statusResult.rows[0], null, 2));
      return;
    }

    console.log('❌ Not found in statuses table');

    // Check posts table
    console.log('\n📋 Checking posts table...');
    const postResult = await db.execute(`
      SELECT id, share_id, author_id, title, content, community_id, created_at
      FROM posts
      WHERE share_id = '${shareId}'
      LIMIT 1
    `);

    if (postResult && postResult.rows && postResult.rows.length > 0) {
      console.log('✅ Found in posts table:');
      console.log(JSON.stringify(postResult.rows[0], null, 2));
      return;
    }

    console.log('❌ Not found in posts table');

    // Check what tables exist and have data
    console.log('\n📊 Checking database contents...');

    const allStatuses = await db.execute(`
      SELECT id, share_id, author_id, created_at
      FROM statuses
      ORDER BY created_at DESC
      LIMIT 3
    `);
    console.log(`Statuses: ${allStatuses.rows?.length || 0}`);

    const allPosts = await db.execute(`
      SELECT id, share_id, author_id, title, created_at
      FROM posts
      ORDER BY created_at DESC
      LIMIT 3
    `);
    console.log(`Posts: ${allPosts.rows?.length || 0}`);

    if (allPosts.rows && allPosts.rows.length > 0) {
      console.log('\nSample posts:');
      console.log(JSON.stringify(allPosts.rows, null, 2));
    }

    if (allStatuses.rows && allStatuses.rows.length > 0) {
      console.log('\nSample statuses:');
      console.log(JSON.stringify(allStatuses.rows, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

const shareId = process.argv[2] || 'T6NN5OsI';
checkShareId(shareId);
