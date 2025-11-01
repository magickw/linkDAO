/**
 * Global Setup for Performance Tests
 */

import { performance } from 'perf_hooks';
import { safeLogger } from '../utils/safeLogger';

export default async function globalSetup() {
  safeLogger.info('🚀 Setting up global performance test environment...');
  
  // Mark global setup start
  performance.mark('global-setup-start');
  
  // Set performance test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.PERFORMANCE_TESTING = 'true';
  
  // Configure test database
  process.env.TEST_DB_HOST = process.env.TEST_DB_HOST || 'localhost';
  process.env.TEST_DB_PORT = process.env.TEST_DB_PORT || '5432';
  process.env.TEST_DB_NAME = process.env.TEST_DB_NAME || 'test_marketplace';
  process.env.TEST_DB_USER = process.env.TEST_DB_USER || 'test';
  process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'test';
  
  // Configure test Redis
  process.env.TEST_REDIS_HOST = process.env.TEST_REDIS_HOST || 'localhost';
  process.env.TEST_REDIS_PORT = process.env.TEST_REDIS_PORT || '6379';
  process.env.TEST_REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379';
  
  // Performance budgets from environment or defaults
  process.env.MAX_RESPONSE_TIME = process.env.MAX_RESPONSE_TIME || '200';
  process.env.MAX_CACHE_TIME = process.env.MAX_CACHE_TIME || '10';
  process.env.MAX_MEMORY_GROWTH = process.env.MAX_MEMORY_GROWTH || '100';
  process.env.MAX_ERROR_RATE = process.env.MAX_ERROR_RATE || '0.05';
  
  // Enable garbage collection for memory tests
  if (global.gc) {
    safeLogger.info('✓ Garbage collection available for memory tests');
  } else {
    safeLogger.info('⚠️  Garbage collection not available. Run with --expose-gc for memory tests');
  }
  
  // Check system resources
  const memoryUsage = process.memoryUsage();
  safeLogger.info(`📊 Initial memory usage: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  
  // Warm up V8 engine
  safeLogger.info('🔥 Warming up V8 engine...');
  for (let i = 0; i < 1000; i++) {
    const obj = { id: i, data: `warmup-${i}` };
    JSON.stringify(obj);
    JSON.parse(JSON.stringify(obj));
  }
  
  // Mark global setup end
  performance.mark('global-setup-end');
  performance.measure('global-setup-duration', 'global-setup-start', 'global-setup-end');
  
  const setupDuration = performance.getEntriesByName('global-setup-duration')[0].duration;
  safeLogger.info(`✅ Global setup completed in ${setupDuration.toFixed(2)}ms`);
}