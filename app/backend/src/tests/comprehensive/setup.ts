/**
 * Comprehensive Test Suite Setup
 * 
 * Global setup configuration for all comprehensive tests
 */

import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { TestEnvironment } from './testEnvironment';

let testEnvironment: TestEnvironment;

beforeAll(async () => {
  console.log('Setting up comprehensive test environment...');
  
  testEnvironment = new TestEnvironment();
  await testEnvironment.setup();
  
  // Set global test timeout
  jest.setTimeout(600000); // 10 minutes
  
  console.log('Comprehensive test environment ready');
}, 120000); // 2 minute setup timeout

afterAll(async () => {
  console.log('Tearing down comprehensive test environment...');
  
  if (testEnvironment) {
    await testEnvironment.teardown();
  }
  
  console.log('Comprehensive test environment cleaned up');
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