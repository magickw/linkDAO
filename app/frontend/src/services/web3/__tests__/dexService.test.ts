import { dexService } from '../dexService';
import { ethers } from 'ethers';

// Mock the web3 utilities
jest.mock('@/utils/web3', () => ({
  getSigner: jest.fn(),
  getProvider: jest.fn()
}));

// Mock the error handler
jest.mock('@/utils/web3ErrorHandling', () => ({
  web3ErrorHandler: {
    handleError: jest.fn().mockReturnValue({
      message: 'Mock error',
      severity: 'high'
    })
  }
}));

describe('DexService', () => {
  const mockSigner = {
    getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890')
  };

  const mockProvider = {
    getSigner: jest.fn().mockReturnValue(mockSigner)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    require('@/utils/web3').getSigner.mockResolvedValue(mockSigner);
    require('@/utils/web3').getProvider.mockResolvedValue(mockProvider);
  });

  describe('getTokenInfo', () => {
    it('should return token info for known tokens', () => {
      const tokenInfo = dexService.getTokenInfo('ETH');
      expect(tokenInfo).toEqual({
        address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        decimals: 18
      });
    });

    it('should return token info for LDAO token', () => {
      const tokenInfo = dexService.getTokenInfo('LDAO');
      expect(tokenInfo).toEqual({
        address: '0xc9F690B45e33ca909bB9ab97836091673232611B',
        decimals: 18
      });
    });

    it('should return null for unknown tokens', () => {
      const tokenInfo = dexService.getTokenInfo('UNKNOWN');
      expect(tokenInfo).toBeNull();
    });
  });
});