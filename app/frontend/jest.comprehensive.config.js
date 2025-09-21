const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  // Extended configuration for comprehensive testing
  testTimeout: 60000, // Increased timeout for complex tests
  
  // Test patterns for different test types
  testMatch: [
    '<rootDir>/src/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/__tests__/**/*.integration.test.{ts,tsx}',
    '<rootDir>/src/__tests__/**/*.e2e.test.{ts,tsx}',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/__tests__/**',
    '!src/mocks/**',
    '!src/e2e/**',
    // Include enhanced components for coverage
    'src/components/EnhancedPostComposer/**/*.{ts,tsx}',
    'src/components/TokenReactionSystem/**/*.{ts,tsx}',
    'src/components/Reputation/**/*.{ts,tsx}',
    'src/components/Navigation/**/*.{ts,tsx}',
    'src/components/SmartRightSidebar/**/*.{ts,tsx}',
    'src/components/Feed/**/*.{ts,tsx}',
    'src/components/VisualPolish/**/*.{ts,tsx}',
    'src/components/RealTimeNotifications/**/*.{ts,tsx}',
    'src/components/EnhancedSearch/**/*.{ts,tsx}',
    'src/components/Performance/**/*.{ts,tsx}',
    'src/contexts/**/*.{ts,tsx}',
    'src/hooks/**/*.{ts,tsx}',
    'src/services/**/*.{ts,tsx}',
  ],
  
  // Enhanced coverage thresholds for comprehensive testing
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // Specific thresholds for enhanced components
    './src/components/EnhancedPostComposer/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/components/TokenReactionSystem/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/components/Reputation/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/contexts/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/services/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  
  // Test environment setup for different test types
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
  
  // Setup files for comprehensive testing
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.ts',
    '<rootDir>/src/__tests__/setup/testSetup.ts',
  ],
  
  // Module name mapping for enhanced components
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@/components/EnhancedPostComposer/(.*)$': '<rootDir>/src/components/EnhancedPostComposer/$1',
    '^@/components/TokenReactionSystem/(.*)$': '<rootDir>/src/components/TokenReactionSystem/$1',
    '^@/components/Reputation/(.*)$': '<rootDir>/src/components/Reputation/$1',
    '^@/components/Navigation/(.*)$': '<rootDir>/src/components/Navigation/$1',
    '^@/components/SmartRightSidebar/(.*)$': '<rootDir>/src/components/SmartRightSidebar/$1',
    '^@/components/Feed/(.*)$': '<rootDir>/src/components/Feed/$1',
    '^@/components/VisualPolish/(.*)$': '<rootDir>/src/components/VisualPolish/$1',
    '^@/components/RealTimeNotifications/(.*)$': '<rootDir>/src/components/RealTimeNotifications/$1',
    '^@/components/EnhancedSearch/(.*)$': '<rootDir>/src/components/EnhancedSearch/$1',
    '^@/components/Performance/(.*)$': '<rootDir>/src/components/Performance/$1',
    '^@/contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
  },
  
  // Reporters for comprehensive testing
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'comprehensive-test-results.xml',
    }],
    ['jest-html-reporters', {
      publicPath: './test-results',
      filename: 'comprehensive-test-report.html',
      expand: true,
    }],
  ],
  
  // Global test configuration
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
  
  // Transform configuration for different file types
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: ['next/babel'],
    }],
  },
  
  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Test result processor for enhanced reporting
  testResultsProcessor: '<rootDir>/src/__tests__/processors/testResultsProcessor.js',
  
  // Watch plugins for development
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Performance monitoring
  maxWorkers: '50%', // Use half of available CPU cores
  
  // Cache configuration
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output for comprehensive testing
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Test sequencing
  testSequencer: '<rootDir>/src/__tests__/sequencer/testSequencer.js',
};