/**
 * Web-compatible fallback for @react-native-async-storage/async-storage
 * This provides localStorage-based implementation for web environments
 */

const AsyncStorage = {
  /**
   * Get an item from storage
   * @param {string} key - The key to retrieve
   * @returns {Promise<string|null>} The stored value or null
   */
  async getItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
      return null;
    } catch (error) {
      console.warn('AsyncStorage.getItem error:', error);
      return null;
    }
  },

  /**
   * Set an item in storage
   * @param {string} key - The key to store
   * @param {string} value - The value to store
   * @returns {Promise<void>}
   */
  async setItem(key, value) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.warn('AsyncStorage.setItem error:', error);
    }
  },

  /**
   * Remove an item from storage
   * @param {string} key - The key to remove
   * @returns {Promise<void>}
   */
  async removeItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('AsyncStorage.removeItem error:', error);
    }
  },

  /**
   * Merge an item with existing data
   * @param {string} key - The key to merge
   * @param {string} value - The value to merge (JSON string)
   * @returns {Promise<void>}
   */
  async mergeItem(key, value) {
    try {
      const existingValue = await this.getItem(key);
      let mergedValue = value;
      
      if (existingValue) {
        try {
          const existingObject = JSON.parse(existingValue);
          const newObject = JSON.parse(value);
          mergedValue = JSON.stringify({ ...existingObject, ...newObject });
        } catch {
          // If parsing fails, just use the new value
          mergedValue = value;
        }
      }
      
      await this.setItem(key, mergedValue);
    } catch (error) {
      console.warn('AsyncStorage.mergeItem error:', error);
    }
  },

  /**
   * Clear all items from storage
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.clear();
      }
    } catch (error) {
      console.warn('AsyncStorage.clear error:', error);
    }
  },

  /**
   * Get all keys from storage
   * @returns {Promise<string[]>} Array of all keys
   */
  async getAllKeys() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return Object.keys(localStorage);
      }
      return [];
    } catch (error) {
      console.warn('AsyncStorage.getAllKeys error:', error);
      return [];
    }
  },

  /**
   * Get multiple items from storage
   * @param {string[]} keys - Array of keys to retrieve
   * @returns {Promise<Array<[string, string|null]>>} Array of key-value pairs
   */
  async multiGet(keys) {
    try {
      const results = [];
      for (const key of keys) {
        const value = await this.getItem(key);
        results.push([key, value]);
      }
      return results;
    } catch (error) {
      console.warn('AsyncStorage.multiGet error:', error);
      return keys.map(key => [key, null]);
    }
  },

  /**
   * Set multiple items in storage
   * @param {Array<[string, string]>} keyValuePairs - Array of key-value pairs
   * @returns {Promise<void>}
   */
  async multiSet(keyValuePairs) {
    try {
      for (const [key, value] of keyValuePairs) {
        await this.setItem(key, value);
      }
    } catch (error) {
      console.warn('AsyncStorage.multiSet error:', error);
    }
  },

  /**
   * Remove multiple items from storage
   * @param {string[]} keys - Array of keys to remove
   * @returns {Promise<void>}
   */
  async multiRemove(keys) {
    try {
      for (const key of keys) {
        await this.removeItem(key);
      }
    } catch (error) {
      console.warn('AsyncStorage.multiRemove error:', error);
    }
  },

  /**
   * Merge multiple items in storage
   * @param {Array<[string, string]>} keyValuePairs - Array of key-value pairs to merge
   * @returns {Promise<void>}
   */
  async multiMerge(keyValuePairs) {
    try {
      for (const [key, value] of keyValuePairs) {
        await this.mergeItem(key, value);
      }
    } catch (error) {
      console.warn('AsyncStorage.multiMerge error:', error);
    }
  }
};

// Export both default and named exports for compatibility
module.exports = AsyncStorage;
module.exports.default = AsyncStorage;