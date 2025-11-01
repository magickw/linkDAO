import { 
  EnhancedEscrowService, 
  EscrowCreationRequest, 
  EscrowValidationResult,
  EscrowStatus,
  EscrowRecoveryOptions
} from '../services/enhancedEscrowService';
import { PaymentValidationService } from '../services/paymentValidationService';
import { DatabaseService } from '../services/databaseService';
import { UserProfileService } from '../services/userProfileService';
import { NotificationService } from '../services/notificationService';

// Mock dependencies
jest.mock('../services/paymentValidationService');
jest.mock('../services/databaseService');
jest.mock('../services/userProfileService');
jest.mock('../services/notificationService');

const MockedPaymentValidationService = PaymentValidationService as jest.MockedClass<typeof PaymentValidationService>;
const MockedDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;
const MockedUserProfileService = UserProfileService as jest.MockedClass<typeof UserProfileService>;
const MockedNotificationService = NotificationService as jest.MockedClass<typeof NotificationService>;

describe('EnhancedEscrowService', () => {
  let enhancedEscrowService: EnhancedEscrowService;
  let mockPaymentValidationService: jest.Mocked<PaymentValidationService>;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockUserProfileService: jest.Mocked<UserProfileService>;
  let mockNotificationService: jest.Mocked<NotificationService>;

  const mockBuyerAddress = '0x1234567890123456789012345678901234567890';
  const mockSellerAddress = '0x9876543210987654321098765432109876543210';
  const mockTokenAddress = '0xA0b86a33E6441c8C06DD2b7c94b7E6E8b8b8b8b8';
  const mockListingId = '123';
  const mockAmount = '100';

  const mockBuyerProfile = {
    id: 'buyer-id',
    walletAddress: mockBuyerAddress,
    handle: 'buyer',
    ens: '',
    avatarCid: '',
    bioCid: ''
  };

  const mockSellerProfile = {
    id: 'seller-id',
    walletAddress: mockSellerAddress,
    handle: 'seller',
    ens: '',
    avatarCid: '',
    bioCid: ''
  };

  const mockEscrow = {
    id: 1,
    listingId: parseInt(mockListingId),
    buyerId: mockBuyerProfile.id,
    sellerId: mockSellerProfile.id,
    amount: mockAmount,
    buyerApproved: false,
    sellerApproved: false,
    disputeOpened: false,
    deliveryConfirmed: false,
    createdAt: new Date(),
    resolvedAt: null
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mocked instances
    mockPaymentValidationService = new MockedPaymentValidationService() as jest.Mocked<PaymentValidationService>;
    mockDatabaseService = new MockedDatabaseService() as jest.Mocked<DatabaseService>;
    mockUserProfileService = new MockedUserProfileService() as jest.Mocked<UserProfileService>;
    mockNotificationService = new MockedNotificationService() as jest.Mocked<NotificationService>;

    // Create service instance
    enhancedEscrowService = new EnhancedEscrowService(
      'http://localhost:8545',
      '0x1234567890123456789012345678901234567890',
      '0x9876543210987654321098765432109876543210'
    );

    // Mock ethers provider
    jest.spyOn(require('ethers'), 'JsonRpcProvider').mockImplementation(() => ({
      getFeeData: jest.fn().mockResolvedValue({
        gasPrice: BigInt('20000000000') // 20 gwei
      })
    }));

    // Setup default mocks
    mockUserProfileService.getProfileByAddress.mockImplementation((address) => {
      if (address === mockBuyerAddress) return Promise.resolve(mockBuyerProfile);
      if (address === mockSellerAddress) return Promise.resolve(mockSellerProfile);
      return Promise.resolve(null);
    });

    mockDatabaseService.createEscrow.mockResolvedValue(mockEscrow);
    mockDatabaseService.getEscrowById.mockResolvedValue(mockEscrow);
    mockDatabaseService.updateEscrow.mockResolvedValue(mockEscrow);
    mockNotificationService.sendOrderNotification.mockResolvedValue();
  });

  describe('validateEscrowCreation', () => {
    it('should validate escrow creation successfully', async () => {
      const request: EscrowCreationRequest = {
        listingId: mockListingId,
        buyerAddress: mockBuyerAddress,
        sellerAddress: mockSellerAddress,
        tokenAddress: mockTokenAddress,
        amount: mockAmount
      };

      mockPaymentValidationService.checkCryptoBalance.mockResolvedValue({
        hasSufficientBalance: true,
        balance: {
          tokenAddress: mockTokenAddress,
          tokenSymbol: 'USDC',
          balance: '1000000000',
          balanceFormatted: '1000',
          decimals: 6
        }
      });

      const result = await enhancedEscrowService.validateEscrowCreation(request);

      expect(result.isValid).toBe(true);
      expect(result.hasSufficientBalance).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.estimatedGasFee).toBeDefined();
    });

    it('should fail validation for missing required fields', async () => {
      const request: EscrowCreationRequest = {
        listingId: '',
        buyerAddress: mockBuyerAddress,
        sellerAddress: mockSellerAddress,
        tokenAddress: mockTokenAddress,
        amount: mockAmount
      };

      const result = await enhancedEscrowService.validateEscrowCreation(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required fields for escrow creation');
    });

    it('should fail validation for invalid addresses', async () => {
      const request: EscrowCreationRequest = {
        listingId: mockListingId,
        buyerAddress: 'invalid_address',
        sellerAddress: mockSellerAddress,
        tokenAddress: mockTokenAddress,
        amount: mockAmount
      };

      const result = await enhancedEscrowService.validateEscrowCreation(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid addresses provided');
    });

    it('should fail validation for insufficient balance', async () => {
      const request: EscrowCreationRequest = {
        listingId: mockListingId,
        buyerAddress: mockBuyerAddress,
        sellerAddress: mockSellerAddress,
        tokenAddress: mockTokenAddress,
        amount: mockAmount
      };

      mockPaymentValidationService.checkCryptoBalance.mockResolvedValue({
        hasSufficientBalance: false,
        balance: {
          tokenAddress: mockTokenAddress,
          tokenSymbol: 'USDC',
          balance: '50000000',
          balanceFormatted: '50',
          decimals: 6
        }
      });

      const result = await enhancedEscrowService.validateEscrowCreation(request);

      expect(result.isValid).toBe(false);
      expect(result.hasSufficientBalance).toBe(false);
      expect(result.errors.some(error => error.includes('Insufficient balance'))).toBe(true);
    });

    it('should warn about low gas balance for ERC-20 tokens', async () => {
      const request: EscrowCreationRequest = {
        listingId: mockListingId,
        buyerAddress: mockBuyerAddress,
        sellerAddress: mockSellerAddress,
        tokenAddress: mockTokenAddress,
        amount: mockAmount
      };

      mockPaymentValidationService.checkCryptoBalance.mockResolvedValue({
        hasSufficientBalance: true,
        balance: {
          tokenAddress: mockTokenAddress,
          tokenSymbol: 'USDC',
          balance: '1000000000',
          balanceFormatted: '1000',
          decimals: 6
        },
        gasBalance: {
          tokenAddress: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'ETH',
          balance: '5000000000000000', // 0.005 ETH
          balanceFormatted: '0.005',
          decimals: 18
        }
      });

      const result = await enhancedEscrowService.validateEscrowCreation(request);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('Low ETH balance'))).toBe(true);
    });

    it('should validate escrow duration', async () => {
      const request: EscrowCreationRequest = {
        listingId: mockListingId,
        buyerAddress: mockBuyerAddress,
        sellerAddress: mockSellerAddress,
        tokenAddress: mockTokenAddress,
        amount: mockAmount,
        escrowDuration: 35 // Invalid - too long
      };

      const result = await enhancedEscrowService.validateEscrowCreation(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Escrow duration must be between 1 and 30 days');
    });
  });

  describe('createEscrow', () => {
    it('should create escrow successfully', async () => {
      mockPaymentValidationService.checkCryptoBalance.mockResolvedValue({
        hasSufficientBalance: true,
        balance: {
          tokenAddress: mockTokenAddress,
          tokenSymbol: 'USDC',
          balance: '1000000000',
          balanceFormatted: '1000',
          decimals: 6
        }
      });

      const escrowId = await enhancedEscrowService.createEscrow(
        mockListingId,
        mockBuyerAddress,
        mockSellerAddress,
        mockTokenAddress,
        mockAmount
      );

      expect(escrowId).toBe('1');
      expect(mockDatabaseService.createEscrow).toHaveBeenCalledWith(
        parseInt(mockListingId),
        mockBuyerProfile.id,
        mockSellerProfile.id,
        mockAmount
      );
      expect(mockNotificationService.sendOrderNotification).toHaveBeenCalledTimes(2);
    });

    it('should fail to create escrow with insufficient balance', async () => {
      mockPaymentValidationService.checkCryptoBalance.mockResolvedValue({
        hasSufficientBalance: false,
        balance: {
          tokenAddress: mockTokenAddress,
          tokenSymbol: 'USDC',
          balance: '50000000',
          balanceFormatted: '50',
          decimals: 6
        }
      });

      await expect(
        enhancedEscrowService.createEscrow(
          mockListingId,
          mockBuyerAddress,
          mockSellerAddress,
          mockTokenAddress,
          mockAmount
        )
      ).rejects.toThrow('Insufficient balance for escrow creation');
    });

    it('should fail to create escrow when buyer profile not found', async () => {
      mockUserProfileService.getProfileByAddress.mockResolvedValue(null);

      await expect(
        enhancedEscrowService.createEscrow(
          mockListingId,
          mockBuyerAddress,
          mockSellerAddress,
          mockTokenAddress,
          mockAmount
        )
      ).rejects.toThrow('Buyer or seller profile not found');
    });
  });

  describe('lockFunds', () => {
    it('should lock funds successfully', async () => {
      mockDatabaseService.getEscrowById.mockResolvedValue(mockEscrow);
      mockPaymentValidationService.checkCryptoBalance.mockResolvedValue({
        hasSufficientBalance: true,
        balance: {
          tokenAddress: mockTokenAddress,
          tokenSymbol: 'USDC',
          balance: '1000000000',
          balanceFormatted: '1000',
          decimals: 6
        }
      });

      await enhancedEscrowService.lockFunds('1', mockAmount, mockTokenAddress);

      expect(mockDatabaseService.updateEscrow).toHaveBeenCalledWith(1, {});
      expect(mockNotificationService.sendOrderNotification).toHaveBeenCalledTimes(2);
    });

    it('should fail to lock funds when escrow not found', async () => {
      mockDatabaseService.getEscrowById.mockResolvedValue(null);

      await expect(
        enhancedEscrowService.lockFunds('1', mockAmount, mockTokenAddress)
      ).rejects.toThrow('Escrow not found');
    });

    it('should fail to lock funds with insufficient balance', async () => {
      mockDatabaseService.getEscrowById.mockResolvedValue(mockEscrow);
      mockPaymentValidationService.checkCryptoBalance.mockResolvedValue({
        hasSufficientBalance: false,
        balance: {
          tokenAddress: mockTokenAddress,
          tokenSymbol: 'USDC',
          balance: '50000000',
          balanceFormatted: '50',
          decimals: 6
        }
      });

      await expect(
        enhancedEscrowService.lockFunds('1', mockAmount, mockTokenAddress)
      ).rejects.toThrow('Insufficient balance to lock funds');
    });
  });

  describe('getEscrowStatus', () => {
    it('should return correct status for created escrow', async () => {
      mockDatabaseService.getEscrowById.mockResolvedValue(mockEscrow);

      const status = await enhancedEscrowService.getEscrowStatus('1');

      expect(status).toBeDefined();
      expect(status!.id).toBe('1');
      expect(status!.status).toBe('created');
      expect(status!.buyerApproved).toBe(false);
      expect(status!.sellerApproved).toBe(false);
      expect(status!.disputeOpened).toBe(false);
    });

    it('should return disputed status when dispute is opened', async () => {
      const disputedEscrow = { ...mockEscrow, disputeOpened: true };
      mockDatabaseService.getEscrowById.mockResolvedValue(disputedEscrow);

      const status = await enhancedEscrowService.getEscrowStatus('1');

      expect(status!.status).toBe('disputed');
      expect(status!.disputeOpened).toBe(true);
    });

    it('should return resolved status when escrow is resolved', async () => {
      const resolvedEscrow = { ...mockEscrow, resolvedAt: new Date() };
      mockDatabaseService.getEscrowById.mockResolvedValue(resolvedEscrow);

      const status = await enhancedEscrowService.getEscrowStatus('1');

      expect(status!.status).toBe('resolved');
      expect(status!.resolvedAt).toBeDefined();
    });

    it('should return null for non-existent escrow', async () => {
      mockDatabaseService.getEscrowById.mockResolvedValue(null);

      const status = await enhancedEscrowService.getEscrowStatus('999');

      expect(status).toBeNull();
    });
  });

  describe('getEscrowRecoveryOptions', () => {
    it('should provide recovery options for created escrow', async () => {
      mockDatabaseService.getEscrowById.mockResolvedValue(mockEscrow);
      mockPaymentValidationService.checkCryptoBalance.mockResolvedValue({
        hasSufficientBalance: true,
        balance: {
          tokenAddress: mockTokenAddress,
          tokenSymbol: 'USDC',
          balance: '1000000000',
          balanceFormatted: '1000',
          decimals: 6
        }
      });

      const options = await enhancedEscrowService.getEscrowRecoveryOptions('1');

      expect(options.canCancel).toBe(true);
      expect(options.canRetry).toBe(true);
      expect(options.suggestedActions).toContain('Retry funding the escrow');
      expect(options.suggestedActions).toContain('Cancel escrow if no longer needed');
    });

    it('should provide different options for funded escrow', async () => {
      const fundedEscrow = { ...mockEscrow, buyerApproved: true, sellerApproved: true };
      mockDatabaseService.getEscrowById.mockResolvedValue(fundedEscrow);
      mockPaymentValidationService.checkCryptoBalance.mockResolvedValue({
        hasSufficientBalance: true,
        balance: {
          tokenAddress: mockTokenAddress,
          tokenSymbol: 'USDC',
          balance: '1000000000',
          balanceFormatted: '1000',
          decimals: 6
        }
      });

      const options = await enhancedEscrowService.getEscrowRecoveryOptions('1');

      expect(options.canRefund).toBe(true);
      expect(options.suggestedActions).toContain('Wait for seller to ship item');
      expect(options.timeoutActions).toContain('Auto-refund after 30 days if no delivery');
    });

    it('should suggest adding funds when balance is insufficient', async () => {
      mockDatabaseService.getEscrowById.mockResolvedValue(mockEscrow);
      mockPaymentValidationService.checkCryptoBalance.mockResolvedValue({
        hasSufficientBalance: false,
        balance: {
          tokenAddress: mockTokenAddress,
          tokenSymbol: 'USDC',
          balance: '50000000',
          balanceFormatted: '50',
          decimals: 6
        }
      });

      const options = await enhancedEscrowService.getEscrowRecoveryOptions('1');

      expect(options.suggestedActions[0]).toBe('Add funds to wallet before retrying');
    });
  });

  describe('cancelEscrow', () => {
    it('should cancel escrow successfully by buyer', async () => {
      mockDatabaseService.getEscrowById.mockResolvedValue(mockEscrow);

      await enhancedEscrowService.cancelEscrow('1', mockBuyerAddress, 'Changed my mind');

      expect(mockDatabaseService.updateEscrow).toHaveBeenCalledWith(1, {});
      expect(mockNotificationService.sendOrderNotification).toHaveBeenCalledTimes(2);
    });

    it('should cancel escrow successfully by seller', async () => {
      mockDatabaseService.getEscrowById.mockResolvedValue(mockEscrow);

      await enhancedEscrowService.cancelEscrow('1', mockSellerAddress, 'Item not available');

      expect(mockDatabaseService.updateEscrow).toHaveBeenCalledWith(1, {});
      expect(mockNotificationService.sendOrderNotification).toHaveBeenCalledTimes(2);
    });

    it('should fail to cancel escrow by unauthorized user', async () => {
      mockDatabaseService.getEscrowById.mockResolvedValue(mockEscrow);
      const unauthorizedAddress = '0x1111111111111111111111111111111111111111';

      await expect(
        enhancedEscrowService.cancelEscrow('1', unauthorizedAddress, 'Unauthorized')
      ).rejects.toThrow('Only buyer or seller can cancel escrow');
    });

    it('should fail to cancel resolved escrow', async () => {
      const resolvedEscrow = { ...mockEscrow, resolvedAt: new Date() };
      mockDatabaseService.getEscrowById.mockResolvedValue(resolvedEscrow);

      await expect(
        enhancedEscrowService.cancelEscrow('1', mockBuyerAddress, 'Too late')
      ).rejects.toThrow('Cannot cancel resolved escrow');
    });

    it('should fail to cancel disputed escrow', async () => {
      const disputedEscrow = { ...mockEscrow, disputeOpened: true };
      mockDatabaseService.getEscrowById.mockResolvedValue(disputedEscrow);

      await expect(
        enhancedEscrowService.cancelEscrow('1', mockBuyerAddress, 'In dispute')
      ).rejects.toThrow('Cannot cancel disputed escrow - wait for resolution');
    });
  });

  describe('retryEscrowOperation', () => {
    it('should retry fund operation successfully', async () => {
      mockDatabaseService.getEscrowById.mockResolvedValue(mockEscrow);
      mockPaymentValidationService.checkCryptoBalance.mockResolvedValue({
        hasSufficientBalance: true,
        balance: {
          tokenAddress: mockTokenAddress,
          tokenSymbol: 'USDC',
          balance: '1000000000',
          balanceFormatted: '1000',
          decimals: 6
        }
      });

      await enhancedEscrowService.retryEscrowOperation('1', 'fund');

      expect(mockDatabaseService.updateEscrow).toHaveBeenCalled();
    });

    it('should fail to retry fund operation when escrow not in created state', async () => {
      const fundedEscrow = { ...mockEscrow, buyerApproved: true, sellerApproved: true };
      mockDatabaseService.getEscrowById.mockResolvedValue(fundedEscrow);

      await expect(
        enhancedEscrowService.retryEscrowOperation('1', 'fund')
      ).rejects.toThrow('Escrow is not in created state for funding retry');
    });

    it('should retry confirm operation successfully', async () => {
      const activeEscrow = { ...mockEscrow, deliveryConfirmed: true };
      mockDatabaseService.getEscrowById.mockResolvedValue(activeEscrow);

      await enhancedEscrowService.retryEscrowOperation('1', 'confirm');

      expect(mockDatabaseService.updateEscrow).toHaveBeenCalled();
    });

    it('should fail with unknown operation', async () => {
      mockDatabaseService.getEscrowById.mockResolvedValue(mockEscrow);

      await expect(
        enhancedEscrowService.retryEscrowOperation('1', 'unknown' as any)
      ).rejects.toThrow('Unknown operation: unknown');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDatabaseService.createEscrow.mockRejectedValue(new Error('Database error'));

      await expect(
        enhancedEscrowService.createEscrow(
          mockListingId,
          mockBuyerAddress,
          mockSellerAddress,
          mockTokenAddress,
          mockAmount
        )
      ).rejects.toThrow('Database error');
    });

    it('should handle payment validation service errors', async () => {
      mockPaymentValidationService.checkCryptoBalance.mockRejectedValue(new Error('Network error'));

      const result = await enhancedEscrowService.validateEscrowCreation({
        listingId: mockListingId,
        buyerAddress: mockBuyerAddress,
        sellerAddress: mockSellerAddress,
        tokenAddress: mockTokenAddress,
        amount: mockAmount
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Failed to check buyer balance');
    });

    it('should handle notification service errors gracefully', async () => {
      mockNotificationService.sendOrderNotification.mockRejectedValue(new Error('Notification error'));
      mockPaymentValidationService.checkCryptoBalance.mockResolvedValue({
        hasSufficientBalance: true,
        balance: {
          tokenAddress: mockTokenAddress,
          tokenSymbol: 'USDC',
          balance: '1000000000',
          balanceFormatted: '1000',
          decimals: 6
        }
      });

      // Should still create escrow even if notifications fail
      const escrowId = await enhancedEscrowService.createEscrow(
        mockListingId,
        mockBuyerAddress,
        mockSellerAddress,
        mockTokenAddress,
        mockAmount
      );

      expect(escrowId).toBe('1');
    });
  });
});
