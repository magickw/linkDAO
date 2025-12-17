/**
 * Safe Migration: Update reactions table to properly reference quickPosts with UUIDs
 * This migration handles the transition from integer post IDs to UUID post IDs
 * It safely checks for the existence of constraints and indexes before attempting to modify them
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schema";
import { sql } from 'drizzle-orm';

// Direct database connection for migration
const connectionString = process.env.DATABASE_URL || "";

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required for migrations');
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

async function up(): Promise<void> {
  console.log('Starting safe migration: update reactions table to reference quickPosts with UUIDs');
  
  try {
    // Step 1: Add a new UUID column to store the new post references
    console.log('Adding new post_id_temp column...');
    await db.execute(sql`ALTER TABLE reactions ADD COLUMN post_id_temp UUID`);

    // Step 2: Add an index to the new column for performance
    console.log('Adding index for new column...');
    try {
      await db.execute(sql`CREATE INDEX CONCURRENTLY idx_reactions_post_id_temp ON reactions(post_id_temp)`);
    } catch (e) {
      console.log('Index idx_reactions_post_id_temp may already exist:', (e as Error).message);
    }

    // Step 3: Check if the old foreign key constraint exists before dropping
    console.log('Checking for old foreign key constraint...');
    const constraintCheck = await db.execute(sql`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE constraint_name = 'reactions_post_id_fkey' 
      AND table_name = 'reactions'
    `);
    
    if (constraintCheck.rows.length > 0) {
      console.log('Dropping old foreign key constraint...');
      await db.execute(sql`ALTER TABLE reactions DROP CONSTRAINT reactions_post_id_fkey`);
    } else {
      console.log('Old foreign key constraint does not exist, skipping drop');
    }

    // Step 4: Rename the columns to make the UUID column primary
    console.log('Renaming columns...');
    await db.execute(sql`ALTER TABLE reactions RENAME COLUMN post_id TO post_id_old`);
    await db.execute(sql`ALTER TABLE reactions RENAME COLUMN post_id_temp TO post_id`);

    // Step 5: Add the new foreign key constraint referencing quickPosts
    console.log('Adding new foreign key constraint...');
    await db.execute(sql`ALTER TABLE reactions ADD CONSTRAINT reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES quick_posts(id) ON DELETE CASCADE`);

    // Step 6: Rename the index to the final name
    try {
      await db.execute(sql`ALTER INDEX idx_reactions_post_id_temp RENAME TO idx_reactions_post_id`);
    } catch (e) {
      console.log('Index rename failed, this may be expected if index was already renamed:', (e as Error).message);
    }

    console.log('Safe migration completed: reactions table now references quickPosts with UUIDs');
  } catch (error) {
    console.error('Safe migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function down(): Promise<void> {
  console.log('Starting safe rollback: revert reactions table to reference posts with integer IDs');
  
  try {
    // Step 1: Check if the new foreign key constraint exists before dropping
    console.log('Checking for new foreign key constraint...');
    const constraintCheck = await db.execute(sql`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE constraint_name = 'reactions_post_id_fkey' 
      AND table_name = 'reactions'
    `);
    
    if (constraintCheck.rows.length > 0) {
      console.log('Dropping new foreign key constraint...');
      await db.execute(sql`ALTER TABLE reactions DROP CONSTRAINT reactions_post_id_fkey`);
    } else {
      console.log('New foreign key constraint does not exist, skipping drop');
    }

    // Step 2: Rename columns back to original names
    console.log('Renaming columns back...');
    await db.execute(sql`ALTER TABLE reactions RENAME COLUMN post_id TO post_id_temp`);
    await db.execute(sql`ALTER TABLE reactions RENAME COLUMN post_id_old TO post_id`);

    // Step 3: Drop the unused UUID column
    await db.execute(sql`ALTER TABLE reactions DROP COLUMN IF EXISTS post_id_temp`);

    // Step 4: Check if posts table exists and recreate the original foreign key constraint
    const postsTableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'posts'
    `);
    
    if (postsTableCheck.rows.length > 0) {
      console.log('Adding original foreign key constraint to posts table...');
      await db.execute(sql`ALTER TABLE reactions ADD CONSTRAINT reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE`);
    } else {
      console.log('Posts table does not exist, skipping original foreign key constraint creation');
    }

    // Step 5: Handle the index appropriately
    try {
      await db.execute(sql`ALTER INDEX IF EXISTS idx_reactions_post_id RENAME TO idx_reactions_post_id_temp`);
    } catch (e) {
      console.log('Index rename failed during rollback, continuing:', (e as Error).message);
    }
    
    try {
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id)`);
    } catch (e) {
      console.log('Index creation failed during rollback:', (e as Error).message);
    }

    console.log('Safe rollback completed: reactions table reverted to original structure');
  } catch (error) {
    console.error('Safe rollback failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Execute migration based on command line argument
if (process.argv[2] === 'up') {
  up().catch(error => {
    console.error('Migration up failed:', error);
    process.exit(1);
  });
} else if (process.argv[2] === 'down') {
  down().catch(error => {
    console.error('Migration down failed:', error);
    process.exit(1);
  });
} else {
  console.log('Please specify "up" or "down" as an argument');
  process.exit(1);
}