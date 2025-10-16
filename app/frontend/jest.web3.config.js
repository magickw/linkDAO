const baseConfig = require('./jest.config.js');

/**
 * Jest configuration specifically for Web3 component testing
 * Extends the base configuration with Web3-specific settings
 */
module.exports = {
  ...baseConfig,
  
  // Test environment setup
  displayName: 'Web3 Components',
  testEnvironment: 'jsdom',
  
  // Test file patterns for Web3 components
  testMatch: [
    '<rootDir>/src/components/Staking/**/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/components/OnChainVerification/**/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/components/SmartContractInteraction/**/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/components/RealTimeUpdates/**/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/components/Mobile/**/__tests__/**/*Web3*.test.{ts,tsx}',
    '<rootDir>/src/__tests__/integration/Web3*.test.{ts,tsx}',
    '<rootDir>/src/__tests__/accessibility/Web3*.test.{ts,tsx}',
    '<rootDir>/src/__tests__/performance/Web3*.test.{ts,tsx}',
  ],
  
  // Setup files for Web3 testing
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.ts',
    '<rootDir>/src/__tests__/setup/web3TestSetup.ts',
  ],
  
  // Module name mapping for Web3 components
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@/types/web3Post$': '<rootDir>/src/types/web3Post.ts',
    '^@/types/governance$': '<rootDir>/src/types/governance.ts',
    '^@/types/onChainVerification$': '<rootDir>/src/types/onChainVerification.ts',
    '^@/services/web3/(.*)$': '<rootDir>/src/services/web3/$1',
    '^@/hooks/useWeb3$': '<rootDir>/src/hooks/useWeb3.ts',
    '^@/contexts/Web3Context$': '<rootDir>/src/contexts/Web3Context.tsx',
  },
  
  // Transform configuration for Web3 libraries
  transform: {
    ...baseConfig.transform,
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        target: 'es2020',
        lib: ['es2020', 'dom'],
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
      },
    }],
  },
  
  // Transform ignore patterns for Web3 node modules
  transformIgnorePatterns: [
    'node_modules/(?!(viem|@wagmi|@tanstack/react-query|framer-motion)/)',
  ],
  
  // Test timeout for Web3 operations
  testTimeout: 30000,
  
  // Coverage configuration for Web3 components
  collectCoverageFrom: [
    'src/components/Staking/**/*.{ts,tsx}',
    'src/components/OnChainVerification/**/*.{ts,tsx}',
    'src/components/SmartContractInteraction/**/*.{ts,tsx}',
    'src/components/RealTimeUpdates/**/*.{ts,tsx}',
    'src/components/Mobile/**/*Web3*.{ts,tsx}',
    'src/services/web3/**/*.{ts,tsx}',
    'src/hooks/useWeb3*.{ts,tsx}',
    'src/contexts/Web3*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
  ],
  
  // Coverage thresholds for Web3 components
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/components/Staking/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/components/OnChainVerification/': {
      branches: 88,
      functions: 88,
      lines: 88,
      statements: 88,
    },
    './src/components/SmartContractInteraction/': {
      branches: 87,
      functions: 87,
      lines: 87,
      statements: 87,
    },
    './src/services/web3/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  // Coverage directory
  coverageDirectory: '<rootDir>/coverage/web3-components',
  
  // Global setup for Web3 testing
  globalSetup: '<rootDir>/src/__tests__/setup/web3GlobalSetup.ts',
  globalTeardown: '<rootDir>/src/__tests__/setup/web3GlobalTeardown.ts',
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
    userAgent: 'node.js',
  },
  
  // Mock configuration for Web3 libraries
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules/@walletconnect/',
    '<rootDir>/node_modules/wagmi/dist/',
  ],
  
  // Verbose output for debugging
  verbose: true,
  
  // Fail fast on first test failure (useful for CI)
  bail: false,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Error on deprecated features
  errorOnDeprecated: true,
  
  // Notify mode for watch
  notify: false,
  
  // Max workers for parallel testing
  maxWorkers: '50%',
  
  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache/web3',
  
  // Reporters for test results
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/web3-components/html-report',
      filename: 'web3-test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Web3 Components Test Report',
    }],
    ['jest-junit', {
      outputDirectory: './coverage/web3-components',
      outputName: 'web3-junit.xml',
      suiteName: 'Web3 Components Tests',
    }],
  ],
  
  // Watch plugins for development
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Snapshot serializers
  snapshotSerializers: [
    'enzyme-to-json/serializer',
  ],
  
  // Custom test sequencer for Web3 tests
  testSequencer: '<rootDir>/src/__tests__/utils/web3TestSequencer.js',
};