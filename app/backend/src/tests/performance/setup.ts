/**
 * Performance Test Setup
 * Global setup for performance testing environment
 */

import { beforeAll, afterAll } from '@jest/globals';

// Global performance test setup
beforeAll(async () => {
  console.log('🚀 Setting up performance test environment...');
  
  // Set longer timeouts for performance tests
  jest.setTimeout(60000);
  
  // Ensure clean memory state
  if (global.gc) {
    global.gc();
  }
  
  // Set performance-specific environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce logging noise during performance tests
  
  console.log('✅ Performance test environment ready');
});

afterAll(async () => {
  console.log('🧹 Cleaning up performance test environment...');
  
  // Final garbage collection
  if (global.gc) {
    global.gc();
  }
  
  console.log('✅ Performance test cleanup complete');
});

// Global error handler for performance tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in performance test:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in performance test:', error);
  process.exit(1);
});