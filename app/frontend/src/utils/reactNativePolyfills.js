/**
 * Comprehensive React Native polyfills for Web3 packages
 * Handles common React Native dependencies used by @rainbow-me/rainbowkit, wagmi, and viem
 */

// React Native Keychain polyfill
const ReactNativeKeychain = {
  SECURITY_LEVEL: {
    SECURE_SOFTWARE: 'SECURE_SOFTWARE',
    SECURE_HARDWARE: 'SECURE_HARDWARE',
    ANY: 'ANY'
  },
  
  ACCESSIBLE: {
    WHEN_UNLOCKED: 'WHEN_UNLOCKED',
    AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
    ALWAYS: 'ALWAYS',
    WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'WHEN_PASSCODE_SET_THIS_DEVICE_ONLY',
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
    ALWAYS_THIS_DEVICE_ONLY: 'ALWAYS_THIS_DEVICE_ONLY'
  },

  async setInternetCredentials(server, username, password, options = {}) {
    try {
      const key = `keychain_${server}_${username}`;
      const data = JSON.stringify({ username, password, server, ...options });
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, data);
      }
      return { service: server, storage: 'localStorage' };
    } catch (error) {
      throw new Error(`Keychain setInternetCredentials failed: ${error.message}`);
    }
  },

  async getInternetCredentials(server) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keys = Object.keys(localStorage);
        const matchingKey = keys.find(key => key.startsWith(`keychain_${server}_`));
        
        if (matchingKey) {
          const data = JSON.parse(localStorage.getItem(matchingKey));
          return {
            username: data.username,
            password: data.password,
            service: server,
            storage: 'localStorage'
          };
        }
      }
      return false;
    } catch {
      return false;
    }
  },

  async resetInternetCredentials(server) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keys = Object.keys(localStorage);
        const matchingKeys = keys.filter(key => key.startsWith(`keychain_${server}_`));
        matchingKeys.forEach(key => localStorage.removeItem(key));
      }
      return true;
    } catch {
      return false;
    }
  },

  async setGenericPassword(username, password, serviceOrOptions, options) {
    const service = typeof serviceOrOptions === 'string' ? serviceOrOptions : 'default';
    const opts = typeof serviceOrOptions === 'object' ? serviceOrOptions : options || {};
    
    try {
      const key = `keychain_generic_${service}`;
      const data = JSON.stringify({ username, password, service, ...opts });
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, data);
      }
      return { service, storage: 'localStorage' };
    } catch (error) {
      throw new Error(`Keychain setGenericPassword failed: ${error.message}`);
    }
  },

  async getGenericPassword(serviceOrOptions) {
    const service = typeof serviceOrOptions === 'string' ? serviceOrOptions : 'default';
    
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const key = `keychain_generic_${service}`;
        const data = localStorage.getItem(key);
        
        if (data) {
          const parsed = JSON.parse(data);
          return {
            username: parsed.username,
            password: parsed.password,
            service: parsed.service,
            storage: 'localStorage'
          };
        }
      }
      return false;
    } catch {
      return false;
    }
  },

  async resetGenericPassword(service = 'default') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const key = `keychain_generic_${service}`;
        localStorage.removeItem(key);
      }
      return true;
    } catch {
      return false;
    }
  }
};

// React Native Get Random Values polyfill
const getRandomValues = (() => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    return window.crypto.getRandomValues.bind(window.crypto);
  }
  
  // Fallback for environments without crypto.getRandomValues
  return function getRandomValues(array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
})();

// React Native FS polyfill
const ReactNativeFS = {
  DocumentDirectoryPath: '/documents',
  CachesDirectoryPath: '/caches',
  ExternalDirectoryPath: '/external',
  
  async readFile() {
    throw new Error('File system operations not supported in web environment');
  },
  
  async writeFile() {
    throw new Error('File system operations not supported in web environment');
  },
  
  async exists() {
    return false;
  },
  
  async mkdir() {
    throw new Error('File system operations not supported in web environment');
  },
  
  async readDir() {
    return [];
  }
};

// React Native Device Info polyfill
const DeviceInfo = {
  getUniqueId: () => Promise.resolve('web-device-id'),
  getDeviceId: () => 'web',
  getSystemName: () => 'Web',
  getSystemVersion: () => '1.0.0',
  getModel: () => 'WebBrowser',
  getBrand: () => 'Web',
  getBuildNumber: () => '1',
  getVersion: () => '1.0.0',
  getReadableVersion: () => '1.0.0',
  getDeviceName: () => Promise.resolve('Web Browser'),
  getUserAgent: () => Promise.resolve(navigator.userAgent || 'Unknown'),
  isEmulator: () => Promise.resolve(false),
  isTablet: () => false,
};

// React Native Biometrics polyfill
const ReactNativeBiometrics = {
  TouchID: 'TouchID',
  FaceID: 'FaceID',
  Biometrics: 'Biometrics',
  
  isSensorAvailable: () => Promise.resolve({ available: false, biometryType: null }),
  createKeys: () => Promise.resolve({ publicKey: 'mock-public-key' }),
  deleteKeys: () => Promise.resolve({ keysDeleted: true }),
  createSignature: () => Promise.resolve({ success: false, error: 'Not supported on web' }),
  simplePrompt: () => Promise.resolve({ success: false, error: 'Not supported on web' })
};

// React Native Haptic Feedback polyfill
const ReactNativeHapticFeedback = {
  HapticFeedbackTypes: {
    selection: 'selection',
    impactLight: 'impactLight',
    impactMedium: 'impactMedium',
    impactHeavy: 'impactHeavy',
    notificationSuccess: 'notificationSuccess',
    notificationWarning: 'notificationWarning',
    notificationError: 'notificationError'
  },
  
  trigger: (type) => {
    // Use web vibration API if available
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      const vibrationMap = {
        selection: 10,
        impactLight: 20,
        impactMedium: 40,
        impactHeavy: 80,
        notificationSuccess: [10, 50, 10],
        notificationWarning: [20, 100, 20],
        notificationError: [50, 100, 50]
      };
      
      const vibration = vibrationMap[type] || 20;
      window.navigator.vibrate(vibration);
    }
  }
};

// React Native Clipboard polyfill
const Clipboard = {
  getString: async () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.clipboard) {
      try {
        return await window.navigator.clipboard.readText();
      } catch {
        return '';
      }
    }
    return '';
  },
  
  setString: async (text) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.clipboard) {
      try {
        await window.navigator.clipboard.writeText(text);
      } catch {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    }
  }
};

// Export all polyfills
module.exports = {
  ReactNativeKeychain,
  getRandomValues,
  ReactNativeFS,
  DeviceInfo,
  ReactNativeBiometrics,
  ReactNativeHapticFeedback,
  Clipboard
};

// Individual exports for specific imports
module.exports.default = ReactNativeKeychain;