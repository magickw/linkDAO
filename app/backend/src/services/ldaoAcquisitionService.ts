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

    try {
      const result = await this.paymentProcessor.processPayment(request);
      
      // Generate receipt if purchase was successful
      if (result.success && result.transactionId) {
        try {
          const quote = await this.getPriceQuote(request.amount, 'USD');
          await this.receiptService.generateLDAOPurchaseReceipt({
            transactionId: result.transactionId,
            buyerAddress: request.userAddress,
            amount: request.amount.toString(),
            currency: 'USD',
            paymentMethod: 'fiat',
            tokensPurchased: result.estimatedTokens?.toString() || '0',
            pricePerToken: quote.pricePerToken.toString(),
            fees: {
              processing: '0.30', // Standard Stripe fee
              platform: (request.amount * 0.005).toString(), // 0.5% platform fee
              total: (0.30 + (request.amount * 0.005)).toString()
            }
          });
        } catch (receiptError) {
          safeLogger.error('Error generating LDAO purchase receipt:', receiptError);
        }
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed',
      };
    }
  }

  public async purchaseWithCrypto(request: PurchaseRequest): Promise<PurchaseResult> {
    if (!this.pricingEngine) {
      return {
        success: false,
        error: 'Pricing engine not configured',
      };
    }

    try {
      const quote = await this.pricingEngine.getQuote(request.amount, request.paymentToken || 'ETH');
      
      // Here we would interact with the treasury contract
      // For now, return a mock successful result
      const result: PurchaseResult = {
        success: true,
        transactionId: `tx_${Date.now()}`,
        estimatedTokens: request.amount,
        finalPrice: quote.totalPrice,
      };
      
      // Generate receipt if purchase was successful
      if (result.success && result.transactionId) {
        try {
          await this.receiptService.generateLDAOPurchaseReceipt({
            transactionId: result.transactionId,
            buyerAddress: request.userAddress,
            amount: request.amount.toString(),
            currency: request.paymentToken || 'ETH',
            paymentMethod: 'crypto',
            transactionHash: result.txHash,
            tokensPurchased: result.estimatedTokens?.toString() || '0',
            pricePerToken: quote.pricePerToken.toString(),
            fees: {
              processing: '0', // Crypto transactions don't have processing fees
              platform: (request.amount * 0.005).toString(), // 0.5% platform fee
              gas: '0.01', // Estimated gas fee
              total: (request.amount * 0.005 + 0.01).toString()
            }
          });
        } catch (receiptError) {
          safeLogger.error('Error generating LDAO purchase receipt:', receiptError);
        }
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Crypto purchase failed',
      };
    }
  }

  public async swapOnDEX(fromToken: string, toToken: string, amount: number, userAddress: string): Promise<SwapResult> {
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

    try {
      const result = await this.dexIntegration.executeSwap(fromToken, toToken, amount, userAddress);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'DEX swap failed',
      };
    }
  }

  public async earnTokens(request: EarnRequest): Promise<EarnResult> {
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

    try {
      const result = await this.earningEngine.distributeRewards(request);
      return result;
    } catch (error) {
      return {
        success: false,
        tokensEarned: 0,
        multiplier: 0,
        error: error instanceof Error ? error.message : 'Token earning failed',
      };
    }
  }

  public async bridgeTokens(fromChain: string, toChain: string, amount: number, userAddress: string): Promise<BridgeResult> {
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

    try {
      const result = await this.bridgeService.bridgeTokens(fromChain, toChain, amount, userAddress);
      return result;
    } catch (error) {
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

  public async getTransactionHistory(userId: string): Promise<PurchaseTransaction[]> {
    // This would typically query the database
    // For now, return empty array
    return [];
  }

  public async getEarningHistory(userId: string): Promise<EarningActivity[]> {
    // This would typically query the database
    // For now, return empty array
    return [];
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
