/**
 * Unit Tests for Transaction Validator
 */

import { validateTransaction, validateGasParameters } from '@/security/transactionValidator';

describe('Transaction Validator', () => {
  describe('validateTransaction', () => {
    it('should validate a valid transaction', () => {
      const result = validateTransaction({
        to: '0x' + 'a'.repeat(40),
        value: 1000000000000000000n,
        data: '0x',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate transaction with data', () => {
      const result = validateTransaction({
        to: '0x' + 'a'.repeat(40),
        value: 0n,
        data: '0xa9059cbb' + 'bb'.repeat(31) + 'dd'.repeat(31), // ERC20 transfer
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid address', () => {
      const result = validateTransaction({
        to: 'invalid-address',
        value: 1000000000000000000n,
        data: '0x',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].toLowerCase()).toContain('address');
    });

    it('should reject negative value', () => {
      const result = validateTransaction({
        to: '0x' + 'a'.repeat(40),
        value: -1n,
        data: '0x',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about large transfers', () => {
      const result = validateTransaction({
        to: '0x' + 'a'.repeat(40),
        value: 1000000000000000000000n, // Very large amount
        data: '0x',
      });

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.toLowerCase().includes('large'))).toBe(true);
    });

    it('should warn about unknown contracts', () => {
      const result = validateTransaction({
        to: '0x' + 'c'.repeat(40),
        value: 0n,
        data: '0x' + 'd'.repeat(100),
      });

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.toLowerCase().includes('unknown'))).toBe(true);
    });

    it('should return warnings array', () => {
      const result = validateTransaction({
        to: '0x' + 'a'.repeat(40),
        value: 1000000000000000000n,
        data: '0x',
      });

      expect(Array.isArray(result.warnings)).toBe(true);
      expect(result.warnings).toBeDefined();
    });
  });

  describe('validateGasParameters', () => {
    it('should validate valid gas parameters', () => {
      const result = validateGasParameters({
        gasLimit: 21000n,
        gasPrice: 1000000000n,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate EIP-1559 gas parameters', () => {
      const result = validateGasParameters({
        gasLimit: 21000n,
        maxFeePerGas: 2000000000n,
        maxPriorityFeePerGas: 1000000000n,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject excessive gas limit', () => {
      const result = validateGasParameters({
        gasLimit: 100000000n, // Excessive
        gasPrice: 1000000000n,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].toLowerCase()).toContain('gas limit');
    });

    it('should reject gas limit exceeding network maximum', () => {
      const result = validateGasParameters({
        gasLimit: 16777216n, // Network maximum
        gasPrice: 1000000000n,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject negative gas price', () => {
      const result = validateGasParameters({
        gasLimit: 21000n,
        gasPrice: -1n,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about high gas prices', () => {
      const result = validateGasParameters({
        gasLimit: 21000n,
        gasPrice: 100000000000n, // High gas price
      });

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.toLowerCase().includes('gas'))).toBe(true);
    });

    it('should return warnings array', () => {
      const result = validateGasParameters({
        gasLimit: 21000n,
        gasPrice: 1000000000n,
      });

      expect(Array.isArray(result.warnings)).toBe(true);
      expect(result.warnings).toBeDefined();
    });
  });
});