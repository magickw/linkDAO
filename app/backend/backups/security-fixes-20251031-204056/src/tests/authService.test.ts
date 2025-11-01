import { AuthService } from '../services/authService';
import { RedisService } from '../services/redisService';
import { DatabaseService } from '../services/databaseService';

// Mock dependencies
jest.mock('../services/redisService');
jest.mock('../services/databaseService');

describe('AuthService', () => {
  let authService: AuthService;
  let mockRedisService: jest.Mocked<RedisService>;
  let mockDatabaseService: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    authService = new AuthService();
    mockRedisService = new RedisService() as jest.Mocked<RedisService>;
    mockDatabaseService = new DatabaseService() as jest.Mocked<DatabaseService>;
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('generateNonce', () => {
    it('should generate and store a nonce', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      mockRedisService.setex = jest.fn().mockResolvedValue('OK');

      const nonce = await authService.generateNonce(address);

      expect(nonce).toBeDefined();
      expect(nonce).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(mockRedisService.setex).toHaveBeenCalledWith(
        `nonce:${address.toLowerCase()}`,
        600,
        nonce
      );
    });
  });

  describe('verifyNonce', () => {
    it('should verify a valid nonce', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const nonce = 'test-nonce';
      
      mockRedisService.get = jest.fn().mockResolvedValue(nonce);
      mockRedisService.del = jest.fn().mockResolvedValue(1);

      const result = await authService.verifyNonce(address, nonce);

      expect(result).toBe(true);
      expect(mockRedisService.get).toHaveBeenCalledWith(`nonce:${address.toLowerCase()}`);
      expect(mockRedisService.del).toHaveBeenCalledWith(`nonce:${address.toLowerCase()}`);
    });

    it('should reject an invalid nonce', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const nonce = 'test-nonce';
      
      mockRedisService.get = jest.fn().mockResolvedValue('different-nonce');

      const result = await authService.verifyNonce(address, nonce);

      expect(result).toBe(false);
      expect(mockRedisService.del).not.toHaveBeenCalled();
    });

    it('should reject when nonce does not exist', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const nonce = 'test-nonce';
      
      mockRedisService.get = jest.fn().mockResolvedValue(null);

      const result = await authService.verifyNonce(address, nonce);

      expect(result).toBe(false);
      expect(mockRedisService.del).not.toHaveBeenCalled();
    });
  });

  describe('initializeUserSession', () => {
    it('should create a new user session', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      mockRedisService.setex = jest.fn().mockResolvedValue('OK');

      await authService.initializeUserSession(address);

      expect(mockRedisService.setex).toHaveBeenCalledWith(
        `session:${address.toLowerCase()}`,
        86400 * 7,
        expect.stringContaining('"loginCount":1')
      );
    });
  });

  describe('updateLastLogin', () => {
    it('should update existing session', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const existingSession = JSON.stringify({
        createdAt: '2023-01-01T00:00:00.000Z',
        loginCount: 5,
        lastLogin: '2023-01-01T00:00:00.000Z'
      });
      
      mockRedisService.get = jest.fn().mockResolvedValue(existingSession);
      mockRedisService.setex = jest.fn().mockResolvedValue('OK');

      await authService.updateLastLogin(address);

      expect(mockRedisService.setex).toHaveBeenCalledWith(
        `session:${address.toLowerCase()}`,
        86400 * 7,
        expect.stringContaining('"loginCount":6')
      );
    });

    it('should create new session if none exists', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      
      mockRedisService.get = jest.fn().mockResolvedValue(null);
      mockRedisService.setex = jest.fn().mockResolvedValue('OK');

      await authService.updateLastLogin(address);

      expect(mockRedisService.setex).toHaveBeenCalledWith(
        `session:${address.toLowerCase()}`,
        86400 * 7,
        expect.stringContaining('"loginCount":1')
      );
    });
  });

  describe('getUserPermissions', () => {
    it('should return basic permissions for new user', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      
      const mockDb = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };
      
      mockDatabaseService.getDatabase = jest.fn().mockReturnValue(mockDb);

      const permissions = await authService.getUserPermissions(address);

      expect(permissions).toEqual(['basic_trading', 'profile_management']);
    });

    it('should return enhanced permissions for KYC verified user', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const userData = {
        id: '1',
        walletAddress: address,
        kycStatus: 'intermediate'
      };
      
      const mockDb = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([userData])
      };
      
      mockDatabaseService.getDatabase = jest.fn().mockReturnValue(mockDb);

      const permissions = await authService.getUserPermissions(address);

      expect(permissions).toContain('basic_trading');
      expect(permissions).toContain('profile_management');
      expect(permissions).toContain('enhanced_trading');
      expect(permissions).toContain('nft_trading');
      expect(permissions).toContain('high_value_trading');
      expect(permissions).toContain('escrow_management');
    });
  });

  describe('checkRateLimit', () => {
    it('should allow request within rate limit', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const action = 'auth';
      
      mockRedisService.get = jest.fn().mockResolvedValue('5');
      mockRedisService.incr = jest.fn().mockResolvedValue(6);

      const result = await authService.checkRateLimit(address, action);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 10 - 5 - 1
    });

    it('should reject request exceeding rate limit', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const action = 'auth';
      
      mockRedisService.get = jest.fn().mockResolvedValue('10');
      mockRedisService.ttl = jest.fn().mockResolvedValue(1800);

      const result = await authService.checkRateLimit(address, action);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should initialize counter for first request', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const action = 'auth';
      
      mockRedisService.get = jest.fn().mockResolvedValue(null);
      mockRedisService.setex = jest.fn().mockResolvedValue('OK');

      const result = await authService.checkRateLimit(address, action);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9); // 10 - 0 - 1
      expect(mockRedisService.setex).toHaveBeenCalledWith(
        `rate_limit:auth:${address.toLowerCase()}`,
        3600,
        '1'
      );
    });
  });

  describe('device management', () => {
    const address = '0x1234567890123456789012345678901234567890';
    const fingerprint = 'device-fingerprint-123';

    describe('storeDeviceFingerprint', () => {
      it('should store new device fingerprint', async () => {
        mockRedisService.get = jest.fn().mockResolvedValue(null);
        mockRedisService.setex = jest.fn().mockResolvedValue('OK');

        await authService.storeDeviceFingerprint(address, fingerprint, 'Mozilla/5.0', '192.168.1.1');

        expect(mockRedisService.setex).toHaveBeenCalledWith(
          `device:${address.toLowerCase()}:${fingerprint}`,
          86400 * 30,
          expect.stringContaining('"trusted":false')
        );
      });

      it('should update existing device fingerprint', async () => {
        const existingDevice = JSON.stringify({
          fingerprint,
          firstSeen: '2023-01-01T00:00:00.000Z',
          trusted: true
        });
        
        mockRedisService.get = jest.fn().mockResolvedValue(existingDevice);
        mockRedisService.setex = jest.fn().mockResolvedValue('OK');

        await authService.storeDeviceFingerprint(address, fingerprint, 'Mozilla/5.0', '192.168.1.1');

        expect(mockRedisService.setex).toHaveBeenCalledWith(
          `device:${address.toLowerCase()}:${fingerprint}`,
          86400 * 30,
          expect.stringContaining('"trusted":true')
        );
      });
    });

    describe('isDeviceTrusted', () => {
      it('should return true for trusted device', async () => {
        const deviceData = JSON.stringify({
          fingerprint,
          trusted: true
        });
        
        mockRedisService.get = jest.fn().mockResolvedValue(deviceData);

        const result = await authService.isDeviceTrusted(address, fingerprint);

        expect(result).toBe(true);
      });

      it('should return false for untrusted device', async () => {
        const deviceData = JSON.stringify({
          fingerprint,
          trusted: false
        });
        
        mockRedisService.get = jest.fn().mockResolvedValue(deviceData);

        const result = await authService.isDeviceTrusted(address, fingerprint);

        expect(result).toBe(false);
      });

      it('should return false for non-existent device', async () => {
        mockRedisService.get = jest.fn().mockResolvedValue(null);

        const result = await authService.isDeviceTrusted(address, fingerprint);

        expect(result).toBe(false);
      });
    });

    describe('trustDevice', () => {
      it('should mark device as trusted', async () => {
        const deviceData = JSON.stringify({
          fingerprint,
          trusted: false,
          firstSeen: '2023-01-01T00:00:00.000Z'
        });
        
        mockRedisService.get = jest.fn().mockResolvedValue(deviceData);
        mockRedisService.setex = jest.fn().mockResolvedValue('OK');

        await authService.trustDevice(address, fingerprint);

        expect(mockRedisService.setex).toHaveBeenCalledWith(
          `device:${address.toLowerCase()}:${fingerprint}`,
          86400 * 30,
          expect.stringContaining('"trusted":true')
        );
      });
    });
  });
});