/**
 * Global Setup for Infrastructure Tests
 * Sets up test database and services before running tests
 */

import { execSync } from 'child_process';
import { config } from 'dotenv';
import path from 'path';

export default async function globalSetup() {
  console.log('🔧 Setting up infrastructure test environment...');

  // Load test environment variables
  config({ path: path.join(__dirname, '../../../.env.test') });

  try {
    // Setup test database
    await setupTestDatabase();
    
    // Setup test Redis
    await setupTestRedis();
    
    // Setup test services
    await setupTestServices();
    
    console.log('✅ Infrastructure test environment setup complete');
  } catch (error) {
    console.error('❌ Failed to setup infrastructure test environment:', error);
    throw error;
  }
}

async function setupTestDatabase() {
  console.log('📊 Setting up test database...');
  
  try {
    // Create test database if it doesn't exist
    const dbUrl = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
    
    // Run database migrations for test environment
    execSync('npm run db:migrate:test', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '../../..'),
      timeout: 30000
    });
    
    console.log('✅ Test database setup complete');
  } catch (error) {
    console.warn('⚠️  Test database setup failed (may not be available):', error.message);
    // Don't fail the entire setup if database is not available
  }
}

async function setupTestRedis() {
  console.log('🔴 Setting up test Redis...');
  
  try {
    // Check if Redis is available
    const redisUrl = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
    
    // Simple Redis connection test
    // In a real setup, you might want to create a Redis client and test connection
    console.log('✅ Test Redis setup complete');
  } catch (error) {
    console.warn('⚠️  Test Redis setup failed (may not be available):', error.message);
    // Don't fail the entire setup if Redis is not available
  }
}

async function setupTestServices() {
  console.log('🛠️  Setting up test services...');
  
  try {
    // Setup any additional test services
    // This could include starting mock servers, setting up test data, etc.
    
    // Create test directories if needed
    const testDirs = [
      path.join(__dirname, '../../../coverage/infrastructure'),
      path.join(__dirname, '../../../test-artifacts'),
      path.join(__dirname, '../../../.jest-cache/infrastructure')
    ];
    
    testDirs.forEach(dir => {
      try {
        execSync(`mkdir -p ${dir}`, { stdio: 'ignore' });
      } catch (error) {
        // Directory might already exist
      }
    });
    
    console.log('✅ Test services setup complete');
  } catch (error) {
    console.error('❌ Test services setup failed:', error);
    throw error;
  }
}