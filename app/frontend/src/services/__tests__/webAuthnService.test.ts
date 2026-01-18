import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WebAuthnService } from '../webAuthnService';
import { SecureKeyStorage } from '@/security/secureKeyStorage';

// Mock WebAuthn API
const mockPublicKeyCredential = {
  type: 'public-key' as const,
  id: new ArrayBuffer(16),
  rawId: new ArrayBuffer(16),
  response: {
    clientDataJSON: new ArrayBuffer(32),
    attestationObject: new ArrayBuffer(64),
    authenticatorData: new ArrayBuffer(37),
    signature: new ArrayBuffer(64),
    userHandle: new ArrayBuffer(16),
    getPublicKey: () => new ArrayBuffer(32),
    getTransports: () => ['internal'],
    getAuthenticatorData: () => new ArrayBuffer(37),
  },
  getClientExtensionResults: () => ({})
};

// Setup global mocks for WebAuthn
if (typeof window !== 'undefined') {
  // @ts-ignore
  global.window.PublicKeyCredential = jest.fn().mockImplementation(() => ({}));
  // @ts-ignore
  global.window.PublicKeyCredential.userVerifyingPlatformAuthenticatorAvailable = jest.fn().mockResolvedValue(true);

  Object.defineProperty(window.navigator, 'credentials', {
    value: {
      create: jest.fn().mockResolvedValue(mockPublicKeyCredential),
      get: jest.fn().mockResolvedValue(mockPublicKeyCredential),
    },
    configurable: true
  });
}

jest.mock('@/security/secureKeyStorage');

describe('WebAuthnService', () => {
  const mockWalletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const mockPassword = 'testPassword123!';
  let webAuthnService: WebAuthnService;

  beforeEach(() => {
    webAuthnService = WebAuthnService.getInstance();
    webAuthnService.clearAllCredentials();
    jest.clearAllMocks();
    localStorage.clear();
    
    // Reset window mocks
    if (typeof window !== 'undefined') {
      // @ts-ignore
      global.window.PublicKeyCredential.userVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(true);
      (window.navigator.credentials.create as any).mockResolvedValue(mockPublicKeyCredential);
      (window.navigator.credentials.get as any).mockResolvedValue(mockPublicKeyCredential);
    }
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Platform Support Detection', () => {
    it('should detect WebAuthn support', () => {
      const isSupported = webAuthnService.isSupported();
      expect(isSupported).toBe(true);
    });
  });

  describe('Credential Registration', () => {
    it('should register a new credential', async () => {
      const options = {
        username: mockWalletAddress,
        displayName: 'My Wallet',
        userId: mockWalletAddress
      };

      const result = await webAuthnService.registerCredential(options);

      expect(result.success).toBe(true);
      expect(result.credentialId).toBeDefined();
      expect(window.navigator.credentials.create).toHaveBeenCalled();
    });

    it('should store credential after successful registration', async () => {
      const options = {
        username: mockWalletAddress,
        displayName: 'My Wallet',
        userId: mockWalletAddress
      };

      await webAuthnService.registerCredential(options);

      expect(webAuthnService.hasCredentials(mockWalletAddress)).toBe(true);
    });
  });

  describe('Authentication', () => {
    it('should authenticate with existing credential', async () => {
      // Setup: register first
      await webAuthnService.registerCredential({
        username: mockWalletAddress,
        displayName: 'My Wallet',
        userId: mockWalletAddress
      });

      const options = {
        username: mockWalletAddress,
        userVerification: 'required' as const
      };

      const result = await webAuthnService.authenticate(options);

      expect(result.success).toBe(true);
      expect(window.navigator.credentials.get).toHaveBeenCalled();
    });

    it('should fail authentication when no credential exists', async () => {
      const options = {
        username: 'unknown-user',
        userVerification: 'required' as const
      };

      const result = await webAuthnService.authenticate(options);

      expect(result.success).toBe(false);
      // It returns success: false and error: "Authentication failed" or similar if no credentials found?
      // Actually implementation checks options.username && this.credentials.has(options.username)
      // If not has, it proceeds with allowCredentials: undefined.
      // Navigator.credentials.get might fail if no credentials.
    });
  });

  describe('Wallet Integration', () => {
    it('should register wallet biometric', async () => {
      (SecureKeyStorage.verifyPassword as any).mockResolvedValue(true);

      const result = await webAuthnService.registerWalletBiometric(mockWalletAddress, mockPassword);

      expect(result.success).toBe(true);
      expect(webAuthnService.isWalletBiometricEnabled(mockWalletAddress)).toBe(true);
    });

    it('should fail registration with invalid password', async () => {
      (SecureKeyStorage.verifyPassword as any).mockResolvedValue(false);

      const result = await webAuthnService.registerWalletBiometric(mockWalletAddress, 'wrong');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid password');
    });

    it('should disable wallet biometric', async () => {
      // Setup
      (SecureKeyStorage.verifyPassword as any).mockResolvedValue(true);
      await webAuthnService.registerWalletBiometric(mockWalletAddress, mockPassword);
      
      const result = webAuthnService.disableWalletBiometric(mockWalletAddress);

      expect(result.success).toBe(true);
      expect(webAuthnService.isWalletBiometricEnabled(mockWalletAddress)).toBe(false);
    });
  });

  describe('Biometric Unlock', () => {
    it('should fail unlock when biometric not enabled', async () => {
      const callback = jest.fn();
      const result = await webAuthnService.unlockWalletBiometric(mockWalletAddress, callback as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not enabled');
    });
  });
});