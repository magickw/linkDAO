# Wallet Connection Fixes for Mobile App

## Issue
Users reported failing to connect any wallet in the production App Store build.

## Diagnosis
1. **MetaMask SDK Failure:** The code was using a dynamic `await import('@metamask/sdk-react-native')` inside the `initialize()` method. Dynamic imports in React Native are often flaky or unsupported in production bundles, causing the SDK to fail to load silently or with a swallowed error.
2. **Artificial Blockers:** All other wallet connection methods (Coinbase, Trust, WalletConnect) were explicitly throwing `new Error("Not Implemented")` or similar messages immediately upon invocation, preventing any attempt to connect.
3. **WalletConnect V1:** The WalletConnect implementation was using a deprecated V1 URI scheme and threw an error even if the deep link was successful.

## Fixes Applied
1. **Static Import:** Switched to `import { MetaMaskSDK } from '@metamask/sdk-react-native';` at the top level. This ensures the SDK is included in the bundle correctly.
2. **Robust Initialization:** Wrapped the SDK initialization in a dedicated try-catch block that doesn't crash the entire service if initialization fails (though it logs the error).
3. **Unblocked Deep Links:**
    - Removed `throw new Error` blocks for Coinbase and Trust wallets.
    - Implemented basic deep linking for these wallets (opening their respective URL schemes).
    - Added user-friendly messages indicating that the connection was initiated (though full bi-directional communication requires further backend/deep-link handler setup).
4. **Improved Error Handling:** added better logging and fallback logic for signing messages.

## Next Steps
- Rebuild the mobile app (`eas build` or `npx expo run:ios --configuration Release`).
- Verify MetaMask connection works in the new build.
- (Future) Implement full WalletConnect V2 (Reown AppKit) for robust support of all wallets.
