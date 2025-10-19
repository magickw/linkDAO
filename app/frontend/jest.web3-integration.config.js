/**
 * Jest Configuration for Web3 Native Community Enhancements Integration Tests
 * Specialized configuration for testing Web3 features with blockchain integration
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  
  // Test environment configuration
  displayName: 'Web3 Integration Tests',
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/__tests__/web3-integration/**/*.test.{ts,tsx}',
    '<rootDir>/src/__tests__/integration/Web3*.test.{ts,tsx}',
    '<rootDir>/src/__tests__/performance/Web3*.test.{ts,tsx}',
    '<rootDir>/src/__tests__/accessibility/Web3*.test.{ts,tsx}',
  ],
  
  // Note: setupFilesAfterEnv is merged later with baseConfig.setupFilesAfterEnv
  
  // Global setup and teardown for blockchain
  globalSetup: '<rootDir>/src/__tests__/setup/web3GlobalSetup.ts',
  globalTeardown: '<rootDir>/src/__tests__/setup/web3GlobalTeardown.ts',
  
  // Module name mapping for Web3 mocks
  moduleNameMapping: {
    ...baseConfig.moduleNameMapping,
    '^@/web3/(.*)$': '<rootDir>/src/services/web3/$1',
    '^@/blockchain/(.*)$': '<rootDir>/src/services/blockchain/$1',
  // Redirect contract type imports to the generated TypeChain types (shims exist)
  '^@/contracts/(.*)$': '<rootDir>/src/types/typechain/$1',
  },
  
  // Transform configuration
  transform: {
    ...baseConfig.transform,
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
    'src/components/Web3/**/*.{ts,tsx}',
    'src/components/Staking/**/*.{ts,tsx}',
    'src/components/OnChainVerification/**/*.{ts,tsx}',
    'src/components/SmartContractInteraction/**/*.{ts,tsx}',
    'src/components/RealTimeUpdates/**/*.{ts,tsx}',
    'src/components/Mobile/Web3/**/*.{ts,tsx}',
    'src/components/CommunityEnhancements/**/*.{ts,tsx}',
    'src/services/web3/**/*.{ts,tsx}',
    'src/hooks/useWeb3*.{ts,tsx}',
    'src/hooks/useRealTime*.{ts,tsx}',
    'src/hooks/useTransaction*.{ts,tsx}',
    'src/utils/web3*.{ts,tsx}',
    'src/utils/progressiveEnhancement.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.stories.{ts,tsx}',
    '!**/__tests__/**',
    '!**/__mocks__/**',
  ],
  
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/components/Web3/': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/services/web3/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  
  // Test timeout for blockchain operations
  testTimeout: 120000, // 2 minutes
  
  // Environment variables for tests
  setupFiles: [
    '<rootDir>/src/__tests__/setup/web3EnvSetup.ts',
  ],
  
  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Performance and memory settings
  maxWorkers: '50%',
  workerIdleMemoryLimit: '512MB',
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-reports/web3-integration',
        outputName: 'junit.xml',
        suiteName: 'Web3 Integration Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: 'test-reports/web3-integration',
        filename: 'report.html',
        pageTitle: 'Web3 Integration Test Report',
        logoImgPath: undefined,
        hideIcon: false,
        expand: true,
        openReport: false,
      },
    ],
  ],
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'json-summary',
  ],
  
  coverageDirectory: 'coverage/web3-integration',
  
  // Verbose output for debugging
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Cache configuration
  cacheDirectory: '<rootDir>/node_modules/.cache/jest/web3-integration',
  
  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node',
  ],
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
    userAgent: 'node.js',
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
    '<rootDir>/dist/',
    '<rootDir>/.next/',
  ],
  
  // Watch plugins for development
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Snapshot configuration
  snapshotSerializers: [
    '@emotion/jest/serializer',
  ],
  
  // Custom matchers
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv || [],
    '<rootDir>/src/__tests__/setup/web3TestSetup.ts',
    '<rootDir>/src/__tests__/utils/web3CustomMatchers.ts',
  ],
};