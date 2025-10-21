/**
 * Seller Security Service Tests
 * 
 * Comprehensive tests for seller security functionality including
 * access validation, wallet verification, role-based access control,
 * data sanitization, and audit logging.
 */

import SellerSecurityService, { 
  SellerRole, 
  SellerAccessRequest, 
  WalletOwnershipVerification,
  SellerAuditEvent
} from '../services/sellerSecurityService';
import { SecurityEventType, SecuritySeverity } from '../services/securityMonitoringService';

// Mock dependencies
jest.mock('../services/securityMonitoringService');
jest.mock('../services/auditLoggingService');
jest.mock('../services/encryptionService');

describe('SellerSecurityService', () => {
  let sellerSecurityService: SellerSecurityService;
  const mockWalletAddress = '0x1234567890123456789012345678901234567890';
  const mockRequestorAddress = '0x0987654321098765432109876543210987654321';

  beforeEach(() => {
    sellerSecurityService = new SellerSecurityService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateSellerAccess', () => {
    it('should validate access for owner accessing own data', async () => {
      const request: SellerAccessRequest = {
        walletAddress: mockWalletAddress,
        requestedData: ['profile', 'listings'],
        requestorAddress: mockWalletAddress,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        timestamp: new Date()
      };

      const result = await sellerSecurityService.validateSellerAccess(request);
      expect(result).toBe(true);
    });

    it('should deny access for unauthorized requestor', async () => {
      const request: SellerAccessRequest = {
        walletAddress: mockWalletAddress,
        requestedData: ['profile', 'listings'],
        requestorAddress: mockRequestorAddress,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        timestamp: new Date()
      };

      const result = await sellerSecurityService.validateSellerAccess(request);
      expect(result).toBe(false);
    });

    it('should validate access without requestor address', async () => {
      const request: SellerAccessRequest = {
        walletAddress: mockWalletAddress,
        requestedData: ['profile'],
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        timestamp: new Date()
      };

      const result = await sellerSecurityService.validateSellerAccess(request);
      expect(result).toBe(true);
    });

    it('should handle validation errors gracefully', async () => {
      const request: any = {
        walletAddress: null, // Invalid wallet address
        requestedData: ['profile'],
        timestamp: new Date()
      };

      const result = await sellerSecurityService.validateSellerAccess(request);
      expect(result).toBe(false);
    });
  });

  describe('verifyWalletOwnership', () => {
    beforeEach(() => {
      // Generate a nonce for testing
      sellerSecurityService.generateVerificationNonce(mockWalletAddress);
    });

    it('should verify valid wallet ownership', async () => {
      const nonce = sellerSecurityService.generateVerificationNonce(mockWalletAddress);
      const verification: WalletOwnershipVerification = {
        walletAddress: mockWalletAddress,
        signature: '0x' + 'a'.repeat(130), // Mock signature
        message: 'Verify ownership',
        timestamp: Date.now(),
        nonce
      };

      const result = await sellerSecurityService.verifyWalletOwnership(verification);
      expect(result).toBe(true);
    });

    it('should reject verification with invalid nonce', async () => {
      const verification: WalletOwnershipVerification = {
        walletAddress: mockWalletAddress,
        signature: '0x' + 'a'.repeat(130),
        message: 'Verify ownership',
        timestamp: Date.now(),
        nonce: 'invalid-nonce'
      };

      const result = await sellerSecurityService.verifyWalletOwnership(verification);
      expect(result).toBe(false);
    });

    it('should reject expired verification', async () => {
      const nonce = sellerSecurityService.generateVerificationNonce(mockWalletAddress);
      const verification: WalletOwnershipVerification = {
        walletAddress: mockWalletAddress,
        signature: '0x' + 'a'.repeat(130),
        message: 'Verify ownership',
        timestamp: Date.now() - 400000, // 6+ minutes ago
        nonce
      };

      const result = await sellerSecurityService.verifyWalletOwnership(verification);
      expect(result).toBe(false);
    });

    it('should reject verification with invalid signature format', async () => {
      const nonce = sellerSecurityService.generateVerificationNonce(mockWalletAddress);
      const verification: WalletOwnershipVerification = {
        walletAddress: mockWalletAddress,
        signature: 'invalid-signature',
        message: 'Verify ownership',
        timestamp: Date.now(),
        nonce
      };

      const result = await sellerSecurityService.verifyWalletOwnership(verification);
      expect(result).toBe(false);
    });
  });

  describe('generateVerificationNonce', () => {
    it('should generate unique nonces', () => {
      const nonce1 = sellerSecurityService.generateVerificationNonce(mockWalletAddress);
      const nonce2 = sellerSecurityService.generateVerificationNonce(mockWalletAddress);
      
      expect(nonce1).toBeDefined();
      expect(nonce2).toBeDefined();
      expect(nonce1).not.toBe(nonce2);
      expect(nonce1.length).toBe(64); // 32 bytes hex
    });

    it('should generate nonces for different wallet addresses', () => {
      const nonce1 = sellerSecurityService.generateVerificationNonce(mockWalletAddress);
      const nonce2 = sellerSecurityService.generateVerificationNonce(mockRequestorAddress);
      
      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe('checkRoleBasedAccess', () => {
    it('should allow owner to access own data', async () => {
      const result = await sellerSecurityService.checkRoleBasedAccess(
        mockWalletAddress,
        ['profile', 'listings'],
        mockWalletAddress
      );
      expect(result).toBe(true);
    });

    it('should deny access for non-owner without role', async () => {
      const result = await sellerSecurityService.checkRoleBasedAccess(
        mockRequestorAddress,
        ['profile', 'listings'],
        mockWalletAddress
      );
      expect(result).toBe(false);
    });
  });

  describe('sanitizeSellerData', () => {
    const testData = {
      walletAddress: mockWalletAddress,
      email: 'test@example.com',
      phone: '1234567890',
      privateKey: 'secret-key',
      internalNotes: 'internal-notes',
      adminFlags: ['flag1', 'flag2'],
      publicInfo: 'public-data'
    };

    it('should sanitize data for transmission', async () => {
      const sanitized = await sellerSecurityService.sanitizeSellerData(testData, 'transmission');
      
      expect(sanitized.privateKey).toBeUndefined();
      expect(sanitized.internalNotes).toBeUndefined();
      expect(sanitized.adminFlags).toBeUndefined();
      expect(sanitized.email).toMatch(/te\*\*\*@example\.com/);
      expect(sanitized.phone).toMatch(/123\*\*\*7890/);
      expect(sanitized.publicInfo).toBe('public-data');
    });

    it('should sanitize data for logging', async () => {
      const sanitized = await sellerSecurityService.sanitizeSellerData(testData, 'logging');
      
      expect(sanitized.privateKey).toBeUndefined();
      expect(sanitized.walletAddress).toMatch(/0x12.*7890/);
      expect(sanitized.publicInfo).toBe('public-data');
    });

    it('should sanitize data for storage', async () => {
      const sanitized = await sellerSecurityService.sanitizeSellerData(testData, 'storage');
      
      expect(sanitized.privateKey).toBeUndefined();
      expect(sanitized.internalNotes).toBeUndefined();
      expect(sanitized.adminFlags).toBeUndefined();
      expect(sanitized.walletAddress).toBe(mockWalletAddress); // Not masked for storage
    });

    it('should handle nested objects', async () => {
      const nestedData = {
        user: {
          profile: {
            email: 'nested@example.com',
            privateKey: 'nested-secret'
          }
        }
      };

      const sanitized = await sellerSecurityService.sanitizeSellerData(nestedData, 'transmission');
      
      expect(sanitized.user.profile.privateKey).toBeUndefined();
      expect(sanitized.user.profile.email).toMatch(/ne\*\*\*@example\.com/);
    });
  });

  describe('logSellerAuditEvent', () => {
    it('should log audit events successfully', async () => {
      const auditEvent: SellerAuditEvent = {
        eventType: 'profile_update',
        walletAddress: mockWalletAddress,
        actorAddress: mockWalletAddress,
        resource: 'profile',
        action: 'update',
        oldState: { name: 'old-name' },
        newState: { name: 'new-name' },
        metadata: { field: 'name' },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        timestamp: new Date()
      };

      // Should not throw
      await expect(sellerSecurityService.logSellerAuditEvent(auditEvent)).resolves.not.toThrow();
    });

    it('should handle logging errors gracefully', async () => {
      const auditEvent: SellerAuditEvent = {
        eventType: 'test_event',
        walletAddress: mockWalletAddress,
        resource: 'test',
        action: 'test',
        timestamp: new Date()
      };

      // Should not throw even if logging fails
      await expect(sellerSecurityService.logSellerAuditEvent(auditEvent)).resolves.not.toThrow();
    });
  });

  describe('createSecuritySession', () => {
    it('should create security session successfully', async () => {
      const sessionId = await sellerSecurityService.createSecuritySession(
        mockWalletAddress,
        SellerRole.OWNER,
        '127.0.0.1',
        'test-agent'
      );

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it('should create sessions with different roles', async () => {
      const ownerSession = await sellerSecurityService.createSecuritySession(
        mockWalletAddress,
        SellerRole.OWNER
      );

      const adminSession = await sellerSecurityService.createSecuritySession(
        mockWalletAddress,
        SellerRole.ADMIN
      );

      expect(ownerSession).not.toBe(adminSession);
    });
  });

  describe('validateSecuritySession', () => {
    it('should validate active session', async () => {
      const sessionId = await sellerSecurityService.createSecuritySession(
        mockWalletAddress,
        SellerRole.OWNER
      );

      const context = await sellerSecurityService.validateSecuritySession(sessionId);
      
      expect(context).toBeDefined();
      expect(context?.walletAddress).toBe(mockWalletAddress);
      expect(context?.role).toBe(SellerRole.OWNER);
      expect(context?.sessionId).toBe(sessionId);
    });

    it('should return null for invalid session', async () => {
      const context = await sellerSecurityService.validateSecuritySession('invalid-session-id');
      expect(context).toBeNull();
    });

    it('should handle expired sessions', async () => {
      const sessionId = await sellerSecurityService.createSecuritySession(
        mockWalletAddress,
        SellerRole.OWNER
      );

      // Wait a bit and then mock time advancement
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Mock Date.now to return a time 2 hours in the future
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 7200000); // 2 hours later

      const context = await sellerSecurityService.validateSecuritySession(sessionId);
      expect(context).toBeNull();

      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('revokeSecuritySession', () => {
    it('should revoke active session', async () => {
      const sessionId = await sellerSecurityService.createSecuritySession(
        mockWalletAddress,
        SellerRole.OWNER
      );

      const result = await sellerSecurityService.revokeSecuritySession(sessionId);
      expect(result).toBe(true);

      // Session should no longer be valid
      const context = await sellerSecurityService.validateSecuritySession(sessionId);
      expect(context).toBeNull();
    });

    it('should return false for non-existent session', async () => {
      const result = await sellerSecurityService.revokeSecuritySession('non-existent-session');
      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle service initialization errors', () => {
      expect(() => new SellerSecurityService()).not.toThrow();
    });

    it('should handle malformed data gracefully', async () => {
      const malformedRequest: any = {
        walletAddress: null,
        requestedData: undefined,
        timestamp: 'invalid-date'
      };

      const result = await sellerSecurityService.validateSellerAccess(malformedRequest);
      expect(result).toBe(false);
    });

    it('should handle sanitization of circular references', async () => {
      const circularData: any = { name: 'test' };
      circularData.self = circularData;

      // Should handle circular references gracefully
      try {
        const result = await sellerSecurityService.sanitizeSellerData(circularData, 'transmission');
        expect(result).toBeDefined();
      } catch (error) {
        // Circular references should be handled gracefully
        expect(error.message).toContain('sanitization failed');
      }
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent access validations', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        walletAddress: `0x${i.toString().padStart(40, '0')}`,
        requestedData: ['profile'],
        timestamp: new Date()
      }));

      const results = await Promise.all(
        requests.map(request => sellerSecurityService.validateSellerAccess(request))
      );

      expect(results).toHaveLength(10);
      results.forEach(result => expect(typeof result).toBe('boolean'));
    });

    it('should handle session cleanup efficiently', async () => {
      // Create multiple sessions
      const sessions = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          sellerSecurityService.createSecuritySession(
            `0x${i.toString().padStart(40, '0')}`,
            SellerRole.OWNER
          )
        )
      );

      expect(sessions).toHaveLength(5);
      sessions.forEach(sessionId => expect(sessionId).toBeDefined());
    });
  });
});