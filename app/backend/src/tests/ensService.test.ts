import { ENSService } from '../services/ensService';

describe('ENSService', () => {
  let ensService: ENSService;

  beforeEach(() => {
    ensService = new ENSService();
  });

  describe('validateENSHandle', () => {
    it('should reject invalid ENS format - no .eth suffix', async () => {
      const result = await ensService.validateENSHandle('invalid-name');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid ENS name format');
    });

    it('should reject names shorter than 3 characters', async () => {
      const result = await ensService.validateENSHandle('ab.eth');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid ENS name format');
    });

    it('should reject names with invalid characters', async () => {
      const result = await ensService.validateENSHandle('test@name.eth');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid ENS name format');
    });

    it('should reject names starting or ending with hyphen', async () => {
      const result1 = await ensService.validateENSHandle('-testname.eth');
      const result2 = await ensService.validateENSHandle('testname-.eth');

      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
    });

    it('should reject empty names', async () => {
      const result = await ensService.validateENSHandle('.eth');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid ENS name format');
    });

    it('should reject names with consecutive hyphens', async () => {
      const result = await ensService.validateENSHandle('test--name.eth');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid ENS name format');
    });

    it('should accept valid ENS format (format validation only)', async () => {
      // This test only validates format, not actual resolution
      // Since we can't easily mock ethers in this environment, we'll test the format validation
      const validFormats = [
        'test.eth',
        'test-name.eth',
        'test123.eth',
        'verylong-test-name-123.eth'
      ];

      for (const format of validFormats) {
        // We expect these to pass format validation, but may fail on resolution
        // which is expected in a test environment without network access
        const result = await ensService.validateENSHandle(format);
        
        // The format should be valid, but resolution may fail
        if (result.error) {
          expect(result.error).not.toContain('Invalid ENS name format');
        }
      }
    });
  });

  describe('suggestENSAlternatives', () => {
    it('should generate ENS alternatives', async () => {
      const suggestions = await ensService.suggestENSAlternatives('testname');

      expect(suggestions).toHaveLength(10);
      expect(suggestions[0].name).toBe('testname.eth');
      expect(suggestions[1].name).toBe('testnamedao.eth');
      expect(suggestions[2].name).toBe('testnamedefi.eth');
      expect(suggestions[3].name).toBe('testnamenft.eth');
      expect(suggestions[4].name).toBe('testnameweb3.eth');
      expect(suggestions[5].name).toBe('thetestname.eth');
      expect(suggestions[6].name).toBe('testnameofficial.eth');
      expect(suggestions[7].name).toBe('testname2024.eth');
      expect(suggestions[8].name).toBe('testnamecrypto.eth');
      expect(suggestions[9].name).toBe('testnamelabs.eth');
    });

    it('should clean input names for suggestions', async () => {
      const suggestions = await ensService.suggestENSAlternatives('Test Name!@#');

      expect(suggestions[0].name).toBe('testname.eth');
    });

    it('should handle empty input', async () => {
      const suggestions = await ensService.suggestENSAlternatives('');

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should limit name length for suggestions', async () => {
      const longName = 'a'.repeat(50);
      const suggestions = await ensService.suggestENSAlternatives(longName);

      // Should truncate to 20 characters
      expect(suggestions[0].name).toBe('aaaaaaaaaaaaaaaaaaaa.eth');
    });
  });

  describe('healthCheck', () => {
    it('should return a health status object', async () => {
      const health = await ensService.healthCheck();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('provider');
      expect(['healthy', 'unhealthy']).toContain(health.status);
      expect(['connected', 'disconnected']).toContain(health.provider);
    });
  });
});
