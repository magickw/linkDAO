const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  displayName: 'Feed System Tests',
  testMatch: [
    '<rootDir>/src/__tests__/unit/Feed/**/*.test.{ts,tsx}',
    '<rootDir>/src/__tests__/integration/Feed/**/*.test.{ts,tsx}',
    '<rootDir>/src/__tests__/performance/Feed/**/*.test.{ts,tsx}'
  ],
  collectCoverageFrom: [
    'src/components/Feed/**/*.{ts,tsx}',
    'src/services/feedService.ts',
    'src/services/serviceWorkerCacheService.ts',
    'src/services/intelligentCacheService.ts',
    'src/hooks/useFeedPreferences.ts',
    'src/hooks/useIntelligentCache.ts',
    'src/types/feed.ts',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__mocks__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/components/Feed/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/services/feedService.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  testTimeout: 30000,
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/testSetup.ts',
    '<rootDir>/jest.setup.ts'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/Feed/(.*)$': '<rootDir>/src/components/Feed/$1',
    '^@/services/feedService$': '<rootDir>/src/services/feedService.ts',
    '^@/hooks/useFeedPreferences$': '<rootDir>/src/hooks/useFeedPreferences.ts',
    '^@/hooks/useIntelligentCache$': '<rootDir>/src/hooks/useIntelligentCache.ts'
  },
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }
  },
  // Performance test specific configuration
  testRunner: 'jest-circus/runner',
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest-feed',
  
  // Custom reporters for detailed output
  reporters: ['default'],

  // Performance monitoring
  verbose: false,
  silent: false,
  
  // Mock configuration for feed-specific tests
  modulePathIgnorePatterns: [
    '<rootDir>/src/__tests__/(?!.*Feed).*'
  ],

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
    '^.+\\.(js|jsx)$': 'babel-jest'
  },

  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/'
  ],

  // Watch plugins for development
  watchPlugins: [],

  // Error handling
  errorOnDeprecated: true,
  bail: false,
  
  // Memory management for performance tests
  workerIdleMemoryLimit: '1GB',
  
  // Custom matchers and utilities
  setupFiles: []
};