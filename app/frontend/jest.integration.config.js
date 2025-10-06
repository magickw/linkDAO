const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  displayName: 'Integration Tests',
  testMatch: [
    '<rootDir>/src/__tests__/integration/**/*.integration.test.{ts,tsx}'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.ts',
    '<rootDir>/src/__tests__/setup/integrationSetup.ts'
  ],
  testTimeout: 30000, // 30 seconds for integration tests
  collectCoverageFrom: [
    'src/components/**/*.{ts,tsx}',
    'src/services/**/*.{ts,tsx}',
    'src/hooks/**/*.{ts,tsx}',
    'src/contexts/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/mocks/**',
    '!src/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    // Cross-feature integration components
    './src/services/contentSharingService.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/services/realTimeNotificationService.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/services/globalSearchService.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/components/Notifications/NotificationSystem.tsx': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageDirectory: '<rootDir>/coverage/integration',
  // Longer timeout for WebSocket and real-time tests
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  // Mock WebSocket for testing
  setupFiles: [
    '<rootDir>/src/__tests__/setup/webSocketMock.ts'
  ],
  // Additional test environment setup
  globalSetup: '<rootDir>/src/__tests__/setup/globalSetup.ts',
  globalTeardown: '<rootDir>/src/__tests__/setup/globalTeardown.ts',
  // Verbose output for integration tests
  verbose: true,
  // Fail fast on first test failure in CI
  bail: process.env.CI ? 1 : 0,
  // Parallel test execution
  maxWorkers: process.env.CI ? 2 : '50%',
  // Test result processor for detailed reporting
  testResultsProcessor: '<rootDir>/src/__tests__/setup/testResultsProcessor.js'
};