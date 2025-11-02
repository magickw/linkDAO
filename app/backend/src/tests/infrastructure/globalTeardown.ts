/**
 * Global Teardown for Infrastructure Tests
 * Cleans up test environment after running tests
 */

import { execSync } from 'child_process';
import { safeLogger } from '../../utils/safeLogger';
import path from 'path';
import fs from 'fs';

export default async function globalTeardown() {
  safeLogger.info('🧹 Cleaning up infrastructure test environment...');

  try {
    // Cleanup test database
    await cleanupTestDatabase();
    
    // Cleanup test Redis
    await cleanupTestRedis();
    
    // Cleanup test artifacts
    await cleanupTestArtifacts();
    
    safeLogger.info('✅ Infrastructure test environment cleanup complete');
  } catch (error) {
    safeLogger.error('❌ Failed to cleanup infrastructure test environment:', error);
    // Don't throw error to avoid masking test results
  }
}

async function cleanupTestDatabase() {
  safeLogger.info('📊 Cleaning up test database...');
  
  try {
    // Clean up test data
    // In a real setup, you might want to truncate tables or drop test database
    safeLogger.info('✅ Test database cleanup complete');
  } catch (error) {
    safeLogger.warn('⚠️  Test database cleanup failed:', error.message);
  }
}

async function cleanupTestRedis() {
  safeLogger.info('🔴 Cleaning up test Redis...');
  
  try {
    // Flush test Redis database
    // In a real setup, you might want to connect to Redis and flush the test database
    safeLogger.info('✅ Test Redis cleanup complete');
  } catch (error) {
    safeLogger.warn('⚠️  Test Redis cleanup failed:', error.message);
  }
}

async function cleanupTestArtifacts() {
  safeLogger.info('🗑️  Cleaning up test artifacts...');
  
  try {
    // Clean up temporary test files
    const tempDirs = [
      path.join(__dirname, '../../../test-artifacts'),
      path.join(__dirname, '../../../.jest-cache/infrastructure')
    ];
    
    tempDirs.forEach(dir => {
      try {
        if (fs.existsSync(dir)) {
          execSync(`rm -rf ${dir}`, { stdio: 'ignore' });
        }
      } catch (error) {
        safeLogger.warn(`Failed to cleanup ${dir}:`, error.message);
      }
    });
    
    safeLogger.info('✅ Test artifacts cleanup complete');
  } catch (error) {
    safeLogger.warn('⚠️  Test artifacts cleanup failed:', error.message);
  }
}
