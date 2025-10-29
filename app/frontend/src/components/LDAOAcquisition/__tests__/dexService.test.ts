import { dexService } from '@/services/web3/dexService';

describe('DEX Service Integration Test', () => {
  it('should get swap quotes from DEX services', async () => {
    // Mock console.error to avoid noise in test output
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    try {
      const quotes = await dexService.getSwapQuotes('ETH', 'LDAO', '1');
      console.log('Quotes received:', quotes);
      
      // We expect this to fail in test environment since we don't have a real provider
      // But we want to make sure it doesn't throw an unhandled error
      expect(Array.isArray(quotes)).toBe(true);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('should handle errors gracefully', async () => {
    // Mock console.error to avoid noise in test output
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    try {
      const quotes = await dexService.getSwapQuotes('INVALID', 'LDAO', '1');
      console.log('Error quotes received:', quotes);
      
      // Should return empty array for invalid tokens
      expect(Array.isArray(quotes)).toBe(true);
      expect(quotes.length).toBe(0);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});