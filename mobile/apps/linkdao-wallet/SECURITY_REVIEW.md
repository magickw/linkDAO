# Security Review: LinkDAO Mobile Wallet Storage

## Overview
The LinkDAO mobile wallet implements a non-custodial architecture where the user has full control over their private keys. Security is maintained through a combination of on-device hardware-backed encryption and application-level password protection.

## 1. Data at Rest (Secure Storage)
- **Sensitive Data**: Private keys and mnemonic phrases are stored using `expo-secure-store`.
  - **Implementation**: On iOS, this utilizes the **Keychain**. On Android, data is stored in **SharedPreferences**, encrypted with the **Android Keystore system**.
  - **Status**: ✅ **Secure**. Data is encrypted using hardware-backed modules and is not accessible to other applications or plain-text file system scans.
- **Non-Sensitive Data**: Wallet metadata (names, network preferences) and cached transaction history are stored using `@react-native-async-storage/async-storage`.
  - **Status**: ✅ **Appropriate**. This improves performance without exposing secrets.

## 2. Application-Level Encryption
- **Double Layer**: Even though `expo-secure-store` provides encryption, the application adds a secondary layer of AES-256-GCM encryption using a user-defined password.
- **Key Derivation**: Uses PBKDF2 with 100,000 iterations to derive the encryption key from the user's password.
- **Status**: ✅ **Excellent**. This protects the user even if the device itself is compromised or if the OS-level security has vulnerabilities.

## 3. In-Memory Security
- **Wiping Secrets**: The `SecureKeyStorage.withDecryptedWallet` pattern ensures that private keys are only in memory during the execution of a specific callback (e.g., signing a transaction).
- **Cleanup**: Uses `wipeUint8Array` to overwrite the memory buffer with random data immediately after use.
- **Status**: ✅ **Secure**. Minimizes the window of exposure for "cold boot" attacks or memory dumps.

## 4. Transaction Security
- **Simulation**: All transactions are simulated via the backend/RPC before the user is asked to sign. This prevents "blind signing" of malicious or failing transactions.
- **Phishing Protection**: Integrated blocklist (refreshed every 4 hours) flags known malicious addresses before the user can proceed.
- **Status**: ✅ **Functional**.

## 5. Potential Improvements
- **Biometric Locking**: While the keys are secure, adding an app-level biometric lock (FaceID/TouchID) before accessing the dashboard would improve physical security. (High Priority for next sprint)
- **Screenshot Protection**: On Android, the `FLAG_SECURE` window attribute should be enabled on the Mnemonic and Send screens to prevent screen recording/capturing. (Medium Priority)

## Conclusion
The current mobile storage implementation follows industry best practices for non-custodial wallets. The dual-layer encryption (OS-level + Password-level) combined with strict memory management provides a high degree of protection for user assets.
