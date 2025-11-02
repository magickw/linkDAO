/**
 * Global Setup for Integration Tests
 * 
 * Sets up the test environment before running integration tests.
 * This includes database setup, service initialization, and test data preparation.
 */

import { execSync } from 'child_process';
import { safeLogger } from '../../utils/safeLogger';
import path from 'path';
import fs from 'fs';

export default async function globalSetup(): Promise<void> {
  safeLogger.info('🔧 Setting up integration test environment...');
  
  try {
    // Set environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key-for-integration-tests';
    process.env.PORT = '0'; // Use random available port
    process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
    
    // Database setup
    await setupTestDatabase();
    
    // Cache setup
    await setupTestCache();
    
    // Create test directories
    await createTestDirectories();
    
    // Initialize test data
    await initializeTestData();
    
    safeLogger.info('✅ Integration test environment ready');
  } catch (error) {
    safeLogger.error('❌ Failed to setup integration test environment:', error);
    throw error;
  }
}

async function setupTestDatabase(): Promise<void> {
  safeLogger.info('📊 Setting up test database...');
  
  try {
    // Use in-memory SQLite for fast tests
    process.env.DATABASE_URL = 'sqlite::memory:';
    
    // Alternative: Use a dedicated test database
    // process.env.DATABASE_URL = 'sqlite:./test-database.db';
    
    // Run database migrations
    const backendDir = path.join(__dirname, '../../../..');
    
    try {
      execSync('npm run db:migrate', {
        cwd: backendDir,
        stdio: 'pipe',
        env: { ...process.env }
      });
      safeLogger.info('✅ Database migrations completed');
    } catch (migrationError) {
      safeLogger.warn('⚠️  Database migrations failed, continuing with existing schema');
    }
    
  } catch (error) {
    safeLogger.error('❌ Database setup failed:', error);
    throw error;
  }
}

async function setupTestCache(): Promise<void> {
  safeLogger.info('🗄️  Setting up test cache...');
  
  try {
    // Use in-memory cache for tests
    process.env.REDIS_URL = 'redis://localhost:6379/15'; // Use test database
    process.env.CACHE_TTL = '60'; // Short TTL for tests
    
    // Alternative: Use memory cache
    process.env.CACHE_TYPE = 'memory';
    
    safeLogger.info('✅ Test cache configured');
  } catch (error) {
    safeLogger.warn('⚠️  Cache setup failed, using fallback:', error);
    process.env.CACHE_TYPE = 'memory';
  }
}

async function createTestDirectories(): Promise<void> {
  safeLogger.info('📁 Creating test directories...');
  
  const directories = [
    path.join(__dirname, '../../../test-reports'),
    path.join(__dirname, '../../../test-reports/integration'),
    path.join(__dirname, '../../../coverage/integration'),
    path.join(__dirname, '../../../.test-cache'),
    path.join(__dirname, '../../../logs/test')
  ];
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  safeLogger.info('✅ Test directories created');
}

async function initializeTestData(): Promise<void> {
  safeLogger.info('🌱 Initializing test data...');
  
  try {
    // Create test data factory
    const testDataPath = path.join(__dirname, '../fixtures/testDataFactory.ts');
    
    if (fs.existsSync(testDataPath)) {
      // Import and initialize test data factory
      const { testDataFactory } = await import('../fixtures/testDataFactory');
      
      // Pre-generate common test data
      global.__TEST_DATA__ = {
        users: Array(10).fill(null).map(() => testDataFactory.createUser()),
        sellers: Array(5).fill(null).map(() => testDataFactory.createSeller()),
        products: Array(20).fill(null).map(() => testDataFactory.createProduct()),
        validSignature: testDataFactory.createValidSignature()
      };
      
      safeLogger.info('✅ Test data initialized');
    } else {
      safeLogger.warn('⚠️  Test data factory not found, skipping data initialization');
    }
  } catch (error) {
    safeLogger.warn('⚠️  Test data initialization failed:', error);
  }
}

// Global test configuration
declare global {
  var __TEST_DATA__: {
    users: any[];
    sellers: any[];
    products: any[];
    validSignature: string;
  };
}
