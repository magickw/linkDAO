/**
 * Jest Configuration for User Acceptance Tests
 * Specialized configuration for comprehensive user acceptance testing
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  
  // Test environment configuration
  displayName: 'User Acceptance Tests',
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/__tests__/user-acceptance/**/*.test.{ts,tsx}',
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/web3TestSetup.ts',
    '<rootDir>/src/__tests__/setup/userAcceptanceSetup.ts',
    '<rootDir>/jest.setup.ts',
  ],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/src/__tests__/setup/userAcceptanceGlobalSetup.ts',
  globalTeardown: '<rootDir>/src/__tests__/setup/userAcceptanceGlobalTeardown.ts',
  
  // Module name mapping
  moduleNameMapping: {
    ...baseConfig.moduleNameMapping,
    '^@/user-acceptance/(.*)$': '<rootDir>/src/__tests__/user-acceptance/$1',
    '^@/test-utils/(.*)$': '<rootDir>/src/__tests__/utils/$1',
  },
  
  // Transform configuration
  transform: {
    ...baseConfig.transform,
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
      },
    }],
  },
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/components/**/*.{ts,tsx}',
    'src/services/**/*.{ts,tsx}',
    'src/hooks/**/*.{ts,tsx}',
    'src/utils/**/*.{ts,tsx}',
    'src/pages/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.stories.{ts,tsx}',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!**/node_modules/**',
  ],
  
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/components/': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/services/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  
  // Test timeout for user acceptance tests
  testTimeout: 300000, // 5 minutes for comprehensive testing
  
  // Performance and memory settings
  maxWorkers: '50%',
  workerIdleMemoryLimit: '1GB',
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-reports/user-acceptance',
        outputName: 'junit.xml',
        suiteName: 'User Acceptance Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: 'test-reports/user-acceptance',
        filename: 'detailed-report.html',
        pageTitle: 'Web3 Native Community Enhancements - User Acceptance Test Report',
        logoImgPath: undefined,
        hideIcon: false,
        expand: true,
        openReport: false,
        darkTheme: false,
        includeFailureMsg: true,
        includeSuiteFailure: true,
      },
    ],
  ],
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'json-summary',
    'cobertura',
  ],
  
  coverageDirectory: 'coverage/user-acceptance',
  
  // Verbose output for detailed logging
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  bail: false, // Continue running tests even if some fail
  
  // Cache configuration
  cacheDirectory: '<rootDir>/node_modules/.cache/jest/user-acceptance',
  
  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node',
  ],
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
    userAgent: 'Mozilla/5.0 (compatible; UserAcceptanceTests/1.0)',
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
    '<rootDir>/dist/',
    '<rootDir>/.next/',
  ],
  
  // Watch plugins for development
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Snapshot configuration
  snapshotSerializers: [
    '@emotion/jest/serializer',
  ],
  
  // Custom test results processor
  testResultsProcessor: '<rootDir>/src/__tests__/utils/userAcceptanceResultsProcessor.js',
  
  // Notify configuration for CI/CD
  notify: false,
  notifyMode: 'failure-change',
  
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Detect open handles for cleanup
  detectOpenHandles: true,
  forceExit: false,
  
  // Silent mode for CI
  silent: false,
  
  // Custom matchers and utilities
  setupFiles: [
    '<rootDir>/src/__tests__/setup/userAcceptanceEnvSetup.ts',
  ],
};