/** @type {import('jest').Config} */
module.exports = {
  displayName: 'Security & Compliance Tests',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/tests/**/*security*.test.ts',
    '**/tests/**/*compliance*.test.ts',
    '**/tests/**/*penetration*.test.ts',
    '**/tests/**/*vulnerability*.test.ts',
    '**/tests/**/kyc*.test.ts',
    '**/tests/**/aml*.test.ts',
    '**/tests/**/incident*.test.ts',
    '**/tests/**/monitoring*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/services/kycComplianceService.ts',
    'src/services/amlTransactionMonitoring.ts',
    'src/services/complianceReporting.ts',
    'src/services/securityIncidentResponse.ts',
    'src/services/securityMonitoringService.ts',
    'src/services/vulnerabilityScanner.ts',
    'src/controllers/securityController.ts',
    'src/middleware/securityMiddleware.ts'
  ],
  coverageDirectory: 'coverage/security',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup/security.setup.ts'],
  testTimeout: 30000,
  verbose: true,
  bail: false,
  maxWorkers: 1, // Run security tests sequentially for better isolation
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};