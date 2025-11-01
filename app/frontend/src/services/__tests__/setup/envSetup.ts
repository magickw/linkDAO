/**
 * Environment Setup for Cache Enhancement Tests
 * Configures test environment variables and global settings
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.CACHE_TEST_MODE = 'true';
process.env.PERFORMANCE_TEST_MODE = 'true';

// Configure test timeouts
process.env.JEST_TIMEOUT = '30000';

// Configure cache test settings
process.env.CACHE_TEST_MAX_SIZE = '10485760'; // 10MB for tests
process.env.CACHE_TEST_MAX_ENTRIES = '100';
process.env.CACHE_TEST_TTL = '300000'; // 5 minutes

// Configure IndexedDB test settings
process.env.IDB_TEST_DB_NAME = 'TestCacheMetadataDB';
process.env.IDB_TEST_VERSION = '1';

// Configure service worker test settings
process.env.SW_TEST_SCRIPT = '/sw-test.js';
process.env.SW_TEST_SCOPE = '/';

// Configure network simulation
process.env.NETWORK_DELAY_MS = '100';
process.env.OFFLINE_SIMULATION = 'true';

// Configure performance thresholds
process.env.CACHE_WRITE_THRESHOLD_MS = '100';
process.env.CACHE_READ_THRESHOLD_MS = '50';
process.env.NETWORK_TIMEOUT_MS = '3000';

// Configure browser compatibility testing
process.env.TEST_CHROME = 'true';
process.env.TEST_FIREFOX = 'true';
process.env.TEST_SAFARI = 'true';
process.env.TEST_EDGE = 'true';

// Configure feature flags for testing
process.env.ENABLE_BACKGROUND_SYNC = 'true';
process.env.ENABLE_NAVIGATION_PRELOAD = 'true';
process.env.ENABLE_BROADCAST_CHANNEL = 'true';
process.env.ENABLE_STORAGE_ESTIMATE = 'true';

// Configure logging for tests
process.env.LOG_LEVEL = 'error'; // Only show errors in tests
process.env.SHOW_ERRORS = 'false'; // Hide errors unless explicitly enabled

// Configure mock data
process.env.MOCK_API_RESPONSES = 'true';
process.env.MOCK_NETWORK_CONDITIONS = 'true';

// Set up global test configuration
(global as any).testConfig = {
  cache: {
    maxSize: parseInt(process.env.CACHE_TEST_MAX_SIZE || '10485760'),
    maxEntries: parseInt(process.env.CACHE_TEST_MAX_ENTRIES || '100'),
    ttl: parseInt(process.env.CACHE_TEST_TTL || '300000')
  },
  
  performance: {
    cacheWriteThreshold: parseInt(process.env.CACHE_WRITE_THRESHOLD_MS || '100'),
    cacheReadThreshold: parseInt(process.env.CACHE_READ_THRESHOLD_MS || '50'),
    networkTimeout: parseInt(process.env.NETWORK_TIMEOUT_MS || '3000')
  },
  
  features: {
    backgroundSync: process.env.ENABLE_BACKGROUND_SYNC === 'true',
    navigationPreload: process.env.ENABLE_NAVIGATION_PRELOAD === 'true',
    broadcastChannel: process.env.ENABLE_BROADCAST_CHANNEL === 'true',
    storageEstimate: process.env.ENABLE_STORAGE_ESTIMATE === 'true'
  },
  
  network: {
    delay: parseInt(process.env.NETWORK_DELAY_MS || '100'),
    offlineSimulation: process.env.OFFLINE_SIMULATION === 'true'
  },
  
  browsers: {
    chrome: process.env.TEST_CHROME === 'true',
    firefox: process.env.TEST_FIREFOX === 'true',
    safari: process.env.TEST_SAFARI === 'true',
    edge: process.env.TEST_EDGE === 'true'
  }
};

// Export configuration for use in tests
export const testConfig = (global as any).testConfig;