const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  displayName: 'Support Documentation Tests',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    '<rootDir>/src/components/Support/__tests__/setup/testSetup.ts'
  ],
  testMatch: [
    '<rootDir>/src/components/Support/**/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/services/**/__tests__/**/*documentService*.test.{ts,tsx}',
    '<rootDir>/src/hooks/**/__tests__/**/*useDocument*.test.{ts,tsx}'
  ],
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/src/components/Support/__tests__/mocks/fileMock.js'
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  collectCoverageFrom: [
    'src/components/Support/**/*.{ts,tsx}',
    'src/services/**/documentService.{ts,tsx}',
    'src/hooks/**/useDocument*.{ts,tsx}',
    '!src/components/Support/**/*.d.ts',
    '!src/components/Support/**/__tests__/**',
    '!src/components/Support/**/stories/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/components/Support/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  testTimeout: 10000,
  maxWorkers: '50%',
  
  // Performance testing configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results/support-documentation',
      outputName: 'junit.xml'
    }],
    ['jest-html-reporters', {
      publicPath: 'test-results/support-documentation',
      filename: 'report.html',
      expand: true
    }]
  ],

  // Accessibility testing
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },

  // Custom test categories
  runner: '@jest/test-sequencer',
  
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  }
};