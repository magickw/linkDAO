# Web3 React Native Compatibility Guide

This guide explains how we handle React Native dependencies in Web3 packages like @rainbow-me/rainbowkit, wagmi, and viem when building for web environments.

## Problem

Web3 packages often include React Native dependencies that don't work in web browsers. These packages expect React Native-specific APIs and modules that aren't available in web environments, causing build failures and runtime errors.

## Solution Overview

We use a combination of webpack aliases, polyfills, and fallbacks to provide web-compatible implementations of React Native dependencies.

## Files Created

### 1. `src/utils/asyncStorageFallback.js`
- Provides localStorage-based implementation of React Native AsyncStorage
- Supports all AsyncStorage methods (getItem, setItem, removeItem, etc.)
- Gracefully handles environments without localStorage

### 2. `src/utils/reactNativePolyfills.js`
- Comprehensive polyfills for common React Native packages:
  - `react-native-keychain`: Secure storage using localStorage
  - `react-native-fs`: File system operations (throws appropriate errors)
  - `react-native-device-info`: Device information polyfills
  - `react-native-biometrics`: Biometric authentication (not supported on web)
  - `react-native-haptic-feedback`: Uses web vibration API when available
  - `@react-native-clipboard/clipboard`: Uses web clipboard API

### 3. `src/utils/cryptoPolyfills.js`
- Crypto-related polyfills for Web3 packages:
  - `crypto.getRandomValues`: Uses web crypto API with fallback
  - `Buffer`: Simple Buffer implementation for basic operations
  - `process`: Node.js process object polyfill

### 4. `src/utils/web3Polyfills.js`
- Complete Web3 environment setup:
  - Global environment configuration
  - React Native API polyfills (Linking, Alert, Dimensions, Platform, PixelRatio)
  - TextEncoder/TextDecoder setup
  - Development environment flags

## Webpack Configuration

The `next.config.js` includes comprehensive webpack aliases and fallbacks:

### React Native Aliases
```javascript
config.resolve.alias = {
  // Core React Native polyfills
  '@react-native-async-storage/async-storage': require.resolve('./src/utils/asyncStorageFallback.js'),
  'react-native-keychain': require.resolve('./src/utils/reactNativePolyfills.js'),
  'react-native-get-random-values': require.resolve('./src/utils/reactNativePolyfills.js'),
  // ... more aliases
};
```

### Node.js Fallbacks
```javascript
config.resolve.fallback = {
  fs: false,
  crypto: false,
  stream: false,
  // ... more fallbacks
};
```

## Usage

### Automatic Setup
The polyfills are automatically loaded when you import `@/utils/web3Polyfills` in your `_app.tsx`:

```typescript
// Import Web3 polyfills first
import '@/utils/web3Polyfills';
```

### Manual Usage
You can also import specific polyfills when needed:

```javascript
import { ReactNativeKeychain } from '@/utils/reactNativePolyfills';
import AsyncStorage from '@/utils/asyncStorageFallback';
```

## Common Issues and Solutions

### 1. "Module not found: Can't resolve 'react-native-*'"
**Solution**: Add the missing package to the webpack aliases in `next.config.js`

### 2. "crypto.getRandomValues is not a function"
**Solution**: Ensure `@/utils/web3Polyfills` is imported early in your app

### 3. "Buffer is not defined"
**Solution**: The crypto polyfills provide a Buffer implementation, or add a specific Buffer polyfill

### 4. "process is not defined"
**Solution**: The web3 polyfills include a process polyfill

## Testing

To test that the polyfills work correctly:

1. **Build the application**: `npm run build`
2. **Check for React Native import errors**: Look for "Module not found" errors in the build output
3. **Test Web3 functionality**: Ensure wallet connections and transactions work properly
4. **Test in different browsers**: Verify compatibility across Chrome, Firefox, Safari, etc.

## Adding New React Native Dependencies

If you encounter a new React Native dependency that needs polyfilling:

1. **Identify the package**: Look for the exact import path in the error message
2. **Create a polyfill**: Add an appropriate implementation to `reactNativePolyfills.js`
3. **Add webpack alias**: Update `next.config.js` to alias the package to your polyfill
4. **Test thoroughly**: Ensure the polyfill works in your specific use case

## Performance Considerations

- **Bundle size**: Polyfills add to your bundle size, but they're necessary for compatibility
- **Tree shaking**: Unused polyfill functions should be tree-shaken by webpack
- **Lazy loading**: Consider lazy loading Web3 components to reduce initial bundle size

## Browser Compatibility

The polyfills are designed to work with:
- **Chrome/Edge**: Full support for all Web APIs
- **Firefox**: Full support with minor differences in crypto API
- **Safari**: Good support, some limitations with clipboard API
- **Mobile browsers**: Basic support, limited haptic feedback

## Security Considerations

- **Keychain polyfill**: Uses localStorage, which is less secure than native keychain
- **Crypto operations**: Uses web crypto API when available, falls back to Math.random()
- **Storage**: All polyfilled storage uses browser storage, which can be cleared by users

## Debugging

To debug React Native compatibility issues:

1. **Enable webpack analysis**: Set `ANALYZE=true` when building
2. **Check browser console**: Look for polyfill warnings and errors
3. **Use source maps**: Enable source maps to trace issues to specific packages
4. **Test incrementally**: Add one Web3 package at a time to isolate issues

## Future Improvements

- **Better crypto fallbacks**: Implement more secure random number generation
- **IndexedDB storage**: Use IndexedDB for more robust storage polyfills
- **Service worker integration**: Cache polyfills in service worker for offline use
- **Automatic detection**: Detect missing React Native dependencies automatically

## Related Documentation

- [Next.js Webpack Configuration](https://nextjs.org/docs/api-reference/next.config.js/custom-webpack-config)
- [RainbowKit Documentation](https://rainbowkit.com/docs/introduction)
- [Wagmi Documentation](https://wagmi.sh/)
- [Viem Documentation](https://viem.sh/)