const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  displayName: 'Simple Seller Integration Tests',
  testMatch: [
    '<rootDir>/src/__tests__/integration/seller/SellerSimpleIntegrationTest.test.tsx'
  ],
  setupFilesAfterEnv: [
    '@testing-library/jest-dom',
  ],
  testTimeout: 30000, // 30 seconds for integration tests
  
  // Test environment configuration
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Module name mapping for basic imports only
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/context/(.*)$': '<rootDir>/src/context/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    // Mock CSS and static files
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/src/__tests__/__mocks__/fileMock.js',
  },
  
  // Verbose output for integration tests
  verbose: true,
  
  // Fail fast on first test failure in CI
  bail: process.env.CI ? 1 : 0,
  
  // Parallel test execution
  maxWorkers: process.env.CI ? 2 : '50%',
  
  // Cache configuration
  cacheDirectory: '<rootDir>/node_modules/.cache/jest/seller-simple',
  
  // Clear cache before running tests
  clearMocks: true,
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/test-reports/',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/components/Marketplace/Seller/**/*.{ts,tsx}',
    'src/components/Seller/**/*.{ts,tsx}',
    'src/services/seller*.{ts,tsx}',
    'src/hooks/useSeller*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/mocks/**',
    '!src/__tests__/**'
  ],
  coverageDirectory: '<rootDir>/coverage/seller-simple',
  coverageReporters: ['text', 'lcov', 'html'],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);