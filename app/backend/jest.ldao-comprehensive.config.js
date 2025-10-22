/**
 * Jest Configuration for LDAO Token Acquisition System Comprehensive Tests
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  displayName: 'LDAO Comprehensive Tests',
  testMatch: [
    '<rootDir>/src/tests/comprehensive/ldaoAcquisition*.test.ts',
    '<rootDir>/src/tests/performance/ldaoAcquisition*.test.ts'
  ],
  testTimeout: 300000, // 5 minutes per test
  maxWorkers: 4,
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/comprehensive/jestSetup.ts'
  ],
  globalSetup: '<rootDir>/src/tests/comprehensive/globalSetup.ts',
  globalTeardown: '<rootDir>/src/tests/comprehensive/globalTeardown.ts',
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: [
    'src/services/ldaoAcquisitionService.ts',
    'src/controllers/ldaoAcquisitionController.ts',
    'src/routes/ldaoAcquisitionRoutes.ts',
    'src/services/stripePaymentService.ts',
    'src/services/moonPayService.ts',
    'src/services/uniswapV3Service.ts',
    'src/services/multiChainDEXService.ts',
    'src/services/earningActivityService.ts',
    'src/services/referralService.ts',
    'src/services/enhancedStakingService.ts',
    'src/services/bridgeMonitoringService.ts',
    'src/services/kycComplianceService.ts',
    'src/middleware/securityMiddleware.ts',
    'src/config/ldaoAcquisitionConfig.ts'
  ],
  coverageReporters: [
    'text',
    'html',
    'json',
    'lcov'
  ],
  coverageDirectory: '<rootDir>/coverage/ldao-comprehensive',
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/services/ldaoAcquisitionService.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/controllers/ldaoAcquisitionController.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './test-reports/ldao-comprehensive',
      filename: 'test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'LDAO Token Acquisition System - Test Report'
    }],
    ['jest-junit', {
      outputDirectory: './test-reports/ldao-comprehensive',
      outputName: 'junit.xml',
      suiteName: 'LDAO Comprehensive Tests'
    }]
  ],
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  // Custom test environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test',
    TEST_MODE: 'comprehensive',
    LOG_LEVEL: 'error'
  },
  // Module name mapping for better imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/src/tests/$1'
  },
  // Transform configuration
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'js',
    'json'
  ],
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  // Error handling
  errorOnDeprecated: true,
  // Performance monitoring
  logHeapUsage: true,
  // Custom matchers
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/comprehensive/jestSetup.ts',
    '<rootDir>/src/tests/comprehensive/customMatchers.ts'
  ]
};