/**
 * Jest Configuration for Comprehensive Test Suite
 * Specialized configuration for running the complete test suite
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test file patterns
  roots: ['<rootDir>/src/tests/comprehensive'],
  testMatch: [
    '**/comprehensive/**/*.test.ts',
    '**/comprehensive/**/test-runner.ts'
  ],
  
  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/src/tests/$1'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/tests/**',
    '!src/index.ts',
    '!src/simpleServer.ts'
  ],
  coverageDirectory: 'coverage/comprehensive',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'cobertura'
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Test execution configuration
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 4, // Limit workers for comprehensive tests
  
  // Timeouts
  testTimeout: 600000, // 10 minutes default timeout
  
  // Setup and teardown
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/comprehensive/setup.ts'
  ],
  globalSetup: '<rootDir>/src/tests/comprehensive/globalSetup.ts',
  globalTeardown: '<rootDir>/src/tests/comprehensive/globalTeardown.ts',
  
  // Reporting
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/comprehensive/html-report',
        filename: 'comprehensive-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'AI Content Moderation - Comprehensive Test Report'
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './coverage/comprehensive',
        outputName: 'junit.xml',
        suiteName: 'Comprehensive Test Suite',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
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
      }
    ]
  },
  
  // Environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'error'
  },
  
  // Global variables
  globals: {
    'ts-jest': {
      useESM: false
    },
    __TEST_SUITE__: 'comprehensive'
  },
  
  // Test sequencing
  testSequencer: '<rootDir>/src/tests/comprehensive/testSequencer.js',
  
  // Error handling
  errorOnDeprecated: true,
  bail: false, // Don't bail on first failure for comprehensive tests
  
  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest/comprehensive',
  
  // Watch mode (disabled for comprehensive tests)
  watchman: false,
  
  // Performance monitoring
  logHeapUsage: true,
  
  // Custom matchers and utilities
  setupFiles: [
    '<rootDir>/src/tests/comprehensive/jestSetup.ts'
  ]
};