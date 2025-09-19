import { PaymentValidationService } from '../../services/paymentValidationService';
import { PaymentMethodAvailabilityService } from '../../services/paymentMethodAvailabilityService';
import { ExchangeRateService } from '../../services/exchangeRateService';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../services/paymentMethodAvailabilityService');
jest.mock('../../services/exchangeRateService');
jest.mock('ethers', () => ({
  ethers: {
    providers: {
      JsonRpcProvider: jest.fn(),
    },
    utils: {
      parseEther: jest.fn(),
      formatEther: jest.fn(),
    },
  },
}));

describe('Payment Validation Unit Tests', () => {
  let paymentValidationService: PaymentValidationService;
  let mockPaymentMethodService: jest.Mocked<PaymentMethodAvailabilityService>;
  let mockExchangeRateService: jest.Mocked<ExchangeRateService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPaymentMethodService = {
      checkCryptoBalance: jest.fn(),
      validateFiatPaymentMethod: jest.fn(),
      checkEscrowContractBalance: jest.fn(),
      getAvailablePaymentMethods: jest.fn(),
    } as any;

    mockExchangeRateService = {
      getExchangeRate: jest.fn(),
      convertCurrency: jest.fn(),
      getSupportedCurrencies: jest.fn(),
    } as any;

    paymentValidationService = new PaymentValidationService(
      mockPaymentMethodService,
      mockExchangeRateService
    );
  });

  describe('validatePaymentMethod', () => {
    const baseRequest = {
      amount: 100,
      currency: 'USD',
      userAddress: '0x1234567890123456789012345678901234567890',
    };

    describe('Crypto Payment Validation', () => {
      it('should validate sufficient crypto balance', async () => {
        const request = {
          ...baseRequest,
          paymentMethod: 'crypto' as const,
          paymentDetails: {
            tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c2D0e0f',
            tokenSymbol: 'USDC',
          },
        };

        mockPaymentMethodService.checkCryptoBalance.mockResolvedValue({
          hasBalance: true,
          balance: '150.00',
          required: '100.00',
        });

        const result = await paymentValidationService.validatePaymentMethod(request);

        expect(result).toEqual({
          isValid: true,
          hasSufficientBalance: true,
          errors: [],
          warnings: [],
          suggestedAlternatives: [],
        });
      });

      it('should detect insufficient crypto balance', async () => {
        const request = {
          ...baseRequest,
          paymentMethod: 'crypto' as const,
          paymentDetails: {
            tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c2D0e0f',
            tokenSymbol: 'USDC',
          },
        };

        mockPaymentMethodService.checkCryptoBalance.mockResolvedValue({
          hasBalance: false,
          balance: '50.00',
          required: '100.00',
        });

        mockPaymentMethodService.getAvailablePaymentMethods.mockResolvedValue([
          {
            method: 'fiat',
            description: 'Credit Card Payment',
            available: true,
            estimatedTotal: 100,
            currency: 'USD',
          },
        ]);

        const result = await paymentValidationService.validatePaymentMethod(request);

        expect(result).toEqual({
          isValid: false,
          hasSufficientBalance: false,
          errors: ['Insufficient crypto balance. Required: 100.00, Available: 50.00'],
          warnings: [],
          suggestedAlternatives: [
            {
              method: 'fiat',
              description: 'Credit Card Payment',
              available: true,
              estimatedTotal: 100,
              currency: 'USD',
            },
          ],
        });
      });

      it('should handle invalid token address', async () => {
        const request = {
          ...baseRequest,
          paymentMethod: 'crypto' as const,
          paymentDetails: {
            tokenAddress: 'invalid-address',
            tokenSymbol: 'USDC',
          },
        };

        const result = await paymentValidationService.validatePaymentMethod(request);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid token address format');
      });

      it('should handle network errors gracefully', async () => {
        const request = {
          ...baseRequest,
          paymentMethod: 'crypto' as const,
          paymentDetails: {
            tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c2D0e0f',
            tokenSymbol: 'USDC',
          },
        };

        mockPaymentMethodService.checkCryptoBalance.mockRejectedValue(
          new Error('Network connection failed')
        );

        const result = await paymentValidationService.validatePaymentMethod(request);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Unable to verify crypto balance due to network error');
      });
    });

    describe('Fiat Payment Validation', () => {
      it('should validate fiat payment method', async () => {
        const request = {
          ...baseRequest,
          paymentMethod: 'fiat' as const,
          paymentDetails: {
            paymentMethodId: 'pm_1234567890',
            provider: 'stripe',
          },
        };

        mockPaymentMethodService.validateFiatPaymentMethod.mockResolvedValue({
          isValid: true,
          canProcess: true,
          fees: 2.9,
        });

        const result = await paymentValidationService.validatePaymentMethod(request);

        expect(result).toEqual({
          isValid: true,
          hasSufficientBalance: true, // Fiat doesn't require balance check
          errors: [],
          warnings: [],
          suggestedAlternatives: [],
        });
      });

      it('should handle invalid fiat payment method', async () => {
        const request = {
          ...baseRequest,
          paymentMethod: 'fiat' as const,
          paymentDetails: {
            paymentMethodId: 'invalid_pm',
            provider: 'stripe',
          },
        };

        mockPaymentMethodService.validateFiatPaymentMethod.mockResolvedValue({
          isValid: false,
          canProcess: false,
          error: 'Payment method not found',
        });

        const result = await paymentValidationService.validatePaymentMethod(request);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid fiat payment method: Payment method not found');
      });

      it('should handle fiat payment processing errors', async () => {
        const request = {
          ...baseRequest,
          paymentMethod: 'fiat' as const,
          paymentDetails: {
            paymentMethodId: 'pm_1234567890',
            provider: 'stripe',
          },
        };

        mockPaymentMethodService.validateFiatPaymentMethod.mockRejectedValue(
          new Error('Stripe API error')
        );

        const result = await paymentValidationService.validatePaymentMethod(request);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Fiat payment validation failed: Stripe API error');
      });
    });

    describe('Escrow Payment Validation', () => {
      it('should validate sufficient balance for escrow', async () => {
        const request = {
          ...baseRequest,
          paymentMethod: 'escrow' as const,
          paymentDetails: {
            tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c2D0e0f',
            tokenSymbol: 'USDC',
            escrowContractAddress: '0xEscrow123456789012345678901234567890',
          },
        };

        mockPaymentMethodService.checkEscrowContractBalance.mockResolvedValue({
          hasBalance: true,
          balance: '200.00',
          required: '100.00',
          allowance: '500.00',
        });

        const result = await paymentValidationService.validatePaymentMethod(request);

        expect(result).toEqual({
          isValid: true,
          hasSufficientBalance: true,
          errors: [],
          warnings: [],
          suggestedAlternatives: [],
        });
      });

      it('should detect insufficient escrow balance', async () => {
        const request = {
          ...baseRequest,
          paymentMethod: 'escrow' as const,
          paymentDetails: {
            tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c2D0e0f',
            tokenSymbol: 'USDC',
            escrowContractAddress: '0xEscrow123456789012345678901234567890',
          },
        };

        mockPaymentMethodService.checkEscrowContractBalance.mockResolvedValue({
          hasBalance: false,
          balance: '50.00',
          required: '100.00',
          allowance: '500.00',
        });

        mockPaymentMethodService.getAvailablePaymentMethods.mockResolvedValue([
          {
            method: 'fiat',
            description: 'Credit Card Payment',
            available: true,
            estimatedTotal: 100,
            currency: 'USD',
          },
          {
            method: 'crypto',
            description: 'Direct Crypto Payment (no escrow protection)',
            available: true,
            estimatedTotal: 100,
            currency: 'USD',
          },
        ]);

        const result = await paymentValidationService.validatePaymentMethod(request);

        expect(result.isValid).toBe(false);
        expect(result.hasSufficientBalance).toBe(false);
        expect(result.errors).toContain('Insufficient balance for escrow payment. Required: 100.00, Available: 50.00');
        expect(result.suggestedAlternatives).toHaveLength(2);
      });

      it('should detect insufficient allowance for escrow', async () => {
        const request = {
          ...baseRequest,
          paymentMethod: 'escrow' as const,
          paymentDetails: {
            tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c2D0e0f',
            tokenSymbol: 'USDC',
            escrowContractAddress: '0xEscrow123456789012345678901234567890',
          },
        };

        mockPaymentMethodService.checkEscrowContractBalance.mockResolvedValue({
          hasBalance: true,
          balance: '200.00',
          required: '100.00',
          allowance: '50.00',
        });

        const result = await paymentValidationService.validatePaymentMethod(request);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Insufficient token allowance for escrow contract. Required: 100.00, Allowed: 50.00');
        expect(result.warnings).toContain('You need to approve the escrow contract to spend your tokens');
      });

      it('should handle invalid escrow contract address', async () => {
        const request = {
          ...baseRequest,
          paymentMethod: 'escrow' as const,
          paymentDetails: {
            tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c2D0e0f',
            tokenSymbol: 'USDC',
            escrowContractAddress: 'invalid-contract-address',
          },
        };

        const result = await paymentValidationService.validatePaymentMethod(request);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid escrow contract address format');
      });
    });
  });

  describe('suggestPaymentAlternatives', () => {
    it('should suggest alternatives when crypto payment fails', async () => {
      const originalMethod = 'crypto';
      const amount = 100;

      mockPaymentMethodService.getAvailablePaymentMethods.mockResolvedValue([
        {
          method: 'fiat',
          description: 'Credit Card Payment',
          available: true,
          estimatedTotal: 102.9, // Including fees
          currency: 'USD',
        },
        {
          method: 'escrow',
          description: 'Escrow Protected Payment',
          available: true,
          estimatedTotal: 100,
          currency: 'USD',
        },
      ]);

      const alternatives = await paymentValidationService.suggestPaymentAlternatives(
        originalMethod,
        amount
      );

      expect(alternatives).toHaveLength(2);
      expect(alternatives[0].method).toBe('fiat');
      expect(alternatives[1].method).toBe('escrow');
    });

    it('should filter out unavailable alternatives', async () => {
      const originalMethod = 'crypto';
      const amount = 100;

      mockPaymentMethodService.getAvailablePaymentMethods.mockResolvedValue([
        {
          method: 'fiat',
          description: 'Credit Card Payment',
          available: false,
          estimatedTotal: 102.9,
          currency: 'USD',
        },
        {
          method: 'escrow',
          description: 'Escrow Protected Payment',
          available: true,
          estimatedTotal: 100,
          currency: 'USD',
        },
      ]);

      const alternatives = await paymentValidationService.suggestPaymentAlternatives(
        originalMethod,
        amount
      );

      expect(alternatives).toHaveLength(1);
      expect(alternatives[0].method).toBe('escrow');
    });

    it('should handle errors when fetching alternatives', async () => {
      const originalMethod = 'crypto';
      const amount = 100;

      mockPaymentMethodService.getAvailablePaymentMethods.mockRejectedValue(
        new Error('Service unavailable')
      );

      const alternatives = await paymentValidationService.suggestPaymentAlternatives(
        originalMethod,
        amount
      );

      expect(alternatives).toEqual([]);
    });
  });

  describe('validateAmount', () => {
    it('should validate positive amounts', () => {
      const result = paymentValidationService.validateAmount(100);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject zero amounts', () => {
      const result = paymentValidationService.validateAmount(0);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount must be greater than zero');
    });

    it('should reject negative amounts', () => {
      const result = paymentValidationService.validateAmount(-10);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount must be greater than zero');
    });

    it('should reject amounts that are too large', () => {
      const result = paymentValidationService.validateAmount(1000000);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount exceeds maximum limit');
    });

    it('should validate decimal precision', () => {
      const result = paymentValidationService.validateAmount(99.999);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount has too many decimal places (max 2)');
    });
  });

  describe('validateCurrency', () => {
    it('should validate supported currencies', () => {
      const supportedCurrencies = ['USD', 'EUR', 'ETH', 'USDC'];
      
      supportedCurrencies.forEach(currency => {
        const result = paymentValidationService.validateCurrency(currency);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject unsupported currencies', () => {
      const result = paymentValidationService.validateCurrency('XYZ');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unsupported currency: XYZ');
    });

    it('should handle case-insensitive currency codes', () => {
      const result = paymentValidationService.validateCurrency('usd');
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateUserAddress', () => {
    it('should validate correct Ethereum addresses', () => {
      const validAddress = '0x1234567890123456789012345678901234567890';
      const result = paymentValidationService.validateUserAddress(validAddress);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid address format', () => {
      const invalidAddress = 'invalid-address';
      const result = paymentValidationService.validateUserAddress(invalidAddress);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid wallet address format');
    });

    it('should reject addresses with incorrect length', () => {
      const shortAddress = '0x1234567890';
      const result = paymentValidationService.validateUserAddress(shortAddress);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid wallet address format');
    });

    it('should handle checksummed addresses', () => {
      const checksummedAddress = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
      const result = paymentValidationService.validateUserAddress(checksummedAddress);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null payment details', async () => {
      const request = {
        ...baseRequest,
        paymentMethod: 'crypto' as const,
        paymentDetails: null,
      };

      const result = await paymentValidationService.validatePaymentMethod(request as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Payment details are required');
    });

    it('should handle missing required fields', async () => {
      const request = {
        paymentMethod: 'crypto' as const,
        paymentDetails: {
          tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c2D0e0f',
        },
      };

      const result = await paymentValidationService.validatePaymentMethod(request as any);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle service timeouts', async () => {
      const request = {
        ...baseRequest,
        paymentMethod: 'crypto' as const,
        paymentDetails: {
          tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c2D0e0f',
          tokenSymbol: 'USDC',
        },
      };

      mockPaymentMethodService.checkCryptoBalance.mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const result = await paymentValidationService.validatePaymentMethod(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unable to verify crypto balance due to network error');
    });
  });
});