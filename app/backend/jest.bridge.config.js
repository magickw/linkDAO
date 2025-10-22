/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/tests/*bridge*.test.ts',
    '**/tests/**/*bridge*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/services/bridge*.ts',
    'src/controllers/bridge*.ts',
    'src/routes/bridge*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  coverageDirectory: 'coverage/bridge',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup/bridge.setup.ts'],
  testTimeout: 30000,
  maxWorkers: 4,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/src/tests/$1'
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/src/tests/'
  ],
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results/bridge',
      outputName: 'bridge-test-results.xml',
      suiteName: 'Bridge Tests'
    }]
  ],
  // Custom test environment variables
  setupFiles: ['<rootDir>/src/tests/setup/env.ts']
};