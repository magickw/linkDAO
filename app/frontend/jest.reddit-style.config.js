const path = require('path');

module.exports = {
  displayName: 'Reddit-Style Community Tests',
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/components/Community/**/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/components/RedditStylePostCard/**/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/components/Mobile/**/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/__tests__/integration/RedditStyle*.test.{ts,tsx}',
    '<rootDir>/src/__tests__/e2e/RedditStyle*.test.{ts,tsx}',
    '<rootDir>/src/__tests__/accessibility/RedditStyle*.test.{ts,tsx}',
    '<rootDir>/src/__tests__/performance/*Reddit*.test.{ts,tsx}',
    '<rootDir>/src/__tests__/crossBrowser/*.test.{ts,tsx}'
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/redditStyleSetup.ts'
  ],

  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/mocks/(.*)$': '<rootDir>/src/mocks/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/src/__tests__/mocks/fileMock.js'
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

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/components/Community/**/*.{ts,tsx}',
    'src/components/RedditStylePostCard/**/*.{ts,tsx}',
    'src/components/Mobile/**/*.{ts,tsx}',
    'src/hooks/useViewMode.{ts,tsx}',
    'src/hooks/useFilterState.{ts,tsx}',
    'src/hooks/useSwipeGestures.{ts,tsx}',
    'src/hooks/useMobileSidebar.{ts,tsx}',
    'src/services/communityService.{ts,tsx}',
    'src/services/communityPostService.{ts,tsx}',
    'src/services/governanceService.{ts,tsx}',
    'src/services/pollService.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.stories.{ts,tsx}',
    '!**/__tests__/**',
    '!**/__mocks__/**'
  ],

  coverageDirectory: '<rootDir>/coverage/reddit-style',
  
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary'
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/components/Community/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/components/RedditStylePostCard/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Test environment setup
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },

  // Global setup and teardown
  globalSetup: '<rootDir>/src/__tests__/setup/globalSetup.ts',
  globalTeardown: '<rootDir>/src/__tests__/setup/globalTeardown.ts',

  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // Timeout configuration
  testTimeout: 30000,

  // Verbose output for debugging
  verbose: false,

  // Error handling
  errorOnDeprecated: true,
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/build/',
    '<rootDir>/dist/'
  ],

  // Performance optimization
  maxWorkers: '50%',
  
  // Custom test results processor
  testResultsProcessor: '<rootDir>/src/__tests__/processors/redditStyleResultsProcessor.js',

  // Custom reporters
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './test-reports/reddit-style',
      filename: 'reddit-style-test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Reddit-Style Community Test Report'
    }],
    ['jest-junit', {
      outputDirectory: './test-reports/reddit-style',
      outputName: 'junit.xml',
      suiteName: 'Reddit-Style Community Tests'
    }]
  ],

  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],

  // Test categories configuration
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: [
        '<rootDir>/src/components/**/__tests__/**/*.test.{ts,tsx}'
      ],
      testTimeout: 10000
    },
    {
      displayName: 'Integration Tests',
      testMatch: [
        '<rootDir>/src/__tests__/integration/**/*.test.{ts,tsx}'
      ],
      testTimeout: 20000
    },
    {
      displayName: 'E2E Tests',
      testMatch: [
        '<rootDir>/src/__tests__/e2e/**/*.test.{ts,tsx}'
      ],
      testTimeout: 60000
    },
    {
      displayName: 'Accessibility Tests',
      testMatch: [
        '<rootDir>/src/__tests__/accessibility/**/*.test.{ts,tsx}'
      ],
      testTimeout: 15000
    },
    {
      displayName: 'Performance Tests',
      testMatch: [
        '<rootDir>/src/__tests__/performance/**/*.test.{ts,tsx}'
      ],
      testTimeout: 30000
    },
    {
      displayName: 'Cross-Browser Tests',
      testMatch: [
        '<rootDir>/src/__tests__/crossBrowser/**/*.test.{ts,tsx}'
      ],
      testTimeout: 45000
    }
  ]
};