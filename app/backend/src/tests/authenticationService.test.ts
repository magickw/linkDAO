import { AuthenticationService } from '../services/authenticationService';
import { ethers } from 'ethers';

// Mock the database and external dependencies
jest.mock('drizzle-orm/postgres-js');
jest.mock('postgres');
jest.mock('jsonwebtoken');
jest.mock('ethers');

describe('AuthenticationService', () => {
  let authService: AuthenticationService;
  let mockDb: any;

  beforeEach(() => {
    // Mock database
    mockDb = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      }),
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    };

    // Mock postgres connection
    const mockSql = jest.fn() as any;
    mockSql.unsafe = jest.fn().mockResolvedValue(undefined);
    mockSql.end = jest.fn().mockResolvedValue(undefined);

    require('postgres').mockReturnValue(mockSql);
    require('drizzle-orm/postgres-js').drizzle.mockReturnValue(mockDb);

    authService = new AuthenticationService('mock://connection', 'test-secret');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateNonce', () => {
    it('should generate a nonce for wallet authentication', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      
      const result = await authService.generateNonce(walletAddress);

      expect(result).toHaveProperty('nonce');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('expiresAt');
      expect(result.nonce).toHaveLength(64); // 32 bytes in hex
      expect(result.message).toContain('Sign this message to authenticate');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockDb.insert.mockImplementation(() => {
        throw new Error('Database error');
      });

      const walletAddress = '0x1234567890123456789012345678901234567890';

      await expect(authService.generateNonce(walletAddress)).rejects.toThrow(
        'Failed to generate authentication nonce'
      );
    });
  });

  describe('authenticateWallet', () => {
    it('should authenticate wallet with valid signature', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const signature = '0x' + 'a'.repeat(130);
      const nonce = 'test-nonce';

      // Mock nonce validation
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              id: 'nonce-id',
              message: 'test message',
            }]),
          }),
        }),
      });

      // Mock signature verification
      (ethers.verifyMessage as jest.Mock).mockReturnValue(walletAddress);

      // Mock JWT token generation
      require('jsonwebtoken').sign.mockReturnValue('mock-token');

      const result = await authService.authenticateWallet(
        walletAddress,
        signature,
        nonce,
        'test-agent',
        '127.0.0.1'
      );

      expect(result.success).toBe(true);
      expect(result.sessionToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(mockDb.insert).toHaveBeenCalledTimes(2); // session + auth attempt
    });

    it('should fail with invalid nonce', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const signature = '0x' + 'a'.repeat(130);
      const nonce = 'invalid-nonce';

      // Mock empty nonce result
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await authService.authenticateWallet(
        walletAddress,
        signature,
        nonce
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_NONCE');
    });

    it('should fail with invalid signature', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const signature = '0x' + 'a'.repeat(130);
      const nonce = 'test-nonce';

      // Mock nonce validation
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              id: 'nonce-id',
              message: 'test message',
            }]),
          }),
        }),
      });

      // Mock invalid signature verification
      (ethers.verifyMessage as jest.Mock).mockReturnValue('0xdifferentaddress');

      const result = await authService.authenticateWallet(
        walletAddress,
        signature,
        nonce
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_SIGNATURE');
    });

    it('should handle ConnectorNotConnectedError gracefully', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const signature = '0x' + 'a'.repeat(130);
      const nonce = 'test-nonce';

      // Mock nonce validation
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              id: 'nonce-id',
              message: 'test message',
            }]),
          }),
        }),
      });

      // Mock ConnectorNotConnectedError
      (ethers.verifyMessage as jest.Mock).mockImplementation(() => {
        throw new Error('ConnectorNotConnectedError: Wallet not connected');
      });

      const result = await authService.authenticateWallet(
        walletAddress,
        signature,
        nonce
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WALLET_NOT_CONNECTED');
      expect(result.error?.message).toContain('Wallet is not connected');
    });
  });

  describe('validateSession', () => {
    it('should validate active session', async () => {
      const sessionToken = 'valid-session-token';
      const mockSession = {
        id: 'session-id',
        walletAddress: '0x1234567890123456789012345678901234567890',
        sessionToken,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        isActive: true,
      };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockSession]),
          }),
        }),
      });

      const result = await authService.validateSession(sessionToken);

      expect(result).toBeTruthy();
      expect(result?.walletAddress).toBe(mockSession.walletAddress);
      expect(result?.sessionToken).toBe(sessionToken);
      expect(mockDb.update).toHaveBeenCalled(); // lastUsedAt update
    });

    it('should return null for invalid session', async () => {
      const sessionToken = 'invalid-session-token';

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await authService.validateSession(sessionToken);

      expect(result).toBeNull();
    });
  });

  describe('refreshSession', () => {
    it('should refresh valid session', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockSession = {
        id: 'session-id',
        walletAddress: '0x1234567890123456789012345678901234567890',
        refreshToken,
        refreshExpiresAt: new Date(Date.now() + 86400000), // 1 day from now
        isActive: true,
      };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockSession]),
          }),
        }),
      });

      require('jsonwebtoken').sign.mockReturnValue('new-token');

      const result = await authService.refreshSession(refreshToken);

      expect(result.success).toBe(true);
      expect(result.sessionToken).toBe('new-token');
      expect(result.refreshToken).toBe('new-token');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should fail with invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh-token';

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await authService.refreshSession(refreshToken);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const sessionToken = 'session-token';
      const mockSession = {
        id: 'session-id',
        walletAddress: '0x1234567890123456789012345678901234567890',
      };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockSession]),
          }),
        }),
      });

      const result = await authService.logout(sessionToken);

      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalled(); // isActive = false
    });

    it('should handle logout with invalid token', async () => {
      const sessionToken = 'invalid-token';

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await authService.logout(sessionToken);

      expect(result).toBe(true); // Should still return true for graceful handling
    });
  });

  describe('cleanup methods', () => {
    it('should cleanup expired sessions', async () => {
      await authService.cleanupExpiredSessions();

      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockDb.update.mockImplementation(() => {
        throw new Error('Database error');
      });

      // Should not throw
      await expect(authService.cleanupExpiredSessions()).resolves.toBeUndefined();
    });
  });
});