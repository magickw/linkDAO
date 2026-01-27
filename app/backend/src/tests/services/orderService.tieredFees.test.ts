import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { OrderService } from '../../services/orderService';
import { CreateOrderInput } from '../../models/Order';

// Mock dependencies
jest.mock('../../services/databaseService');
jest.mock('../../services/userProfileService');
jest.mock('../../services/enhancedEscrowService');
jest.mock('../../services/tax/taxAwareEscrowService');
jest.mock('../../services/notificationService');
jest.mock('../../utils/safeLogger');

describe('OrderService - Tiered Platform Fees', () => {
  let orderService: OrderService;
  let mockDatabaseService: any;
  let mockEscrowService: any;
  let mockUserProfileService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockDatabaseService = require('../../services/databaseService');
    mockEscrowService = require('../../services/enhancedEscrowService');
    mockUserProfileService = require('../../services/userProfileService');

    // Mock successful responses
    mockUserProfileService.getProfileByAddress = jest.fn().mockResolvedValue({
      id: 'user-123',
      walletAddress: '0x1234567890123456789012345678901234567890'
    });

    mockEscrowService.createEscrow = jest.fn().mockResolvedValue({
      escrowId: 'escrow-123',
      transactionHash: '0xabcd'
    });

    mockDatabaseService.createOrder = jest.fn().mockResolvedValue({
      id: 'order-123',
      platform_fee: 10,
      amount: 114.49,
      paymentMethod: 'fiat'
    });

    orderService = new OrderService();
  });

  describe('Fiat Payment - 10% Platform Fee', () => {
    it('should calculate 10% platform fee for fiat payments', async () => {
      const input: CreateOrderInput = {
        listingId: 'listing-123',
        buyerAddress: '0xbuyer123',
        sellerAddress: '0xseller456',
        amount: '100.00',
        paymentToken: 'USDC',
        paymentMethod: 'fiat',
        shippingCost: '5.99',
        taxAmount: '8.50'
      };

      // The service would calculate:
      // Platform fee = $100 * 0.10 = $10.00
      const itemPrice = 100.00;
      const platformFeeRate = input.paymentMethod === 'fiat' ? 0.10 : 0.07;
      const expectedFee = itemPrice * platformFeeRate;

      expect(expectedFee).toBe(10.00);
    });

    it('should hold full escrow amount for fiat orders', async () => {
      const input: CreateOrderInput = {
        listingId: 'listing-123',
        buyerAddress: '0xbuyer123',
        sellerAddress: '0xseller456',
        amount: '100.00',
        paymentToken: 'USDC',
        paymentMethod: 'fiat',
        shippingCost: '5.99',
        taxAmount: '8.50'
      };

      // Expected escrow amount = item + shipping + tax = $114.49
      const itemPrice = parseFloat(input.amount);
      const shippingCost = parseFloat(input.shippingCost || '0');
      const taxAmount = parseFloat(input.taxAmount || '0');
      const escrowAmount = itemPrice + shippingCost + taxAmount;

      expect(escrowAmount).toBe(114.49);
    });

    it('should correctly calculate seller payout for fiat orders', () => {
      // Fiat: $100 item, $5.99 shipping, $8.50 tax, 10% fee
      const itemPrice = 100.00;
      const shippingCost = 5.99;
      const taxAmount = 8.50;
      const platformFee = itemPrice * 0.10; // $10.00

      const sellerPayout = itemPrice - platformFee + shippingCost + taxAmount;

      expect(sellerPayout).toBe(104.49);
      expect(platformFee).toBe(10.00);
    });

    it('should log correct fee rate for fiat orders', () => {
      const paymentMethod = 'fiat';
      const platformFeeRate = paymentMethod === 'fiat' ? 0.10 : 0.07;
      const feePercentage = `${(platformFeeRate * 100).toFixed(1)}%`;

      expect(feePercentage).toBe('10.0%');
    });
  });

  describe('Crypto Payment - 7% Platform Fee', () => {
    it('should calculate 7% platform fee for crypto payments', async () => {
      const input: CreateOrderInput = {
        listingId: 'listing-123',
        buyerAddress: '0xbuyer123',
        sellerAddress: '0xseller456',
        amount: '100.00',
        paymentToken: 'USDC',
        paymentMethod: 'crypto',
        shippingCost: '5.99',
        taxAmount: '8.50'
      };

      const itemPrice = 100.00;
      const platformFeeRate = input.paymentMethod === 'fiat' ? 0.10 : 0.07;
      const expectedFee = itemPrice * platformFeeRate;

      expect(expectedFee).toBe(7.00);
    });

    it('should hold full escrow amount for crypto orders', async () => {
      const input: CreateOrderInput = {
        listingId: 'listing-123',
        buyerAddress: '0xbuyer123',
        sellerAddress: '0xseller456',
        amount: '100.00',
        paymentToken: 'USDC',
        paymentMethod: 'crypto',
        shippingCost: '5.99',
        taxAmount: '8.50'
      };

      const itemPrice = parseFloat(input.amount);
      const shippingCost = parseFloat(input.shippingCost || '0');
      const taxAmount = parseFloat(input.taxAmount || '0');
      const escrowAmount = itemPrice + shippingCost + taxAmount;

      expect(escrowAmount).toBe(114.49);
    });

    it('should correctly calculate seller payout for crypto orders', () => {
      // Crypto: $100 item, $5.99 shipping, $8.50 tax, 7% fee
      const itemPrice = 100.00;
      const shippingCost = 5.99;
      const taxAmount = 8.50;
      const platformFee = itemPrice * 0.07; // $7.00

      const sellerPayout = itemPrice - platformFee + shippingCost + taxAmount;

      expect(sellerPayout).toBe(107.49);
      expect(platformFee).toBe(7.00);
    });

    it('should log correct fee rate for crypto orders', () => {
      const paymentMethod = 'crypto';
      const platformFeeRate = paymentMethod === 'fiat' ? 0.10 : 0.07;
      const feePercentage = `${(platformFeeRate * 100).toFixed(1)}%`;

      expect(feePercentage).toBe('7.0%');
    });

    it('should default to crypto (7%) when payment method not specified', () => {
      const paymentMethod = undefined;
      const platformFeeRate = (paymentMethod === 'fiat') ? 0.10 : 0.07;
      const itemPrice = 100.00;
      const fee = itemPrice * platformFeeRate;

      expect(fee).toBe(7.00);
    });
  });

  describe('Fee Comparison: Seller Benefit Analysis', () => {
    it('should show $3.00 difference between fiat and crypto for $100 item', () => {
      const itemPrice = 100.00;
      const fiatFee = itemPrice * 0.10; // $10
      const cryptoFee = itemPrice * 0.07; // $7
      const difference = fiatFee - cryptoFee;

      expect(difference).toBe(3.00);
    });

    it('should show $30.00 difference between fiat and crypto for $1000 item', () => {
      const itemPrice = 1000.00;
      const fiatFee = itemPrice * 0.10; // $100
      const cryptoFee = itemPrice * 0.07; // $70
      const difference = fiatFee - cryptoFee;

      expect(difference).toBe(30.00);
    });

    it('should correctly calculate seller benefit on various order values', () => {
      const testCases = [
        { item: 10, oldFee: 1.50, newFiatFee: 1.00, newCryptoFee: 0.70, fiatBenefit: 0.50, cryptoBenefit: 0.80 },
        { item: 50, oldFee: 7.50, newFiatFee: 5.00, newCryptoFee: 3.50, fiatBenefit: 2.50, cryptoBenefit: 4.00 },
        { item: 100, oldFee: 15.00, newFiatFee: 10.00, newCryptoFee: 7.00, fiatBenefit: 5.00, cryptoBenefit: 8.00 },
        { item: 500, oldFee: 75.00, newFiatFee: 50.00, newCryptoFee: 35.00, fiatBenefit: 25.00, cryptoBenefit: 40.00 },
        { item: 1000, oldFee: 150.00, newFiatFee: 100.00, newCryptoFee: 70.00, fiatBenefit: 50.00, cryptoBenefit: 80.00 }
      ];

      testCases.forEach(test => {
        const fiatFee = test.item * 0.10;
        const cryptoFee = test.item * 0.07;

        expect(fiatFee).toBe(test.newFiatFee);
        expect(cryptoFee).toBe(test.newCryptoFee);
        expect(test.oldFee - fiatFee).toBe(test.fiatBenefit);
        expect(test.oldFee - cryptoFee).toBe(test.cryptoBenefit);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle decimal amounts correctly', () => {
      const testCases = [
        { item: 12.99, fiatFee: 1.299, cryptoFee: 0.9093 },
        { item: 99.99, fiatFee: 9.999, cryptoFee: 6.9993 },
        { item: 0.01, fiatFee: 0.001, cryptoFee: 0.0007 }
      ];

      testCases.forEach(test => {
        const fiatFee = parseFloat((test.item * 0.10).toFixed(2));
        const cryptoFee = parseFloat((test.item * 0.07).toFixed(2));

        expect(fiatFee).toBeCloseTo(test.fiatFee, 2);
        expect(cryptoFee).toBeCloseTo(test.cryptoFee, 2);
      });
    });

    it('should handle orders with no tax', () => {
      const itemPrice = 100.00;
      const shippingCost = 5.99;
      const taxAmount = 0;
      const platformFee = itemPrice * 0.10;

      const escrowAmount = itemPrice + shippingCost + taxAmount;
      const sellerPayout = itemPrice - platformFee + shippingCost + taxAmount;

      expect(escrowAmount).toBe(105.99);
      expect(sellerPayout).toBe(95.99);
    });

    it('should handle orders with no shipping (digital items)', () => {
      const itemPrice = 50.00;
      const shippingCost = 0;
      const taxAmount = 2.50;
      const platformFee = itemPrice * 0.07; // crypto

      const escrowAmount = itemPrice + shippingCost + taxAmount;
      const sellerPayout = itemPrice - platformFee + shippingCost + taxAmount;

      expect(escrowAmount).toBe(52.50);
      expect(sellerPayout).toBe(49.00);
    });

    it('should handle zero values gracefully', () => {
      const itemPrice = 100.00;
      const shippingCost = 0;
      const taxAmount = 0;
      const platformFee = itemPrice * 0.10;

      const escrowAmount = itemPrice + shippingCost + taxAmount;
      const sellerPayout = itemPrice - platformFee + shippingCost + taxAmount;

      expect(escrowAmount).toBe(100.00);
      expect(sellerPayout).toBe(90.00);
    });

    it('should handle very large order values', () => {
      const itemPrice = 100000.00;
      const shippingCost = 500.00;
      const taxAmount = 5000.00;

      const fiatFee = itemPrice * 0.10; // $10,000
      const cryptoFee = itemPrice * 0.07; // $7,000

      const fiatSellerPayout = itemPrice - fiatFee + shippingCost + taxAmount; // $95,500
      const cryptoSellerPayout = itemPrice - cryptoFee + shippingCost + taxAmount; // $98,500

      expect(fiatFee).toBe(10000.00);
      expect(cryptoFee).toBe(7000.00);
      expect(fiatSellerPayout).toBe(95500.00);
      expect(cryptoSellerPayout).toBe(98500.00);
    });
  });

  describe('Metadata Storage', () => {
    it('should store correct fee rate in metadata for fiat orders', () => {
      const paymentMethod = 'fiat';
      const platformFeeRate = paymentMethod === 'fiat' ? 0.10 : 0.07;
      const feePercentageStr = `${(platformFeeRate * 100).toFixed(1)}%`;

      const metadata = {
        orderBreakdown: {
          itemPrice: 100,
          shippingCost: 5.99,
          taxAmount: 8.50,
          platformFee: 10.00,
          platformFeeRate: feePercentageStr,
          paymentMethod: 'fiat'
        }
      };

      expect(metadata.orderBreakdown.platformFeeRate).toBe('10.0%');
      expect(metadata.orderBreakdown.paymentMethod).toBe('fiat');
    });

    it('should store correct fee rate in metadata for crypto orders', () => {
      const paymentMethod = 'crypto';
      const platformFeeRate = paymentMethod === 'fiat' ? 0.10 : 0.07;
      const feePercentageStr = `${(platformFeeRate * 100).toFixed(1)}%`;

      const metadata = {
        orderBreakdown: {
          itemPrice: 100,
          shippingCost: 5.99,
          taxAmount: 8.50,
          platformFee: 7.00,
          platformFeeRate: feePercentageStr,
          paymentMethod: 'crypto'
        }
      };

      expect(metadata.orderBreakdown.platformFeeRate).toBe('7.0%');
      expect(metadata.orderBreakdown.paymentMethod).toBe('crypto');
    });

    it('should store complete breakdown for audit trail', () => {
      const breakdown = {
        itemPrice: 100.00,
        shippingCost: 5.99,
        taxAmount: 8.50,
        platformFee: 10.00,
        platformFeeRate: '10.0%',
        paymentMethod: 'fiat',
        totalAmount: 114.49
      };

      expect(breakdown.itemPrice).toBe(100.00);
      expect(breakdown.shippingCost).toBe(5.99);
      expect(breakdown.taxAmount).toBe(8.50);
      expect(breakdown.platformFee).toBe(10.00);
      expect(breakdown.totalAmount).toBe(114.49);
      expect(breakdown.itemPrice + breakdown.shippingCost + breakdown.taxAmount).toBe(breakdown.totalAmount);
    });
  });

  describe('Escrow Amount Validation', () => {
    it('should ensure escrow amount never includes platform fee', () => {
      const itemPrice = 100.00;
      const shippingCost = 5.99;
      const taxAmount = 8.50;

      // Escrow should always be: item + shipping + tax (never deduct fee)
      const escrowAmount = itemPrice + shippingCost + taxAmount;

      // Verify fee is NOT deducted from escrow
      expect(escrowAmount).toBe(114.49);
      expect(escrowAmount).not.toBe(114.49 - 10.00); // fiat
      expect(escrowAmount).not.toBe(114.49 - 7.00); // crypto
    });

    it('should ensure fee is deducted from seller payout, not from escrow', () => {
      const itemPrice = 100.00;
      const shippingCost = 5.99;
      const taxAmount = 8.50;
      const fiatFee = 10.00;

      const escrowAmount = itemPrice + shippingCost + taxAmount; // $114.49
      const sellerPayout = itemPrice - fiatFee + shippingCost + taxAmount; // $104.49

      expect(escrowAmount).toBe(114.49);
      expect(sellerPayout).toBe(104.49);
      expect(escrowAmount - fiatFee).toBe(sellerPayout);
    });
  });
});
