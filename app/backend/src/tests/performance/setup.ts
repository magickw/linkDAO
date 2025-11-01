/**
 * Performance Test Setup
 * Global setup for performance testing environment
 */

import { beforeAll, afterAll } from '@jest/globals';
import { safeLogger } from '../utils/safeLogger';

// Global performance test setup
beforeAll(async () => {
  safeLogger.info('🚀 Setting up performance test environment...');
  
  // Set longer timeouts for performance tests
  jest.setTimeout(60000);
  
  // Ensure clean memory state
  if (global.gc) {
    global.gc();
  }
  
  // Set performance-specific environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce logging noise during performance tests
  
  safeLogger.info('✅ Performance test environment ready');
});

afterAll(async () => {
  safeLogger.info('🧹 Cleaning up performance test environment...');
  
  // Final garbage collection
  if (global.gc) {
    global.gc();
  }
  
  safeLogger.info('✅ Performance test cleanup complete');
});

// Global error handler for performance tests
process.on('unhandledRejection', (reason, promise) => {
  safeLogger.error('Unhandled Rejection in performance test:', reason);
});

process.on('uncaughtException', (error) => {
  safeLogger.error('Uncaught Exception in performance test:', error);
  process.exit(1);
});
