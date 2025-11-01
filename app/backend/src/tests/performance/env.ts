/**
 * Environment Setup for Performance Tests
 */

// Performance test environment configuration
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.PERFORMANCE_TESTING = 'true';

// Increase Node.js memory limit for performance tests
if (!process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = '--max-old-space-size=4096';
}

// Enable garbage collection exposure
if (!process.execArgv.includes('--expose-gc')) {
  safeLogger.warn('⚠️  Consider running with --expose-gc flag for accurate memory testing');
}

// Set test timeouts
jest.setTimeout(120000); // 2 minutes for performance tests

// Global error handlers for performance tests
process.on('unhandledRejection', (reason, promise) => {
  safeLogger.error('Unhandled Rejection in performance test:', reason);
});

process.on('uncaughtException', (error) => {
  safeLogger.error('Uncaught Exception in performance test:', error);
  process.exit(1);
});
