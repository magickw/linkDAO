// CRITICAL: _toString polyfill must be defined BEFORE any other code runs
// This is required by react-native-reanimated before native module loads
// Using simple implementation without closures
global._toString = global._toString || function(value) {
  return value === null ? 'null'
    : value === undefined ? 'undefined'
    : typeof value === 'object' ? Object.prototype.toString.call(value)
    : String(value);
};

// Load remaining polyfills
require('./polyfills');

// Import the App entry point which sets up Expo Router
require('./App');
