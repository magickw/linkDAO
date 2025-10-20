/**
 * Jest Configuration for Integration Tests
 * 
 * Specialized configuration for running comprehensive integration tests
 * with proper setup, teardown, and reporting.
 */

const path = require('path');

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Root directory
  rootDir: path.resolve(__dirname),
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/tests/integration/**/*.test.ts',
    '<rootDir>/src/tests/integration/**/*.test.js'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/__fixtures__/',
    '/test-reports/'
  ],
  
  // TypeScript support
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        compilerOptions: {
          module: 'commonjs',
          target: 'es2020',
          lib: ['es2020'],
          allowJs: true,
          skipLibCheck: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          forceConsistentCasingInFileNames: true,
          moduleResolution: 'node',
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true
        }
      }
    }]
  },
  
  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/src/tests/$1',
    '^@fixtures/(.*)$': '<rootDir>/src/tests/fixtures/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1'
  },
  
  // Setup and teardown
  globalSetup: '<rootDir>/src/tests/integration/globalSetup.ts',
  globalTeardown: '<rootDir>/src/tests/integration/globalTeardown.ts',
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/integration/setupTests.ts'
  ],
  
  // Test execution
  maxWorkers: 1, // Run tests sequentially to avoid conflicts
  testTimeout: 60000, // 60 seconds timeout for integration tests
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  
  // Coverage configuration
  collectCoverage: false, // Disabled by default, enable with --coverage flag
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/tests/**/*',
    '!src/**/*.test.{ts,js}',
    '!src/**/*.spec.{ts,js}',
    '!src/db/migrations/**/*',
    '!src/scripts/**/*',
    '!src/docs/**/*'
  ],
  coverageDirectory: '<rootDir>/coverage/integration',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'json-summary',
    'lcov'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  
  // Reporting
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/test-reports/integration',
        filename: 'integration-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Backend API Integration Test Report',
        logoImgPath: undefined,
        inlineSource: false
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-reports/integration',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: false,
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ]
  ],
  
  // Environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  
  // Custom matchers and utilities
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/integration/setupTests.ts'
  ],
  
  // Error handling
  errorOnDeprecated: true,
  bail: false, // Continue running tests even if some fail
  
  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache/integration',
  
  // Watch mode (for development)
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/test-reports/'
  ],
  
  // Logging
  silent: false,
  
  // Custom test sequencer for deterministic test order
  // testSequencer: '<rootDir>/src/tests/integration/testSequencer.js'
};