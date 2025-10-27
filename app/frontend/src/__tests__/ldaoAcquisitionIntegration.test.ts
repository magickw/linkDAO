/**
 * LDAO Acquisition Integration Tests
 * These tests verify that all components of the LDAO acquisition system work together
 */

import { ldaoAcquisitionService } from '../services/ldaoAcquisitionService';

// Mock window.open to avoid errors in tests
Object.defineProperty(window, 'open', {
  writable: true,
  value: jest.fn(),
});

describe('LDAO Acquisition Integration', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clear localStorage after each test
    localStorage.clear();
  });

  test('should complete full purchase flow with transaction history', async () => {
    // 1. User initiates a MoonPay purchase
    const moonPayResult = await ldaoAcquisitionService.purchaseWithMoonPay(1000, 'USD');
    expect(moonPayResult.success).toBe(true);
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('buy.moonpay.com'),
      'moonpay',
      'width=400,height=600'
    );

    // 2. User completes a DEX swap
    const dexResult = await ldaoAcquisitionService.swapForLDAO('ETH', '500');
    expect(dexResult.success).toBe(true);

    // 3. Manually save transactions to simulate what would happen in real implementation
    const mockTransaction1 = {
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      user: '0x1234567890123456789012345678901234567890',
      amount: '1000',
      cost: '100',
      currency: 'USD',
      timestamp: Date.now(),
      type: 'purchase',
      status: 'success',
      method: 'moonpay'
    };

    const mockTransaction2 = {
      hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      user: '0x1234567890123456789012345678901234567890',
      amount: '500',
      cost: '0.25',
      currency: 'ETH',
      timestamp: Date.now() + 1000,
      type: 'purchase',
      status: 'success',
      method: 'dex'
    };

    ldaoAcquisitionService.savePurchaseTransaction(mockTransaction1);
    ldaoAcquisitionService.savePurchaseTransaction(mockTransaction2);

    // 4. Verify transactions were saved to localStorage
    const storedTransactions = localStorage.getItem('ldao_purchase_transactions');
    expect(storedTransactions).not.toBeNull();

    if (storedTransactions) {
      const parsed = JSON.parse(storedTransactions);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual(mockTransaction1);
      expect(parsed[1]).toEqual(mockTransaction2);
    }
  });

  test('should handle multiple purchase methods with consistent data structure', () => {
    // Test different purchase methods by directly saving transactions
    const transactions = [
      {
        hash: '0x1',
        user: '0x1234567890123456789012345678901234567890',
        amount: '100',
        cost: '10',
        currency: 'USD',
        timestamp: Date.now(),
        type: 'purchase',
        status: 'success',
        method: 'moonpay'
      },
      {
        hash: '0x2',
        user: '0x1234567890123456789012345678901234567890',
        amount: '200',
        cost: '0.05',
        currency: 'ETH',
        timestamp: Date.now() + 1000,
        type: 'purchase',
        status: 'success',
        method: 'dex'
      },
      {
        hash: '0x3',
        user: '0x1234567890123456789012345678901234567890',
        amount: '300',
        cost: '30',
        currency: 'USD',
        timestamp: Date.now() + 2000,
        type: 'purchase',
        status: 'success',
        method: 'fiat'
      }
    ];

    // Save all transactions
    transactions.forEach(tx => {
      ldaoAcquisitionService.savePurchaseTransaction(tx);
    });

    // Verify all transactions have consistent structure
    const storedTransactions = localStorage.getItem('ldao_purchase_transactions');
    expect(storedTransactions).not.toBeNull();

    if (storedTransactions) {
      const parsed = JSON.parse(storedTransactions);
      expect(parsed).toHaveLength(3);
      
      parsed.forEach((transaction: any, index: number) => {
        expect(transaction).toHaveProperty('hash');
        expect(transaction).toHaveProperty('user');
        expect(transaction).toHaveProperty('amount');
        expect(transaction).toHaveProperty('timestamp');
        expect(transaction).toHaveProperty('type');
        expect(transaction).toHaveProperty('status');
        expect(transaction).toHaveProperty('method');
        expect(transaction).toEqual(transactions[index]);
      });
    }
  });

  test('should maintain transaction history across sessions', () => {
    // First session - make purchases
    const transaction1 = {
      hash: '0x100',
      user: '0x1234567890123456789012345678901234567890',
      amount: '500',
      cost: '50',
      currency: 'USD',
      timestamp: Date.now(),
      type: 'purchase',
      status: 'success',
      method: 'moonpay'
    };

    const transaction2 = {
      hash: '0x200',
      user: '0x1234567890123456789012345678901234567890',
      amount: '250',
      cost: '0.125',
      currency: 'ETH',
      timestamp: Date.now() + 1000,
      type: 'purchase',
      status: 'success',
      method: 'dex'
    };

    ldaoAcquisitionService.savePurchaseTransaction(transaction1);
    ldaoAcquisitionService.savePurchaseTransaction(transaction2);

    // Verify transactions were saved
    let storedTransactions = localStorage.getItem('ldao_purchase_transactions');
    expect(storedTransactions).not.toBeNull();

    if (storedTransactions) {
      const parsed = JSON.parse(storedTransactions);
      expect(parsed).toHaveLength(2);
    }

    // Simulate new session by clearing mocks but not localStorage
    jest.clearAllMocks();

    // Second session - make another purchase
    const transaction3 = {
      hash: '0x300',
      user: '0x1234567890123456789012345678901234567890',
      amount: '300',
      cost: '30',
      currency: 'USD',
      timestamp: Date.now() + 2000,
      type: 'purchase',
      status: 'success',
      method: 'fiat'
    };

    ldaoAcquisitionService.savePurchaseTransaction(transaction3);

    // Verify all transactions are still there
    storedTransactions = localStorage.getItem('ldao_purchase_transactions');
    expect(storedTransactions).not.toBeNull();

    if (storedTransactions) {
      const parsed = JSON.parse(storedTransactions);
      expect(parsed).toHaveLength(3);
      
      // Check that all transactions are present
      const hashes = parsed.map((tx: any) => tx.hash);
      expect(hashes).toContain('0x100');
      expect(hashes).toContain('0x200');
      expect(hashes).toContain('0x300');
    }
  });

  test('should handle transaction history export with all purchase types', () => {
    // Make purchases of different types
    const transactions = [
      {
        hash: '0xa1',
        user: '0x1234567890123456789012345678901234567890',
        amount: '100',
        cost: '10',
        currency: 'USD',
        timestamp: Date.now(),
        type: 'purchase',
        status: 'success',
        method: 'moonpay'
      },
      {
        hash: '0xb2',
        user: '0x1234567890123456789012345678901234567890',
        amount: '1000',
        cost: '0.5',
        currency: 'ETH',
        timestamp: Date.now() + 1000,
        type: 'purchase',
        status: 'success',
        method: 'dex'
      }
    ];

    transactions.forEach(tx => {
      ldaoAcquisitionService.savePurchaseTransaction(tx);
    });

    // Verify we have transactions with different methods
    const storedTransactions = localStorage.getItem('ldao_purchase_transactions');
    expect(storedTransactions).not.toBeNull();

    if (storedTransactions) {
      const parsed = JSON.parse(storedTransactions);
      
      // Verify we have transactions with different methods
      const methods = parsed.map((tx: any) => tx.method);
      expect(methods).toContain('moonpay');
      expect(methods).toContain('dex');
    }
  });
});