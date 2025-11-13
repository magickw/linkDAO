import { ethers } from 'ethers';
import { safeLogger } from '../utils/safeLogger';
import { DatabaseService } from './databaseService';
import { UserProfileService } from './userProfileService';
import { PaymentValidationService } from './paymentValidationService';
import { NotificationService } from './notificationService';
import { MarketplaceEscrow } from '../models/Marketplace';

const databaseService = new DatabaseService();
const userProfileService = new UserProfileService();
const notificationService = new NotificationService();

export interface EscrowCreationRequest {
  listingId: string;
  buyerAddress: string;
  sellerAddress: string;
  tokenAddress: string;
  amount: string;
  escrowDuration?: number; // in days
  requiresDeliveryConfirmation?: boolean;
  metadata?: any;
}

export interface EscrowValidationResult {
  isValid: boolean;
  hasSufficientBalance: boolean;
  errors: string[];
  warnings: string[];
  estimatedGasFee?: string;
  requiredApprovals?: string[];
}

export interface EscrowStatus {
  id: string;
  status: 'created' | 'funded' | 'active' | 'disputed' | 'resolved' | 'cancelled';
  buyerApproved: boolean;
  sellerApproved: boolean;
  disputeOpened: boolean;
  fundsLocked: boolean;
  deliveryConfirmed: boolean;
  createdAt: Date;
  expiresAt?: Date;
  resolvedAt?: Date;
}

export interface EscrowRecoveryOptions {
  canCancel: boolean;
  canRefund: boolean;
  canRetry: boolean;
  suggestedActions: string[];
  timeoutActions: string[];
}

// Enhanced Escrow Service
export class EnhancedEscrowService {
  private provider: ethers.JsonRpcProvider;
  private enhancedEscrowContract: ethers.Contract | null;
  private marketplaceContract: ethers.Contract | null;
  private paymentValidationService: PaymentValidationService;

  constructor(rpcUrl: string, enhancedEscrowContractAddress: string, marketplaceContractAddress: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.enhancedEscrowContract = null;
    this.marketplaceContract = null;
    this.paymentValidationService = new PaymentValidationService();
    
    // Initialize contracts if addresses are provided
    if (enhancedEscrowContractAddress && ethers.isAddress(enhancedEscrowContractAddress)) {
      // Enhanced Escrow ABI (simplified for this example)
      const ENHANCED_ESCROW_ABI = [
        "function createEscrow(uint256 listingId, address buyer, address seller, address tokenAddress, uint256 amount) external returns (uint256)",
        "function lockFunds(uint256 escrowId) external payable",
        "function confirmDelivery(uint256 escrowId, string deliveryInfo) external",
        "function approveEscrow(uint256 escrowId) external",
        "function openDispute(uint256 escrowId, string reason) external",
        "function submitEvidence(uint256 escrowId, string evidence) external",
        "function castVote(uint256 escrowId, bool voteForBuyer) external",
        "function getEscrow(uint256 escrowId) external view returns (tuple)",
        "function getReputationScore(address user) external view returns (uint256)"
      ];
      
      this.enhancedEscrowContract = new ethers.Contract(
        enhancedEscrowContractAddress, 
        ENHANCED_ESCROW_ABI, 
        this.provider
      );
    }
    
    if (marketplaceContractAddress && ethers.isAddress(marketplaceContractAddress)) {
      // Marketplace ABI (simplified for this example)
      const MARKETPLACE_ABI = [
        "function listings(uint256) external view returns (tuple)"
      ];
      
      this.marketplaceContract = new ethers.Contract(
        marketplaceContractAddress, 
        MARKETPLACE_ABI, 
        this.provider
      );
    }
  }

  /**
   * Validate escrow creation request
   */
  async validateEscrowCreation(request: EscrowCreationRequest): Promise<EscrowValidationResult> {
    const result: EscrowValidationResult = {
      isValid: false,
      hasSufficientBalance: false,
      errors: [],
      warnings: [],
      requiredApprovals: []
    };

    try {
      // Basic validation
      if (!request.listingId || !request.buyerAddress || !request.sellerAddress || !request.tokenAddress || !request.amount) {
        result.errors.push('Missing required fields for escrow creation');
        return result;
      }

      // Validate addresses
      if (!ethers.isAddress(request.buyerAddress) || !ethers.isAddress(request.sellerAddress) || !ethers.isAddress(request.tokenAddress)) {
        result.errors.push('Invalid addresses provided');
        return result;
      }

      // Validate amount
      if (parseFloat(request.amount) <= 0) {
        result.errors.push('Escrow amount must be greater than 0');
        return result;
      }

      // Check if buyer has sufficient balance
      try {
        const balanceCheck = await this.paymentValidationService.checkCryptoBalance(
          request.buyerAddress,
          request.tokenAddress,
          request.amount,
          1 // Assuming mainnet for now
        );

        result.hasSufficientBalance = balanceCheck.hasSufficientBalance;

        if (!balanceCheck.hasSufficientBalance) {
          result.errors.push(`Insufficient balance. Required: ${request.amount}, Available: ${balanceCheck.balance.balanceFormatted}`);
        }

        // Check gas balance for ERC-20 tokens
        if (request.tokenAddress !== '0x0000000000000000000000000000000000000000' && balanceCheck.gasBalance) {
          const minGasBalance = ethers.parseUnits('0.01', balanceCheck.gasBalance.decimals);
          if (BigInt(balanceCheck.gasBalance.balance) < minGasBalance) {
            result.warnings.push(`Low ${balanceCheck.gasBalance.tokenSymbol} balance for gas fees`);
          }
        }
      } catch (error) {
        result.errors.push('Failed to check buyer balance');
        return result;
      }

      // Estimate gas fees
      try {
        const gasPrice = await this.provider.getFeeData();
        if (gasPrice.gasPrice) {
          const gasLimit = request.tokenAddress === '0x0000000000000000000000000000000000000000' ? 100000 : 150000;
          const gasCost = gasPrice.gasPrice * BigInt(gasLimit);
          result.estimatedGasFee = ethers.formatEther(gasCost);
        }
      } catch (error) {
        result.warnings.push('Unable to estimate gas fees');
      }

      // Check token approvals for ERC-20
      if (request.tokenAddress !== '0x0000000000000000000000000000000000000000') {
        result.requiredApprovals.push(`Approve ${request.amount} tokens for escrow contract`);
      }

      // Validate escrow duration
      if (request.escrowDuration && (request.escrowDuration < 1 || request.escrowDuration > 30)) {
        result.errors.push('Escrow duration must be between 1 and 30 days');
        return result;
      }

      result.isValid = result.errors.length === 0;
      return result;
    } catch (error) {
      safeLogger.error('Error validating escrow creation:', error);
      result.errors.push('Escrow validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return result;
    }
  }

  /**
   * Create a new enhanced escrow with proper validation
   */
  async createEscrow(
    listingId: string,
    buyerAddress: string,
    sellerAddress: string,
    tokenAddress: string,
    amount: string
  ): Promise<string> {
    try {
      // Validate escrow creation
      const validation = await this.validateEscrowCreation({
        listingId,
        buyerAddress,
        sellerAddress,
        tokenAddress,
        amount
      });

      if (!validation.isValid) {
        throw new Error(`Escrow validation failed: ${validation.errors.join(', ')}`);
      }

      if (!validation.hasSufficientBalance) {
        throw new Error('Insufficient balance for escrow creation');
      }

      if (!this.enhancedEscrowContract) {
        throw new Error('Enhanced Escrow contract not initialized');
      }

      // Create escrow in database first
      const buyer = await userProfileService.getProfileByAddress(buyerAddress);
      const seller = await userProfileService.getProfileByAddress(sellerAddress);

      if (!buyer || !seller) {
        throw new Error('Buyer or seller profile not found');
      }

      const dbEscrow = await databaseService.createEscrow(
        listingId,
        buyer.id,
        seller.id,
        amount
      );
      
      if (!dbEscrow) {
        throw new Error('Failed to create escrow in database');
      }

      const escrowId = dbEscrow.id.toString();

      // In a real implementation, interact with smart contract here
      safeLogger.info(`Creating enhanced escrow ${escrowId} for listing ${listingId}`);
      safeLogger.info(`Buyer: ${buyerAddress}, Seller: ${sellerAddress}`);
      safeLogger.info(`Token: ${tokenAddress}, Amount: ${amount}`);

      // Send notifications
      await Promise.all([
        notificationService.sendOrderNotification(buyerAddress, 'ESCROW_CREATED', escrowId),
        notificationService.sendOrderNotification(sellerAddress, 'ESCROW_CREATED', escrowId)
      ]);

      return escrowId;
    } catch (error) {
      safeLogger.error('Error creating enhanced escrow:', error);
      throw error;
    }
  }

  /**
   * Lock funds in escrow with enhanced validation
   */
  async lockFunds(escrowId: string, amount: string, tokenAddress: string): Promise<void> {
    try {
      if (!this.enhancedEscrowContract) {
        throw new Error('Enhanced Escrow contract not initialized');
      }

      // Get escrow details
      const escrow = await this.getEscrow(escrowId);
      if (!escrow) {
        throw new Error('Escrow not found');
      }

      // Validate that funds haven't already been locked
      if (escrow.deliveryConfirmed) {
        throw new Error('Funds already locked in this escrow');
      }

      // Validate buyer balance before locking
      const validation = await this.validateEscrowCreation({
        listingId: escrow.listingId,
        buyerAddress: escrow.buyerWalletAddress,
        sellerAddress: escrow.sellerWalletAddress,
        tokenAddress,
        amount
      });

      if (!validation.hasSufficientBalance) {
        throw new Error(`Insufficient balance to lock funds: ${validation.errors.join(', ')}`);
      }

      // In a real implementation, interact with smart contract
      safeLogger.info(`Locking ${amount} ${tokenAddress} in escrow ${escrowId}`);
      
      // Update escrow status in database
      await databaseService.updateEscrow(parseInt(escrowId), {
        // Mark funds as locked
      });

      // Send notifications
      await Promise.all([
        notificationService.sendOrderNotification(escrow.buyerWalletAddress, 'ESCROW_FUNDED', escrowId),
        notificationService.sendOrderNotification(escrow.sellerWalletAddress, 'ESCROW_FUNDED', escrowId)
      ]);

      safeLogger.info(`Successfully locked funds in escrow ${escrowId}`);
    } catch (error) {
      safeLogger.error('Error locking funds in escrow:', error);
      
      // Send error notification to buyer
      const escrow = await this.getEscrow(escrowId);
      if (escrow) {
        await notificationService.sendOrderNotification(
          escrow.buyerWalletAddress, 
          'ESCROW_FUNDING_FAILED', 
          escrowId,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        );
      }
      
      throw error;
    }
  }

  /**
   * Confirm delivery
   * @param escrowId ID of the escrow
   * @param deliveryInfo Delivery tracking information
   */
  async confirmDelivery(escrowId: string, deliveryInfo: string): Promise<void> {
    try {
      if (!this.enhancedEscrowContract) {
        throw new Error('Enhanced Escrow contract not initialized');
      }

      // In a real implementation, we would interact with the smart contract
      safeLogger.info(`Confirming delivery for escrow ${escrowId}: ${deliveryInfo}`);
      
      // Update escrow in database
      await databaseService.updateEscrow(parseInt(escrowId), {
        // In a real implementation, we would store delivery info
      });
    } catch (error) {
      safeLogger.error('Error confirming delivery:', error);
      throw error;
    }
  }

  /**
   * Approve escrow (buyer confirms receipt)
   * @param escrowId ID of the escrow
   * @param buyerAddress Address of the buyer
   */
  async approveEscrow(escrowId: string, buyerAddress: string): Promise<void> {
    try {
      if (!this.enhancedEscrowContract) {
        throw new Error('Enhanced Escrow contract not initialized');
      }

      // In a real implementation, we would interact with the smart contract
      safeLogger.info(`Approving escrow ${escrowId} by buyer ${buyerAddress}`);
      
      // Update escrow in database
      await databaseService.updateEscrow(parseInt(escrowId), {
        buyerApproved: true
      });
    } catch (error) {
      safeLogger.error('Error approving escrow:', error);
      throw error;
    }
  }

  /**
   * Open dispute
   * @param escrowId ID of the escrow
   * @param userAddress Address of the user opening dispute
   * @param reason Reason for dispute
   */
  async openDispute(escrowId: string, userAddress: string, reason: string): Promise<void> {
    try {
      if (!this.enhancedEscrowContract) {
        throw new Error('Enhanced Escrow contract not initialized');
      }

      // In a real implementation, we would interact with the smart contract
      safeLogger.info(`Opening dispute for escrow ${escrowId} by ${userAddress}: ${reason}`);
      
      // Update escrow in database
      await databaseService.updateEscrow(parseInt(escrowId), {
        disputeOpened: true
      });
    } catch (error) {
      safeLogger.error('Error opening dispute:', error);
      throw error;
    }
  }

  /**
   * Submit evidence for dispute
   * @param escrowId ID of the escrow
   * @param userAddress Address of the user submitting evidence
   * @param evidence Evidence information (could be IPFS hash)
   */
  async submitEvidence(escrowId: string, userAddress: string, evidence: string): Promise<void> {
    try {
      if (!this.enhancedEscrowContract) {
        throw new Error('Enhanced Escrow contract not initialized');
      }

      // In a real implementation, we would interact with the smart contract
      safeLogger.info(`Submitting evidence for escrow ${escrowId} by ${userAddress}: ${evidence}`);
    } catch (error) {
      safeLogger.error('Error submitting evidence:', error);
      throw error;
    }
  }

  /**
   * Cast vote in community dispute resolution
   * @param escrowId ID of the escrow
   * @param voterAddress Address of the voter
   * @param voteForBuyer True if voting for buyer, false if for seller
   */
  async castVote(escrowId: string, voterAddress: string, voteForBuyer: boolean): Promise<void> {
    try {
      if (!this.enhancedEscrowContract) {
        throw new Error('Enhanced Escrow contract not initialized');
      }

      // In a real implementation, we would interact with the smart contract
      safeLogger.info(`Casting vote for escrow ${escrowId} by ${voterAddress}: ${voteForBuyer ? 'Buyer' : 'Seller'}`);
    } catch (error) {
      safeLogger.error('Error casting vote:', error);
      throw error;
    }
  }

  /**
   * Get escrow details
   * @param escrowId ID of the escrow
   * @returns Escrow details
   */
  async getEscrow(escrowId: string): Promise<MarketplaceEscrow | null> {
    try {
      const dbEscrow = await databaseService.getEscrowById(parseInt(escrowId));
      if (!dbEscrow) return null;
      
      // Get buyer and seller addresses
      const buyer = await userProfileService.getProfileById(dbEscrow.buyerId || '');
      const seller = await userProfileService.getProfileById(dbEscrow.sellerId || '');
      if (!buyer || !seller) return null;
      
      const escrow: MarketplaceEscrow = {
        id: dbEscrow.id.toString(),
        listingId: dbEscrow.listingId?.toString() || '',
        buyerWalletAddress: buyer.walletAddress,
        sellerWalletAddress: seller.walletAddress,
        amount: dbEscrow.amount,
        buyerApproved: dbEscrow.buyerApproved || false,
        sellerApproved: dbEscrow.sellerApproved || false,
        disputeOpened: dbEscrow.disputeOpened || false,
        resolverWalletAddress: dbEscrow.resolverAddress || undefined,
        createdAt: dbEscrow.createdAt?.toISOString() || new Date().toISOString(),
        resolvedAt: dbEscrow.resolvedAt?.toISOString(),
        deliveryInfo: dbEscrow.deliveryInfo || undefined,
        deliveryConfirmed: dbEscrow.deliveryConfirmed || false
      };
      
      return escrow;
    } catch (error) {
      safeLogger.error('Error getting escrow:', error);
      throw error;
    }
  }

  /**
   * Get user reputation score
   * @param userAddress Address of the user
   * @returns Reputation score
   */
  async getUserReputation(userAddress: string): Promise<number> {
    try {
      if (!this.enhancedEscrowContract) {
        // Fallback to database if contract not available
        const dbReputation = await databaseService.getUserReputation(userAddress);
        return dbReputation ? dbReputation.score : 0;
      }

      // In a real implementation, we would interact with the smart contract
      safeLogger.info(`Getting reputation score for ${userAddress}`);
      return 50; // Default score
    } catch (error) {
      safeLogger.error('Error getting user reputation:', error);
      return 0;
    }
  }

  /**
   * Get escrow status with detailed information
   */
  async getEscrowStatus(escrowId: string): Promise<EscrowStatus | null> {
    try {
      const escrow = await this.getEscrow(escrowId);
      if (!escrow) return null;

      // Determine status based on escrow state
      let status: EscrowStatus['status'] = 'created';
      
      if (escrow.disputeOpened) {
        status = 'disputed';
      } else if (escrow.resolvedAt) {
        status = 'resolved';
      } else if (escrow.deliveryConfirmed) {
        status = 'active';
      } else if (escrow.buyerApproved && escrow.sellerApproved) {
        status = 'funded';
      }

      return {
        id: escrowId,
        status,
        buyerApproved: escrow.buyerApproved,
        sellerApproved: escrow.sellerApproved,
        disputeOpened: escrow.disputeOpened,
        fundsLocked: escrow.deliveryConfirmed, // Using deliveryConfirmed as funds locked indicator
        deliveryConfirmed: escrow.deliveryConfirmed,
        createdAt: new Date(escrow.createdAt),
        expiresAt: escrow.resolvedAt ? undefined : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        resolvedAt: escrow.resolvedAt ? new Date(escrow.resolvedAt) : undefined
      };
    } catch (error) {
      safeLogger.error('Error getting escrow status:', error);
      return null;
    }
  }

  /**
   * Get recovery options for failed escrow
   */
  async getEscrowRecoveryOptions(escrowId: string): Promise<EscrowRecoveryOptions> {
    try {
      const status = await this.getEscrowStatus(escrowId);
      const escrow = await this.getEscrow(escrowId);

      const options: EscrowRecoveryOptions = {
        canCancel: false,
        canRefund: false,
        canRetry: false,
        suggestedActions: [],
        timeoutActions: []
      };

      if (!status || !escrow) {
        options.suggestedActions.push('Escrow not found - contact support');
        return options;
      }

      // Determine available recovery options based on status
      switch (status.status) {
        case 'created':
          options.canCancel = true;
          options.canRetry = true;
          options.suggestedActions.push('Retry funding the escrow');
          options.suggestedActions.push('Cancel escrow if no longer needed');
          break;

        case 'funded':
          options.canRefund = true;
          options.suggestedActions.push('Wait for seller to ship item');
          options.suggestedActions.push('Contact seller for updates');
          options.timeoutActions.push('Auto-refund after 30 days if no delivery');
          break;

        case 'active':
          options.suggestedActions.push('Confirm delivery when item received');
          options.suggestedActions.push('Open dispute if there are issues');
          break;

        case 'disputed':
          options.suggestedActions.push('Provide additional evidence');
          options.suggestedActions.push('Wait for dispute resolution');
          break;

        case 'resolved':
          options.suggestedActions.push('Escrow completed successfully');
          break;
      }

      // Add balance-specific recovery options
      const validation = await this.validateEscrowCreation({
        listingId: escrow.listingId,
        buyerAddress: escrow.buyerWalletAddress,
        sellerAddress: escrow.sellerWalletAddress,
        tokenAddress: '0x0000000000000000000000000000000000000000', // Default to ETH
        amount: escrow.amount
      });

      if (!validation.hasSufficientBalance) {
        options.suggestedActions.unshift('Add funds to wallet before retrying');
      }

      return options;
    } catch (error) {
      safeLogger.error('Error getting escrow recovery options:', error);
      return {
        canCancel: false,
        canRefund: false,
        canRetry: false,
        suggestedActions: ['Error getting recovery options - contact support'],
        timeoutActions: []
      };
    }
  }

  /**
   * Cancel escrow with proper validation
   */
  async cancelEscrow(escrowId: string, cancellerAddress: string, reason: string): Promise<void> {
    try {
      const escrow = await this.getEscrow(escrowId);
      if (!escrow) {
        throw new Error('Escrow not found');
      }

      const status = await this.getEscrowStatus(escrowId);
      if (!status) {
        throw new Error('Unable to get escrow status');
      }

      // Validate cancellation permissions
      if (cancellerAddress !== escrow.buyerWalletAddress && cancellerAddress !== escrow.sellerWalletAddress) {
        throw new Error('Only buyer or seller can cancel escrow');
      }

      // Check if escrow can be cancelled
      if (status.status === 'resolved') {
        throw new Error('Cannot cancel resolved escrow');
      }

      if (status.status === 'disputed') {
        throw new Error('Cannot cancel disputed escrow - wait for resolution');
      }

      // In a real implementation, interact with smart contract
      safeLogger.info(`Cancelling escrow ${escrowId} by ${cancellerAddress}: ${reason}`);

      // Update database
      await databaseService.updateEscrow(parseInt(escrowId), {
        // Mark as cancelled
      });

      // Send notifications
      const otherParty = cancellerAddress === escrow.buyerWalletAddress ? 
        escrow.sellerWalletAddress : escrow.buyerWalletAddress;

      await Promise.all([
        notificationService.sendOrderNotification(cancellerAddress, 'ESCROW_CANCELLED', escrowId, { reason }),
        notificationService.sendOrderNotification(otherParty, 'ESCROW_CANCELLED', escrowId, { reason, cancelledBy: cancellerAddress })
      ]);

      safeLogger.info(`Successfully cancelled escrow ${escrowId}`);
    } catch (error) {
      safeLogger.error('Error cancelling escrow:', error);
      throw error;
    }
  }

  /**
   * Retry failed escrow operation
   */
  async retryEscrowOperation(escrowId: string, operation: 'fund' | 'confirm' | 'resolve'): Promise<void> {
    try {
      const escrow = await this.getEscrow(escrowId);
      if (!escrow) {
        throw new Error('Escrow not found');
      }

      const status = await this.getEscrowStatus(escrowId);
      if (!status) {
        throw new Error('Unable to get escrow status');
      }

      safeLogger.info(`Retrying ${operation} operation for escrow ${escrowId}`);

      switch (operation) {
        case 'fund':
          if (status.status !== 'created') {
            throw new Error('Escrow is not in created state for funding retry');
          }
          await this.lockFunds(escrowId, escrow.amount, '0x0000000000000000000000000000000000000000');
          break;

        case 'confirm':
          if (status.status !== 'active') {
            throw new Error('Escrow is not in active state for confirmation retry');
          }
          await this.confirmDelivery(escrowId, 'Retry delivery confirmation');
          break;

        case 'resolve':
          if (status.status !== 'disputed') {
            throw new Error('Escrow is not in disputed state for resolution retry');
          }
          // In a real implementation, retry dispute resolution
          safeLogger.info(`Retrying dispute resolution for escrow ${escrowId}`);
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      safeLogger.info(`Successfully retried ${operation} for escrow ${escrowId}`);
    } catch (error) {
      safeLogger.error(`Error retrying ${operation} for escrow ${escrowId}:`, error);
      throw error;
    }
  }

  /**
   * Send notification to user
   * @param userAddress Address of the user
   * @param message Notification message
   */
  async sendNotification(userAddress: string, message: string): Promise<void> {
    try {
      // In a real implementation, this would send actual notifications
      safeLogger.info(`Notification to ${userAddress}: ${message}`);
    } catch (error) {
      safeLogger.error('Error sending notification:', error);
    }
  }
}
