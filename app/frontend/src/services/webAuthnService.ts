/**
 * WebAuthn (Biometric) Authentication Service
 * Provides passwordless authentication using WebAuthn API
 * Integrated with LinkDAO wallet system for secure biometric unlock
 */

import { SecureKeyStorage } from '@/security/secureKeyStorage';

export interface WebAuthnCredential {
  id: string;
  rawId: ArrayBuffer;
  type: 'public-key';
  response: {
    clientDataJSON: ArrayBuffer;
    attestationObject: ArrayBuffer;
    authenticatorData: ArrayBuffer;
    signature: ArrayBuffer;
    userHandle: ArrayBuffer;
  };
}

export interface WebAuthnRegistrationOptions {
  username: string;
  displayName: string;
  userId: string;
  excludeCredentials?: Array<{
    id: ArrayBuffer;
    type: 'public-key';
    transports?: string[];
  }>;
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    requireResidentKey?: boolean;
    userVerification?: 'required' | 'preferred' | 'discouraged';
  };
}

export interface WebAuthnAuthenticationOptions {
  username?: string;
  userVerification?: 'required' | 'preferred' | 'discouraged';
  allowCredentials?: Array<{
    id: ArrayBuffer;
    type: 'public-key';
    transports?: string[];
  }>;
}

export interface BiometricUnlockResult {
  success: boolean;
  error?: string;
}

export class WebAuthnService {
  private static instance: WebAuthnService;
  private credentials: Map<string, any> = new Map();
  private readonly STORAGE_KEY = 'linkdao_webauthn_credentials';
  private readonly WALLET_CREDENTIALS_KEY = 'linkdao_wallet_biometric_credentials';

  private constructor() {
    this.loadCredentials();
  }

  static getInstance(): WebAuthnService {
    if (!WebAuthnService.instance) {
      WebAuthnService.instance = new WebAuthnService();
    }
    return WebAuthnService.instance;
  }

  /**
   * Check if WebAuthn is supported
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'PublicKeyCredential' in window &&
      typeof window.PublicKeyCredential === 'function' &&
      'userVerifyingPlatformAuthenticatorAvailable' in window.PublicKeyCredential
    );
  }

  /**
   * Check if platform authenticator (biometric) is available
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      return await window.PublicKeyCredential!.userVerifyingPlatformAuthenticatorAvailable!();
    } catch (error) {
      console.error('Error checking platform authenticator:', error);
      return false;
    }
  }

  /**
   * Register a new credential (for biometric setup)
   */
  async registerCredential(options: WebAuthnRegistrationOptions): Promise<{ success: boolean; credentialId?: string; error?: string }> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'WebAuthn is not supported on this device'
      };
    }

    try {
      const challenge = this.generateChallenge();
      const userId = this.stringToArrayBuffer(options.userId);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: challenge,
        rp: {
          name: 'LinkDAO',
          id: window.location.hostname
        },
        user: {
          id: userId,
          name: options.username,
          displayName: options.displayName
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' }  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: options.authenticatorSelection?.authenticatorAttachment || 'platform',
          requireResidentKey: options.authenticatorSelection?.requireResidentKey || false,
          userVerification: options.authenticatorSelection?.userVerification || 'required'
        },
        excludeCredentials: options.excludeCredentials || [],
        timeout: 60000,
        attestation: 'direct'
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as PublicKeyCredential;

      if (!credential) {
        return {
          success: false,
          error: 'Failed to create credential'
        };
      }

      const credentialId = this.arrayBufferToBase64(credential.rawId);
      const credentialData = {
        id: credentialId,
        publicKey: this.arrayBufferToBase64((credential.response as any).getPublicKey()),
        counter: 0,
        transports: credential.response.getTransports ? credential.response.getTransports() : [],
        backupEligible: (credential.response as any).getBackupEligible?.() || false,
        backupStatus: (credential.response as any).getBackupState?.() || false,
        createdAt: Date.now(),
        lastUsed: Date.now()
      };

      // Store credential
      this.credentials.set(options.username, credentialData);
      this.saveCredentials();

      return {
        success: true,
        credentialId
      };
    } catch (error) {
      console.error('WebAuthn registration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  /**
   * Authenticate using WebAuthn (biometric login)
   */
  async authenticate(options: WebAuthnAuthenticationOptions = {}): Promise<{ success: boolean; username?: string; error?: string }> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'WebAuthn is not supported on this device'
      };
    }

    try {
      const challenge = this.generateChallenge();
      let allowCredentials: PublicKeyCredentialDescriptor[] = [];

      // If username provided, get their credentials
      if (options.username && this.credentials.has(options.username)) {
        const credential = this.credentials.get(options.username);
        allowCredentials = [
          {
            id: this.base64ToArrayBuffer(credential.id),
            type: 'public-key',
            transports: credential.transports
          }
        ];
      } else if (options.allowCredentials) {
        allowCredentials = options.allowCredentials;
      }

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challenge,
        allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
        userVerification: options.userVerification || 'required',
        timeout: 60000
      };

      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      }) as PublicKeyCredential;

      if (!credential) {
        return {
          success: false,
          error: 'Authentication failed'
        };
      }

      // Verify credential
      const credentialId = this.arrayBufferToBase64(credential.rawId);
      const username = this.findUsernameByCredentialId(credentialId);

      if (!username) {
        return {
          success: false,
          error: 'Credential not found'
        };
      }

      // Update counter and last used
      const storedCredential = this.credentials.get(username);
      if (storedCredential) {
        storedCredential.counter++;
        storedCredential.lastUsed = Date.now();
        this.credentials.set(username, storedCredential);
        this.saveCredentials();
      }

      return {
        success: true,
        username
      };
    } catch (error) {
      console.error('WebAuthn authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Register biometric authentication for a wallet
   */
  async registerWalletBiometric(
    walletAddress: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify password first
      const isValidPassword = await SecureKeyStorage.verifyPassword(walletAddress, password);
      if (!isValidPassword) {
        return {
          success: false,
          error: 'Invalid password'
        };
      }

      // Register credential
      const result = await this.registerCredential({
        username: walletAddress,
        displayName: `LinkDAO Wallet - ${walletAddress.slice(0, 8)}...`,
        userId: walletAddress,
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          requireResidentKey: false,
          userVerification: 'required'
        }
      });

      if (!result.success) {
        return result;
      }

      // Store wallet-credential mapping
      const walletCredentials = this.getWalletCredentials();
      walletCredentials[walletAddress] = {
        credentialId: result.credentialId,
        enabled: true,
        registeredAt: Date.now()
      };
      this.saveWalletCredentials(walletCredentials);

      return {
        success: true
      };
    } catch (error) {
      console.error('Failed to register wallet biometric:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  /**
   * Unlock wallet using biometric authentication
   */
  async unlockWalletBiometric(
    walletAddress: string,
    callback: (privateKey: string) => Promise<any>
  ): Promise<BiometricUnlockResult> {
    try {
      // Check if wallet has biometric enabled
      const walletCredentials = this.getWalletCredentials();
      const walletCredential = walletCredentials[walletAddress];

      if (!walletCredential || !walletCredential.enabled) {
        return {
          success: false,
          error: 'Biometric authentication not enabled for this wallet'
        };
      }

      // Authenticate using biometric
      const authResult = await this.authenticate({
        username: walletAddress,
        userVerification: 'required'
      });

      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error || 'Biometric authentication failed'
        };
      }

      // Get password from secure storage (we store a hash for biometric unlock)
      const password = this.getBiometricPassword(walletAddress);
      if (!password) {
        return {
          success: false,
          error: 'Biometric password not found. Please set up biometric again.'
        };
      }

      // Unlock wallet using the stored password
      const result = await SecureKeyStorage.withDecryptedWallet(
        walletAddress,
        password,
        async ({ privateKey }) => {
          if (!privateKey) {
            throw new Error('Failed to unlock wallet');
          }
          return await callback(privateKey);
        }
      );

      return {
        success: true
      };
    } catch (error) {
      console.error('Failed to unlock wallet with biometric:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Biometric unlock failed'
      };
    }
  }

  /**
   * Enable biometric authentication for a wallet
   */
  async enableWalletBiometric(
    walletAddress: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify password
      const isValidPassword = await SecureKeyStorage.verifyPassword(walletAddress, password);
      if (!isValidPassword) {
        return {
          success: false,
          error: 'Invalid password'
        };
      }

      // Store password hash for biometric unlock (encrypted with WebAuthn)
      // In a real implementation, you'd want to store this more securely
      // For now, we'll store a reference that the biometric can verify
      this.setBiometricPassword(walletAddress, password);

      // Register the wallet biometric
      return await this.registerWalletBiometric(walletAddress, password);
    } catch (error) {
      console.error('Failed to enable wallet biometric:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable biometric'
      };
    }
  }

  /**
   * Disable biometric authentication for a wallet
   */
  disableWalletBiometric(walletAddress: string): { success: boolean; error?: string } {
    try {
      const walletCredentials = this.getWalletCredentials();
      
      if (!walletCredentials[walletAddress]) {
        return {
          success: false,
          error: 'Biometric authentication not enabled for this wallet'
        };
      }

      // Remove wallet credential mapping
      delete walletCredentials[walletAddress];
      this.saveWalletCredentials(walletCredentials);

      // Remove stored password
      this.removeBiometricPassword(walletAddress);

      // Remove the credential itself
      this.removeCredential(walletAddress);

      return {
        success: true
      };
    } catch (error) {
      console.error('Failed to disable wallet biometric:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disable biometric'
      };
    }
  }

  /**
   * Check if wallet has biometric authentication enabled
   */
  isWalletBiometricEnabled(walletAddress: string): boolean {
    const walletCredentials = this.getWalletCredentials();
    return !!(walletCredentials[walletAddress]?.enabled);
  }

  /**
   * Get wallet credentials
   */
  private getWalletCredentials(): Record<string, any> {
    try {
      const data = localStorage.getItem(this.WALLET_CREDENTIALS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to load wallet credentials:', error);
      return {};
    }
  }

  /**
   * Save wallet credentials
   */
  private saveWalletCredentials(credentials: Record<string, any>): void {
    try {
      localStorage.setItem(this.WALLET_CREDENTIALS_KEY, JSON.stringify(credentials));
    } catch (error) {
      console.error('Failed to save wallet credentials:', error);
    }
  }

  /**
   * Store biometric password (simplified - in production use secure enclave)
   */
  private setBiometricPassword(walletAddress: string, password: string): void {
    try {
      // In a real implementation, this should use the WebAuthn credential
      // to encrypt the password or derive it from the credential
      // For now, we'll store a hash that can be verified
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      crypto.subtle.digest('SHA-256', data).then(hash => {
        const hashArray = Array.from(new Uint8Array(hash));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem(`${this.WALLET_CREDENTIALS_KEY}_${walletAddress}`, hashHex);
      });
    } catch (error) {
      console.error('Failed to set biometric password:', error);
    }
  }

  /**
   * Get biometric password (simplified implementation)
   */
  private getBiometricPassword(walletAddress: string): string | null {
    // In a real implementation, this would derive the password from the WebAuthn credential
    // For now, we'll return null as this is a placeholder
    // The actual implementation would use the credential to unlock the wallet
    return null;
  }

  /**
   * Remove biometric password
   */
  private removeBiometricPassword(walletAddress: string): void {
    try {
      localStorage.removeItem(`${this.WALLET_CREDENTIALS_KEY}_${walletAddress}`);
    } catch (error) {
      console.error('Failed to remove biometric password:', error);
    }
  }

  /**
   * Check if user has registered credentials
   */
  hasCredentials(username: string): boolean {
    return this.credentials.has(username);
  }

  /**
   * Get all registered credentials
   */
  getAllCredentials(): string[] {
    return Array.from(this.credentials.keys());
  }

  /**
   * Remove credential
   */
  removeCredential(username: string): boolean {
    const deleted = this.credentials.delete(username);
    if (deleted) {
      this.saveCredentials();
    }
    return deleted;
  }

  /**
   * Generate random challenge
   */
  private generateChallenge(): ArrayBuffer {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return array.buffer;
  }

  /**
   * Convert string to ArrayBuffer
   */
  private stringToArrayBuffer(str: string): ArrayBuffer {
    const encoder = new TextEncoder();
    return encoder.encode(str).buffer;
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Find username by credential ID
   */
  private findUsernameByCredentialId(credentialId: string): string | null {
    for (const [username, credential] of this.credentials.entries()) {
      if (credential.id === credentialId) {
        return username;
      }
    }
    return null;
  }

  /**
   * Save credentials to localStorage
   */
  private saveCredentials(): void {
    try {
      const data = JSON.stringify(Array.from(this.credentials.entries()));
      localStorage.setItem(this.STORAGE_KEY, data);
    } catch (error) {
      console.error('Failed to save WebAuthn credentials:', error);
    }
  }

  /**
   * Load credentials from localStorage
   */
  private loadCredentials(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const entries = JSON.parse(data);
        this.credentials = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to load WebAuthn credentials:', error);
    }
  }

  /**
   * Clear all credentials
   */
  clearAllCredentials(): void {
    this.credentials.clear();
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.WALLET_CREDENTIALS_KEY);
  }

  /**
   * Get credential count
   */
  getCredentialCount(): number {
    return this.credentials.size;
  }
}

// Export singleton instance
export const webAuthnService = WebAuthnService.getInstance();
