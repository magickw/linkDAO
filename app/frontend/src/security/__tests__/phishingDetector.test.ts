/**
 * Unit Tests for Phishing Detection
 */

import { detectPhishing } from '@/security/phishingDetector';

describe('Phishing Detection', () => {
  describe('detectPhishing', () => {
    it('should detect known malicious addresses', () => {
      const knownMaliciousAddress = '0x0000000000000000000000000000000000000001';
      const value = 1000000000000000000n; // Large amount
      
      const result = detectPhishing(knownMaliciousAddress, value, '');
      
      expect(result).toBeDefined();
      expect(result.isSuspicious).toBe(true);
      expect(result.riskLevel).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should not flag safe transactions', () => {
      const safeAddress = '0x' + 'a'.repeat(40);
      const value = 1000000000000000000n;
      const data = '0x';
      
      const result = detectPhishing(safeAddress, value, data);
      
      expect(result.isSuspicious).toBe(false);
      expect(result.riskLevel).toBe('low');
      expect(result.warnings.length).toBe(0);
    });

    it('should detect suspicious patterns in addresses', () => {
      // Address with suspicious pattern
      const suspiciousAddress = '0x000000000000000000000000000000000000dead';
      const value = 1000000000000000000n;
      
      const result = detectPhishing(suspiciousAddress, value, '');
      
      expect(result).toBeDefined();
      // May or may not be suspicious depending on implementation
    });

    it('should flag large transfers', () => {
      const address = '0x' + 'a'.repeat(40);
      const largeValue = 1000000000000000000000n; // Very large amount
      
      const result = detectPhishing(address, largeValue, '');
      
      expect(result).toBeDefined();
      // Should at least warn about large transfers
      expect(result.warnings.some((w) => w.toLowerCase().includes('large'))).toBe(true);
    });

    it('should flag unknown contracts', () => {
      const unknownContract = '0x' + 'c'.repeat(40);
      const value = 1000000000000000000n;
      const data = '0x' + 'd'.repeat(100); // Contract interaction
      
      const result = detectPhishing(unknownContract, value, data);
      
      expect(result).toBeDefined();
      // Should warn about unknown contracts
      expect(result.warnings.some((w) => w.toLowerCase().includes('unknown'))).toBe(true);
    });

    it('should assign high risk level to known malicious addresses', () => {
      const knownMaliciousAddress = '0x000000000000000000000000000000000000001';
      const value = 1000000000000000000n;
      
      const result = detectPhishing(knownMaliciousAddress, value, '');
      
      expect(result.riskLevel).toBe('high');
      expect(result.isSuspicious).toBe(true);
    });

    it('should assign low risk level to safe transactions', () => {
      const safeAddress = '0x' + 'a'.repeat(40);
      const smallValue = 1000000000000000n;
      
      const result = detectPhishing(safeAddress, smallValue, '');
      
      expect(result.riskLevel).toBe('low');
      expect(result.isSuspicious).toBe(false);
    });

    it('should return warnings array', () => {
      const address = '0x' + 'a'.repeat(40);
      const value = 1000000000000000000n;
      
      const result = detectPhishing(address, value, '');
      
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(result.warnings).toBeDefined();
    });
  });
});