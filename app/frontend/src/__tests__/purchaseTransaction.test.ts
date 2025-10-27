/**
 * Purchase Transaction Tests
 * These tests focus specifically on the purchase transaction functionality
 */

import { ldaoAcquisitionService } from '../services/ldaoAcquisitionService';

// Mock window.open to avoid errors in tests
Object.defineProperty(window, 'open', {
  writable: true,
  value: jest.fn(),
});

describe('Purchase Transaction Functionality', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clear localStorage after each test
    localStorage.clear();
  });

  test('should save purchase transaction with correct structure', () => {
    const transaction = {
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      user: '0x1234567890123456789012345678901234567890',
      amount: '1000.50',
      cost: '10.25',
      currency: 'ETH' as const,
      timestamp: Date.now(),
      type: 'purchase' as const,
      status: 'success' as const,
      method: 'crypto' as const
    };

    ldaoAcquisitionService.savePurchaseTransaction(transaction);
    
    const stored = localStorage.getItem('ldao_purchase_transactions');
    expect(stored).not.toBeNull();
    
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toEqual(transaction);
    }
  });

  test('should handle different purchase methods', () => {
    const methods = ['crypto', 'fiat', 'dex', 'moonpay'] as const;
    
    methods.forEach((method, index) => {
      const transaction = {
        hash: `0x${index}`,
        user: '0x1234567890123456789012345678901234567890',
        amount: '1000',
        cost: '10',
        currency: 'ETH' as const,
        timestamp: Date.now() + index,
        type: 'purchase' as const,
        status: 'success' as const,
        method
      };

      ldaoAcquisitionService.savePurchaseTransaction(transaction);
    });
    
    const stored = localStorage.getItem('ldao_purchase_transactions');
    expect(stored).not.toBeNull();
    
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed).toHaveLength(4);
      
      methods.forEach((method, index) => {
        expect(parsed[index].method).toBe(method);
      });
    }
  });

  test('should handle different currencies', () => {
    const currencies = ['ETH', 'USDC', 'USD'] as const;
    
    currencies.forEach((currency, index) => {
      const transaction = {
        hash: `0x${index}`,
        user: '0x1234567890123456789012345678901234567890',
        amount: '1000',
        cost: currency === 'ETH' ? '10' : currency === 'USDC' ? '10000' : '10',
        currency,
        timestamp: Date.now() + index,
        type: 'purchase' as const,
        status: 'success' as const,
        method: 'crypto' as const
      };

      ldaoAcquisitionService.savePurchaseTransaction(transaction);
    });
    
    const stored = localStorage.getItem('ldao_purchase_transactions');
    expect(stored).not.toBeNull();
    
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed).toHaveLength(3);
      
      currencies.forEach((currency, index) => {
        expect(parsed[index].currency).toBe(currency);
      });
    }
  });

  test('should preserve transaction history across sessions', () => {
    // Save a transaction
    const transaction = {
      hash: '0x123',
      user: '0x1234567890123456789012345678901234567890',
      amount: '1000',
      cost: '10',
      currency: 'ETH',
      timestamp: Date.now(),
      type: 'purchase',
      status: 'success',
      method: 'crypto'
    };

    ldaoAcquisitionService.savePurchaseTransaction(transaction);
    
    // Simulate a new session by creating a new instance
    const stored = localStorage.getItem('ldao_purchase_transactions');
    expect(stored).not.toBeNull();
    
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toEqual(transaction);
    }
  });

  test('should handle malformed transaction data gracefully', () => {
    // This test ensures our save function doesn't crash with bad data
    expect(() => {
      ldaoAcquisitionService.savePurchaseTransaction({} as any);
    }).not.toThrow();
    
    expect(() => {
      ldaoAcquisitionService.savePurchaseTransaction(null as any);
    }).not.toThrow();
    
    expect(() => {
      ldaoAcquisitionService.savePurchaseTransaction(undefined as any);
    }).not.toThrow();
  });
});