/**
 * Jest Configuration for Performance Tests
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/tests/performance/**/*.test.ts'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/performance/setup.ts'
  ],
  

  
  // Coverage configuration
  collectCoverage: false, // Disable coverage for performance tests
  
  // Test timeout (longer for performance tests)
  testTimeout: 120000, // 2 minutes
  
  // Performance test specific settings
  maxWorkers: 1, // Run performance tests sequentially
  
  // Global setup and teardown
  globalSetup: '<rootDir>/src/tests/performance/globalSetup.ts',
  globalTeardown: '<rootDir>/src/tests/performance/globalTeardown.ts',
  
  // Environment variables
  setupFiles: ['<rootDir>/src/tests/performance/env.ts'],
  
  // Reporter configuration
  reporters: [
    'default'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Verbose output for performance analysis
  verbose: true,
  
  // Detect open handles (important for performance tests)
  detectOpenHandles: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Custom test results processor
  testResultsProcessor: '<rootDir>/src/tests/performance/resultsProcessor.js'
};