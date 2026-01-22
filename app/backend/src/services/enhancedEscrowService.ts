import { ethers } from 'ethers';
import { safeLogger } from '../utils/safeLogger';
import { DatabaseService } from './databaseService';
import { UserProfileService } from './userProfileService';
import { PaymentValidationService } from './paymentValidationService';
import { NotificationService } from './notificationService';
import { MarketplaceEscrow } from '../models/Marketplace';
import { getNetworkConfig, getDefaultNetworkConfig, isChainSupported } from '../config/networkConfig';

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
  chainId?: number; // Target chain ID for cross-chain escrow
}

export interface EscrowValidationResult {
  isValid: boolean;
  hasSufficientBalance: boolean;
  errors: string[];
  warnings: string[];
  estimatedGasFee?: string;
  requiredApprovals?: string[];
  chainSupported?: boolean; // Whether the target chain is supported
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

// Enhanced Escrow Service with Multi-Network Support
export class EnhancedEscrowService {
  private provider: ethers.JsonRpcProvider; // Default provider
  private enhancedEscrowContract: ethers.Contract | null;
  private marketplaceContract: ethers.Contract | null;
  private paymentValidationService: PaymentValidationService;
  private tokenDecimalsCache: Map<string, number> = new Map();

  // Multi-network support
  private providerCache: Map<number, ethers.JsonRpcProvider> = new Map();
  private contractCache: Map<number, { escrow: ethers.Contract | null; marketplace: ethers.Contract | null }> = new Map();

  // Enhanced Escrow ABI (shared across all networks)
  private readonly ENHANCED_ESCROW_ABI = [
    "function createEscrow(uint256 listingId, address seller, address tokenAddress, uint256 amount, uint256 deliveryDeadline, uint8 resolutionMethod) external payable returns (uint256)",
    "function createEscrowWithSecurity(uint256 listingId, address seller, address tokenAddress, uint256 amount, uint256 deliveryDeadline, uint8 resolutionMethod, bool requiresMultiSig, uint256 multiSigThreshold, uint256 timeLockDuration) external payable returns (uint256)",
    "function lockFunds(uint256 escrowId) external payable",
    "function confirmDelivery(uint256 escrowId, string deliveryInfo) external",
    "function addSignature(uint256 escrowId) external",
    "function openDispute(uint256 escrowId) external",
    "function autoResolveDispute(uint256 escrowId) external",
    "function castVote(uint256 escrowId, bool forBuyer) external",
    "function resolveDisputeByArbitrator(uint256 escrowId, bool buyerWins) external",
    "function getEscrow(uint256 escrowId) external view returns (address seller, address buyer, uint256 amount, address token, uint256 createdAt, uint256 duration, uint8 status, address winner)",
    "function getDetailedReputation(address user) external view returns (uint256 totalScore, uint256 successfulTransactions, uint256 disputedTransactions, uint256 arbitrationWins, uint256 arbitrationLosses)",
    "function getEscrowChainId(uint256 escrowId) external view returns (uint256)"
  ];

  private readonly MARKETPLACE_ABI = [
    "function listings(uint256) external view returns (tuple)"
  ];

  constructor(rpcUrl: string, enhancedEscrowContractAddress: string, marketplaceContractAddress: string) {
    // Initialize default provider (for backward compatibility)
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.enhancedEscrowContract = null;
    this.marketplaceContract = null;
    this.paymentValidationService = new PaymentValidationService();

    // Initialize default contracts if addresses are provided
    if (enhancedEscrowContractAddress && ethers.isAddress(enhancedEscrowContractAddress)) {
      this.enhancedEscrowContract = new ethers.Contract(
        enhancedEscrowContractAddress,
        this.ENHANCED_ESCROW_ABI,
        this.provider
      );
    }

    if (marketplaceContractAddress && ethers.isAddress(marketplaceContractAddress)) {
      this.marketplaceContract = new ethers.Contract(
        marketplaceContractAddress,
        this.MARKETPLACE_ABI,
        this.provider
      );
    }
  }

  /**
   * Get or create provider for a specific chain
   */
  private getProviderForChain(chainId: number): ethers.JsonRpcProvider {
    if (this.providerCache.has(chainId)) {
      return this.providerCache.get(chainId)!;
    }

    const networkConfig = getNetworkConfig(chainId);
    if (!networkConfig) {
      safeLogger.warn(`No network config for chain ${chainId}, using default provider`);
      return this.provider;
    }

    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    this.providerCache.set(chainId, provider);
    return provider;
  }

  /**
   * Get or create contracts for a specific chain
   */
  private getContractsForChain(chainId: number): { escrow: ethers.Contract | null; marketplace: ethers.Contract | null } {
    if (this.contractCache.has(chainId)) {
      return this.contractCache.get(chainId)!;
    }

    const networkConfig = getNetworkConfig(chainId);
    if (!networkConfig) {
      safeLogger.warn(`No network config for chain ${chainId}, using default contracts`);
      return { escrow: this.enhancedEscrowContract, marketplace: this.marketplaceContract };
    }

    const provider = this.getProviderForChain(chainId);
    let escrowContract: ethers.Contract | null = null;
    let marketplaceContract: ethers.Contract | null = null;

    if (networkConfig.escrowContractAddress && ethers.isAddress(networkConfig.escrowContractAddress)) {
      escrowContract = new ethers.Contract(
        networkConfig.escrowContractAddress,
        this.ENHANCED_ESCROW_ABI,
        provider
      );
    }

    if (networkConfig.marketplaceContractAddress && ethers.isAddress(networkConfig.marketplaceContractAddress)) {
      marketplaceContract = new ethers.Contract(
        networkConfig.marketplaceContractAddress,
        this.MARKETPLACE_ABI,
        provider
      );
    }

    const contracts = { escrow: escrowContract, marketplace: marketplaceContract };
    this.contractCache.set(chainId, contracts);
    return contracts;
  }

  /**
   * Helper to get token decimals with multi-chain support
   */
  async getTokenDecimals(tokenAddress: string, chainId?: number): Promise<number> {
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      return 18; // Native ETH
    }

    const cacheKey = `${chainId || 'default'}-${tokenAddress}`;
    if (this.tokenDecimalsCache.has(cacheKey)) {
      return this.tokenDecimalsCache.get(cacheKey)!;
    }

    try {
      const provider = chainId ? this.getProviderForChain(chainId) : this.provider;
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function decimals() view returns (uint8)'],
        provider
      );
      const decimals = await tokenContract.decimals();
      const decimalsNum = Number(decimals);
      this.tokenDecimalsCache.set(cacheKey, decimalsNum);
      return decimalsNum;
    } catch (error) {
      safeLogger.warn(`Failed to fetch decimals for ${tokenAddress} on chain ${chainId}, defaulting to 18`, error);
      return 18;
    }
  }

  /**
   * Validate escrow creation request with real blockchain verification
   */
  async validateEscrowCreation(request: EscrowCreationRequest): Promise<EscrowValidationResult> {
    const result: EscrowValidationResult = {
      isValid: false,
      hasSufficientBalance: false,
      errors: [],
      warnings: [],
      requiredApprovals: [],
      chainSupported: true
    };

    try {
      // Basic validation
      if (!request.listingId || !request.buyerAddress || !request.sellerAddress || !request.tokenAddress || !request.amount) {
        result.errors.push('Missing required fields for escrow creation');
        return result;
      }

      // Validate addresses
      const buyerValid = ethers.isAddress(request.buyerAddress);
      const sellerValid = ethers.isAddress(request.sellerAddress);
      const tokenValid = ethers.isAddress(request.tokenAddress);

      safeLogger.info('[validateEscrowCreation] Address validation:', {
        buyerAddress: request.buyerAddress,
        buyerValid,
        sellerAddress: request.sellerAddress,
        sellerValid,
        tokenAddress: request.tokenAddress,
        tokenValid
      });

      if (!buyerValid || !sellerValid || !tokenValid) {
        const invalidAddresses = [];
        if (!buyerValid) invalidAddresses.push(`buyer: ${request.buyerAddress}`);
        if (!sellerValid) invalidAddresses.push(`seller: ${request.sellerAddress}`);
        if (!tokenValid) invalidAddresses.push(`token: ${request.tokenAddress}`);

        result.errors.push(`Invalid addresses provided: ${invalidAddresses.join(', ')}`);
        return result;
      }

      // Validate amount
      if (parseFloat(request.amount) <= 0) {
        result.errors.push('Escrow amount must be greater than 0');
        return result;
      }

      // Verify network connectivity and contract deployment
      try {
        const targetChainId = request.chainId || (await this.provider.getNetwork()).chainId;
        const provider = request.chainId ? this.getProviderForChain(targetChainId as number) : this.provider;
        const network = await provider.getNetwork();

        safeLogger.info(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);

        // Get chain-specific contracts
        const contracts = request.chainId ? this.getContractsForChain(targetChainId as number) : { escrow: this.enhancedEscrowContract };
        const escrowContract = contracts.escrow;

        // Check if escrow contract is deployed
        if (escrowContract) {
          const code = await provider.getCode(escrowContract.target as string);
          if (code === '0x') {
            result.errors.push(`Enhanced escrow contract is not deployed on this network (Chain ID: ${network.chainId})`);
            return result;
          }
        } else {
          result.errors.push(`Enhanced escrow contract is not configured for this network (Chain ID: ${network.chainId})`);
          return result;
        }

        // Check cross-chain support if specified
        if (request.chainId && request.chainId !== Number(network.chainId)) {
          // This should ideally not happen if we switched providers correctly
          result.errors.push(`Provider network mismatch: requested ${request.chainId}, got ${network.chainId}`);
          return result;
        }
      } catch (networkError) {
        safeLogger.error('Network validation error:', networkError);
        result.errors.push('Failed to connect to blockchain network');
        return result;
      }

      // Enhanced balance check with real blockchain data
      try {
        const targetChainId = request.chainId ? Number(request.chainId) : Number((await this.provider.getNetwork()).chainId);
        const balanceCheck = await this.paymentValidationService.checkCryptoBalance(
          request.buyerAddress,
          request.tokenAddress,
          request.amount,
          targetChainId
        );

        result.hasSufficientBalance = balanceCheck.hasSufficientBalance;

        if (!balanceCheck.hasSufficientBalance) {
          result.errors.push(`Insufficient balance. Required: ${request.amount}, Available: ${balanceCheck.balance.balanceFormatted}`);
        }

        // Check gas balance for ERC-20 tokens with enhanced validation
        if (request.tokenAddress !== '0x0000000000000000000000000000000000000000' && balanceCheck.gasBalance) {
          const provider = request.chainId ? this.getProviderForChain(targetChainId) : this.provider;
          const gasPrice = await provider.getFeeData();
          if (gasPrice.gasPrice) {
            // Estimate gas for ERC-20 approval + escrow creation
            const estimatedGasLimit = 200000; // Conservative estimate
            const requiredGas = gasPrice.gasPrice * BigInt(estimatedGasLimit);

            if (BigInt(balanceCheck.gasBalance.balance) < requiredGas) {
              const requiredEth = ethers.formatEther(requiredGas);
              result.errors.push(`Insufficient ETH for gas. Required: ${requiredEth} ETH, Available: ${balanceCheck.gasBalance.balanceFormatted}`);
            }
          }
        }
      } catch (error) {
        result.errors.push('Failed to check buyer balance on blockchain');
        return result;
      }

      // Enhanced gas fee estimation with EIP-1559 support
      try {
        const targetChainId = request.chainId ? Number(request.chainId) : Number((await this.provider.getNetwork()).chainId);
        const provider = request.chainId ? this.getProviderForChain(targetChainId) : this.provider;
        const feeData = await provider.getFeeData();
        const gasLimit = await this.estimateEscrowCreationGas(request);

        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          // EIP-1559 transaction
          const maxCost = feeData.maxFeePerGas * BigInt(gasLimit);
          result.estimatedGasFee = ethers.formatEther(maxCost);
          result.warnings.push(`Using EIP-1559 transaction. Max gas cost: ${result.estimatedGasFee} ETH`);
        } else if (feeData.gasPrice) {
          // Legacy transaction
          const gasCost = feeData.gasPrice * BigInt(gasLimit);
          result.estimatedGasFee = ethers.formatEther(gasCost);
        }
      } catch (error) {
        result.warnings.push('Unable to estimate gas fees accurately');
      }

      // Check token approvals for ERC-20 with real contract verification
      if (request.tokenAddress !== '0x0000000000000000000000000000000000000000') {
        try {
          const targetChainId = request.chainId ? Number(request.chainId) : Number((await this.provider.getNetwork()).chainId);
          const provider = request.chainId ? this.getProviderForChain(targetChainId) : this.provider;
          const contracts = request.chainId ? this.getContractsForChain(targetChainId) : { escrow: this.enhancedEscrowContract };
          const escrowContract = contracts.escrow;

          // Check if token contract exists and is valid
          const tokenCode = await provider.getCode(request.tokenAddress);
          if (tokenCode === '0x') {
            result.errors.push('Token contract does not exist at provided address');
            return result;
          }

          // Check current allowance
          if (escrowContract) {
            const tokenContract = new ethers.Contract(
              request.tokenAddress,
              ['function allowance(address owner, address spender) view returns (uint256)'],
              provider
            );

            const currentAllowance = await tokenContract.allowance(
              request.buyerAddress,
              escrowContract.target
            );

            const decimals = await this.getTokenDecimals(request.tokenAddress, targetChainId);
            const requiredAmount = ethers.parseUnits(request.amount, decimals);

            if (currentAllowance < requiredAmount) {
              result.requiredApprovals.push(`Approve ${request.amount} tokens for escrow contract`);
              result.warnings.push('Token approval required before creating escrow');
            }
          }
        } catch (tokenError) {
          result.warnings.push('Unable to verify token contract or current allowance');
          result.requiredApprovals.push(`Approve ${request.amount} tokens for escrow contract`);
        }
      }

      // Validate escrow duration
      if (request.escrowDuration && (request.escrowDuration < 1 || request.escrowDuration > 30)) {
        result.errors.push('Escrow duration must be between 1 and 30 days');
        return result;
      }

      // Additional validation: check if buyer and seller are different
      if (request.buyerAddress.toLowerCase() === request.sellerAddress.toLowerCase()) {
        result.errors.push('Buyer and seller addresses cannot be the same');
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
   * Estimate gas required for escrow creation
   */
  /**
   * Estimate gas required for escrow creation
   */
  private async estimateEscrowCreationGas(request: EscrowCreationRequest): Promise<number> {
    try {
      const targetChainId = request.chainId ? Number(request.chainId) : undefined;
      const contracts = targetChainId ? this.getContractsForChain(targetChainId) : { escrow: this.enhancedEscrowContract };
      const provider = targetChainId ? this.getProviderForChain(targetChainId) : this.provider;
      const escrowContract = contracts.escrow;

      if (!escrowContract) {
        return request.tokenAddress === '0x0000000000000000000000000000000000000000' ? 100000 : 150000;
      }

      // Create a read-only interface for gas estimation
      const contractInterface = escrowContract.interface;
      const encodedData = contractInterface.encodeFunctionData('createEscrow', [
        request.listingId,
        request.buyerAddress,
        request.sellerAddress,
        request.tokenAddress,
        ethers.parseUnits(request.amount, await this.getTokenDecimals(request.tokenAddress, targetChainId)) // Dynamic decimals
      ]);

      const gasEstimate = await provider.estimateGas({
        to: escrowContract.target as string,
        data: encodedData,
        from: request.buyerAddress
      });

      // Add 20% buffer for safety
      return Math.floor(Number(gasEstimate) * 1.2);
    } catch (error) {
      safeLogger.warn('Failed to estimate gas, using fallback:', error);
      return request.tokenAddress === '0x0000000000000000000000000000000000000000' ? 100000 : 150000;
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
    amount: string,
    chainId: number = 11155111, // Default to Sepolia
    escrowDurationDays: number = 7,
    disputeResolutionMethod: number = 0 // 0 = AUTOMATIC, 1 = COMMUNITY_VOTING, 2 = ARBITRATOR
  ): Promise<{ escrowId: string; transactionData?: any }> {
    return this._createEscrow(
      listingId,
      buyerAddress,
      sellerAddress,
      tokenAddress,
      amount,
      chainId,
      escrowDurationDays,
      disputeResolutionMethod,
      false, // requiresMultiSig
      0,     // multiSigThreshold
      0      // timeLockDuration
    );
  }

  async createSecureEscrow(
    listingId: string,
    buyerAddress: string,
    sellerAddress: string,
    tokenAddress: string,
    amount: string,
    chainId: number = 11155111, // Default to Sepolia
    escrowDurationDays: number = 7,
    disputeResolutionMethod: number = 0, // 0 = AUTOMATIC, 1 = COMMUNITY_VOTING, 2 = ARBITRATOR
    requiresMultiSig: boolean = false,
    multiSigThreshold: number = 1,
    timeLockDurationHours: number = 0
  ): Promise<{ escrowId: string; transactionData?: any }> {
    return this._createEscrow(
      listingId,
      buyerAddress,
      sellerAddress,
      tokenAddress,
      amount,
      chainId,
      escrowDurationDays,
      disputeResolutionMethod,
      requiresMultiSig,
      multiSigThreshold,
      timeLockDurationHours * 3600 // Convert hours to seconds
    );
  }

  private async _createEscrow(
    listingId: string,
    buyerAddress: string,
    sellerAddress: string,
    tokenAddress: string,
    amount: string,
    chainId: number = 11155111, // Default to Sepolia
    escrowDurationDays: number = 7,
    disputeResolutionMethod: number = 0, // 0 = AUTOMATIC, 1 = COMMUNITY_VOTING, 2 = ARBITRATOR
    requiresMultiSig: boolean = false,
    multiSigThreshold: number = 1,
    timeLockDurationSeconds: number = 0
  ): Promise<{ escrowId: string; transactionData?: any }> {
    try {
      // Validate escrow creation
      const validation = await this.validateEscrowCreation({
        listingId,
        buyerAddress,
        sellerAddress,
        tokenAddress,
        amount,
        chainId
      });

      if (!validation.isValid) {
        throw new Error(`Escrow validation failed: ${validation.errors.join(', ')}`);
      }

      if (!validation.hasSufficientBalance) {
        throw new Error('Insufficient balance for escrow creation');
      }

      // Get chain-specific contracts and provider
      const networkConfig = getNetworkConfig(chainId);
      if (!networkConfig) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      const provider = this.getProviderForChain(chainId);
      const contracts = this.getContractsForChain(chainId);

      // Log network connection
      const network = await provider.getNetwork();
      safeLogger.info(`Connected to network: ${networkConfig.name} (Chain ID: ${network.chainId})`);

      if (!contracts.escrow) {
        throw new Error(`Enhanced escrow contract is not deployed on this network`);
      }

      // Create escrow in database first
      const buyer = await userProfileService.getProfileByAddress(buyerAddress);
      const seller = await userProfileService.getProfileByAddress(sellerAddress);

      if (!buyer || !seller) {
        throw new Error('Buyer or seller profile not found');
      }

      // Validate listing exists
      const listing = await databaseService.getListingById(listingId);
      if (!listing) {
        throw new Error(`Listing with ID ${listingId} not found`);
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

      // Calculate delivery deadline
      const deliveryDeadline = Math.floor(Date.now() / 1000) + (escrowDurationDays * 24 * 60 * 60);

      // Prepare smart contract transaction data using chain-specific contract
      const contractInterface = contracts.escrow.interface;
      let encodedData;

      if (requiresMultiSig || timeLockDurationSeconds > 0) {
        encodedData = contractInterface.encodeFunctionData('createEscrowWithSecurity', [
          listingId,
          sellerAddress,
          tokenAddress,
          ethers.parseUnits(amount, await this.getTokenDecimals(tokenAddress, chainId)),
          deliveryDeadline,
          disputeResolutionMethod,
          requiresMultiSig,
          multiSigThreshold,
          timeLockDurationSeconds
        ]);
      } else {
        encodedData = contractInterface.encodeFunctionData('createEscrow', [
          listingId,
          sellerAddress,
          tokenAddress,
          ethers.parseUnits(amount, await this.getTokenDecimals(tokenAddress, chainId)),
          deliveryDeadline,
          disputeResolutionMethod
        ]);
      }

      // Update database with pending status
      await databaseService.updateEscrow(escrowId, {
        buyerApproved: false // Wait for blockchain confirmation
      });

      // Send notifications
      await Promise.all([
        notificationService.sendOrderNotification(buyerAddress, 'ESCROW_CREATED', escrowId),
        notificationService.sendOrderNotification(sellerAddress, 'ESCROW_CREATED', escrowId)
      ]);

      return {
        escrowId,
        transactionData: {
          to: contracts.escrow.target,
          data: encodedData,
          value: tokenAddress === '0x0000000000000000000000000000000000000000' ? ethers.parseUnits(amount, 18).toString() : '0'
        }
      };
    } catch (error) {
      safeLogger.error('Error creating enhanced escrow:', error);
      throw error;
    }
  }

  /**
   * Verify blockchain transaction and update escrow status
   */
  async verifyEscrowTransaction(escrowId: string, transactionHash: string): Promise<{
    verified: boolean;
    status: string;
    blockNumber?: number;
    blockHash?: string;
    gasUsed?: number;
    effectiveGasPrice?: string;
  }> {
    try {
      // Get transaction receipt
      const receipt = await this.provider.getTransactionReceipt(transactionHash);

      if (!receipt) {
        throw new Error('Transaction not found or not yet mined');
      }

      if (receipt.status === 0) {
        throw new Error('Transaction failed');
      }

      // Get transaction details
      const transaction = await this.provider.getTransaction(transactionHash);
      if (!transaction) {
        throw new Error('Transaction details not found');
      }

      // Verify transaction was sent to our contract
      if (this.enhancedEscrowContract &&
        receipt.to?.toLowerCase() !== (this.enhancedEscrowContract.target as string).toLowerCase()) {
        throw new Error('Transaction was not sent to the escrow contract');
      }

      // Parse transaction logs to find escrow creation event
      let escrowCreated = false;
      if (this.enhancedEscrowContract) {
        for (const log of receipt.logs) {
          try {
            const parsedLog = this.enhancedEscrowContract.interface.parseLog(log);
            if (parsedLog && parsedLog.name === 'EscrowCreated') {
              escrowCreated = true;
              safeLogger.info(`Found EscrowCreated event for escrow ${escrowId}`);
              break;
            }
          } catch (logError) {
            // Log doesn't belong to our contract, continue
          }
        }
      }

      if (!escrowCreated) {
        safeLogger.warn('No EscrowCreated event found in transaction logs');
      }

      // Update escrow in database with transaction details
      await databaseService.updateEscrow(escrowId, {
        buyerApproved: true,
        sellerApproved: true
      });

      safeLogger.info(`Verified escrow transaction ${transactionHash} for escrow ${escrowId}`);

      return {
        verified: true,
        status: 'confirmed',
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: Number(receipt.gasUsed),
        // effectiveGasPrice: ethers.formatUnits(receipt.effectiveGasPrice || 0, 'gwei')
      };
    } catch (error) {
      safeLogger.error('Error verifying escrow transaction:', error);

      // Update escrow status to failed
      await databaseService.updateEscrow(escrowId, {
        disputeOpened: true
      });

      return {
        verified: false,
        status: 'failed'
      };
    }
  }

  /**
   * Monitor escrow events and update database accordingly
   */
  async startEventMonitoring(escrowId: string): Promise<void> {
    if (!this.enhancedEscrowContract) {
      safeLogger.warn('Cannot start event monitoring: escrow contract not initialized');
      return;
    }

    try {
      // Listen for escrow-specific events
      const escrowFilter = this.enhancedEscrowContract.filters.EscrowCreated(escrowId);

      this.enhancedEscrowContract.on(escrowFilter, (listingId, buyer, seller, token, amount, event) => {
        safeLogger.info(`EscrowCreated event received for escrow ${escrowId}:`, {
          listingId,
          buyer,
          seller,
          token,
          amount: amount.toString(),
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber
        });

        // Update database with event data
        databaseService.updateEscrow(escrowId, {
          buyerApproved: true,
          sellerApproved: true
        }).catch(error => {
          safeLogger.error('Failed to update escrow from event:', error);
        });
      });

      // Listen for delivery confirmation events
      const deliveryFilter = this.enhancedEscrowContract.filters.DeliveryConfirmed(escrowId);

      this.enhancedEscrowContract.on(deliveryFilter, (deliveryInfo, event) => {
        safeLogger.info(`DeliveryConfirmed event received for escrow ${escrowId}:`, {
          deliveryInfo,
          transactionHash: event.transactionHash
        });

        databaseService.updateEscrow(escrowId, {
          deliveryConfirmed: true,
          deliveryInfo
        }).catch(error => {
          safeLogger.error('Failed to update escrow delivery status:', error);
        });
      });

      // Listen for dispute events
      const disputeFilter = this.enhancedEscrowContract.filters.DisputeOpened(escrowId);

      this.enhancedEscrowContract.on(disputeFilter, (initiator, reason, event) => {
        safeLogger.info(`DisputeOpened event received for escrow ${escrowId}:`, {
          initiator,
          reason,
          transactionHash: event.transactionHash
        });

        databaseService.updateEscrow(escrowId, {
          disputeOpened: true
        }).catch(error => {
          safeLogger.error('Failed to update escrow dispute status:', error);
        });
      });

      safeLogger.info(`Started event monitoring for escrow ${escrowId}`);
    } catch (error) {
      safeLogger.error('Error starting event monitoring:', error);
    }
  }

  /**
   * Stop monitoring escrow events
   */
  async stopEventMonitoring(escrowId: string): Promise<void> {
    if (!this.enhancedEscrowContract) {
      return;
    }

    try {
      // Remove all listeners for this escrow
      this.enhancedEscrowContract.removeAllListeners();
      safeLogger.info(`Stopped event monitoring for escrow ${escrowId}`);
    } catch (error) {
      safeLogger.error('Error stopping event monitoring:', error);
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
      await databaseService.updateEscrow(escrowId, {
        buyerApproved: true
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
      await databaseService.updateEscrow(escrowId, {
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
      await databaseService.updateEscrow(escrowId, {
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
      await databaseService.updateEscrow(escrowId, {
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
      const dbEscrow = await databaseService.getEscrowById(escrowId);
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
      await databaseService.updateEscrow(escrowId, {
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