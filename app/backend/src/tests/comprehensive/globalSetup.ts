/**
 * Global Test Setup
 * 
 * Runs once before all tests to prepare the testing environment
 */

export default async function globalSetup(): Promise<void> {
  safeLogger.info('Starting global test setup...');
  
  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.TEST_MODE = 'comprehensive';
  
  // Setup test database
  process.env.TEST_DB_HOST = process.env.TEST_DB_HOST || 'localhost';
  process.env.TEST_DB_PORT = process.env.TEST_DB_PORT || '5432';
  process.env.TEST_DB_NAME = process.env.TEST_DB_NAME || 'marketplace_test';
  process.env.TEST_DB_USER = process.env.TEST_DB_USER || 'test';
  process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'test';
  
  // Setup test Redis
  process.env.TEST_REDIS_HOST = process.env.TEST_REDIS_HOST || 'localhost';
  process.env.TEST_REDIS_PORT = process.env.TEST_REDIS_PORT || '6379';
  
  // Setup test blockchain
  process.env.TEST_BLOCKCHAIN_URL = process.env.TEST_BLOCKCHAIN_URL || 'http://localhost:8545';
  process.env.TEST_CHAIN_ID = process.env.TEST_CHAIN_ID || '31337';
  
  // Generate test accounts
  const testAccounts = [
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
    '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
    '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a'
  ];
  
  process.env.TEST_ACCOUNTS = testAccounts.join(',');
  
  // Setup test services
  process.env.TEST_IPFS_URL = process.env.TEST_IPFS_URL || 'http://localhost:5001';
  process.env.TEST_API_URL = process.env.TEST_API_URL || 'http://localhost:3001';
  
  // Performance test configuration
  process.env.PERF_TEST_URL = process.env.PERF_TEST_URL || 'http://localhost:3001';
  process.env.PERF_TEST_DURATION = process.env.PERF_TEST_DURATION || '300000';
  process.env.MAX_CONCURRENT_USERS = process.env.MAX_CONCURRENT_USERS || '1000';
  
  // E2E test configuration
  process.env.E2E_BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
  process.env.E2E_HEADLESS = process.env.E2E_HEADLESS || 'true';
  
  safeLogger.info('Global test setup completed');
}
