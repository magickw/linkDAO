const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  displayName: 'Connectivity Tests',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts', '<rootDir>/src/services/__tests__/setup/testSetup.ts'],
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/src/services/__tests__/connectivityTestValidation.test.ts',
    '<rootDir>/src/services/__tests__/connectivityIntegration.test.ts',
    '<rootDir>/src/services/__tests__/circuitBreakerFunctionality.test.ts',
    '<rootDir>/src/services/__tests__/offlineSupportActionQueue.test.ts',
    '<rootDir>/src/services/__tests__/endToEndConnectivityTests.test.ts',
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/services/circuitBreaker.ts',
    'src/services/enhancedRequestManager.ts',
    'src/services/actionQueueService.ts',
    'src/hooks/useResilientAPI.ts',
    'src/hooks/useRequestCoalescing.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage/connectivity',
  testTimeout: 30000, // 30 seconds for integration tests
  setupFiles: ['<rootDir>/src/services/__tests__/setup/globalMocks.ts'],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);