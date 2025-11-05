/**
 * Web3 Environment Setup and Polyfills
 * This file should be imported early in your application to ensure
 * all necessary polyfills are available for Web3 packages
 */

// Import crypto polyfills first
import './cryptoPolyfills';

// Set up global environment for Web3 packages
if (typeof global === 'undefined') {
  var global = globalThis || window || self;
}

// Ensure TextEncoder/TextDecoder are available
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Polyfill for React Native's global.__DEV__
if (typeof global.__DEV__ === 'undefined') {
  global.__DEV__ = process.env.NODE_ENV !== 'production';
}

// Polyfill for React Native's global.HermesInternal
if (typeof global.HermesInternal === 'undefined') {
  global.HermesInternal = null;
}

// Set up fetch polyfill if needed (for older environments)
if (typeof global.fetch === 'undefined' && typeof window !== 'undefined' && window.fetch) {
  global.fetch = window.fetch.bind(window);
}

// Polyfill for React Native's Linking
const LinkingPolyfill = {
  openURL: async (url) => {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
      return true;
    }
    return false;
  },
  
  canOpenURL: async () => {
    return typeof window !== 'undefined';
  },
  
  getInitialURL: async () => {
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return null;
  },
  
  addEventListener: () => {
    // No-op for web
  },
  
  removeEventListener: () => {
    // No-op for web
  }
};

// Polyfill for React Native's Alert
const AlertPolyfill = {
  alert: (title, message, buttons) => {
    if (typeof window !== 'undefined') {
      const msg = message ? `${title}\n\n${message}` : title;
      
      if (buttons && buttons.length > 1) {
        // For multiple buttons, use confirm
        const result = window.confirm(msg);
        const button = result ? buttons.find(b => b.style !== 'cancel') : buttons.find(b => b.style === 'cancel');
        if (button && button.onPress) {
          button.onPress();
        }
      } else {
        // For single button or no buttons, use alert
        window.alert(msg);
        if (buttons && buttons[0] && buttons[0].onPress) {
          buttons[0].onPress();
        }
      }
    }
  }
};

// Polyfill for React Native's Dimensions
const DimensionsPolyfill = {
  get: () => {
    if (typeof window !== 'undefined') {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        scale: window.devicePixelRatio || 1,
        fontScale: 1
      };
    }
    return { width: 375, height: 667, scale: 1, fontScale: 1 };
  },
  
  addEventListener: (type, handler) => {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handler);
    }
  },
  
  removeEventListener: (type, handler) => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', handler);
    }
  }
};

// Polyfill for React Native's Platform
const PlatformPolyfill = {
  OS: 'web',
  Version: '1.0.0',
  isPad: false,
  isTVOS: false,
  
  select: (specifics) => {
    return specifics.web || specifics.default;
  }
};

// Polyfill for React Native's PixelRatio
const PixelRatioPolyfill = {
  get: () => {
    if (typeof window !== 'undefined') {
      return window.devicePixelRatio || 1;
    }
    return 1;
  },
  
  getFontScale: () => 1,
  getPixelSizeForLayoutSize: (layoutSize) => Math.round(layoutSize * PixelRatioPolyfill.get()),
  roundToNearestPixel: (layoutSize) => Math.round(layoutSize * PixelRatioPolyfill.get()) / PixelRatioPolyfill.get()
};

// Set up React Native polyfills globally
if (typeof global !== 'undefined') {
  try {
    global.Linking = global.Linking || LinkingPolyfill;
    global.Alert = global.Alert || AlertPolyfill;
    global.Dimensions = global.Dimensions || DimensionsPolyfill;
    global.Platform = global.Platform || PlatformPolyfill;
    global.PixelRatio = global.PixelRatio || PixelRatioPolyfill;
  } catch {
    // Global might be read-only, skip
  }
}

// Export for manual imports if needed
export {
  LinkingPolyfill as Linking,
  AlertPolyfill as Alert,
  DimensionsPolyfill as Dimensions,
  PlatformPolyfill as Platform,
  PixelRatioPolyfill as PixelRatio
};

// Default export for convenience
export default {
  Linking: LinkingPolyfill,
  Alert: AlertPolyfill,
  Dimensions: DimensionsPolyfill,
  Platform: PlatformPolyfill,
  PixelRatio: PixelRatioPolyfill
};