import { 
  PurchaseRequest, 
  PurchaseResult, 
  EarnRequest, 
  EarnResult, 
  PriceQuote, 
  PaymentMethod,
  SwapResult,
  BridgeResult,
  PurchaseTransaction,
  EarningActivity,
  StakingPosition
} from '../types/ldaoAcquisition';
import { LDAOAcquisitionConfigManager } from '../config/ldaoAcquisitionConfig';
import { LDAOReceiptService } from './ldaoReceiptService';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { purchaseTransactions, earningActivities } from '../db/schema';
import { eq, desc, and, gte, lt } from 'drizzle-orm';
import { subDays } from 'date-fns';
import { sanitizeString, sanitizeNumber, sanitizeWalletAddress } from '../utils/inputSanitization';

export interface IPaymentProcessor {
  processPayment(request: PurchaseRequest): Promise<PurchaseResult>;
  getSupportedMethods(): PaymentMethod[];
}

export interface IDEXIntegration {
  getQuote(fromToken: string, toToken: string, amount: number): Promise<PriceQuote>;
  executeSwap(fromToken: string, toToken: string, amount: number, userAddress: string): Promise<SwapResult>;
}

export interface IBridgeService {
  bridgeTokens(fromChain: string, toChain: string, amount: number, userAddress: string): Promise<BridgeResult>;
  getSupportedChains(): string[];
}

export interface IEarningEngine {
  calculateRewards(request: EarnRequest): Promise<number>;
  distributeRewards(request: EarnRequest): Promise<EarnResult>;
}

export interface IStakingService {
  stake(userId: string, amount: number, lockPeriod: number): Promise<StakingPosition>;
  unstake(positionId: string): Promise<boolean>;
  getStakingPositions(userId: string): Promise<StakingPosition[]>;
}

export interface IPricingEngine {
  getCurrentPrice(): Promise<number>;
  getQuote(amount: number, paymentToken: string): Promise<PriceQuote>;
  applyVolumeDiscount(amount: number): number;
}

export class LDAOAcquisitionService {
  private configManager: LDAOAcquisitionConfigManager;
  private paymentProcessor?: IPaymentProcessor;
  private dexIntegration?: IDEXIntegration;
  private bridgeService?: IBridgeService;
  private earningEngine?: IEarningEngine;
  private stakingService?: IStakingService;
  private pricingEngine?: IPricingEngine;
  private receiptService: LDAOReceiptService;
  private db: any;

  constructor(
    configManager: LDAOAcquisitionConfigManager,
    dependencies: {
      paymentProcessor?: IPaymentProcessor;
      dexIntegration?: IDEXIntegration;
      bridgeService?: IBridgeService;
      earningEngine?: IEarningEngine;
      stakingService?: IStakingService;
      pricingEngine?: IPricingEngine;
    } = {}
  ) {
    this.configManager = configManager;
    this.paymentProcessor = dependencies.paymentProcessor;
    this.dexIntegration = dependencies.dexIntegration;
    this.bridgeService = dependencies.bridgeService;
    this.earningEngine = dependencies.earningEngine;
    this.stakingService = dependencies.stakingService;
    this.pricingEngine = dependencies.pricingEngine;
    this.receiptService = new LDAOReceiptService();
    this.db = db; // Initialize database connection
  }

  // Dependency injection setters
  public setPaymentProcessor(processor: IPaymentProcessor): void {
    this.paymentProcessor = processor;
  }

  public setDEXIntegration(dex: IDEXIntegration): void {
    this.dexIntegration = dex;
  }

  public setBridgeService(bridge: IBridgeService): void {
    this.bridgeService = bridge;
  }

  public setEarningEngine(engine: IEarningEngine): void {
    this.earningEngine = engine;
  }

  public setStakingService(staking: IStakingService): void {
    this.stakingService = staking;
  }

  public setPricingEngine(pricing: IPricingEngine): void {
    this.pricingEngine = pricing;
  }

  // Main acquisition methods
  public async purchaseWithFiat(request: PurchaseRequest): Promise<PurchaseResult> {
    try {
      // Validate and sanitize request
      if (!request || !request.amount || !request.userAddress) {
        return {
          success: false,
          error: 'Missing required fields: amount, userAddress',
        };
      }

      // Sanitize inputs
      const sanitizedAmount = sanitizeNumber(request.amount);
      const sanitizedUserAddress = sanitizeWalletAddress(request.userAddress);
      const sanitizedPaymentToken = request.paymentToken ? sanitizeString(request.paymentToken) : undefined;

      // Validate amount
      if (sanitizedAmount <= 0) {
        return {
          success: false,
          error: 'Amount must be greater than 0',
        };
      }

      // Check if fiat payments are enabled
      if (!this.configManager.getConfig().fiatPaymentEnabled) {
        return {
          success: false,
          error: 'Fiat payment is not enabled',
        };
      }

      if (!this.paymentProcessor) {
        return {
          success: false,
          error: 'Payment processor not configured',
        };
      }

      // Create sanitized request
      const sanitizedRequest: PurchaseRequest = {
        amount: sanitizedAmount,
        paymentMethod: 'fiat',
        paymentToken: sanitizedPaymentToken,
        userAddress: sanitizedUserAddress
      };

      const result = await this.paymentProcessor.processPayment(sanitizedRequest);
      
      // Generate receipt if purchase was successful
      if (result.success && result.transactionId) {
        try {
          const quote = await this.getPriceQuote(sanitizedAmount, 'USD');
          await this.receiptService.generateLDAOPurchaseReceipt({
            transactionId: result.transactionId,
            buyerAddress: sanitizedUserAddress,
            amount: sanitizedAmount.toString(),
            currency: 'USD',
            paymentMethod: 'fiat',
            tokensPurchased: result.estimatedTokens?.toString() || '0',
            pricePerToken: quote.pricePerToken.toString(),
            fees: {
              processing: '0.30', // Standard Stripe fee
              platform: (sanitizedAmount * 0.005).toString(), // 0.5% platform fee
              total: (0.30 + (sanitizedAmount * 0.005)).toString()
            }
          });
        } catch (receiptError) {
          safeLogger.error('Error generating LDAO purchase receipt:', receiptError);
        }
      }
      
      return result;
    } catch (error) {
      safeLogger.error('Error in purchaseWithFiat:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed',
      };
    }
  }

  public async purchaseWithCrypto(request: PurchaseRequest): Promise<PurchaseResult> {
    try {
      // Validate request
      if (!request || !request.amount || !request.userAddress) {
        return {
          success: false,
          error: 'Missing required fields: amount, userAddress',
        };
      }

      // Sanitize inputs
      const sanitizedAmount = sanitizeNumber(request.amount);
      const sanitizedUserAddress = sanitizeWalletAddress(request.userAddress);
      const sanitizedPaymentToken = request.paymentToken ? sanitizeString(request.paymentToken) : 'ETH';

      // Validate amount
      if (sanitizedAmount <= 0) {
        return {
          success: false,
          error: 'Amount must be greater than 0',
        };
      }

      if (!this.pricingEngine) {
        return {
          success: false,
          error: 'Pricing engine not configured',
        };
      }

      const quote = await this.pricingEngine.getQuote(sanitizedAmount, sanitizedPaymentToken);
      
      // Here we would interact with the treasury contract
      // For now, return a mock successful result
      const result: PurchaseResult = {
        success: true,
        transactionId: `tx_${Date.now()}`,
        estimatedTokens: sanitizedAmount,
        finalPrice: quote.totalPrice,
      };
      
      // Generate receipt if purchase was successful
      if (result.success && result.transactionId) {
        try {
          await this.receiptService.generateLDAOPurchaseReceipt({
            transactionId: result.transactionId,
            buyerAddress: sanitizedUserAddress,
            amount: sanitizedAmount.toString(),
            currency: sanitizedPaymentToken,
            paymentMethod: 'crypto',
            transactionHash: result.txHash,
            tokensPurchased: result.estimatedTokens?.toString() || '0',
            pricePerToken: quote.pricePerToken.toString(),
            fees: {
              processing: '0', // Crypto transactions don't have processing fees
              platform: (sanitizedAmount * 0.005).toString(), // 0.5% platform fee
              gas: '0.01', // Estimated gas fee
              total: (sanitizedAmount * 0.005 + 0.01).toString()
            }
          });
        } catch (receiptError) {
          safeLogger.error('Error generating LDAO purchase receipt:', receiptError);
        }
      }
      
      return result;
    } catch (error) {
      safeLogger.error('Error in purchaseWithCrypto:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Crypto purchase failed',
      };
    }
  }

  public async swapOnDEX(fromToken: string, toToken: string, amount: number, userAddress: string): Promise<SwapResult> {
    try {
      // Validate inputs
      if (!fromToken || !toToken || !amount || !userAddress) {
        return {
          success: false,
          error: 'Missing required parameters: fromToken, toToken, amount, userAddress',
        };
      }

      // Sanitize inputs
      const sanitizedFromToken = sanitizeString(fromToken);
      const sanitizedToToken = sanitizeString(toToken);
      const sanitizedAmount = sanitizeNumber(amount);
      const sanitizedUserAddress = sanitizeWalletAddress(userAddress);

      if (sanitizedAmount <= 0) {
        return {
          success: false,
          error: 'Amount must be greater than 0',
        };
      }

      if (!this.configManager.getConfig().dexIntegrationEnabled) {
        return {
          success: false,
          error: 'DEX integration is not enabled',
        };
      }

      if (!this.dexIntegration) {
        return {
          success: false,
          error: 'DEX integration not configured',
        };
      }

      const result = await this.dexIntegration.executeSwap(sanitizedFromToken, sanitizedToToken, sanitizedAmount, sanitizedUserAddress);
      return result;
    } catch (error) {
      safeLogger.error('Error in swapOnDEX:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'DEX swap failed',
      };
    }
  }

  public async earnTokens(request: EarnRequest): Promise<EarnResult> {
    try {
      // Validate request
      if (!request || !request.userId || !request.activityType || !request.activityId) {
        return {
          success: false,
          tokensEarned: 0,
          multiplier: 0,
          error: 'Missing required fields: userId, activityType, activityId',
        };
      }

      // Sanitize inputs
      const sanitizedUserId = sanitizeString(request.userId);
      const sanitizedActivityType = sanitizeString(request.activityType);
      const sanitizedActivityId = sanitizeString(request.activityId);
      const sanitizedMetadata = request.metadata ? JSON.parse(JSON.stringify(request.metadata)) : undefined; // Basic sanitization of metadata

      const validActivityTypes = ['post', 'comment', 'referral', 'marketplace'];
      if (!validActivityTypes.includes(sanitizedActivityType)) {
        return {
          success: false,
          tokensEarned: 0,
          multiplier: 0,
          error: `Invalid activity type. Must be one of: ${validActivityTypes.join(', ')}`,
        };
      }

      if (!this.configManager.getConfig().earnToOwnEnabled) {
        return {
          success: false,
          tokensEarned: 0,
          multiplier: 0,
          error: 'Earn-to-own is not enabled',
        };
      }

      if (!this.earningEngine) {
        return {
          success: false,
          tokensEarned: 0,
          multiplier: 0,
          error: 'Earning engine not configured',
        };
      }

      // Create sanitized request
      const sanitizedRequest: EarnRequest = {
        userId: sanitizedUserId,
        activityType: sanitizedActivityType as 'post' | 'comment' | 'referral' | 'marketplace',
        activityId: sanitizedActivityId,
        metadata: sanitizedMetadata
      };

      const result = await this.earningEngine.distributeRewards(sanitizedRequest);
      return result;
    } catch (error) {
      safeLogger.error('Error in earnTokens:', error);
      return {
        success: false,
        tokensEarned: 0,
        multiplier: 0,
        error: error instanceof Error ? error.message : 'Token earning failed',
      };
    }
  }

  public async bridgeTokens(fromChain: string, toChain: string, amount: number, userAddress: string): Promise<BridgeResult> {
    try {
      // Validate inputs
      if (!fromChain || !toChain || !amount || !userAddress) {
        return {
          success: false,
          error: 'Missing required parameters: fromChain, toChain, amount, userAddress',
        };
      }

      // Sanitize inputs
      const sanitizedFromChain = sanitizeString(fromChain);
      const sanitizedToChain = sanitizeString(toChain);
      const sanitizedAmount = sanitizeNumber(amount);
      const sanitizedUserAddress = sanitizeWalletAddress(userAddress);

      if (sanitizedAmount <= 0) {
        return {
          success: false,
          error: 'Amount must be greater than 0',
        };
      }

      if (sanitizedFromChain === sanitizedToChain) {
        return {
          success: false,
          error: 'Source and destination chains cannot be the same',
        };
      }

      if (!this.configManager.getConfig().bridgeEnabled) {
        return {
          success: false,
          error: 'Bridge is not enabled',
        };
      }

      if (!this.bridgeService) {
        return {
          success: false,
          error: 'Bridge service not configured',
        };
      }

      const result = await this.bridgeService.bridgeTokens(sanitizedFromChain, sanitizedToChain, sanitizedAmount, sanitizedUserAddress);
      return result;
    } catch (error) {
      safeLogger.error('Error in bridgeTokens:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token bridging failed',
      };
    }
  }

  public async getCurrentPrice(): Promise<number> {
    if (!this.pricingEngine) {
      throw new Error('Pricing engine not configured');
    }

    return await this.pricingEngine.getCurrentPrice();
  }

  public async getPriceQuote(amount: number, paymentToken: string = 'ETH'): Promise<PriceQuote> {
    if (!this.pricingEngine) {
      throw new Error('Pricing engine not configured');
    }

    return await this.pricingEngine.getQuote(amount, paymentToken);
  }

  public getSupportedPaymentMethods(): PaymentMethod[] {
    const methods: PaymentMethod[] = [];

    // Add crypto payment methods
    const config = this.configManager.getConfig();
    for (const token of config.supportedTokens) {
      methods.push({
        type: 'crypto',
        token,
        available: true,
      });
    }

    // Add fiat payment methods if enabled
    if (config.fiatPaymentEnabled && this.paymentProcessor) {
      methods.push(...this.paymentProcessor.getSupportedMethods());
    }

    return methods;
  }

  public getSupportedNetworks(): string[] {
    return this.configManager.getConfig().supportedNetworks;
  }

  public async getTransactionHistory(userId: string, options?: { 
    limit?: number; 
    offset?: number; 
    status?: string; 
    startDate?: Date; 
    endDate?: Date;
  }): Promise<{ transactions: PurchaseTransaction[]; totalCount: number }> {
    try {
      if (!this.db) {
        safeLogger.warn('Database not available for transaction history');
        return { transactions: [], totalCount: 0 };
      }

      // Sanitize inputs
      const sanitizedUserId = sanitizeString(userId);
      const sanitizedLimit = options?.limit ? Math.min(Math.max(sanitizeNumber(options.limit), 1), 1000) : 100; // Limit between 1-1000
      const sanitizedOffset = options?.offset ? Math.max(sanitizeNumber(options.offset), 0) : 0;
      const sanitizedStatus = options?.status ? sanitizeString(options.status) : undefined;

      // Build query with optional filters
      let query = this.db.select().from(purchaseTransactions).where(eq(purchaseTransactions.userId, sanitizedUserId));

      if (sanitizedStatus) {
        query = query.where(eq(purchaseTransactions.status, sanitizedStatus));
      }

      if (options?.startDate) {
        query = query.where(gte(purchaseTransactions.createdAt, options.startDate));
      }

      if (options?.endDate) {
        query = query.where(lt(purchaseTransactions.createdAt, options.endDate));
      }

      // Get total count for pagination
      const countResult = await this.db.select({ count: purchaseTransactions.id })
        .from(purchaseTransactions)
        .where(and(
          eq(purchaseTransactions.userId, sanitizedUserId),
          sanitizedStatus ? eq(purchaseTransactions.status, sanitizedStatus) : undefined,
          options?.startDate ? gte(purchaseTransactions.createdAt, options.startDate) : undefined,
          options?.endDate ? lt(purchaseTransactions.createdAt, options.endDate) : undefined
        ).filter((condition): condition is SQL<unknown> => condition !== undefined));

      const totalCount = countResult.length > 0 ? countResult.length : 0;

      // Apply ordering and limits
      query = query.orderBy(desc(purchaseTransactions.createdAt));

      if (options?.limit !== undefined && options?.offset !== undefined) {
        query = query.limit(sanitizedLimit).offset(sanitizedOffset);
      } else {
        // Default limit to 100 if not specified
        query = query.limit(sanitizedLimit);
      }

      const transactions = await query;

      return {
        transactions: transactions.map((tx: any) => ({
          id: tx.id,
          userId: tx.userId,
          amount: parseFloat(tx.amount),
          paymentMethod: tx.paymentMethod,
          paymentToken: tx.paymentToken,
          pricePerToken: parseFloat(tx.pricePerToken),
          discountApplied: parseFloat(tx.discountApplied),
          status: tx.status,
          txHash: tx.txHash,
          createdAt: tx.createdAt,
          completedAt: tx.completedAt
        })),
        totalCount
      };
    } catch (error) {
      safeLogger.error('Error fetching transaction history:', error);
      return { transactions: [], totalCount: 0 };
    }
  }

  public async getEarningHistory(userId: string, options?: { 
    limit?: number; 
    offset?: number; 
    activityType?: string; 
    startDate?: Date; 
    endDate?: Date;
  }): Promise<{ activities: EarningActivity[]; totalCount: number }> {
    try {
      if (!this.db) {
        safeLogger.warn('Database not available for earning history');
        return { activities: [], totalCount: 0 };
      }

      // Sanitize inputs
      const sanitizedUserId = sanitizeString(userId);
      const sanitizedLimit = options?.limit ? Math.min(Math.max(sanitizeNumber(options.limit), 1), 1000) : 100; // Limit between 1-1000
      const sanitizedOffset = options?.offset ? Math.max(sanitizeNumber(options.offset), 0) : 0;
      const sanitizedActivityType = options?.activityType ? sanitizeString(options.activityType) : undefined;

      // Build query with optional filters
      let query = this.db.select().from(earningActivities).where(eq(earningActivities.userId, sanitizedUserId));

      if (sanitizedActivityType) {
        query = query.where(eq(earningActivities.activityType, sanitizedActivityType));
      }

      if (options?.startDate) {
        query = query.where(gte(earningActivities.createdAt, options.startDate));
      }

      if (options?.endDate) {
        query = query.where(lt(earningActivities.createdAt, options.endDate));
      }

      // Get total count for pagination
      const countResult = await this.db.select({ count: earningActivities.id })
        .from(earningActivities)
        .where(and(
          eq(earningActivities.userId, sanitizedUserId),
          sanitizedActivityType ? eq(earningActivities.activityType, sanitizedActivityType) : undefined,
          options?.startDate ? gte(earningActivities.createdAt, options.startDate) : undefined,
          options?.endDate ? lt(earningActivities.createdAt, options.endDate) : undefined
        ).filter((condition): condition is SQL<unknown> => condition !== undefined));

      const totalCount = countResult.length > 0 ? countResult.length : 0;

      // Apply ordering and limits
      query = query.orderBy(desc(earningActivities.createdAt));

      if (options?.limit !== undefined && options?.offset !== undefined) {
        query = query.limit(sanitizedLimit).offset(sanitizedOffset);
      } else {
        // Default limit to 100 if not specified
        query = query.limit(sanitizedLimit);
      }

      const activities = await query;

      return {
        activities: activities.map((earning: any) => ({
          id: earning.id,
          userId: earning.userId,
          activityType: earning.activityType,
          tokensEarned: parseFloat(earning.tokensEarned),
          multiplier: parseFloat(earning.multiplier),
          isPremiumBonus: earning.isPremiumBonus,
          createdAt: earning.createdAt
        })),
        totalCount
      };
    } catch (error) {
      safeLogger.error('Error fetching earning history:', error);
      return { activities: [], totalCount: 0 };
    }
  }

  public async getStakingPositions(userId: string): Promise<StakingPosition[]> {
    if (!this.stakingService) {
      return [];
    }

    return await this.stakingService.getStakingPositions(userId);
  }

  public getServiceStatus(): {
    fiatPayment: boolean;
    dexIntegration: boolean;
    earnToOwn: boolean;
    staking: boolean;
    bridge: boolean;
  } {
    const config = this.configManager.getConfig();
    return {
      fiatPayment: config.fiatPaymentEnabled && !!this.paymentProcessor,
      dexIntegration: config.dexIntegrationEnabled && !!this.dexIntegration,
      earnToOwn: config.earnToOwnEnabled && !!this.earningEngine,
      staking: config.stakingEnabled && !!this.stakingService,
      bridge: config.bridgeEnabled && !!this.bridgeService,
    };
  }
}
