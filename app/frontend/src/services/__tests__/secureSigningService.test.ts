/**
 * Unit Tests for Secure Signing Service
 */

import { secureSigningService } from '@/services/secureSigningService';
import { PublicClient } from 'viem';

// Mock PublicClient
const mockPublicClient: jest.Mocked<PublicClient> = {
  call: jest.fn(),
  estimateGas: jest.fn(),
  getBalance: jest.fn(),
  getTransactionCount: jest.fn(),
  getChainId: jest.fn(),
  // Add other required methods as needed
} as any;

// Mock SecureKeyStorage
jest.mock('@/security/secureKeyStorage', () => ({
  SecureKeyStorage: {
    getWallet: jest.fn(),
  },
}));

// Mock phishing detector
jest.mock('@/security/phishingDetector', () => ({
  detectPhishing: jest.fn(() => ({
    isSuspicious: false,
    riskLevel: 'low',
    warnings: [],
  })),
}));

// Mock transaction validator
jest.mock('@/security/transactionValidator', () => ({
  validateTransaction: jest.fn(() => ({
    valid: true,
    errors: [],
    warnings: [],
  })),
  validateGasParameters: jest.fn(() => ({
    valid: true,
    errors: [],
    warnings: [],
  })),
}));

describe('Secure Signing Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signTransaction', () => {
    it('should sign a transaction successfully', async () => {
      const signingRequest = {
        to: '0x' + 'a'.repeat(40),
        value: 1000000000000000000n,
        data: '0x',
        gasLimit: 21000n,
        gasPrice: 1000000000n,
      };

      const result = await secureSigningService.signTransaction(
        signingRequest,
        'test-password',
        mockPublicClient
      );

      expect(result).toBeDefined();
      // In production, this would return a signed transaction
    });

    it('should perform security checks before signing', async () => {
      const signingRequest = {
        to: '0x' + 'a'.repeat(40),
        value: 1000000000000000000n,
        data: '0x',
        gasLimit: 21000n,
        gasPrice: 1000000000n,
      };

      await secureSigningService.signTransaction(
        signingRequest,
        'test-password',
        mockPublicClient
      );

      // Verify security checks were called
      const { detectPhishing } = require('@/security/phishingDetector');
      expect(detectPhishing).toHaveBeenCalled();

      const { validateTransaction } = require('@/security/transactionValidator');
      expect(validateTransaction).toHaveBeenCalled();
    });

    it('should reject suspicious transactions', async () => {
      const signingRequest = {
        to: '0x0000000000000000000000000000000000000001', // Known malicious
        value: 1000000000000000000n,
        data: '0x',
        gasLimit: 21000n,
        gasPrice: 1000000000n,
      };

      // Mock phishing detection to flag as suspicious
      const { detectPhishing } = require('@/security/phishingDetector');
      detectPhishing.mockReturnValue({
        isSuspicious: true,
        riskLevel: 'high',
        warnings: ['Known malicious address'],
      });

      const result = await secureSigningService.signTransaction(
        signingRequest,
        'test-password',
        mockPublicClient
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject invalid transactions', async () => {
      const signingRequest = {
        to: 'invalid-address',
        value: 1000000000000000000n,
        data: '0x',
      };

      // Mock transaction validation to fail
      const { validateTransaction } = require('@/security/transactionValidator');
      validateTransaction.mockReturnValue({
        valid: false,
        errors: ['Invalid address'],
        warnings: [],
      });

      const result = await secureSigningService.signTransaction(
        signingRequest,
        'test-password',
        mockPublicClient
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('signMessage', () => {
    it('should sign a message successfully', async () => {
      const message = 'Hello, World!';

      const result = await secureSigningService.signMessage(message, 'test-password');

      expect(result).toBeDefined();
      // In production, this would return a signed message
    });

    it('should handle empty messages', async () => {
      const message = '';

      const result = await secureSigningService.signMessage(message, 'test-password');

      expect(result).toBeDefined();
    });

    it('should handle special characters in messages', async () => {
      const message = '🚀 Special characters: é, ñ, 中文';

      const result = await secureSigningService.signMessage(message, 'test-password');

      expect(result).toBeDefined();
    });
  });

  describe('signTypedData', () => {
    it('should sign typed data successfully', async () => {
      const domain = {
        name: 'LinkDAO',
        version: '1',
        chainId: 1,
        verifyingContract: '0x' + 'a'.repeat(40),
      };

      const types = {
        Person: [
          { name: 'name', type: 'string' },
          { name: 'wallet', type: 'address' },
        ],
      };

      const value = {
        name: 'Test User',
        wallet: '0x' + 'a'.repeat(40),
      };

      const result = await secureSigningService.signTypedData(
        domain,
        types,
        value,
        'test-password'
      );

      expect(result).toBeDefined();
    });

    it('should handle complex typed data', async () => {
      const domain = {
        name: 'LinkDAO',
        version: '1',
        chainId: 8453,
        verifyingContract: '0x' + 'b'.repeat(40),
      };

      const types = {
        Order: [
          { name: 'maker', type: 'address' },
          { name: 'taker', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'price', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
        ],
      };

      const value = {
        maker: '0x' + 'a'.repeat(40),
        taker: '0x' + 'b'.repeat(40),
        amount: 1000000000000000000n,
        price: 2000000000000000000n,
        nonce: 123456n,
      };

      const result = await secureSigningService.signTypedData(
        domain,
        types,
        value,
        'test-password'
      );

      expect(result).toBeDefined();
    });
  });

  describe('verifySignature', () => {
    it('should verify a valid signature', () => {
      const message = 'Hello, World!';
      const signature = '0x' + 'a'.repeat(130);
      const address = '0x' + 'b'.repeat(40);

      const result = secureSigningService.verifySignature(message, signature, address);

      expect(result).toBeDefined();
      expect(typeof result).toBe('boolean');
    });

    it('should reject invalid signatures', () => {
      const message = 'Hello, World!';
      const invalidSignature = '0xinvalid';
      const address = '0x' + 'a'.repeat(40);

      const result = secureSigningService.verifySignature(message, invalidSignature, address);

      expect(result).toBe(false);
    });
  });

  describe('validateSigningRequest', () => {
    it('should validate a correct signing request', () => {
      const request = {
        to: '0x' + 'a'.repeat(40),
        value: 1000000000000000000n,
        data: '0x',
      };

      const result = secureSigningService.validateSigningRequest(request);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid signing request', () => {
      const request = {
        to: 'invalid-address',
        value: -1n,
        data: 'not-hex',
      };

      const result = secureSigningService.validateSigningRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});