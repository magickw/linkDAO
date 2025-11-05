/**
 * Crypto polyfills for Web3 packages
 * Provides web-compatible implementations for crypto functions
 */

// Polyfill for react-native-get-random-values
if (typeof global !== 'undefined' && !global.crypto) {
  try {
    global.crypto = {};
  } catch {
    // Crypto object might be read-only, skip
  }
}

if (typeof window !== 'undefined' && window.crypto && typeof global !== 'undefined' && global.crypto && !global.crypto.getRandomValues) {
  try {
    global.crypto.getRandomValues = window.crypto.getRandomValues.bind(window.crypto);
  } catch {
    // getRandomValues might be read-only, skip
  }
}

// Fallback getRandomValues implementation
const getRandomValues = (array) => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    return window.crypto.getRandomValues(array);
  }
  
  // Fallback for environments without crypto.getRandomValues
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
};

// Ensure crypto.getRandomValues is available globally
if (typeof global !== 'undefined') {
  try {
    global.crypto = global.crypto || {};
    if (!global.crypto.getRandomValues) {
      global.crypto.getRandomValues = getRandomValues;
    }
  } catch {
    // Crypto object might be read-only, skip
  }
}

// Buffer polyfill for Web3 packages
const BufferPolyfill = (() => {
  if (typeof Buffer !== 'undefined') {
    return Buffer;
  }
  
  // Simple Buffer-like implementation for basic operations
  class SimpleBuffer {
    constructor(data) {
      if (typeof data === 'number') {
        this.data = new Uint8Array(data);
      } else if (typeof data === 'string') {
        this.data = new TextEncoder().encode(data);
      } else if (data instanceof Uint8Array) {
        this.data = data;
      } else if (Array.isArray(data)) {
        this.data = new Uint8Array(data);
      } else {
        this.data = new Uint8Array(0);
      }
    }
    
    static from(data) {
      return new SimpleBuffer(data);
    }
    
    static alloc(size, fill = 0) {
      const buffer = new SimpleBuffer(size);
      buffer.data.fill(fill);
      return buffer;
    }
    
    static isBuffer(obj) {
      return obj instanceof SimpleBuffer;
    }
    
    toString(encoding = 'utf8') {
      if (encoding === 'hex') {
        return Array.from(this.data)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      }
      return new TextDecoder().decode(this.data);
    }
    
    get length() {
      return this.data.length;
    }
    
    slice(start, end) {
      return new SimpleBuffer(this.data.slice(start, end));
    }
  }
  
  return SimpleBuffer;
})();

// Process polyfill for Web3 packages
const ProcessPolyfill = {
  env: {
    NODE_ENV: typeof process !== 'undefined' ? process.env.NODE_ENV : 'production',
    ...((typeof process !== 'undefined' && process.env) || {})
  },
  version: '16.0.0',
  versions: {
    node: '16.0.0'
  },
  platform: 'browser',
  browser: true,
  nextTick: (callback, ...args) => {
    setTimeout(() => callback(...args), 0);
  }
};

// Ensure global polyfills are available
if (typeof global !== 'undefined') {
  try {
    global.Buffer = global.Buffer || BufferPolyfill;
    global.process = global.process || ProcessPolyfill;
  } catch {
    // Global might be read-only, skip
  }
}

if (typeof window !== 'undefined') {
  try {
    window.Buffer = window.Buffer || BufferPolyfill;
    window.process = window.process || ProcessPolyfill;
    window.global = window.global || window;
  } catch {
    // Window properties might be read-only, skip
  }
}

module.exports = {
  getRandomValues,
  Buffer: BufferPolyfill,
  process: ProcessPolyfill
};