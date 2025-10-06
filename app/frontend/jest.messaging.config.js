const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  displayName: 'Messaging System Tests',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/services/__tests__/messageEncryptionService.test.ts',
    '<rootDir>/src/services/__tests__/conversationManagementService.test.ts',
    '<rootDir>/src/services/__tests__/offlineMessageQueueService.test.ts',
    '<rootDir>/src/__tests__/integration/messaging/**/*.test.tsx',
    '<rootDir>/src/__tests__/security/messaging/**/*.test.ts'
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/testSetup.ts',
    '<rootDir>/src/__tests__/setup/messagingSetup.ts'
  ],

  // Module name mapping for TypeScript paths
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths || {}, {
      prefix: '<rootDir>/src/',
    }),
    // Mock static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'jest-transform-stub',
  },

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/services/messageEncryptionService.ts',
    'src/services/conversationManagementService.ts',
    'src/services/offlineMessageQueueService.ts',
    'src/components/Messaging/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
  ],
  
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],
  
  coverageDirectory: '<rootDir>/coverage/messaging',
  
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Specific thresholds for critical files
    'src/services/messageEncryptionService.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'src/services/conversationManagementService.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Test environment setup
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },

  // Global test configuration
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },

  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
  ],

  // Test timeout
  testTimeout: 30000,

  // Verbose output for debugging
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Error handling
  errorOnDeprecated: true,

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/build/',
    '<rootDir>/dist/',
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
    '<rootDir>/dist/',
  ],

  // Mock configuration
  modulePathIgnorePatterns: [
    '<rootDir>/build/',
    '<rootDir>/dist/',
  ],

  // Custom matchers and utilities
  setupFiles: [
    '<rootDir>/src/__tests__/setup/globalSetup.ts',
  ],

  // Snapshot configuration
  snapshotSerializers: [
    'enzyme-to-json/serializer',
  ],

  // Performance monitoring
  maxWorkers: '50%',
  
  // Cache configuration
  cacheDirectory: '<rootDir>/node_modules/.cache/jest/messaging',

  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/coverage/messaging/html-report',
        filename: 'messaging-test-report.html',
        pageTitle: 'Messaging System Test Report',
        logoImgPath: undefined,
        hideIcon: false,
        expand: true,
        openReport: false,
        includeFailureMsg: true,
        includeSuiteFailure: true,
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage/messaging',
        outputName: 'messaging-junit.xml',
        suiteName: 'Messaging System Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],

  // Custom test results processor
  testResultsProcessor: '<rootDir>/src/__tests__/messaging/testResultsProcessor.js',
};