console.log('jest.config.js loaded');
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': ['@swc/jest'],
    // Use a no-op transformer for .js files to prevent Babel from processing them
    // This is a common workaround when Babel is interfering
    '^.+\\.(js|jsx)$': 'babel-jest', // Assuming babel-jest is installed or will be mocked
  },
  transformIgnorePatterns: ['/node_modules/'],
  // If 'babel-jest' is not installed or causing issues, you might need to mock it
  // For example, if you have no .babelrc, Jest might use a default babel config.
  // If this line below causes an error, remove it.
  // 'babel-jest' can be replaced by a stub if no actual JS transpilation is needed
  // like: '^.+\\.(js|jsx)$': '<rootDir>/node_modules/jest-transform-stub',
};
