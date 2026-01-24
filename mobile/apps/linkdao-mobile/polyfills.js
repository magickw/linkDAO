// Polyfills for browser APIs required by web3 libraries (viem, wagmi, etc.)
// All polyfills use require() for synchronous execution order

// Fix for @noble/hashes _toString error on Hermes
// Must be before any other imports
const { Buffer } = require('buffer');
global.Buffer = Buffer;

// Fix Uint8Array.prototype methods for @noble/hashes compatibility with Hermes
if (!Uint8Array.prototype._toString) {
  Uint8Array.prototype._toString = function() {
    return String.fromCharCode.apply(null, this);
  };
}

// Ensure Uint8Array has all required methods
if (!Uint8Array.prototype.slice) {
  Uint8Array.prototype.slice = function(start, end) {
    return new Uint8Array(Array.prototype.slice.call(this, start, end));
  };
}

// Polyfill TextEncoder/TextDecoder for @noble/hashes
if (typeof global.TextEncoder === 'undefined') {
  try {
    const encoding = require('text-encoding');
    global.TextEncoder = encoding.TextEncoder;
    global.TextDecoder = encoding.TextDecoder;
  } catch (e) {
    // Fallback TextEncoder implementation
    global.TextEncoder = function TextEncoder() {};
    global.TextEncoder.prototype.encode = function(str) {
      const buf = Buffer.from(str, 'utf8');
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    };

    global.TextDecoder = function TextDecoder() {};
    global.TextDecoder.prototype.decode = function(arr) {
      return Buffer.from(arr).toString('utf8');
    };
  }
}

// Import URL polyfill for React Native
require('react-native-url-polyfill/auto');

// Initialize window object if it doesn't exist
if (typeof window === 'undefined') {
  global.window = {};
}

// Polyfill crypto.getRandomValues for React Native using react-native-get-random-values
// This MUST be imported before uuid or other crypto libraries
require('react-native-get-random-values');

if (typeof global.crypto === 'undefined') {
  global.crypto = {};
}

// Polyfill crypto.subtle for React Native
if (typeof global.crypto.subtle === 'undefined') {
  global.crypto.subtle = {};
}

// Polyfill addEventListener
if (typeof global.window.addEventListener !== 'function') {
  global.window.addEventListener = () => {};
}

// Polyfill removeEventListener
if (typeof global.window.removeEventListener !== 'function') {
  global.window.removeEventListener = () => {};
}

// Polyfill matchMedia
if (typeof global.window.matchMedia !== 'function') {
  global.window.matchMedia = () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}

// Polyfill requestAnimationFrame
if (typeof global.window.requestAnimationFrame !== 'function') {
  global.window.requestAnimationFrame = (callback) => setTimeout(callback, 16);
}

// Polyfill cancelAnimationFrame
if (typeof global.window.cancelAnimationFrame !== 'function') {
  global.window.cancelAnimationFrame = (id) => clearTimeout(id);
}

// Polyfill setTimeout
if (typeof global.window.setTimeout !== 'function') {
  global.window.setTimeout = setTimeout;
}

// Polyfill clearTimeout
if (typeof global.window.clearTimeout !== 'function') {
  global.window.clearTimeout = clearTimeout;
}

// Polyfill setInterval
if (typeof global.window.setInterval !== 'function') {
  global.window.setInterval = setInterval;
}

// Polyfill clearInterval
if (typeof global.window.clearInterval !== 'function') {
  global.window.clearInterval = clearInterval;
}

// Polyfill localStorage
if (typeof global.window.localStorage === 'undefined') {
  global.window.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  };
}

// Also add to global for compatibility
if (typeof global.addEventListener !== 'function') {
  global.addEventListener = global.window.addEventListener;
}

if (typeof global.removeEventListener !== 'function') {
  global.removeEventListener = global.window.removeEventListener;
}

if (typeof global.matchMedia !== 'function') {
  global.matchMedia = global.window.matchMedia;
}

if (typeof global.requestAnimationFrame !== 'function') {
  global.requestAnimationFrame = global.window.requestAnimationFrame;
}

if (typeof global.cancelAnimationFrame !== 'function') {
  global.cancelAnimationFrame = global.window.cancelAnimationFrame;
}

if (typeof global.setTimeout !== 'function') {
  global.setTimeout = global.window.setTimeout;
}

if (typeof global.clearTimeout !== 'function') {
  global.clearTimeout = global.window.clearTimeout;
}

if (typeof global.setInterval !== 'function') {
  global.setInterval = global.window.setInterval;
}

if (typeof global.clearInterval !== 'function') {
  global.clearInterval = global.window.clearInterval;
}
