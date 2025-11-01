#!/usr/bin/env ts-node

/**
 * Test Database Migration Script
 * 
 * Simple migration script for test database setup in CI/CD environments.
 */

import { Client } from 'pg';
import { safeLogger } from '../utils/safeLogger';
import dotenv from 'dotenv';
import { safeLogger } from '../utils/safeLogger';

// Load environment variables
dotenv.config();

async function runTestMigration(): Promise<void> {
  const {
    TEST_DB_HOST,
    TEST_DB_PORT,
    TEST_DB_NAME,
    TEST_DB_USER,
    TEST_DB_PASSWORD
  } = process.env;

  if (!TEST_DB_HOST || !TEST_DB_PORT || !TEST_DB_NAME || !TEST_DB_USER || !TEST_DB_PASSWORD) {
    safeLogger.info('Test database environment variables not set, skipping migration');
    return;
  }

  const client = new Client({
    host: TEST_DB_HOST,
    port: parseInt(TEST_DB_PORT, 10),
    database: TEST_DB_NAME,
    user: TEST_DB_USER,
    password: TEST_DB_PASSWORD
  });

  try {
    safeLogger.info('Connecting to test database...');
    await client.connect();
    safeLogger.info('Connected to test database');

    // Run basic schema setup
    safeLogger.info('Running basic schema setup...');
    
    // Create a simple test table to verify the connection
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_migration_check (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    safeLogger.info('Test migration completed successfully');
  } catch (error) {
    safeLogger.error('Test migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runTestMigration()
    .then(() => {
      safeLogger.info('Test database migration completed');
      process.exit(0);
    })
    .catch((error) => {
      safeLogger.error('Test database migration failed:', error);
      process.exit(1);
    });
}

export default runTestMigration;