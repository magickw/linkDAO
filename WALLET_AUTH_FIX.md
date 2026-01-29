# Wallet Authentication Loop Fix - Complete Solution

## Problem Summary
The mobile app was stuck in an **infinite authentication loop** when connecting with dev-mock wallet:
- Request nonce → Sign message → Request nonce AGAIN (repeat forever)
- Each cycle got a new nonce instead of verifying the previous signature
- App never reached "login successful"

## Root Causes

### 1. **Component-Level Re-mounting** (WalletLoginBridge)
- Route params (`walletAddress`, `connector`) from Expo Router
- Each render could pass new object references for params
- Component re-mounted when auth succeeded and navigation happened
- Cleared all state tracking in `authInProgressRef`

### 2. **Service-Level Missing Deduplication** (authService)
- No tracking of in-progress auth attempts at the service layer
- Multiple calls to `authenticateWallet()` for same address could fire simultaneously
- Each would request a new nonce, creating multiple concurrent flows

### 3. **Dependency Array Issues** (WalletLoginBridge)
- Originally included `isAuthenticated`, `setUser`, `setToken`
- These changed during auth completion
- Caused effect to re-trigger even after marking address as handled

## Solutions Implemented

### Fix #1: Component-Level Deduplication (WalletLoginBridge)
**File:** `/mobile/apps/linkdao-mobile/src/components/WalletLoginBridge.tsx`

```typescript
const authInProgressRef = useRef<Map<string, boolean>>(new Map());

// In effect:
if (authInProgressRef.current.get(addressKey)) {
  console.log('Auth already in progress for this address');
  return;
}

authInProgressRef.current.set(addressKey, true);
// ... auth logic ...
authInProgressRef.current.set(addressKey, false); // in finally block
```

**Benefit:** Prevents multiple auth calls from the same component instance

### Fix #2: Clean Dependency Array
**File:** `/mobile/apps/linkdao-mobile/src/components/WalletLoginBridge.tsx`

```typescript
// OLD (causes infinite loops):
useEffect(..., [walletAddress, connector, isAuthenticated, ..., setUser, setToken])

// NEW (stable and correct):
useEffect(..., [walletAddress, connector, autoLogin, onLoginSuccess, onLoginError, skipIfAuthenticated])
```

**Rationale:**
- `isAuthenticated` is checked inside effect but doesn't need to trigger re-runs
- Zustand setters (`setUser`, `setToken`) always have same reference, shouldn't be deps
- Only real "input" dependencies included

### Fix #3: Service-Level Deduplication (authService)
**File:** `/mobile/packages/shared/src/services/authService.ts`

```typescript
// Module level:
const globalAuthInProgress = new Map<string, Promise<any>>();

// In authenticateWallet():
async authenticateWallet(address, connector, status, options) {
  const addressKey = address.toLowerCase();
  
  if (globalAuthInProgress.has(addressKey)) {
    console.log('Auth already in progress, returning existing promise');
    return globalAuthInProgress.get(addressKey)!;
  }
  
  const authPromise = (async () => {
    // ... auth flow ...
  })();
  
  globalAuthInProgress.set(addressKey, authPromise);
  const result = await authPromise;
  
  return result;
} finally {
  globalAuthInProgress.delete(addressKey);
}
```

**Benefits:**
- Prevents concurrent auth for same address across entire app
- Multiple callers get same promise result
- Survives component remounts
- Works at service layer (not just React layer)

## Expected Behavior After Fix

### Sequence of Events
1. ✅ User clicks "Dev Mock (Testing)" wallet
2. ✅ WalletLoginBridge initiates auth
3. ✅ **One-time** nonce request to backend
4. ✅ Message signed once
5. ✅ Signature verified at `/api/auth/wallet-connect`
6. ✅ Login succeeds
7. ✅ Navigation to home screen
8. ✅ Auth complete (no more requests)

### Console Output (Expected)
```
🔐 Attempting login for wallet: 0x742d35cc6634c0532925a3b844bc5e8f5a7a3f9d
📡 Requesting nonce from backend for address: 0x742d35Cc6634C0532925a3b844Bc5e8f5a7a3f9D
📡 Backend response: {...}
✅ Got nonce from backend: abc123...
✅ Got message from backend: Sign this message...
🔐 Signing message with dev-mock: Sign this message...
✅ Mock signature generated for development
✅ Login successful for 0x742d35cc6634c0532925a3b844bc5e8f5a7a3f9d
✅ Auto-login successful for: 0x742d35Cc6634C0532925a3b844Bc5e8f5a7a3f9D
```

## Testing

### With Dev Mock Wallet
```bash
EXPO_PUBLIC_DEV_MODE=true npm start
# Select "Dev Mock (Testing)" from wallet list
# Should login immediately without loops
```

### With Real Wallets
```bash
npm start
# WalletConnect, Trust, etc. should now work without infinite loops
```

## Files Modified

1. **WalletLoginBridge.tsx**
   - Added `authInProgressRef` tracking
   - Fixed dependency array
   - Added in-progress auth check

2. **authService.ts** (shared package)
   - Added global `globalAuthInProgress` Map
   - Modified `authenticateWallet()` to deduplicate
   - Added finally block to clean up tracking

## Commits

- `0b18ad53` - Fix infinite authentication loop in WalletLoginBridge
- `6e2ffbca` - Add global deduplication for concurrent wallet auth

## Migration Notes

No breaking changes. Existing integrations continue to work:
- `authenticateWallet()` signature unchanged
- Error handling same
- 2FA flow preserved
- All return types compatible

Just rebuild dev server (`npm start`) to pick up changes from shared package TypeScript files.
