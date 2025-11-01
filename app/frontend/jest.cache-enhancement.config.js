const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

/**
 * Jest Configuration for Service Worker Cache Enhancement Tests
 * Optimized for testing service worker functionality and cache strategies
 */
module.exports = {
  displayName: 'Service Worker Cache Enhancement',
  
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.ts',
    '<rootDir>/src/services/__tests__/setup/cacheTestSetup.ts'
  ],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/services/__tests__/**/serviceWorkerCache*.test.ts',
    '<rootDir>/src/services/__tests__/**/enhancedCache*.test.ts',
    '<rootDir>/src/services/__tests__/**/cache*.test.ts',
    '<rootDir>/src/services/__tests__/**/backgroundSync*.test.ts',
    '<rootDir>/src/services/__tests__/**/intelligentPreloading*.test.ts',
    '<rootDir>/src/services/__tests__/**/cacheMetadata*.test.ts',
    '<rootDir>/src/services/__tests__/**/cacheMigration*.test.ts',
    '<rootDir>/src/services/__tests__/**/cacheCompatibility*.test.ts'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/src/services/__tests__/e2e/',
    '<rootDir>/src/services/__tests__/setup/',
    '<rootDir>/src/services/__tests__/mocks/'
  ],
  
  // Module name mapping
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    // Mock service worker APIs
    '^workbox-(.*)$': '<rootDir>/src/services/__tests__/mocks/workbox-$1.js'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        compilerOptions: {
          jsx: 'react-jsx'
        }
      }
    }],
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/test-results/cache-enhancement/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  // Coverage collection patterns
  collectCoverageFrom: [
    'src/services/serviceWorkerCacheService.ts',
    'src/services/cacheMetadataManager.ts',
    'src/services/backgroundSyncManager.ts',
    'src/services/offlineActionQueue.ts',
    'src/services/intelligentPreloadingSystem.ts',
    'src/services/cachePerformanceMetricsService.ts',
    'src/services/cacheAccessControl.ts',
    'src/services/cacheDataProtection.ts',
    'src/services/cacheMigrationSystem.ts',
    'src/services/cacheCompatibilityLayer.ts',
    'src/services/feedCacheStrategy.ts',
    'src/services/communityCacheStrategy.ts',
    'src/services/marketplaceCacheStrategy.ts',
    'src/services/encryptedMessageStorage.ts',
    'src/services/messageAttachmentHandler.ts',
    'src/services/storageQuotaManager.ts'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Specific thresholds for core services
    'src/services/serviceWorkerCacheService.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/services/cacheMetadataManager.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Globals
  globals: {
    'ts-jest': {
      useESM: false
    }
  },
  
  // Environment variables
  setupFiles: ['<rootDir>/src/services/__tests__/setup/envSetup.ts'],
  
  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Reporters
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './test-results/cache-enhancement/html-report',
      filename: 'cache-enhancement-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Service Worker Cache Enhancement Test Report'
    }],
    ['jest-junit', {
      outputDirectory: './test-results/cache-enhancement',
      outputName: 'junit.xml',
      suiteName: 'Service Worker Cache Enhancement Tests'
    }]
  ],
  
  // Cache configuration
  cacheDirectory: '<rootDir>/node_modules/.cache/jest/cache-enhancement',
  
  // Snapshot configuration
  snapshotSerializers: ['enzyme-to-json/serializer'],
  
  // Custom matchers
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.ts',
    '<rootDir>/src/services/__tests__/setup/customMatchers.ts'
  ]
};