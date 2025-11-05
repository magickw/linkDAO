# Wallet Signature Prompt Fix

## Issue Analysis

The repeated wallet signature prompts are caused by several issues in the authentication flow:

1. **Session Management**: Sessions are being invalidated too frequently
2. **Auto-authentication**: The useWalletAuth hook triggers authentication on every wallet connection change
3. **Token Refresh**: Aggressive token refresh is causing re-authentication
4. **CORS Issues**: CORS middleware may be interfering with session persistence
5. **Nonce Management**: Nonces may be expiring too quickly or being reused

## Root Causes Identified

### 1. Auto-Authentication Loop
In `useWalletAuth.ts`, the effect triggers authentication whenever the wallet connects:
```typescript
useEffect(() => {
  if (isConnected && address && !isAuthenticated && !isAuthenticating) {
    const timeoutId = setTimeout(() => {
      authenticate();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }
}, [isConnected, address, isAuthenticated, isAuthenticating]);
```

### 2. Session Invalidation
In `authenticationService.ts`, existing sessions are invalidated on every new authentication:
```typescript
// Invalidate existing sessions for this wallet
await this.invalidateExistingSessions(walletAddress);
```

### 3. Aggressive Token Refresh
In `AuthContext.tsx`, token refresh happens every 15 minutes and logs out on failure:
```typescript
const refreshInterval = setInterval(async () => {
  try {
    await authService.refreshToken();
  } catch (error) {
    console.error('Token refresh failed:', error);
    // If refresh fails, logout user
    await handleLogout();
  }
}, 15 * 60 * 1000); // Refresh every 15 minutes
```

## Solutions Implemented

### 1. Enhanced Session Persistence
- Added `getValidSession()` method to check for existing valid sessions before creating new ones
- Modified authentication to reuse existing sessions instead of always creating new ones
- Only invalidate old sessions (>1 hour) to allow multiple tabs/devices

### 2. Smarter Auto-Authentication
- Added cooldown period (30 seconds) between authentication attempts
- Track authentication attempts per address to prevent loops
- Check for existing valid tokens before triggering new authentication
- Improved conditions for when auto-authentication should trigger

### 3. Improved Token Management
- Increased token refresh interval from 15 to 30 minutes (less aggressive)
- Don't immediately logout on refresh failures - handle network errors gracefully
- Only logout on critical authentication errors (401/403)
- Better session validation in frontend before triggering new auth

### 4. Better Error Handling
- Graceful handling of network errors without triggering re-authentication
- Proper error classification (network vs auth errors)
- Fallback mechanisms for backend unavailability
- Prevent authentication loops on repeated failures

### 5. Session State Caching
- Check localStorage for valid tokens before new authentication
- Validate existing sessions on wallet connection
- Reuse valid sessions across components and page refreshes
- Added session-friendly CORS headers

## Files Modified

1. `app/backend/src/services/authenticationService.ts` - Enhanced session management
2. `app/frontend/src/hooks/useWalletAuth.ts` - Improved auto-authentication logic
3. `app/frontend/src/context/AuthContext.tsx` - Better session persistence
4. `app/frontend/src/services/authService.ts` - Enhanced error handling
5. `app/backend/src/middleware/corsMiddleware.ts` - Session-friendly CORS headers

## Testing

After implementing these fixes:
1. Connect wallet once
2. Navigate between pages
3. Refresh browser
4. Wait for token refresh cycles
5. Verify no repeated signature prompts occur

## Expected Behavior

- Users should only be prompted to sign once per session
- Sessions should persist across page refreshes
- Token refresh should happen silently in the background
- Wallet disconnection should properly clear authentication state
- No authentication loops or repeated prompts