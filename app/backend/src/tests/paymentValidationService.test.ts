import { PaymentValidationService, PaymentValidationRequest } from '../services/paymentValidationService';
import { ExchangeRateService } from '../services/exchangeRateService';
import { DatabaseService } from '../services/databaseService';
import { UserProfileService } from '../services/userProfileService';

// Mock dependencies
jest.mock('../services/databaseService');
jest.mock('../services/userProfileService');
jest.mock('../services/exchangeRateService');

const MockedDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;
const MockedUserProfileService = UserProfileService as jest.MockedClass<typeof UserProfileService>;
const MockedExchangeRateService = ExchangeRateService as jest.MockedClass<typeof ExchangeRateService>;

describe('PaymentValidationService', () => {
  let paymentValidationService: PaymentValidationService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockUserProfileService: jest.Mocked<UserProfileService>;
  let mockExchangeRateService: jest.Mocked<ExchangeRateService>;

  const mockUserAddress = '0x1234567890123456789012345678901234567890';
  const mockTokenAddress = '0xA0b86a33E6441c8C06DD2b7c94b7E6E8b8b8b8b8';
  const mockRecipientAddress = '0x9876543210987654321098765432109876543210';

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mocked instances
    mockDatabaseService = new MockedDatabaseService() as jest.Mocked<DatabaseService>;
    mockUserProfileService = new MockedUserProfileService() as jest.Mocked<UserProfileService>;
    mockExchangeRateService = new MockedExchangeRateService() as jest.Mocked<ExchangeRateService>;

    // Create service instance
    paymentValidationService = new PaymentValidationService();

    // Mock ethers provider methods
    jest.spyOn(require('ethers'), 'JsonRpcProvider').mockImplementation(() => ({
      getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000')), // 1 ETH
      getFeeData: jest.fn().mockResolvedValue({
        gasPrice: BigInt('20000000000') // 20 gwei
      })
    }));
  });

  describe('validatePayment', () => {
    it('should validate crypto payment successfully', async () => {
      const request: PaymentValidationRequest = {
        paymentMethod: 'crypto',
        amount: 100,
        currency: 'USDC',
        userAddress: mockUserAddress,
        paymentDetails: {
          tokenAddress: mockTokenAddress,
          tokenSymbol: 'USDC',
          tokenDecimals: 6,
          chainId: 1,
          recipientAddress: mockRecipientAddress
        }
      };

      const result = await paymentValidationService.validatePayment(request);

      expect(result.isValid).toBe(true);
      expect(result.hasSufficientBalance).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.estimatedFees).toBeDefined();
    });

    it('should validate fiat payment successfully', async () => {
      const request: PaymentValidationRequest = {
        paymentMethod: 'fiat',
        amount: 100,
        currency: 'USD',
        userAddress: mockUserAddress,
        paymentDetails: {
          paymentMethodId: 'pm_test123',
          provider: 'stripe',
          currency: 'USD'
        }
      };

      const result = await paymentValidationService.validatePayment(request);

      expect(result.isValid).toBe(true);
      expect(result.hasSufficientBalance).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.estimatedFees).toBeDefined();
    });

    it('should validate escrow payment successfully', async () => {
      const request: PaymentValidationRequest = {
        paymentMethod: 'escrow',
        amount: 100,
        currency: 'USDC',
        userAddress: mockUserAddress,
        paymentDetails: {
          tokenAddress: mockTokenAddress,
          tokenSymbol: 'USDC',
          tokenDecimals: 6,
          chainId: 1,
          escrowDuration: 7,
          requiresDeliveryConfirmation: true
        }
      };

      const result = await paymentValidationService.validatePayment(request);

      expect(result.isValid).toBe(true);
      expect(result.hasSufficientBalance).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.estimatedFees).toBeDefined();
    });

    it('should fail validation for invalid payment method', async () => {
      const request: PaymentValidationRequest = {
        paymentMethod: 'invalid' as any,
        amount: 100,
        currency: 'USD',
        userAddress: mockUserAddress,
        paymentDetails: {}
      };

      const result = await paymentValidationService.validatePayment(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid payment method');
    });

    it('should fail validation for missing required fields', async () => {
      const request: PaymentValidationRequest = {
        paymentMethod: 'crypto',
        amount: 0,
        currency: '',
        userAddress: '',
        paymentDetails: {}
      };

      const result = await paymentValidationService.validatePayment(request);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail validation for unsupported token', async () => {
      const request: PaymentValidationRequest = {
        paymentMethod: 'crypto',
        amount: 100,
        currency: 'UNKNOWN',
        userAddress: mockUserAddress,
        paymentDetails: {
          tokenAddress: '0x0000000000000000000000000000000000000001',
          tokenSymbol: 'UNKNOWN',
          tokenDecimals: 18,
          chainId: 1,
          recipientAddress: mockRecipientAddress
        }
      };

      const result = await paymentValidationService.validatePayment(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unsupported token');
    });

    it('should fail validation for unsupported chain', async () => {
      const request: PaymentValidationRequest = {
        paymentMethod: 'crypto',
        amount: 100,
        currency: 'ETH',
        userAddress: mockUserAddress,
        paymentDetails: {
          tokenAddress: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'ETH',
          tokenDecimals: 18,
          chainId: 999999,
          recipientAddress: mockRecipientAddress
        }
      };

      const result = await paymentValidationService.validatePayment(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unsupported chain');
    });
  });

  describe('checkCryptoBalance', () => {
    it('should check native token balance successfully', async () => {
      const result = await paymentValidationService.checkCryptoBalance(
        mockUserAddress,
        '0x0000000000000000000000000000000000000000',
        '0.5',
        1
      );

      expect(result.hasSufficientBalance).toBe(true);
      expect(result.balance.tokenSymbol).toBe('ETH');
      expect(result.balance.balanceFormatted).toBe('1.0');
    });

    it('should check ERC-20 token balance successfully', async () => {
      // Mock ERC-20 contract call
      const mockContract = {
        balanceOf: jest.fn().mockResolvedValue(BigInt('1000000000')) // 1000 USDC (6 decimals)
      };
      
      jest.spyOn(require('ethers'), 'Contract').mockImplementation(() => mockContract);

      const result = await paymentValidationService.checkCryptoBalance(
        mockUserAddress,
        mockTokenAddress,
        '500',
        1
      );

      expect(result.hasSufficientBalance).toBe(true);
      expect(result.balance.tokenSymbol).toBe('USDC');
      expect(result.gasBalance).toBeDefined();
    });

    it('should detect insufficient balance', async () => {
      // Mock low balance
      jest.spyOn(require('ethers'), 'JsonRpcProvider').mockImplementation(() => ({
        getBalance: jest.fn().mockResolvedValue(BigInt('100000000000000000')) // 0.1 ETH
      }));

      const result = await paymentValidationService.checkCryptoBalance(
        mockUserAddress,
        '0x0000000000000000000000000000000000000000',
        '1.0',
        1
      );

      expect(result.hasSufficientBalance).toBe(false);
      expect(result.balance.balanceFormatted).toBe('0.1');
    });

    it('should handle unsupported token', async () => {
      await expect(
        paymentValidationService.checkCryptoBalance(
          mockUserAddress,
          '0x0000000000000000000000000000000000000001',
          '100',
          1
        )
      ).rejects.toThrow('Unsupported token');
    });
  });

  describe('getPaymentAlternatives', () => {
    it('should suggest fiat alternative for insufficient crypto balance', async () => {
      const request: PaymentValidationRequest = {
        paymentMethod: 'crypto',
        amount: 100,
        currency: 'USDC',
        userAddress: mockUserAddress,
        paymentDetails: {
          tokenAddress: mockTokenAddress,
          tokenSymbol: 'USDC',
          tokenDecimals: 6,
          chainId: 1,
          recipientAddress: mockRecipientAddress
        }
      };

      const alternatives = await paymentValidationService.getPaymentAlternatives(
        request,
        'insufficient_balance'
      );

      expect(alternatives.length).toBeGreaterThan(0);
      expect(alternatives.some(alt => alt.method === 'fiat')).toBe(true);
    });

    it('should suggest escrow alternative for security', async () => {
      const request: PaymentValidationRequest = {
        paymentMethod: 'crypto',
        amount: 1000,
        currency: 'USDC',
        userAddress: mockUserAddress,
        paymentDetails: {
          tokenAddress: mockTokenAddress,
          tokenSymbol: 'USDC',
          tokenDecimals: 6,
          chainId: 1,
          recipientAddress: mockRecipientAddress
        }
      };

      const alternatives = await paymentValidationService.getPaymentAlternatives(
        request,
        'security_concern'
      );

      expect(alternatives.some(alt => alt.method === 'escrow')).toBe(true);
    });
  });

  describe('estimatePaymentFees', () => {
    it('should estimate crypto payment fees', async () => {
      const request: PaymentValidationRequest = {
        paymentMethod: 'crypto',
        amount: 100,
        currency: 'USDC',
        userAddress: mockUserAddress,
        paymentDetails: {
          tokenAddress: mockTokenAddress,
          tokenSymbol: 'USDC',
          tokenDecimals: 6,
          chainId: 1,
          recipientAddress: mockRecipientAddress
        }
      };

      const fees = await paymentValidationService.estimatePaymentFees(request);

      expect(fees.platformFee).toBeGreaterThan(0);
      expect(fees.gasFee).toBeGreaterThan(0);
      expect(fees.totalFees).toBe(fees.platformFee + (fees.gasFee || 0));
      expect(fees.currency).toBe('USDC');
    });

    it('should estimate fiat payment fees', async () => {
      const request: PaymentValidationRequest = {
        paymentMethod: 'fiat',
        amount: 100,
        currency: 'USD',
        userAddress: mockUserAddress,
        paymentDetails: {
          paymentMethodId: 'pm_test123',
          provider: 'stripe',
          currency: 'USD'
        }
      };

      const fees = await paymentValidationService.estimatePaymentFees(request);

      expect(fees.processingFee).toBeGreaterThan(0);
      expect(fees.platformFee).toBeGreaterThan(0);
      expect(fees.totalFees).toBe(fees.processingFee + fees.platformFee);
      expect(fees.currency).toBe('USD');
    });

    it('should estimate escrow payment fees', async () => {
      const request: PaymentValidationRequest = {
        paymentMethod: 'escrow',
        amount: 100,
        currency: 'USDC',
        userAddress: mockUserAddress,
        paymentDetails: {
          tokenAddress: mockTokenAddress,
          tokenSymbol: 'USDC',
          tokenDecimals: 6,
          chainId: 1,
          escrowDuration: 7,
          requiresDeliveryConfirmation: true
        }
      };

      const fees = await paymentValidationService.estimatePaymentFees(request);

      expect(fees.processingFee).toBeGreaterThan(0); // Escrow fee
      expect(fees.platformFee).toBeGreaterThan(0);
      expect(fees.gasFee).toBeGreaterThan(0);
      expect(fees.totalFees).toBeGreaterThan(0);
      expect(fees.currency).toBe('USDC');
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      jest.spyOn(require('ethers'), 'JsonRpcProvider').mockImplementation(() => ({
        getBalance: jest.fn().mockRejectedValue(new Error('Network error'))
      }));

      const result = await paymentValidationService.validatePayment({
        paymentMethod: 'crypto',
        amount: 100,
        currency: 'ETH',
        userAddress: mockUserAddress,
        paymentDetails: {
          tokenAddress: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'ETH',
          tokenDecimals: 18,
          chainId: 1,
          recipientAddress: mockRecipientAddress
        }
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Failed to validate crypto payment'))).toBe(true);
    });

    it('should handle invalid addresses', async () => {
      const result = await paymentValidationService.validatePayment({
        paymentMethod: 'crypto',
        amount: 100,
        currency: 'ETH',
        userAddress: 'invalid_address',
        paymentDetails: {
          tokenAddress: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'ETH',
          tokenDecimals: 18,
          chainId: 1,
          recipientAddress: mockRecipientAddress
        }
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid user address is required');
    });

    it('should handle missing payment details', async () => {
      const result = await paymentValidationService.validatePayment({
        paymentMethod: 'crypto',
        amount: 100,
        currency: 'ETH',
        userAddress: mockUserAddress,
        paymentDetails: {} as any
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('token address'))).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete crypto payment validation flow', async () => {
      const request: PaymentValidationRequest = {
        paymentMethod: 'crypto',
        amount: 50,
        currency: 'USDC',
        userAddress: mockUserAddress,
        orderId: 'order_123',
        listingId: 'listing_456',
        paymentDetails: {
          tokenAddress: mockTokenAddress,
          tokenSymbol: 'USDC',
          tokenDecimals: 6,
          chainId: 1,
          recipientAddress: mockRecipientAddress,
          gasEstimate: '65000'
        }
      };

      const result = await paymentValidationService.validatePayment(request);

      expect(result.isValid).toBe(true);
      expect(result.hasSufficientBalance).toBe(true);
      expect(result.estimatedFees).toBeDefined();
      expect(result.estimatedFees?.currency).toBe('USDC');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle insufficient balance with alternatives', async () => {
      // Mock insufficient balance
      jest.spyOn(require('ethers'), 'JsonRpcProvider').mockImplementation(() => ({
        getBalance: jest.fn().mockResolvedValue(BigInt('10000000000000000')), // 0.01 ETH
        getFeeData: jest.fn().mockResolvedValue({
          gasPrice: BigInt('20000000000')
        })
      }));

      const request: PaymentValidationRequest = {
        paymentMethod: 'crypto',
        amount: 1000,
        currency: 'ETH',
        userAddress: mockUserAddress,
        paymentDetails: {
          tokenAddress: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'ETH',
          tokenDecimals: 18,
          chainId: 1,
          recipientAddress: mockRecipientAddress
        }
      };

      const result = await paymentValidationService.validatePayment(request);

      expect(result.isValid).toBe(false);
      expect(result.hasSufficientBalance).toBe(false);
      expect(result.suggestedAlternatives).toBeDefined();
      expect(result.suggestedAlternatives!.length).toBeGreaterThan(0);
    });
  });
});
