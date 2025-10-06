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
    'src/hooks/useFeedPreferences.ts',
    'src/hooks/useIntelligentCache.ts',
    'src/types/feed.ts',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/components/Feed/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/services/feedService.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.ts',
    '<rootDir>/src/__tests__/setup/testSetup.ts'
  ],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  // Performance testing configuration
  testTimeout: 30000,
  maxWorkers: '50%',
  
  // Mock configuration for feed tests
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@/components/Feed/(.*)$': '<rootDir>/src/components/Feed/$1',
    '^@/services/feedService$': '<rootDir>/src/services/feedService.ts',
    '^@/hooks/useFeedPreferences$': '<rootDir>/src/hooks/useFeedPreferences.ts',
    '^@/hooks/useIntelligentCache$': '<rootDir>/src/hooks/useIntelligentCache.ts',
  },
  
  // Transform configuration
  transform: {
    ...baseConfig.transform,
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  
  // Global setup for feed tests
  globalSetup: '<rootDir>/src/__tests__/setup/globalSetup.ts',
  globalTeardown: '<rootDir>/src/__tests__/setup/globalTeardown.ts',
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './test-reports/feed',
      filename: 'feed-test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Feed System Test Report',
      logoImgPath: undefined,
      includeFailureMsg: true,
      includeSuiteFailure: true,
    }],
    ['jest-junit', {
      outputDirectory: './test-reports/feed',
      outputName: 'feed-junit.xml',
      suiteName: 'Feed System Tests',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true,
    }],
  ],
  
  // Coverage configuration
  coverageDirectory: './coverage/feed',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary'
  ],
  
  // Performance and memory settings
  logHeapUsage: true,
  detectOpenHandles: true,
  forceExit: true,
  
  // Custom test environment variables
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
    userAgent: 'jest-test-environment'
  },
  
  // Mock implementations for feed-specific modules
  setupFiles: [
    '<rootDir>/src/__tests__/setup/feedMocks.ts'
  ],
  
  // Test result processor for performance metrics
  testResultsProcessor: '<rootDir>/src/__tests__/setup/performanceProcessor.js',
  
  // Verbose output for debugging
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Cache configuration
  cacheDirectory: '<rootDir>/.jest-cache/feed',
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/test-reports/',
    '<rootDir>/.next/',
  ],
  
  // Custom matchers for feed testing
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv || [],
    '<rootDir>/src/__tests__/setup/feedMatchers.ts'
  ],
};