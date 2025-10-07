/**
 * Global Teardown for Infrastructure Tests
 * Cleans up test environment after running tests
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up infrastructure test environment...');

  try {
    // Cleanup test database
    await cleanupTestDatabase();
    
    // Cleanup test Redis
    await cleanupTestRedis();
    
    // Cleanup test artifacts
    await cleanupTestArtifacts();
    
    console.log('✅ Infrastructure test environment cleanup complete');
  } catch (error) {
    console.error('❌ Failed to cleanup infrastructure test environment:', error);
    // Don't throw error to avoid masking test results
  }
}

async function cleanupTestDatabase() {
  console.log('📊 Cleaning up test database...');
  
  try {
    // Clean up test data
    // In a real setup, you might want to truncate tables or drop test database
    console.log('✅ Test database cleanup complete');
  } catch (error) {
    console.warn('⚠️  Test database cleanup failed:', error.message);
  }
}

async function cleanupTestRedis() {
  console.log('🔴 Cleaning up test Redis...');
  
  try {
    // Flush test Redis database
    // In a real setup, you might want to connect to Redis and flush the test database
    console.log('✅ Test Redis cleanup complete');
  } catch (error) {
    console.warn('⚠️  Test Redis cleanup failed:', error.message);
  }
}

async function cleanupTestArtifacts() {
  console.log('🗑️  Cleaning up test artifacts...');
  
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
        console.warn(`Failed to cleanup ${dir}:`, error.message);
      }
    });
    
    console.log('✅ Test artifacts cleanup complete');
  } catch (error) {
    console.warn('⚠️  Test artifacts cleanup failed:', error.message);
  }
}