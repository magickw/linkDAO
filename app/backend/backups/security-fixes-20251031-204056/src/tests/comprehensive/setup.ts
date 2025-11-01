/**
 * Comprehensive Test Suite Setup
 * 
 * Global setup configuration for all comprehensive tests
 */

import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { safeLogger } from '../utils/safeLogger';
import { TestEnvironment } from './testEnvironment';
import { safeLogger } from '../utils/safeLogger';

let testEnvironment: TestEnvironment;

beforeAll(async () => {
  safeLogger.info('Setting up comprehensive test environment...');
  
  testEnvironment = new TestEnvironment();
  await testEnvironment.setup();
  
  // Set global test timeout
  jest.setTimeout(600000); // 10 minutes
  
  safeLogger.info('Comprehensive test environment ready');
}, 120000); // 2 minute setup timeout

afterAll(async () => {
  safeLogger.info('Tearing down comprehensive test environment...');
  
  if (testEnvironment) {
    await testEnvironment.teardown();
  }
  
  safeLogger.info('Comprehensive test environment cleaned up');
}, 60000); // 1 minute teardown timeout

beforeEach(async () => {
  // Reset test state before each test
  if (testEnvironment) {
    const redis = testEnvironment.getRedis();
    if (redis) {
      await redis.flushdb();
    }
  }
});

afterEach(async () => {
  // Cleanup after each test
  // Additional cleanup if needed
});

// Export test environment for use in tests
export { testEnvironment };