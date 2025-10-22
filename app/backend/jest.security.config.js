/** @type {import('jest').Config} */
module.exports = {
  displayName: 'Security & Compliance Tests',
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test file patterns for security tests
  testMatch: [
    '**/tests/security-*.test.ts',
    '**/tests/compliance-*.test.ts',
    '**/tests/vulnerability-*.test.ts',
    '**/tests/penetration-*.test.ts'
  ],
  
  // Setup and teardown
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/setup/security.setup.ts'
  ],
  
  // Coverage configuration for security tests
  collectCoverage: true,
  coverageDirectory: 'coverage/security',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  // Focus coverage on security-related files
  collectCoverageFrom: [
    'src/services/security*.ts',
    'src/services/kyc*.ts',
    'src/services/aml*.ts',
    'src/services/compliance*.ts',
    'src/services/vulnerability*.ts',
    'src/services/dataEncryption*.ts',
    'src/middleware/security*.ts',
    'src/middleware/auth*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  
  // Coverage thresholds for security code
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/services/security*': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/services/kyc*': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/services/compliance*': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Test timeouts for security tests (they may take longer)
  testTimeout: 120000,
  
  // Environment variables for security testing
  setupFiles: ['<rootDir>/src/tests/setup/env.setup.ts'],
  
  // Module path mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/src/tests/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  
  // Global setup and teardown for security tests
  globalSetup: '<rootDir>/src/tests/setup/globalSetup.ts',
  globalTeardown: '<rootDir>/src/tests/setup/globalTeardown.ts',
  
  // Verbose output for security test results
  verbose: true,
  
  // Fail fast on first test failure for critical security tests
  bail: false,
  
  // Clear mocks between tests for security isolation
  clearMocks: true,
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Reporter configuration for security test results
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './test-reports/security',
      filename: 'security-test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'LDAO Security & Compliance Test Report'
    }],
    ['jest-junit', {
      outputDirectory: './test-reports/security',
      outputName: 'security-junit.xml',
      suiteName: 'Security & Compliance Tests'
    }]
  ],
  
  // Test result processor for security metrics
  testResultsProcessor: '<rootDir>/src/tests/processors/securityResultsProcessor.js'
};