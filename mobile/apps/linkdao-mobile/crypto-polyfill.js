// Crypto polyfill for ws package
// Provides minimal crypto functions needed by ws in React Native

const crypto = {
  randomFillSync(buffer, offset, size) {
    offset = offset || 0;
    size = size || buffer.length - offset;

    const randomBytes = new Uint8Array(size);
    if (global.crypto && global.crypto.getRandomValues) {
      global.crypto.getRandomValues(randomBytes);
    } else {
      for (let i = 0; i < size; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
    }

    buffer.set(randomBytes, offset);
    return buffer;
  },

  randomFillSyncSafe(buffer, offset, size) {
    return crypto.randomFillSync(buffer, offset, size);
  },

  // Additional methods that might be required
  getRandomValues(buffer) {
    if (global.crypto && global.crypto.getRandomValues) {
      return global.crypto.getRandomValues(buffer);
    }
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
    return buffer;
  },
};

module.exports = crypto;
