import { AuthenticationService } from '../../services/authenticationService';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Mock dependencies
jest.mock('ethers', () => ({
  verifyMessage: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
}));

// Mock database
const mockDb = {
  insert: jest.fn(),
  select: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  execute: jest.fn(),
};

// Mock postgres connection
jest.mock('postgres', () => {
  return jest.fn(() => ({}));
});

jest.mock('drizzle-orm/postgres-js', () => ({
  drizzle: jest.fn(() => mockDb),
}));

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  const mockConnectionString = 'postgresql://test:test@localhost:5432/test';
  const mockJwtSecret = 'test-jwt-secret';

  beforeEach(() => {
    service = new AuthenticationService(mockConnectionString, mockJwtSecret);
    jest.clearAllMocks();
  });

  describe('generateNonce', () => {
    const validWalletAddress = '0x1234567890123456789012345678901234567890';

    it('should generate nonce successfully', async () => {
      const mockNonce = 'mock-nonce-hex-string';
      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: jest.fn().mockReturnValue(mockNonce),
      });

      const mockInsert = {
        values: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await service.generateNonce(validWalletAddress);

      expect(result).toEqual({
        nonce: mockNonce,
        message: expect.stringContaining(`Nonce: ${mockNonce}`),
        expiresAt: expect.any(Date),
      });

      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockInsert.values).toHaveBeenCalledWith({
        walletAddress: validWalletAddress.toLowerCase(),
        nonce: mockNonce,
        message: expect.stringContaining(mockNonce),
        expiresAt: expect.any(Date),
        used: false,
      });
    });

    it('should handle database errors during nonce generation', async () => {
      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: jest.fn().mockReturnValue('mock-nonce'),
      });

      const mockInsert = {
        values: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      await expect(service.generateNonce(validWalletAddress)).rejects.toThrow('Failed to generate authentication nonce');
    });

    it('should cleanup expired nonces before generating new one', async () => {
      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: jest.fn().mockReturnValue('mock-nonce'),
      });

      const mockInsert = {
        values: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);
      mockDb.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      await service.generateNonce(validWalletAddress);

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('authenticateWallet', () => {
    const validWalletAddress = '0x1234567890123456789012345678901234567890';
    const mockSignature = 'mock-signature';
    const mockNonce = 'mock-nonce';
    const mockMessage = `Sign this message to authenticate with LinkDAO Marketplace.\n\nNonce: ${mockNonce}\nTimestamp: ${Date.now()}`;

    beforeEach(() => {
      // Mock JWT token generation
      (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');
    });

    it('should authenticate wallet successfully with valid signature', async () => {
      // Mock nonce validation
      const mockNonceRecord = { message: mockMessage };
      jest.spyOn(service as any, 'validateAndConsumeNonce').mockResolvedValue(mockNonceRecord);

      // Mock signature verification
      (ethers.verifyMessage as jest.Mock).mockReturnValue(validWalletAddress);

      // Mock database operations
      const mockInsert = {
        values: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await service.authenticateWallet(
        validWalletAddress,
        mockSignature,
        mockNonce,
        'test-user-agent',
        '127.0.0.1'
      );

      expect(result.success).toBe(true);
      expect(result.sessionToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBe('mock-jwt-token');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.error).toBeUndefined();

      expect(ethers.verifyMessage).toHaveBeenCalledWith(mockMessage, mockSignature);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should fail authentication with invalid nonce', async () => {
      // Mock invalid nonce
      jest.spyOn(service as any, 'validateAndConsumeNonce').mockResolvedValue(null);

      const mockInsert = {
        values: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await service.authenticateWallet(
        validWalletAddress,
        mockSignature,
        'invalid-nonce'
      );

      expect(result.success).toBe(false);
      expect(result.error).toEqual({
        code: 'INVALID_NONCE',
        message: 'Invalid or expired nonce. Please request a new one.',
      });
    });

    it('should fail authentication with invalid signature', async () => {
      // Mock valid nonce but invalid signature
      const mockNonceRecord = { message: mockMessage };
      jest.spyOn(service as any, 'validateAndConsumeNonce').mockResolvedValue(mockNonceRecord);

      // Mock signature verification failure
      (ethers.verifyMessage as jest.Mock).mockReturnValue('0xDifferentAddress');

      const mockInsert = {
        values: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await service.authenticateWallet(
        validWalletAddress,
        'invalid-signature',
        mockNonce
      );

      expect(result.success).toBe(false);
      expect(result.error).toEqual({
        code: 'INVALID_SIGNATURE',
        message: 'Invalid wallet signature. Please try signing again.',
      });
    });

    it('should handle ConnectorNotConnectedError gracefully', async () => {
      // Mock nonce validation
      const mockNonceRecord = { message: mockMessage };
      jest.spyOn(service as any, 'validateAndConsumeNonce').mockResolvedValue(mockNonceRecord);

      // Mock connector error
      (ethers.verifyMessage as jest.Mock).mockImplementation(() => {
        throw new Error('ConnectorNotConnectedError: Wallet not connected');
      });

      const mockInsert = {
        values: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await service.authenticateWallet(
        validWalletAddress,
        mockSignature,
        mockNonce
      );

      expect(result.success).toBe(false);
      expect(result.error).toEqual({
        code: 'WALLET_NOT_CONNECTED',
        message: 'Wallet is not connected. Please connect your wallet and try again.',
        details: 'The wallet connector is not available. This may be due to network issues or the wallet being disconnected.',
      });
    });

    it('should handle general authentication errors', async () => {
      // Mock nonce validation
      const mockNonceRecord = { message: mockMessage };
      jest.spyOn(service as any, 'validateAndConsumeNonce').mockResolvedValue(mockNonceRecord);

      // Mock general error
      (ethers.verifyMessage as jest.Mock).mockImplementation(() => {
        throw new Error('General authentication error');
      });

      const mockInsert = {
        values: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await service.authenticateWallet(
        validWalletAddress,
        mockSignature,
        mockNonce
      );

      expect(result.success).toBe(false);
      expect(result.error).toEqual({
        code: 'AUTHENTICATION_FAILED',
        message: 'Authentication failed. Please try again.',
        details: 'General authentication error',
      });
    });

    it('should invalidate existing sessions before creating new one', async () => {
      // Mock successful authentication flow
      const mockNonceRecord = { message: mockMessage };
      jest.spyOn(service as any, 'validateAndConsumeNonce').mockResolvedValue(mockNonceRecord);
      (ethers.verifyMessage as jest.Mock).mockReturnValue(validWalletAddress);

      const mockInsert = {
        values: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      await service.authenticateWallet(validWalletAddress, mockSignature, mockNonce);

      // Should call update to invalidate existing sessions
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockUpdate.set).toHaveBeenCalledWith({ isActive: false });
    });
  });

  describe('validateSession', () => {
    const mockSessionToken = 'mock-session-token';
    const validWalletAddress = '0x1234567890123456789012345678901234567890';

    it('should validate active session successfully', async () => {
      const mockSession = {
        id: 'session-id',
        walletAddress: validWalletAddress,
        sessionToken: mockSessionToken,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        isActive: true,
        lastUsedAt: new Date(),
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockSession]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await service.validateSession(mockSessionToken);

      expect(result).toEqual({
        id: 'session-id',
        walletAddress: validWalletAddress,
        sessionToken: mockSessionToken,
        expiresAt: mockSession.expiresAt,
        isActive: true,
        lastUsedAt: expect.any(Date),
      });

      // Should update lastUsedAt timestamp
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockUpdate.set).toHaveBeenCalledWith({ lastUsedAt: expect.any(Date) });
    });

    it('should return null for invalid session token', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]), // No sessions found
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await service.validateSession('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for expired session', async () => {
      const expiredSession = {
        id: 'session-id',
        walletAddress: validWalletAddress,
        sessionToken: mockSessionToken,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
        isActive: true,
        lastUsedAt: new Date(),
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([expiredSession]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await service.validateSession(mockSessionToken);

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await service.validateSession(mockSessionToken);

      expect(result).toBeNull();
    });
  });

  describe('refreshSession', () => {
    const mockRefreshToken = 'mock-refresh-token';
    const validWalletAddress = '0x1234567890123456789012345678901234567890';

    it('should refresh session successfully', async () => {
      const mockSession = {
        id: 'session-id',
        walletAddress: validWalletAddress,
        refreshToken: mockRefreshToken,
        refreshExpiresAt: new Date(Date.now() + 86400000), // 1 day from now
        isActive: true,
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockSession]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const mockInsert = {
        values: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      (jwt.sign as jest.Mock).mockReturnValue('new-mock-token');

      const result = await service.refreshSession(
        mockRefreshToken,
        'test-user-agent',
        '127.0.0.1'
      );

      expect(result.success).toBe(true);
      expect(result.sessionToken).toBe('new-mock-token');
      expect(result.refreshToken).toBe('new-mock-token');
      expect(result.expiresAt).toBeInstanceOf(Date);

      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should fail refresh with invalid refresh token', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]), // No sessions found
      };
      mockDb.select.mockReturnValue(mockSelect);

      const mockInsert = {
        values: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await service.refreshSession('invalid-refresh-token');

      expect(result.success).toBe(false);
      expect(result.error).toEqual({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token. Please log in again.',
      });
    });

    it('should handle database errors during refresh', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const mockInsert = {
        values: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await service.refreshSession(mockRefreshToken);

      expect(result.success).toBe(false);
      expect(result.error).toEqual({
        code: 'REFRESH_FAILED',
        message: 'Failed to refresh session. Please log in again.',
        details: 'Database error',
      });
    });
  });

  describe('logout', () => {
    const mockSessionToken = 'mock-session-token';
    const validWalletAddress = '0x1234567890123456789012345678901234567890';

    it('should logout successfully', async () => {
      const mockSession = {
        id: 'session-id',
        walletAddress: validWalletAddress,
        sessionToken: mockSessionToken,
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockSession]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const mockInsert = {
        values: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await service.logout(mockSessionToken, '127.0.0.1', 'test-user-agent');

      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockUpdate.set).toHaveBeenCalledWith({ isActive: false });
    });

    it('should handle logout for non-existent session', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]), // No sessions found
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await service.logout('non-existent-token');

      expect(result).toBe(true); // Should still return true for idempotency
    });

    it('should handle database errors during logout', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await service.logout(mockSessionToken);

      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions successfully', async () => {
      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      await service.cleanupExpiredSessions();

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockUpdate.set).toHaveBeenCalledWith({ isActive: false });
    });

    it('should handle database errors during cleanup', async () => {
      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      // Should not throw error
      await expect(service.cleanupExpiredSessions()).resolves.toBeUndefined();
    });
  });

  describe('getAuthStats', () => {
    it('should return authentication statistics', async () => {
      const result = await service.getAuthStats();

      expect(result).toEqual({
        totalSessions: 0,
        activeSessions: 0,
        recentAttempts: 0,
        successRate: 0,
      });
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockDb.select = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await service.getAuthStats('0x1234567890123456789012345678901234567890');

      expect(result).toBeNull();
    });
  });

  describe('Private helper methods', () => {
    describe('verifySignature', () => {
      it('should verify valid signature', async () => {
        const walletAddress = '0x1234567890123456789012345678901234567890';
        const message = 'Test message';
        const signature = 'test-signature';

        (ethers.verifyMessage as jest.Mock).mockReturnValue(walletAddress);

        const result = await (service as any).verifySignature(walletAddress, message, signature);

        expect(result).toBe(true);
        expect(ethers.verifyMessage).toHaveBeenCalledWith(message, signature);
      });

      it('should reject invalid signature', async () => {
        const walletAddress = '0x1234567890123456789012345678901234567890';
        const message = 'Test message';
        const signature = 'invalid-signature';

        (ethers.verifyMessage as jest.Mock).mockReturnValue('0xDifferentAddress');

        const result = await (service as any).verifySignature(walletAddress, message, signature);

        expect(result).toBe(false);
      });

      it('should handle signature verification errors', async () => {
        const walletAddress = '0x1234567890123456789012345678901234567890';
        const message = 'Test message';
        const signature = 'error-signature';

        (ethers.verifyMessage as jest.Mock).mockImplementation(() => {
          throw new Error('Signature verification error');
        });

        const result = await (service as any).verifySignature(walletAddress, message, signature);

        expect(result).toBe(false);
      });
    });

    describe('generateSessionToken', () => {
      it('should generate session token with correct payload', () => {
        const walletAddress = '0x1234567890123456789012345678901234567890';
        const mockToken = 'mock-session-token';

        (jwt.sign as jest.Mock).mockReturnValue(mockToken);

        const result = (service as any).generateSessionToken(walletAddress);

        expect(result).toBe(mockToken);
        expect(jwt.sign).toHaveBeenCalledWith(
          {
            walletAddress: walletAddress.toLowerCase(),
            type: 'session',
            timestamp: expect.any(Number),
          },
          mockJwtSecret,
          { expiresIn: '24h' }
        );
      });
    });

    describe('generateRefreshToken', () => {
      it('should generate refresh token with correct payload', () => {
        const walletAddress = '0x1234567890123456789012345678901234567890';
        const mockToken = 'mock-refresh-token';

        (jwt.sign as jest.Mock).mockReturnValue(mockToken);

        const result = (service as any).generateRefreshToken(walletAddress);

        expect(result).toBe(mockToken);
        expect(jwt.sign).toHaveBeenCalledWith(
          {
            walletAddress: walletAddress.toLowerCase(),
            type: 'refresh',
            timestamp: expect.any(Number),
          },
          mockJwtSecret,
          { expiresIn: '30d' }
        );
      });
    });
  });
});
