/**
 * Comprehensive Test Suite Integration Test
 * 
 * Validates that the comprehensive test suite is properly configured
 * and can execute all test components.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ComprehensiveTestSuite } from './testSuite';
import { TestEnvironment } from './testEnvironment';

describe('Comprehensive Test Suite Integration', () => {
  let testSuite: ComprehensiveTestSuite;
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    testSuite = new ComprehensiveTestSuite();
    testEnv = new TestEnvironment();
    
    // Setup test environment
    await testEnv.setup();
  }, 120000);

  afterAll(async () => {
    if (testEnv) {
      await testEnv.teardown();
    }
  }, 60000);

  test('should initialize test suite components', () => {
    expect(testSuite).toBeDefined();
    expect(testSuite['smartContractTests']).toBeDefined();
    expect(testSuite['apiTests']).toBeDefined();
    expect(testSuite['databaseTests']).toBeDefined();
    expect(testSuite['e2eTests']).toBeDefined();
    expect(testSuite['performanceTests']).toBeDefined();
    expect(testSuite['securityTests']).toBeDefined();
  });

  test('should validate test environment setup', () => {
    expect(testEnv).toBeDefined();
    expect(testEnv.getDatabase()).toBeDefined();
    expect(testEnv.getRedis()).toBeDefined();
    expect(testEnv.getProvider()).toBeDefined();
    expect(testEnv.getTestAccounts()).toBeDefined();
    expect(testEnv.getTestAccounts().length).toBeGreaterThan(0);
  });

  test('should validate requirements coverage', async () => {
    const coverageValid = await testSuite.validateAllRequirements();
    expect(coverageValid).toBe(true);
  });

  test('should generate coverage report', async () => {
    await expect(testSuite.generateCoverageReport()).resolves.not.toThrow();
  });

  test('should have proper test configuration', () => {
    // Verify Jest configuration
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.TEST_MODE).toBe('comprehensive');
    
    // Verify test utilities are available
    expect(global.testUtils).toBeDefined();
    expect(global.testUtils.generateRandomAddress).toBeDefined();
    expect(global.testUtils.generateRandomHash).toBeDefined();
    expect(global.testUtils.generateRandomUUID).toBeDefined();
    expect(global.testUtils.sleep).toBeDefined();
    expect(global.testUtils.retry).toBeDefined();
    expect(global.testUtils.measureExecutionTime).toBeDefined();
  });

  test('should validate custom matchers', () => {
    // Test Ethereum address matcher
    expect('0x1234567890123456789012345678901234567890').toHaveValidEthereumAddress();
    expect('invalid_address').not.toHaveValidEthereumAddress();
    
    // Test transaction hash matcher
    expect('0x1234567890123456789012345678901234567890123456789012345678901234').toHaveValidTransactionHash();
    expect('invalid_hash').not.toHaveValidTransactionHash();
    
    // Test UUID matcher
    const uuid = global.testUtils.generateRandomUUID();
    expect(uuid).toHaveValidUUID();
    expect('invalid_uuid').not.toHaveValidUUID();
    
    // Test email matcher
    expect('test@example.com').toHaveValidEmail();
    expect('invalid_email').not.toHaveValidEmail();
    
    // Test range matcher
    expect(50).toBeWithinRange(1, 100);
    expect(150).not.toBeWithinRange(1, 100);
    
    // Test coverage matcher
    expect(95).toHaveCoverageAbove(90);
    expect(85).not.toHaveCoverageAbove(90);
    
    // Test response time matcher
    expect(100).toHaveResponseTimeBelow(200);
    expect(300).not.toHaveResponseTimeBelow(200);
  });

  test('should validate test utilities', async () => {
    // Test address generation
    const address = global.testUtils.generateRandomAddress();
    expect(address).toHaveValidEthereumAddress();
    
    // Test hash generation
    const hash = global.testUtils.generateRandomHash();
    expect(hash).toHaveValidTransactionHash();
    
    // Test UUID generation
    const uuid = global.testUtils.generateRandomUUID();
    expect(uuid).toHaveValidUUID();
    
    // Test sleep utility
    const { duration } = await global.testUtils.measureExecutionTime(async () => {
      await global.testUtils.sleep(100);
    });
    expect(duration).toBeWithinRange(90, 150); // Allow some variance
    
    // Test retry utility
    let attempts = 0;
    const result = await global.testUtils.retry(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Retry test');
      }
      return 'success';
    }, 5, 10);
    
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  test('should validate test environment configuration', () => {
    // Database configuration
    expect(process.env.TEST_DB_HOST).toBeDefined();
    expect(process.env.TEST_DB_PORT).toBeDefined();
    expect(process.env.TEST_DB_NAME).toBeDefined();
    expect(process.env.TEST_DB_USER).toBeDefined();
    expect(process.env.TEST_DB_PASSWORD).toBeDefined();
    
    // Redis configuration
    expect(process.env.TEST_REDIS_HOST).toBeDefined();
    expect(process.env.TEST_REDIS_PORT).toBeDefined();
    
    // Blockchain configuration
    expect(process.env.TEST_BLOCKCHAIN_URL).toBeDefined();
    expect(process.env.TEST_CHAIN_ID).toBeDefined();
    expect(process.env.TEST_ACCOUNTS).toBeDefined();
    
    // Service configuration
    expect(process.env.TEST_IPFS_URL).toBeDefined();
    expect(process.env.TEST_API_URL).toBeDefined();
  });

  test('should validate performance test configuration', () => {
    expect(process.env.PERF_TEST_URL).toBeDefined();
    expect(process.env.PERF_TEST_DURATION).toBeDefined();
    expect(process.env.MAX_CONCURRENT_USERS).toBeDefined();
    
    const duration = parseInt(process.env.PERF_TEST_DURATION || '0');
    const maxUsers = parseInt(process.env.MAX_CONCURRENT_USERS || '0');
    
    expect(duration).toBeGreaterThan(0);
    expect(maxUsers).toBeGreaterThan(0);
  });

  test('should validate E2E test configuration', () => {
    expect(process.env.E2E_BASE_URL).toBeDefined();
    expect(process.env.E2E_HEADLESS).toBeDefined();
    
    const baseUrl = process.env.E2E_BASE_URL;
    expect(baseUrl).toMatch(/^https?:\/\/.+/);
  });

  test('should have proper test timeouts configured', () => {
    // Verify Jest timeout is set appropriately for comprehensive tests
    expect(jest.getTimeout()).toBeGreaterThanOrEqual(600000); // 10 minutes minimum
  });

  test('should validate test artifacts directory structure', async () => {
    const fs = require('fs/promises');
    const path = require('path');
    
    // Check if test artifacts directories exist or can be created
    const artifactsDir = path.join(process.cwd(), 'test-artifacts');
    const reportsDir = path.join(process.cwd(), 'test-reports');
    const coverageDir = path.join(process.cwd(), 'coverage');
    
    await fs.mkdir(artifactsDir, { recursive: true });
    await fs.mkdir(reportsDir, { recursive: true });
    await fs.mkdir(coverageDir, { recursive: true });
    
    // Verify directories exist
    const artifactsExists = await fs.access(artifactsDir).then(() => true).catch(() => false);
    const reportsExists = await fs.access(reportsDir).then(() => true).catch(() => false);
    const coverageExists = await fs.access(coverageDir).then(() => true).catch(() => false);
    
    expect(artifactsExists).toBe(true);
    expect(reportsExists).toBe(true);
    expect(coverageExists).toBe(true);
  });
});
