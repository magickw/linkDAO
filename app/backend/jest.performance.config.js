module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests/performance'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/tests/**',
  ],
  coverageDirectory: 'coverage/performance',
  verbose: true,
  testTimeout: 60000, // 60 seconds for performance tests
  setupFilesAfterEnv: ['<rootDir>/src/tests/performance/setup.ts'],
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-reports',
      outputName: 'performance-test-results.xml',
    }]
  ],
  // Performance test specific settings
  maxWorkers: 1, // Run performance tests sequentially
  forceExit: true,
  detectOpenHandles: true,
};