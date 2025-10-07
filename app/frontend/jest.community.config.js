/**
 * Jest Configuration for Community System Tests
 * Specialized configuration for testing community components and workflows
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.ts',
    '<rootDir>/src/__tests__/setup/testSetup.ts'
  ],
  
  // Test patterns - focus on community tests
  testMatch: [
    '<rootDir>/src/__tests__/unit/Community/**/*.test.{ts,tsx}',
    '<rootDir>/src/__tests__/integration/Community/**/*.test.{ts,tsx}',
    '<rootDir>/src/__tests__/performance/Community/**/*.test.{ts,tsx}',
    '<rootDir>/src/components/Community/**/__tests__/**/*.test.{ts,tsx}'
  ],
  
  // Module name mapping
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@/mocks/(.*)$': '<rootDir>/src/mocks/$1',
    
    // Mock static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/src/__mocks__/fileMock.js'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }],
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Coverage configuration - focus on community components
  collectCoverageFrom: [
    'src/components/Community/**/*.{ts,tsx}',
    'src/services/community*.{ts,tsx}',
    'src/hooks/useCommunity*.{ts,tsx}',
    'src/utils/community*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**'
  ],
  
  // Coverage thresholds - stricter for community system
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/components/Community/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/services/community*.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'clover'
  ],
  
  // Coverage directory
  coverageDirectory: '<rootDir>/coverage/community',
  
  // Test timeout - longer for integration tests
  testTimeout: 30000,
  
  // Globals for testing
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }
  },
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@testing-library|@babel))'
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Verbose output for debugging
  verbose: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Max workers for parallel execution
  maxWorkers: '50%',
  
  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache/community',
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-reports/community',
        outputName: 'junit.xml',
        suiteName: 'Community System Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › '
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/test-reports/community',
        filename: 'community-test-report.html',
        pageTitle: 'Community System Test Report',
        logoImgPath: undefined,
        hideIcon: false,
        expand: true,
        openReport: false
      }
    ]
  ],
  
  // Custom test sequencer for performance tests
  testSequencer: '<rootDir>/src/__tests__/setup/communityTestSequencer.js',
  
  // Error on deprecated features
  errorOnDeprecated: true,
  
  // Notify mode
  notify: false,
  
  // Notify mode
  notify: false
};