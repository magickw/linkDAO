/**
 * Comprehensive Test Suite Setup
 * Global setup for all comprehensive tests
 */

import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

// Extend Jest timeout for comprehensive tests
jest.setTimeout(600000); // 10 minutes

// Global test state
let globalTestState: any = {};

beforeAll(async () => {
  console.log('🔧 Setting up comprehensive test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.TEST_SUITE = 'comprehensive';
  
  // Initialize global test state
  globalTestState = {
    startTime: Date.now(),
    testResults: new Map(),
    performanceMetrics: new Map(),
    securityResults: new Map(),
    coverageData: new Map()
  };
  
  // Set up global error handlers
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
  
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });
  
  console.log('✅ Comprehensive test environment ready');
});

afterAll(async () => {
  console.log('🧹 Cleaning up comprehensive test environment...');
  
  const totalTime = Date.now() - globalTestState.startTime;
  console.log(`⏱️  Total test execution time: ${totalTime}ms`);
  
  // Clean up global state
  globalTestState = {};
  
  console.log('✅ Comprehensive test cleanup completed');
});

beforeEach(async () => {
  // Reset any per-test state if needed
});

afterEach(async () => {
  // Clean up after each test if needed
});

// Global test utilities
(global as any).testUtils = {
  recordTestResult: (testName: string, result: any) => {
    globalTestState.testResults.set(testName, result);
  },
  
  recordPerformanceMetric: (metricName: string, value: any) => {
    globalTestState.performanceMetrics.set(metricName, value);
  },
  
  recordSecurityResult: (testName: string, result: any) => {
    globalTestState.securityResults.set(testName, result);
  },
  
  getGlobalTestState: () => globalTestState
};

// Custom matchers for comprehensive tests
expect.extend({
  toBeWithinPerformanceSLA(received: number, expectedMax: number) {
    const pass = received <= expectedMax;
    return {
      message: () =>
        `expected ${received}ms to be within SLA of ${expectedMax}ms`,
      pass
    };
  },
  
  toHaveSecurityScore(received: any, expectedMin: number) {
    const score = received.securityScore || 0;
    const pass = score >= expectedMin;
    return {
      message: () =>
        `expected security score ${score} to be at least ${expectedMin}`,
      pass
    };
  },
  
  toMeetCoverageThreshold(received: any, threshold: number) {
    const coverage = received.percentage || 0;
    const pass = coverage >= threshold;
    return {
      message: () =>
        `expected coverage ${coverage}% to meet threshold of ${threshold}%`,
      pass
    };
  }
});

// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinPerformanceSLA(expectedMax: number): R;
      toHaveSecurityScore(expectedMin: number): R;
      toMeetCoverageThreshold(threshold: number): R;
    }
  }
}