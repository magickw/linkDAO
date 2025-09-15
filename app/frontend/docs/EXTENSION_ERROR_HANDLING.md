# Extension Error Handling System

This document explains the comprehensive extension error handling system implemented to suppress common Web3 wallet extension errors that don't affect application functionality.

## Problem

Browser wallet extensions (MetaMask, Coinbase Wallet, etc.) often inject code into web pages that can cause runtime errors. These errors are typically harmless but create noise in error reporting and can cause unhandled error warnings.

Common extension errors include:
- `chrome.runtime.sendMessage() called from a webpage must specify an Extension ID`
- Extension script errors from files like `inpage.js`, `content_script.js`
- Web3 provider initialization errors

## Solution

We've implemented a multi-layered approach to suppress these errors:

### 1. Early Suppression (_document.tsx)

The earliest layer catches errors before React even loads:
- Inline script in the document head
- Handles errors during initial page load
- Covers the critical window before React initializes

### 2. App-Level Suppression (_app.tsx)

Additional error handling at the React app level:
- Comprehensive error and promise rejection handlers
- Specific patterns for the extension ID error you encountered
- Debug logging in development mode

### 3. Utility-Based Suppression (extensionErrorHandler.ts)

Reusable utilities for handling extension errors:
- Pattern matching for common extension error signatures
- Safe wallet operation wrappers
- Debug utilities for development

### 4. React Error Boundary (ErrorBoundary.tsx)

Catches React component errors:
- Prevents extension errors from crashing React components
- Allows normal app errors to be handled properly

## Usage

### Automatic Suppression

The system works automatically once initialized. No additional setup required.

### Safe Wallet Operations

```typescript
import { safeWalletOperation } from '@/utils/extensionErrorHandler';

// Wrap wallet operations to handle extension errors gracefully
const result = await safeWalletOperation(
  () => window.ethereum.request({ method: 'eth_accounts' }),
  [] // fallback value
);
```

### Debug Mode

In development, detailed suppression logs are automatically enabled:

```javascript
// Check console for:
// 🔇 Extension Error Suppressed
// Detailed error information and stack traces
```

## Testing

A test script is available at `/public/test-extension-errors.js`:

1. Open browser console
2. Navigate to your app
3. Copy and paste the test script
4. Run to verify suppression is working

## Error Patterns Handled

The system recognizes and suppresses:

- `chrome.runtime.sendMessage` errors
- Extension ID requirement errors
- `chrome-extension://` URL errors
- `inpage.js` and other extension file errors
- MetaMask, Coinbase Wallet, and other wallet-specific errors
- Generic extension context errors

## Configuration

### Adding New Patterns

To handle new extension error patterns, update `EXTENSION_ERROR_PATTERNS` in `extensionErrorHandler.ts`:

```typescript
const EXTENSION_ERROR_PATTERNS = [
  // Add new patterns here
  'your-new-extension-error-pattern',
  // ...
] as const;
```

### Debug Control

```typescript
import { debugExtensionErrors } from '@/utils/extensionErrorHandler';

// Enable debug mode manually
debugExtensionErrors(true);
```

## Best Practices

1. **Don't suppress real errors**: Only extension-related errors are suppressed
2. **Monitor in development**: Use debug mode to verify correct suppression
3. **Test wallet functionality**: Ensure actual wallet operations still work
4. **Update patterns as needed**: Add new patterns for new extension types

## Troubleshooting

### Error Still Appears

1. Check if error pattern is included in `EXTENSION_ERROR_PATTERNS`
2. Verify error suppression is initialized in `_app.tsx`
3. Check browser console for suppression debug logs
4. Test with the provided test script

### Wallet Not Working

1. Ensure only extension errors are being suppressed
2. Check if legitimate wallet errors are being caught
3. Use `safeWalletOperation` for better error handling

### Performance Concerns

1. Error suppression is lightweight and runs in capture phase
2. Pattern matching is optimized with early returns
3. Debug logging only enabled in development

## Migration from Previous Versions

If upgrading from older error handling:

1. Remove old error suppression code
2. Import new utilities where needed
3. Test with the provided test script
4. Enable debug mode to verify migration

The new system provides comprehensive coverage while maintaining performance and reliability.