/**
 * WebAuthn (Biometric) Authentication Service
 * Provides passwordless authentication using WebAuthn API
 */

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

export class WebAuthnService {
  private static instance: WebAuthnService;
  private credentials: Map<string, any> = new Map();

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
        backupStatus: (credential.response as any).getBackupState?.() || false
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

      // Update counter
      const storedCredential = this.credentials.get(username);
      if (storedCredential) {
        storedCredential.counter++;
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
      localStorage.setItem('webauthn_credentials', data);
    } catch (error) {
      console.error('Failed to save WebAuthn credentials:', error);
    }
  }

  /**
   * Load credentials from localStorage
   */
  private loadCredentials(): void {
    try {
      const data = localStorage.getItem('webauthn_credentials');
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
    localStorage.removeItem('webauthn_credentials');
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
