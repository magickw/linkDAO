import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { RefundRequest } from '../services/multiProviderRefundIntegration';

// Create mock functions
const mockStripeProcessRefund = jest.fn();
const mockStripeGetRefundStatus = jest.fn();
const mockPayPalProcessRefund = jest.fn();
const mockPayPalGetRefundStatus = jest.fn();
const mockBlockchainProcessNativeTokenRefund = jest.fn();
const mockBlockchainProcessERC20TokenRefund = jest.fn();
const mockBlockchainGetTransactionStatus = jest.fn();
const mockTrackRefundTransaction = jest.fn();
const mockUpdateRefundStatus = jest.fn();
const mockGetProviderStatus = jest.fn();
const mockDbInsert = jest.fn();
const mockDbUpdate = jest.fn();
const mockDbSelect = jest.fn();

// Mock modules before importing the service
jest.mock('../services/providers/stripeRefundProvider', () => ({
  stripeRefundProvider: {
    processRefund: mockStripeProcessRefund,
    getRefundStatus: mockStripeGetRefundStatus
  }
}));

jest.mock('../services/providers/paypalRefundProvider', () => ({
  paypalRefundProvider: {
    processRefund: mockPayPalProcessRefund,
    getRefundStatus: mockPayPalGetRefundStatus
  }
}));

jest.mock('../services/providers/blockchainRefundProvider', () => ({
  blockchainRefundProvider: {
    processNativeTokenRefund: mockBlockchainProcessNativeTokenRefund,
    processERC20TokenRefund: mockBlockchainProcessERC20TokenRefund,
    getTransactionStatus: mockBlockchainGetTransactionStatus
  }
}));

jest.mock('../services/refundMonitoringService', () => ({
  refundMonitoringService: {
    trackRefundTransaction: mockTrackRefundTransaction,
    updateRefundStatus: mockUpdateRefundStatus,
    getProviderStatus: mockGetProviderStatus
  }
}));

jest.mock('../db/index', () => ({
  db: {
    insert: mockDbInsert,
    update: mockDbUpdate,
    select: mockDbSelect
  }
}));

// Now import the service after mocks are set up
import { multiProviderRefundIntegration } from '../services/multiProviderRefundIntegration';

describe('MultiProviderRefundIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockDbInsert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'provider-tx-123' }])
      })
    });
    
    mockDbUpdate.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([])
      })
    });
    
    mockDbSelect.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([])
      })
    });
  });

  describe('processRefund', () => {
    it('should process Stripe refund successfully', async () => {
      // Arrange
      const request: RefundRequest = {
        returnId: 'return-123',
        refundId: 'refund-123',
        provider: 'stripe',
        amount: 100.00,
        currency: 'USD',
        providerTransactionId: 'pi_test123',
        reason: 'requested_by_customer'
      };

      const mockRefundRecord = {
        id: 'record-123',
        returnId: request.returnId,
        refundId: request.refundId,
        status: 'pending'
      };

      const mockStripeResult = {
        success: true,
        refundId: 're_test123',
        status: 'succeeded',
        amount: 100.00,
        currency: 'USD',
        processingTime: 5000
      };

      mockTrackRefundTransaction.mockResolvedValue(mockRefundRecord);
      mockStripeProcessRefund.mockResolvedValue(mockStripeResult);
      mockUpdateRefundStatus.mockResolvedValue(undefined);

      // Act
      const result = await multiProviderRefundIntegration.processRefund(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.provider).toBe('stripe');
      expect(result.providerRefundId).toBe('re_test123');
      expect(result.amount).toBe(100.00);
      expect(mockTrackRefundTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          returnId: request.returnId,
          refundId: request.refundId,
          paymentProvider: 'stripe'
        })
      );
      expect(mockStripeProcessRefund).toHaveBeenCalledWith(
        'pi_test123',
        100.00,
        'requested_by_customer'
      );
    });

    it('should process PayPal refund successfully', async () => {
      // Arrange
      const request: RefundRequest = {
        returnId: 'return-456',
        refundId: 'refund-456',
        provider: 'paypal',
        amount: 50.00,
        currency: 'USD',
        providerTransactionId: 'capture-test456',
        reason: 'Product defective'
      };

      const mockRefundRecord = {
        id: 'record-456',
        returnId: request.returnId,
        refundId: request.refundId,
        status: 'pending'
      };

      const mockPayPalResult = {
        success: true,
        refundId: 'refund-paypal-456',
        status: 'COMPLETED',
        amount: 50.00,
        currency: 'USD',
        processingTime: 120000
      };

      mockTrackRefundTransaction.mockResolvedValue(mockRefundRecord);
      mockPayPalProcessRefund.mockResolvedValue(mockPayPalResult);
      mockUpdateRefundStatus.mockResolvedValue(undefined);

      // Act
      const result = await multiProviderRefundIntegration.processRefund(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.provider).toBe('paypal');
      expect(result.providerRefundId).toBe('refund-paypal-456');
      expect(mockPayPalProcessRefund).toHaveBeenCalledWith(
        'capture-test456',
        50.00,
        'USD',
        'Product defective'
      );
    });

    it('should process blockchain refund successfully', async () => {
      // Arrange
      const request: RefundRequest = {
        returnId: 'return-789',
        refundId: 'refund-789',
        provider: 'blockchain',
        amount: 0.5,
        currency: 'ETH',
        providerTransactionId: '0x123abc',
        metadata: {
          recipientAddress: '0xRecipient123'
        }
      };

      const mockRefundRecord = {
        id: 'record-789',
        returnId: request.returnId,
        refundId: request.refundId,
        status: 'pending'
      };

      const mockBlockchainResult = {
        success: true,
        transactionHash: '0xTxHash789',
        status: 'completed',
        amount: 0.5,
        currency: 'ETH',
        processingTime: 45000,
        gasUsed: 21000
      };

      mockTrackRefundTransaction.mockResolvedValue(mockRefundRecord);
      mockBlockchainProcessNativeTokenRefund.mockResolvedValue(mockBlockchainResult);
      mockUpdateRefundStatus.mockResolvedValue(undefined);

      // Act
      const result = await multiProviderRefundIntegration.processRefund(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.provider).toBe('blockchain');
      expect(result.providerRefundId).toBe('0xTxHash789');
      expect(mockBlockchainProcessNativeTokenRefund).toHaveBeenCalledWith(
        '0xRecipient123',
        0.5
      );
    });

    it('should handle Stripe refund failure', async () => {
      // Arrange
      const request: RefundRequest = {
        returnId: 'return-fail',
        refundId: 'refund-fail',
        provider: 'stripe',
        amount: 100.00,
        currency: 'USD',
        providerTransactionId: 'pi_fail'
      };

      const mockRefundRecord = {
        id: 'record-fail',
        returnId: request.returnId,
        refundId: request.refundId,
        status: 'pending'
      };

      const mockStripeResult = {
        success: false,
        refundId: '',
        status: 'failed',
        amount: 0,
        currency: 'USD',
        processingTime: 3000,
        errorMessage: 'Insufficient funds'
      };

      mockTrackRefundTransaction.mockResolvedValue(mockRefundRecord);
      mockStripeProcessRefund.mockResolvedValue(mockStripeResult);
      mockUpdateRefundStatus.mockResolvedValue(undefined);

      // Act
      const result = await multiProviderRefundIntegration.processRefund(request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Insufficient funds');
      expect(mockUpdateRefundStatus).toHaveBeenCalledWith(
        'record-fail',
        'failed',
        undefined,
        'Insufficient funds'
      );
    });
  });

  describe('getProviderRefundStatus', () => {
    it('should get Stripe refund status', async () => {
      // Arrange
      const mockStatus = {
        status: 'succeeded',
        amount: 100.00,
        currency: 'USD',
        created: new Date('2024-01-01'),
        failureReason: undefined
      };

      mockStripeGetRefundStatus.mockResolvedValue(mockStatus);

      // Act
      const result = await multiProviderRefundIntegration.getProviderRefundStatus('stripe', 're_test123');

      // Assert
      expect(result).toEqual(mockStatus);
      expect(mockStripeGetRefundStatus).toHaveBeenCalledWith('re_test123');
    });

    it('should get PayPal refund status', async () => {
      // Arrange
      const mockStatus = {
        status: 'COMPLETED',
        amount: 50.00,
        currency: 'USD',
        created: new Date('2024-01-01')
      };

      mockPayPalGetRefundStatus.mockResolvedValue(mockStatus);

      // Act
      const result = await multiProviderRefundIntegration.getProviderRefundStatus('paypal', 'refund-paypal-123');

      // Assert
      expect(result).toEqual(mockStatus);
      expect(mockPayPalGetRefundStatus).toHaveBeenCalledWith('refund-paypal-123');
    });

    it('should get blockchain transaction status', async () => {
      // Arrange
      const mockTxStatus = {
        status: 'completed',
        confirmations: 12,
        blockNumber: 12345,
        gasUsed: 21000,
        timestamp: new Date('2024-01-01')
      };

      mockBlockchainGetTransactionStatus.mockResolvedValue(mockTxStatus);

      // Act
      const result = await multiProviderRefundIntegration.getProviderRefundStatus('blockchain', '0xTxHash');

      // Assert
      expect(result.status).toBe('completed');
      expect(result.created).toEqual(mockTxStatus.timestamp);
      expect(mockBlockchainGetTransactionStatus).toHaveBeenCalledWith('0xTxHash');
    });
  });

  describe('getAllProviderHealthStatus', () => {
    it('should get health status for all providers', async () => {
      // Arrange
      const mockProviderStatuses = [
        {
          provider: 'stripe' as const,
          status: 'operational' as const,
          successRate: 98.5,
          averageProcessingTime: 5.2,
          lastSuccessfulRefund: new Date('2024-01-01'),
          errorRate: 1.5,
          recentErrors: []
        },
        {
          provider: 'paypal' as const,
          status: 'degraded' as const,
          successRate: 85.0,
          averageProcessingTime: 120.0,
          lastSuccessfulRefund: new Date('2024-01-01'),
          errorRate: 15.0,
          recentErrors: ['Connection timeout']
        },
        {
          provider: 'blockchain' as const,
          status: 'operational' as const,
          successRate: 99.0,
          averageProcessingTime: 45.0,
          lastSuccessfulRefund: new Date('2024-01-01'),
          errorRate: 1.0,
          recentErrors: []
        }
      ];

      mockGetProviderStatus.mockResolvedValue(mockProviderStatuses);

      // Act
      const result = await multiProviderRefundIntegration.getAllProviderHealthStatus();

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].provider).toBe('stripe');
      expect(result[0].isHealthy).toBe(true);
      expect(result[1].provider).toBe('paypal');
      expect(result[1].isHealthy).toBe(false);
      expect(result[2].provider).toBe('blockchain');
      expect(result[2].isHealthy).toBe(true);
    });
  });

  describe('getProviderCapabilities', () => {
    it('should return capabilities for all providers', () => {
      // Act
      const capabilities = multiProviderRefundIntegration.getProviderCapabilities();

      // Assert
      expect(capabilities.stripe).toBeDefined();
      expect(capabilities.paypal).toBeDefined();
      expect(capabilities.blockchain).toBeDefined();
      
      expect(capabilities.stripe.supportsPartialRefunds).toBe(true);
      expect(capabilities.stripe.supportsInstantRefunds).toBe(true);
      expect(capabilities.stripe.supportedCurrencies).toContain('USD');
      
      expect(capabilities.paypal.supportsPartialRefunds).toBe(true);
      expect(capabilities.paypal.supportsInstantRefunds).toBe(false);
      
      expect(capabilities.blockchain.supportedCurrencies).toContain('ETH');
      expect(capabilities.blockchain.supportedCurrencies).toContain('USDC');
    });
  });
});
