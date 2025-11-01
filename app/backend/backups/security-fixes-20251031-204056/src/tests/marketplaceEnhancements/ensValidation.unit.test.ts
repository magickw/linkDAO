import { ENSService } from '../../services/ensService';
import { jest } from '@jest/globals';

// Mock ethers for ENS testing
jest.mock('ethers', () => ({
  ethers: {
    providers: {
      JsonRpcProvider: jest.fn().mockImplementation(() => ({
        resolveName: jest.fn(),
        lookupAddress: jest.fn(),
        getResolver: jest.fn(),
      })),
    },
    utils: {
      isAddress: jest.fn(),
      getAddress: jest.fn(),
    },
  },
}));

describe('ENS Validation Unit Tests', () => {
  let ensService: ENSService;
  let mockProvider: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock provider
    mockProvider = {
      resolveName: jest.fn(),
      lookupAddress: jest.fn(),
      getResolver: jest.fn(),
    };
    
    ensService = new ENSService(mockProvider);
  });

  describe('validateENSHandle', () => {
    it('should validate correct ENS format', async () => {
      const validENS = 'test.eth';
      mockProvider.resolveName.mockResolvedValue('0x1234567890123456789012345678901234567890');
      
      const result = await ensService.validateENSHandle(validENS);
      
      expect(result).toBe(true);
      expect(mockProvider.resolveName).toHaveBeenCalledWith(validENS);
    });

    it('should reject invalid ENS format', async () => {
      const invalidENS = 'invalid-ens';
      
      const result = await ensService.validateENSHandle(invalidENS);
      
      expect(result).toBe(false);
    });

    it('should handle ENS resolution failure', async () => {
      const ensName = 'nonexistent.eth';
      mockProvider.resolveName.mockResolvedValue(null);
      
      const result = await ensService.validateENSHandle(ensName);
      
      expect(result).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      const ensName = 'test.eth';
      mockProvider.resolveName.mockRejectedValue(new Error('Network error'));
      
      const result = await ensService.validateENSHandle(ensName);
      
      expect(result).toBe(false);
    });
  });

  describe('resolveENSToAddress', () => {
    it('should resolve ENS name to address', async () => {
      const ensName = 'test.eth';
      const expectedAddress = '0x1234567890123456789012345678901234567890';
      mockProvider.resolveName.mockResolvedValue(expectedAddress);
      
      const result = await ensService.resolveENSToAddress(ensName);
      
      expect(result).toBe(expectedAddress);
      expect(mockProvider.resolveName).toHaveBeenCalledWith(ensName);
    });

    it('should return null for non-existent ENS', async () => {
      const ensName = 'nonexistent.eth';
      mockProvider.resolveName.mockResolvedValue(null);
      
      const result = await ensService.resolveENSToAddress(ensName);
      
      expect(result).toBeNull();
    });

    it('should handle resolution errors', async () => {
      const ensName = 'test.eth';
      mockProvider.resolveName.mockRejectedValue(new Error('Resolution failed'));
      
      const result = await ensService.resolveENSToAddress(ensName);
      
      expect(result).toBeNull();
    });
  });

  describe('reverseResolveAddress', () => {
    it('should reverse resolve address to ENS name', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const expectedENS = 'test.eth';
      mockProvider.lookupAddress.mockResolvedValue(expectedENS);
      
      const result = await ensService.reverseResolveAddress(address);
      
      expect(result).toBe(expectedENS);
      expect(mockProvider.lookupAddress).toHaveBeenCalledWith(address);
    });

    it('should return null for address without ENS', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      mockProvider.lookupAddress.mockResolvedValue(null);
      
      const result = await ensService.reverseResolveAddress(address);
      
      expect(result).toBeNull();
    });

    it('should handle invalid address format', async () => {
      const invalidAddress = 'invalid-address';
      
      const result = await ensService.reverseResolveAddress(invalidAddress);
      
      expect(result).toBeNull();
    });
  });

  describe('verifyENSOwnership', () => {
    it('should verify ENS ownership correctly', async () => {
      const ensName = 'test.eth';
      const walletAddress = '0x1234567890123456789012345678901234567890';
      mockProvider.resolveName.mockResolvedValue(walletAddress);
      
      const result = await ensService.verifyENSOwnership(ensName, walletAddress);
      
      expect(result).toBe(true);
    });

    it('should reject ownership for different address', async () => {
      const ensName = 'test.eth';
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const differentAddress = '0x0987654321098765432109876543210987654321';
      mockProvider.resolveName.mockResolvedValue(differentAddress);
      
      const result = await ensService.verifyENSOwnership(ensName, walletAddress);
      
      expect(result).toBe(false);
    });

    it('should handle case-insensitive address comparison', async () => {
      const ensName = 'test.eth';
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const upperCaseAddress = '0X1234567890123456789012345678901234567890';
      mockProvider.resolveName.mockResolvedValue(upperCaseAddress);
      
      const result = await ensService.verifyENSOwnership(ensName, walletAddress);
      
      expect(result).toBe(true);
    });
  });

  describe('isENSHandleAvailable', () => {
    it('should return false for existing ENS names', async () => {
      const ensName = 'existing.eth';
      mockProvider.resolveName.mockResolvedValue('0x1234567890123456789012345678901234567890');
      
      const result = await ensService.isENSHandleAvailable(ensName);
      
      expect(result).toBe(false);
    });

    it('should return true for non-existent ENS names', async () => {
      const ensName = 'available.eth';
      mockProvider.resolveName.mockResolvedValue(null);
      
      const result = await ensService.isENSHandleAvailable(ensName);
      
      expect(result).toBe(true);
    });

    it('should handle network errors as unavailable', async () => {
      const ensName = 'test.eth';
      mockProvider.resolveName.mockRejectedValue(new Error('Network error'));
      
      const result = await ensService.isENSHandleAvailable(ensName);
      
      expect(result).toBe(false);
    });
  });

  describe('suggestENSAlternatives', () => {
    it('should suggest alternatives for taken ENS names', async () => {
      const baseName = 'test';
      mockProvider.resolveName
        .mockResolvedValueOnce('0x1234567890123456789012345678901234567890') // test.eth taken
        .mockResolvedValueOnce(null) // test1.eth available
        .mockResolvedValueOnce(null) // test2.eth available
        .mockResolvedValueOnce(null); // test3.eth available
      
      const suggestions = await ensService.suggestENSAlternatives(baseName);
      
      expect(suggestions).toHaveLength(3);
      expect(suggestions).toContain('test1.eth');
      expect(suggestions).toContain('test2.eth');
      expect(suggestions).toContain('test3.eth');
    });

    it('should include original name if available', async () => {
      const baseName = 'available';
      mockProvider.resolveName.mockResolvedValue(null);
      
      const suggestions = await ensService.suggestENSAlternatives(baseName);
      
      expect(suggestions).toContain('available.eth');
    });

    it('should handle special characters in base name', async () => {
      const baseName = 'test-name';
      mockProvider.resolveName.mockResolvedValue(null);
      
      const suggestions = await ensService.suggestENSAlternatives(baseName);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toMatch(/^test-name.*\.eth$/);
    });
  });

  describe('Error Handling', () => {
    it('should handle provider connection errors', async () => {
      const ensName = 'test.eth';
      mockProvider.resolveName.mockRejectedValue(new Error('Provider not connected'));
      
      const result = await ensService.validateENSHandle(ensName);
      
      expect(result).toBe(false);
    });

    it('should handle timeout errors', async () => {
      const ensName = 'test.eth';
      mockProvider.resolveName.mockRejectedValue(new Error('Timeout'));
      
      const result = await ensService.validateENSHandle(ensName);
      
      expect(result).toBe(false);
    });

    it('should handle malformed responses', async () => {
      const ensName = 'test.eth';
      mockProvider.resolveName.mockResolvedValue('invalid-address');
      
      const result = await ensService.validateENSHandle(ensName);
      
      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty ENS name', async () => {
      const result = await ensService.validateENSHandle('');
      
      expect(result).toBe(false);
    });

    it('should handle null ENS name', async () => {
      const result = await ensService.validateENSHandle(null as any);
      
      expect(result).toBe(false);
    });

    it('should handle undefined ENS name', async () => {
      const result = await ensService.validateENSHandle(undefined as any);
      
      expect(result).toBe(false);
    });

    it('should handle very long ENS names', async () => {
      const longENS = 'a'.repeat(1000) + '.eth';
      
      const result = await ensService.validateENSHandle(longENS);
      
      expect(result).toBe(false);
    });

    it('should handle ENS names with special characters', async () => {
      const specialENS = 'test-name_123.eth';
      mockProvider.resolveName.mockResolvedValue('0x1234567890123456789012345678901234567890');
      
      const result = await ensService.validateENSHandle(specialENS);
      
      expect(result).toBe(true);
    });
  });
});