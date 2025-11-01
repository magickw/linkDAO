import { KYCService } from '../services/kycService';
import { DatabaseService } from '../services/databaseService';
import { RedisService } from '../services/redisService';

// Mock dependencies
jest.mock('../services/databaseService');
jest.mock('../services/redisService');

describe('KYCService', () => {
  let kycService: KYCService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockRedisService: jest.Mocked<RedisService>;

  beforeEach(() => {
    kycService = new KYCService();
    mockDatabaseService = new DatabaseService() as jest.Mocked<DatabaseService>;
    mockRedisService = new RedisService() as jest.Mocked<RedisService>;
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('initiateKYC', () => {
    it('should initiate basic KYC verification', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const tier = 'basic';
      
      mockRedisService.setex = jest.fn().mockResolvedValue('OK');
      
      const mockDb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined)
      };
      
      mockDatabaseService.getDatabase = jest.fn().mockReturnValue(mockDb);

      const result = await kycService.initiateKYC(address, tier);

      expect(result.tier).toBe(tier);
      expect(result.status).toBe('pending');
      expect(result.walletAddress).toBe(address.toLowerCase());
      expect(result.requiredDocuments).toEqual(['national_id']);
      expect(result.estimatedProcessingTime).toBe('1-2 business days');
      
      expect(mockRedisService.setex).toHaveBeenCalledWith(
        `kyc:${address.toLowerCase()}`,
        86400 * 30,
        expect.any(String)
      );
    });

    it('should initiate intermediate KYC verification', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const tier = 'intermediate';
      
      mockRedisService.setex = jest.fn().mockResolvedValue('OK');
      
      const mockDb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined)
      };
      
      mockDatabaseService.getDatabase = jest.fn().mockReturnValue(mockDb);

      const result = await kycService.initiateKYC(address, tier);

      expect(result.tier).toBe(tier);
      expect(result.requiredDocuments).toEqual(['national_id', 'utility_bill']);
      expect(result.estimatedProcessingTime).toBe('3-5 business days');
    });

    it('should initiate advanced KYC verification', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const tier = 'advanced';
      
      mockRedisService.setex = jest.fn().mockResolvedValue('OK');
      
      const mockDb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined)
      };
      
      mockDatabaseService.getDatabase = jest.fn().mockReturnValue(mockDb);

      const result = await kycService.initiateKYC(address, tier);

      expect(result.tier).toBe(tier);
      expect(result.requiredDocuments).toEqual(['passport', 'utility_bill', 'bank_statement']);
      expect(result.estimatedProcessingTime).toBe('5-10 business days');
    });
  });

  describe('getKYCStatus', () => {
    it('should return none status for non-existent KYC', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      
      mockRedisService.get = jest.fn().mockResolvedValue(null);

      const result = await kycService.getKYCStatus(address);

      expect(result.status).toBe('none');
      expect(result.tier).toBe('none');
    });

    it('should return KYC status for existing verification', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const kycData = {
        id: 'kyc-123',
        walletAddress: address.toLowerCase(),
        tier: 'basic',
        status: 'approved',
        documents: [
          { type: 'national_id', url: 'ipfs://...', uploadedAt: '2023-01-01T00:00:00.000Z', verified: true }
        ],
        submittedAt: '2023-01-01T00:00:00.000Z',
        reviewedAt: '2023-01-02T00:00:00.000Z',
        expiresAt: '2024-01-01T00:00:00.000Z'
      };
      
      mockRedisService.get = jest.fn().mockResolvedValue(JSON.stringify(kycData));

      const result = await kycService.getKYCStatus(address);

      expect(result.status).toBe('approved');
      expect(result.tier).toBe('basic');
      expect(result.submittedAt).toBe('2023-01-01T00:00:00.000Z');
      expect(result.reviewedAt).toBe('2023-01-02T00:00:00.000Z');
      expect(result.expiresAt).toBe('2024-01-01T00:00:00.000Z');
      expect(result.requiredDocuments).toEqual(['national_id']);
      expect(result.completedDocuments).toEqual(['national_id']);
    });
  });

  describe('uploadDocument', () => {
    it('should upload document for existing KYC', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const kycData = {
        id: 'kyc-123',
        walletAddress: address.toLowerCase(),
        tier: 'basic',
        status: 'pending',
        documents: [],
        submittedAt: '2023-01-01T00:00:00.000Z'
      };
      
      const document = {
        type: 'national_id' as const,
        url: 'ipfs://document-hash',
        uploadedAt: '2023-01-01T00:00:00.000Z',
        verified: false
      };
      
      mockRedisService.get = jest.fn().mockResolvedValue(JSON.stringify(kycData));
      mockRedisService.setex = jest.fn().mockResolvedValue('OK');

      await kycService.uploadDocument(address, document);

      expect(mockRedisService.setex).toHaveBeenCalledWith(
        `kyc:${address.toLowerCase()}`,
        86400 * 30,
        expect.stringContaining('"type":"national_id"')
      );
    });

    it('should throw error for non-existent KYC', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const document = {
        type: 'national_id' as const,
        url: 'ipfs://document-hash',
        uploadedAt: '2023-01-01T00:00:00.000Z',
        verified: false
      };
      
      mockRedisService.get = jest.fn().mockResolvedValue(null);

      await expect(kycService.uploadDocument(address, document)).rejects.toThrow('KYC process not initiated');
    });

    it('should update status to under_review when all documents uploaded', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const kycData = {
        id: 'kyc-123',
        walletAddress: address.toLowerCase(),
        tier: 'basic',
        status: 'pending',
        documents: [],
        submittedAt: '2023-01-01T00:00:00.000Z'
      };
      
      const document = {
        type: 'national_id' as const,
        url: 'ipfs://document-hash',
        uploadedAt: '2023-01-01T00:00:00.000Z',
        verified: false
      };
      
      mockRedisService.get = jest.fn().mockResolvedValue(JSON.stringify(kycData));
      mockRedisService.setex = jest.fn().mockResolvedValue('OK');

      await kycService.uploadDocument(address, document);

      expect(mockRedisService.setex).toHaveBeenCalledWith(
        `kyc:${address.toLowerCase()}`,
        86400 * 30,
        expect.stringContaining('"status":"under_review"')
      );
    });
  });

  describe('approveKYC', () => {
    it('should approve KYC verification', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const kycData = {
        id: 'kyc-123',
        walletAddress: address.toLowerCase(),
        tier: 'basic',
        status: 'under_review',
        documents: [
          { type: 'national_id', url: 'ipfs://...', uploadedAt: '2023-01-01T00:00:00.000Z', verified: false }
        ],
        submittedAt: '2023-01-01T00:00:00.000Z'
      };
      
      mockRedisService.get = jest.fn().mockResolvedValue(JSON.stringify(kycData));
      mockRedisService.setex = jest.fn().mockResolvedValue('OK');
      
      const mockDb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined)
      };
      
      mockDatabaseService.getDatabase = jest.fn().mockReturnValue(mockDb);

      await kycService.approveKYC(address, 'Approved by admin');

      expect(mockRedisService.setex).toHaveBeenCalledWith(
        `kyc:${address.toLowerCase()}`,
        86400 * 365,
        expect.stringContaining('"status":"approved"')
      );
    });

    it('should throw error for non-existent KYC', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      
      mockRedisService.get = jest.fn().mockResolvedValue(null);

      await expect(kycService.approveKYC(address)).rejects.toThrow('KYC data not found');
    });
  });

  describe('rejectKYC', () => {
    it('should reject KYC verification', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const kycData = {
        id: 'kyc-123',
        walletAddress: address.toLowerCase(),
        tier: 'basic',
        status: 'under_review',
        documents: [
          { type: 'national_id', url: 'ipfs://...', uploadedAt: '2023-01-01T00:00:00.000Z', verified: false }
        ],
        submittedAt: '2023-01-01T00:00:00.000Z'
      };
      
      mockRedisService.get = jest.fn().mockResolvedValue(JSON.stringify(kycData));
      mockRedisService.setex = jest.fn().mockResolvedValue('OK');
      
      const mockDb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined)
      };
      
      mockDatabaseService.getDatabase = jest.fn().mockReturnValue(mockDb);

      await kycService.rejectKYC(address, 'Document quality insufficient');

      expect(mockRedisService.setex).toHaveBeenCalledWith(
        `kyc:${address.toLowerCase()}`,
        86400 * 30,
        expect.stringContaining('"status":"rejected"')
      );
    });
  });

  describe('isKYCExpired', () => {
    it('should return false for non-approved KYC', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      
      mockRedisService.get = jest.fn().mockResolvedValue(null);

      const result = await kycService.isKYCExpired(address);

      expect(result).toBe(false);
    });

    it('should return true for expired KYC', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const kycData = {
        id: 'kyc-123',
        walletAddress: address.toLowerCase(),
        tier: 'basic',
        status: 'approved',
        documents: [],
        submittedAt: '2023-01-01T00:00:00.000Z',
        expiresAt: '2023-01-01T00:00:00.000Z' // Expired
      };
      
      mockRedisService.get = jest.fn().mockResolvedValue(JSON.stringify(kycData));

      const result = await kycService.isKYCExpired(address);

      expect(result).toBe(true);
    });

    it('should return false for valid KYC', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const kycData = {
        id: 'kyc-123',
        walletAddress: address.toLowerCase(),
        tier: 'basic',
        status: 'approved',
        documents: [],
        submittedAt: '2023-01-01T00:00:00.000Z',
        expiresAt: futureDate
      };
      
      mockRedisService.get = jest.fn().mockResolvedValue(JSON.stringify(kycData));

      const result = await kycService.isKYCExpired(address);

      expect(result).toBe(false);
    });
  });

  describe('getKYCLimits', () => {
    it('should return limits for none tier', () => {
      const limits = kycService.getKYCLimits('none');

      expect(limits.dailyLimit).toBe(100);
      expect(limits.monthlyLimit).toBe(1000);
      expect(limits.transactionLimit).toBe(50);
      expect(limits.features).toEqual(['basic_trading']);
    });

    it('should return limits for basic tier', () => {
      const limits = kycService.getKYCLimits('basic');

      expect(limits.dailyLimit).toBe(1000);
      expect(limits.monthlyLimit).toBe(10000);
      expect(limits.transactionLimit).toBe(500);
      expect(limits.features).toContain('basic_trading');
      expect(limits.features).toContain('nft_trading');
    });

    it('should return limits for intermediate tier', () => {
      const limits = kycService.getKYCLimits('intermediate');

      expect(limits.dailyLimit).toBe(10000);
      expect(limits.monthlyLimit).toBe(100000);
      expect(limits.transactionLimit).toBe(5000);
      expect(limits.features).toContain('escrow_services');
    });

    it('should return limits for advanced tier', () => {
      const limits = kycService.getKYCLimits('advanced');

      expect(limits.dailyLimit).toBe(100000);
      expect(limits.monthlyLimit).toBe(1000000);
      expect(limits.transactionLimit).toBe(50000);
      expect(limits.features).toContain('governance_voting');
      expect(limits.features).toContain('dispute_resolution');
    });

    it('should return default limits for unknown tier', () => {
      const limits = kycService.getKYCLimits('unknown');

      expect(limits.dailyLimit).toBe(100);
      expect(limits.monthlyLimit).toBe(1000);
      expect(limits.transactionLimit).toBe(50);
      expect(limits.features).toEqual(['basic_trading']);
    });
  });
});
