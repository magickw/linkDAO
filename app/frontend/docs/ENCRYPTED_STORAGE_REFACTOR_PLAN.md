# Refactor Plan: Encrypted Wallet Storage

## Objective
Migrate `WALLET_ADDRESS` storage from `sessionStorage` (current ephemeral solution) to `localStorage` with AES-256 encryption. This ensures data persistence across sessions without exposing the raw address in plaintext.

## Problem Statement
The current storage mechanism uses `sessionStorage` to limit exposure (cleared on tab close). However, full persistence requires `localStorage`. Storing the wallet address in `localStorage` in plaintext is a security risk.
The challenge is that `crypto.subtle` (Web Crypto API) is asynchronous, but `EnhancedAuthService` and many consumers rely on synchronous properties (e.g., initialized in `constructor`).

## Proposed Architecture

### 1. Unified Encrypted Storage Service
Refactor `SecureKeyStorage` or create `EncryptedSessionManager` to handle all encrypted I/O.
- **Methods**:
  - `async saveEncrypted(key: string, value: string, secret: string): Promise<void>`
  - `async loadDecrypted(key: string, secret: string): Promise<string | null>`

### 2. Async Service Initialization
Modify `EnhancedAuthService` to support asynchronous startup.
- **Changes**:
  - Add `public ready: Promise<void>` property.
  - Convert `initializeFromStorage()` to `async initializeFromStorage()`.
  - In `constructor`, start initialization: `this.ready = this.initializeFromStorage();`.

### 3. Usage Updates
Consumers of `EnhancedAuthService` must await initialization or handle uninitialized states.
- **Pattern**:
  ```typescript
  // Before
  const user = authService.currentUser;
  
  // After
  await authService.ready;
  const user = authService.currentUser;
  ```
- **Alternative (Reactive)**: Use a React Context/hook (`useAuth`) that exposes an `isLoading` state. This is already pattern in `Web3Context`, so we integrate `authService.ready` into `Web3Context` initialization.

### 4. Direct Storage Access Audit
Identify and refactor components accessing `localStorage.getItem('linkdao_wallet_address')` directly.
- **Files to Check**:
  - `src/services/marketplaceService.ts`
  - `src/context/Web3Context.tsx`
  - `src/components/Marketplace/Seller/MessagingAnalytics.tsx`
- **Refactor**: Replace `localStorage` calls with `authService.getWalletAddress()`.

## Implementation Steps

1.  **Utilities**: Ensure `src/utils/cryptoUtils.ts` is robust.
2.  **Service Refactor**: Update `EnhancedAuthService` to use `encrypt/decrypt` for `WALLET_ADDRESS` and `SESSION_DATA`.
3.  **Migration Logic**:
    -   On init: Check `sessionStorage`. If present, memory load + encrypt save to `localStorage` + wipe `sessionStorage`.
    -   Check plaintext `localStorage`. If present, encrypt + save.
4.  **Consumer Updates**: wrappers for `marketplaceService` to await auth ready.

## Security Benefits
-   **Confidentiality**: Address is opaque in local storage.
-   **Integrity**: Encrypted blob ensures tampering detects (GCM auth tag).
-   **Persistence**: Users stay logged in (if token also persisted/refreshable) without plaintext leaks.
