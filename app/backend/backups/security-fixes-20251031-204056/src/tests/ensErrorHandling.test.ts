import { ENSService } from '../services/ensService';

describe('ENSService Error Handling and Fallbacks', () => {
  let ensService: ENSService;

  beforeEach(() => {
    ensService = new ENSService();
  });

  describe('Error Message Handling', () => {
    it('should provide user-friendly error messages for common errors', async () => {
      // Test format validation errors
      const invalidFormatResult = await ensService.validateENSHandle('invalid-name');
      expect(invalidFormatResult.isValid).toBe(false);
      expect(invalidFormatResult.error).toContain('Invalid ENS name format');
      expect(invalidFormatResult.error).toContain('Must end with .eth');
    });

    it('should handle empty ENS names gracefully', async () => {
      const emptyResult = await ensService.validateENSHandle('');
      expect(emptyResult.isValid).toBe(false);
      expect(emptyResult.error).toContain('Invalid ENS name format');
    });

    it('should handle null/undefined ENS names gracefully', async () => {
      const nullResult = await ensService.validateENSHandle(null as any);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.error).toContain('Invalid ENS name format');

      const undefinedResult = await ensService.validateENSHandle(undefined as any);
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.error).toContain('Invalid ENS name format');
    });
  });

  describe('Service Availability', () => {
    it('should provide service status information', async () => {
      const status = await ensService.getServiceStatus();
      
      expect(status).toHaveProperty('available');
      expect(status).toHaveProperty('message');
      expect(status).toHaveProperty('lastChecked');
      expect(status).toHaveProperty('nextCheck');
      expect(typeof status.available).toBe('boolean');
      expect(typeof status.message).toBe('string');
      expect(status.lastChecked).toBeInstanceOf(Date);
      expect(status.nextCheck).toBeInstanceOf(Date);
    });

    it('should perform health checks', async () => {
      const health = await ensService.healthCheck();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('provider');
      expect(['healthy', 'unhealthy']).toContain(health.status);
      expect(['connected', 'disconnected']).toContain(health.provider);
    });
  });

  describe('Fallback Mechanisms', () => {
    it('should provide fallback validation when service is unavailable', async () => {
      // This test validates the fallback mechanism exists
      const fallbackResult = await ensService.validateENSHandleWithFallback('test.eth');
      
      expect(fallbackResult).toHaveProperty('isValid');
      expect(fallbackResult).toHaveProperty('error');
      
      // If the service is unavailable, it should provide helpful guidance
      if (!fallbackResult.isValid && fallbackResult.error?.includes('unavailable')) {
        expect(fallbackResult.error).toContain('proceed without ENS verification');
      }
    });
  });

  describe('Input Validation', () => {
    it('should validate ENS format correctly', async () => {
      const testCases = [
        { input: 'test.eth', shouldBeValid: true },
        { input: 'test-name.eth', shouldBeValid: true },
        { input: 'test123.eth', shouldBeValid: true },
        { input: 'ab.eth', shouldBeValid: false }, // Too short
        { input: 'test@name.eth', shouldBeValid: false }, // Invalid character
        { input: '-testname.eth', shouldBeValid: false }, // Starts with hyphen
        { input: 'testname-.eth', shouldBeValid: false }, // Ends with hyphen
        { input: 'test--name.eth', shouldBeValid: false }, // Consecutive hyphens
        { input: '.eth', shouldBeValid: false }, // Empty name
        { input: 'testname', shouldBeValid: false }, // No .eth suffix
        { input: 'testname.com', shouldBeValid: false }, // Wrong suffix
      ];

      for (const testCase of testCases) {
        const result = await ensService.validateENSHandle(testCase.input);
        
        if (testCase.shouldBeValid) {
          // For valid formats, the error should not be about format
          if (!result.isValid) {
            expect(result.error).not.toContain('Invalid ENS name format');
          }
        } else {
          // For invalid formats, should fail with format error
          expect(result.isValid).toBe(false);
          expect(result.error).toContain('Invalid ENS name format');
        }
      }
    });
  });

  describe('Ownership Verification Error Handling', () => {
    it('should handle invalid wallet addresses gracefully', async () => {
      const result = await ensService.verifyENSOwnership('test.eth', 'invalid-address');
      
      expect(result.isOwner).toBe(false);
      expect(result.error).toContain('Invalid wallet address format');
      expect(result.error).toContain('valid Ethereum address');
    });

    it('should handle empty wallet addresses', async () => {
      const result = await ensService.verifyENSOwnership('test.eth', '');
      
      expect(result.isOwner).toBe(false);
      expect(result.error).toContain('Invalid wallet address format');
    });
  });

  describe('Availability Check Error Handling', () => {
    it('should handle invalid ENS names in availability checks', async () => {
      const result = await ensService.isENSHandleAvailable('invalid-name');
      
      expect(result.isAvailable).toBe(false);
      expect(result.isRegistered).toBe(false);
      expect(result.error).toContain('Invalid ENS name format');
    });
  });

  describe('Suggestion System Error Handling', () => {
    it('should handle empty input for suggestions', async () => {
      const suggestions = await ensService.suggestENSAlternatives('');
      
      expect(Array.isArray(suggestions)).toBe(true);
      // Should still provide some suggestions even with empty input
    });

    it('should clean and process special characters in suggestions', async () => {
      const suggestions = await ensService.suggestENSAlternatives('Test@Name#123!');
      
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      
      // All suggestions should be valid ENS format
      suggestions.forEach(suggestion => {
        expect(suggestion.name).toMatch(/^[a-z0-9-]+\.eth$/);
        expect(suggestion.name).not.toMatch(/^-/); // Should not start with hyphen
        expect(suggestion.name).not.toMatch(/-$/); // Should not end with hyphen
        expect(suggestion.name).not.toMatch(/--/); // Should not have consecutive hyphens
      });
    });

    it('should limit suggestion name length', async () => {
      const longName = 'a'.repeat(100);
      const suggestions = await ensService.suggestENSAlternatives(longName);
      
      expect(Array.isArray(suggestions)).toBe(true);
      
      // All suggestions should have reasonable length
      suggestions.forEach(suggestion => {
        const nameWithoutEth = suggestion.name.replace('.eth', '');
        expect(nameWithoutEth.length).toBeLessThanOrEqual(30); // Reasonable limit
      });
    });
  });
});