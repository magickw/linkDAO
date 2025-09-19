import { PaymentValidationService } from './paymentValidationService';
import { EnhancedFiatPaymentService } from './enhancedFiatPaymentService';
import { EnhancedEscrowService } from './enhancedEscrowService';
import { ExchangeRateService } from './exchangeRateService';
import { DatabaseService } from './databaseService';
import { NotificationService } from './notificationService';

export interface HybridCheckoutRequest {
  orderId: string;
  listingId: string;
  buyerAddress: string;
  sellerAddress: string;
  amount: number;
  currency: string;
  preferredMethod?: 'crypto' | 'fiat' | 'auto';
  userCountry?: string;
  metadata?: any;
}

export interface PaymentPathDecision {
  selectedPath: 'crypto' | 'fiat';
  reason: string;
  method: {
    type: 'crypto' | 'fiat';
    provider?: string;
    tokenAddress?: string;
    tokenSymbol?: string;
    chainId?: number;
  };
  fees: {
    processingFee: number;
    platformFee: number;
    gasFee?: number;
    totalFees: number;
    currency: string;
  };
  estimatedTime: string;
  fallbackOptions: PaymentPathDecision[];
}

export interface HybridPaymentResult {
  orderId: string;
  paymentPath: 'crypto' | 'fiat';
  escrowType: 'smart_contract' | 'stripe_connect';
  escrowId?: string;
  stripePaymentIntentId?: string;
  stripeTransferGroup?: string;
  transactionHash?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fees: any;
  createdAt: Date;
  estimatedCompletionTime: Date;
}

export class HybridPaymentOrchestrator {
  private paymentValidationService: PaymentValidationService;
  private fiatPaymentService: EnhancedFiatPaymentService;
  private escrowService: EnhancedEscrowService;
  private exchangeRateService: ExchangeRateService;
  private databaseService: DatabaseService;
  private notificationService: NotificationService;

  constructor() {
    this.paymentValidationService = new PaymentValidationService();
    this.fiatPaymentService = new EnhancedFiatPaymentService();
    this.escrowService = new EnhancedEscrowService(
      process.env.RPC_URL || 'http://localhost:8545',
      process.env.ENHANCED_ESCROW_CONTRACT_ADDRESS || '',
      process.env.MARKETPLACE_CONTRACT_ADDRESS || ''
    );
    this.exchangeRateService = new ExchangeRateService();
    this.databaseService = new DatabaseService();
    this.notificationService = new NotificationService();
  }

  /**
   * Intelligent payment path selection based on user context
   */
  async determineOptimalPaymentPath(request: HybridCheckoutRequest): Promise<PaymentPathDecision> {
    try {
      // Check crypto balance and availability
      const cryptoValidation = await this.paymentValidationService.validatePayment({
        paymentMethod: 'crypto',
        amount: request.amount,
        currency: 'USDC', // Default to USDC for crypto
        userAddress: request.buyerAddress,
        paymentDetails: {
          tokenAddress: '0xA0b86a33E6441c8C06DD2b7c94b7E6E8b8b8b8b8', // USDC
          tokenSymbol: 'USDC',
          tokenDecimals: 6,
          chainId: 1,
          recipientAddress: request.sellerAddress
        }
      });

      // Check fiat availability
      const fiatMethods = await this.fiatPaymentService.getAvailablePaymentMethods(
        request.buyerAddress,
        request.amount,
        request.currency,
        request.userCountry
      );

      // Decision logic
      let selectedPath: 'crypto' | 'fiat' = 'fiat'; // Default to fiat for broader accessibility
      let reason = 'Fiat payment selected for broader accessibility';

      // Prefer crypto if user has sufficient balance and prefers it
      if (cryptoValidation.isValid && cryptoValidation.hasSufficientBalance) {
        if (request.preferredMethod === 'crypto' || request.preferredMethod === 'auto') {
          selectedPath = 'crypto';
          reason = 'Crypto payment selected - sufficient balance and user preference';
        }
      }

      // Force fiat if crypto not available
      if (!cryptoValidation.isValid || !cryptoValidation.hasSufficientBalance) {
        selectedPath = 'fiat';
        reason = 'Fiat payment required - insufficient crypto balance or validation failed';
      }

      // Build payment method details
      const method = selectedPath === 'crypto' ? {
        type: 'crypto' as const,
        tokenAddress: '0xA0b86a33E6441c8C06DD2b7c94b7E6E8b8b8b8b8',
        tokenSymbol: 'USDC',
        chainId: 1
      } : {
        type: 'fiat' as const,
        provider: 'stripe'
      };

      // Calculate fees
      const fees = selectedPath === 'crypto' 
        ? cryptoValidation.estimatedFees || {
            processingFee: 0,
            platformFee: request.amount * 0.005,
            gasFee: 0.01,
            totalFees: (request.amount * 0.005) + 0.01,
            currency: 'USDC'
          }
        : {
            processingFee: (request.amount * 0.029) + 0.30,
            platformFee: request.amount * 0.01,
            totalFees: (request.amount * 0.029) + 0.30 + (request.amount * 0.01),
            currency: request.currency
          };

      // Generate fallback options
      const fallbackOptions: PaymentPathDecision[] = [];
      if (selectedPath === 'crypto' && fiatMethods.availableMethods.length > 0) {
        fallbackOptions.push({
          selectedPath: 'fiat',
          reason: 'Fiat fallback if crypto payment fails',
          method: { type: 'fiat', provider: 'stripe' },
          fees: {
            processingFee: (request.amount * 0.029) + 0.30,
            platformFee: request.amount * 0.01,
            totalFees: (request.amount * 0.029) + 0.30 + (request.amount * 0.01),
            currency: request.currency
          },
          estimatedTime: 'Instant',
          fallbackOptions: []
        });
      }

      return {
        selectedPath,
        reason,
        method,
        fees,
        estimatedTime: selectedPath === 'crypto' ? '1-5 minutes' : 'Instant',
        fallbackOptions
      };
    } catch (error) {
      console.error('Error determining payment path:', error);
      
      // Default to fiat on error
      return {
        selectedPath: 'fiat',
        reason: 'Defaulting to fiat due to path determination error',
        method: { type: 'fiat', provider: 'stripe' },
        fees: {
          processingFee: (request.amount * 0.029) + 0.30,
          platformFee: request.amount * 0.01,
          totalFees: (request.amount * 0.029) + 0.30 + (request.amount * 0.01),
          currency: request.currency
        },
        estimatedTime: 'Instant',
        fallbackOptions: []
      };
    }
  }

  /**
   * Execute hybrid checkout with automatic path selection
   */
  async processHybridCheckout(request: HybridCheckoutRequest): Promise<HybridPaymentResult> {
    try {
      // Determine optimal payment path
      const pathDecision = await this.determineOptimalPaymentPath(request);

      // Create order record immediately for visibility
      const orderRecord = await this.createOrderRecord(request, pathDecision);

      let result: HybridPaymentResult;

      if (pathDecision.selectedPath === 'crypto') {
        result = await this.processCryptoEscrowPath(request, pathDecision, orderRecord);
      } else {
        result = await this.processFiatEscrowPath(request, pathDecision, orderRecord);
      }

      // Send notifications
      await this.sendCheckoutNotifications(request, result);

      return result;
    } catch (error) {
      console.error('Hybrid checkout failed:', error);
      
      // Try fallback path if available
      const pathDecision = await this.determineOptimalPaymentPath(request);
      if (pathDecision.fallbackOptions.length > 0) {
        console.log('Attempting fallback payment path...');
        return await this.processFiatEscrowPath(request, pathDecision.fallbackOptions[0], null);
      }
      
      throw error;
    }
  }

  /**
   * Process crypto escrow path (smart contract)
   */
  private async processCryptoEscrowPath(
    request: HybridCheckoutRequest,
    pathDecision: PaymentPathDecision,
    orderRecord: any
  ): Promise<HybridPaymentResult> {
    try {
      // Create smart contract escrow
      const escrowId = await this.escrowService.createEscrow(
        request.listingId,
        request.buyerAddress,
        request.sellerAddress,
        pathDecision.method.tokenAddress || '0x0000000000000000000000000000000000000000',
        request.amount.toString()
      );

      // Update order with escrow details
      await this.databaseService.updateOrder(parseInt(request.orderId), {
        escrowId: parseInt(escrowId),
        paymentMethod: 'crypto',
        status: 'pending'
      });

      return {
        orderId: request.orderId,
        paymentPath: 'crypto',
        escrowType: 'smart_contract',
        escrowId,
        status: 'pending',
        fees: pathDecision.fees,
        createdAt: new Date(),
        estimatedCompletionTime: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      };
    } catch (error) {
      console.error('Crypto escrow path failed:', error);
      throw error;
    }
  }

  /**
   * Process fiat escrow path (Stripe Connect)
   */
  private async processFiatEscrowPath(
    request: HybridCheckoutRequest,
    pathDecision: PaymentPathDecision,
    orderRecord: any
  ): Promise<HybridPaymentResult> {
    try {
      // Create Stripe Connect escrow-like structure
      const stripeResult = await this.createStripeConnectEscrow(request, pathDecision);

      // Update order with Stripe details
      if (orderRecord) {
        await this.databaseService.updateOrder(parseInt(request.orderId), {
          paymentMethod: 'fiat',
          stripePaymentIntentId: stripeResult.paymentIntentId,
          stripeTransferGroup: stripeResult.transferGroup,
          status: 'processing'
        });
      }

      return {
        orderId: request.orderId,
        paymentPath: 'fiat',
        escrowType: 'stripe_connect',
        stripePaymentIntentId: stripeResult.paymentIntentId,
        stripeTransferGroup: stripeResult.transferGroup,
        status: 'processing',
        fees: pathDecision.fees,
        createdAt: new Date(),
        estimatedCompletionTime: new Date(Date.now() + 1000) // Instant
      };
    } catch (error) {
      console.error('Fiat escrow path failed:', error);
      throw error;
    }
  }

  /**
   * Create Stripe Connect escrow structure
   */
  private async createStripeConnectEscrow(
    request: HybridCheckoutRequest,
    pathDecision: PaymentPathDecision
  ): Promise<{
    paymentIntentId: string;
    transferGroup: string;
    sellerAccountId: string;
  }> {
    // Mock Stripe Connect implementation
    // In production, this would:
    // 1. Create/get seller's connected account
    // 2. Create payment intent with transfer_group
    // 3. Set up delayed transfer to seller
    
    const transferGroup = `order_${request.orderId}_${Date.now()}`;
    const paymentIntentId = `pi_${Math.random().toString(36).substr(2, 9)}`;
    const sellerAccountId = `acct_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`Creating Stripe Connect escrow for order ${request.orderId}`);
    console.log(`Transfer Group: ${transferGroup}`);
    console.log(`Payment Intent: ${paymentIntentId}`);
    console.log(`Seller Account: ${sellerAccountId}`);

    return {
      paymentIntentId,
      transferGroup,
      sellerAccountId
    };
  }

  /**
   * Create order record for immediate visibility
   */
  private async createOrderRecord(
    request: HybridCheckoutRequest,
    pathDecision: PaymentPathDecision
  ): Promise<any> {
    try {
      // Get user profiles
      const buyer = await this.databaseService.getUserByAddress?.(request.buyerAddress);
      const seller = await this.databaseService.getUserByAddress?.(request.sellerAddress);

      // Create order in database
      const orderData = {
        listingId: parseInt(request.listingId),
        buyerId: buyer?.id || 'unknown',
        sellerId: seller?.id || 'unknown',
        amount: request.amount.toString(),
        paymentToken: pathDecision.method.tokenSymbol || request.currency,
        status: 'created',
        paymentMethod: pathDecision.selectedPath,
        metadata: JSON.stringify({
          ...request.metadata,
          paymentPath: pathDecision.selectedPath,
          fees: pathDecision.fees
        })
      };

      return await this.databaseService.createOrder(
        orderData.listingId,
        orderData.buyerId,
        orderData.sellerId,
        orderData.amount,
        orderData.paymentToken
      );
    } catch (error) {
      console.error('Error creating order record:', error);
      return null;
    }
  }

  /**
   * Handle order fulfillment and fund release
   */
  async handleOrderFulfillment(
    orderId: string,
    action: 'confirm_delivery' | 'release_funds' | 'dispute',
    metadata?: any
  ): Promise<void> {
    try {
      // Get order details
      const order = await this.databaseService.getOrderById(parseInt(orderId));
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.paymentMethod === 'crypto' && order.escrowId) {
        // Handle crypto escrow
        switch (action) {
          case 'confirm_delivery':
            await this.escrowService.confirmDelivery(order.escrowId.toString(), JSON.stringify(metadata));
            break;
          case 'release_funds':
            await this.escrowService.approveEscrow(order.escrowId.toString(), order.buyerId || '');
            break;
          case 'dispute':
            await this.escrowService.openDispute(order.escrowId.toString(), metadata.initiatorAddress, metadata.reason);
            break;
        }
      } else if (order.paymentMethod === 'fiat' && order.stripePaymentIntentId) {
        // Handle Stripe Connect escrow
        switch (action) {
          case 'confirm_delivery':
            await this.confirmStripeDelivery(order.stripePaymentIntentId, metadata);
            break;
          case 'release_funds':
            await this.releaseStripeEscrow(order.stripePaymentIntentId, order.stripeTransferGroup);
            break;
          case 'dispute':
            await this.handleStripeDispute(order.stripePaymentIntentId, metadata);
            break;
        }
      }

      // Update order status
      const newStatus = action === 'release_funds' ? 'completed' : 
                       action === 'dispute' ? 'disputed' : 'processing';
      
      await this.databaseService.updateOrder(parseInt(orderId), { status: newStatus });

    } catch (error) {
      console.error('Error handling order fulfillment:', error);
      throw error;
    }
  }

  /**
   * Get unified order status across both payment paths
   */
  async getUnifiedOrderStatus(orderId: string): Promise<{
    orderId: string;
    status: string;
    paymentPath: 'crypto' | 'fiat';
    escrowStatus?: any;
    stripeStatus?: any;
    canConfirmDelivery: boolean;
    canReleaseFunds: boolean;
    canDispute: boolean;
    estimatedDelivery?: Date;
  }> {
    try {
      const order = await this.databaseService.getOrderById(parseInt(orderId));
      if (!order) {
        throw new Error('Order not found');
      }

      let escrowStatus = null;
      let stripeStatus = null;
      let canConfirmDelivery = false;
      let canReleaseFunds = false;
      let canDispute = true;

      if (order.paymentMethod === 'crypto' && order.escrowId) {
        escrowStatus = await this.escrowService.getEscrowStatus(order.escrowId.toString());
        canConfirmDelivery = escrowStatus?.status === 'funded';
        canReleaseFunds = escrowStatus?.status === 'active';
      } else if (order.paymentMethod === 'fiat') {
        // Mock Stripe status
        stripeStatus = {
          paymentIntentId: order.stripePaymentIntentId,
          status: 'succeeded',
          transferStatus: 'pending'
        };
        canConfirmDelivery = true;
        canReleaseFunds = true;
      }

      return {
        orderId,
        status: order.status || 'unknown',
        paymentPath: order.paymentMethod as 'crypto' | 'fiat',
        escrowStatus,
        stripeStatus,
        canConfirmDelivery,
        canReleaseFunds,
        canDispute,
        estimatedDelivery: order.estimatedDelivery ? new Date(order.estimatedDelivery) : undefined
      };
    } catch (error) {
      console.error('Error getting unified order status:', error);
      throw error;
    }
  }

  // Private helper methods for Stripe Connect operations

  private async confirmStripeDelivery(paymentIntentId: string, metadata: any): Promise<void> {
    console.log(`Confirming delivery for Stripe payment ${paymentIntentId}:`, metadata);
    // In production: Update Stripe metadata, prepare for transfer
  }

  private async releaseStripeEscrow(paymentIntentId: string, transferGroup?: string): Promise<void> {
    console.log(`Releasing Stripe escrow for payment ${paymentIntentId}, transfer group: ${transferGroup}`);
    // In production: Execute transfer to seller's connected account
  }

  private async handleStripeDispute(paymentIntentId: string, metadata: any): Promise<void> {
    console.log(`Handling Stripe dispute for payment ${paymentIntentId}:`, metadata);
    // In production: Create dispute record, hold transfer
  }

  private async sendCheckoutNotifications(
    request: HybridCheckoutRequest,
    result: HybridPaymentResult
  ): Promise<void> {
    try {
      await Promise.all([
        this.notificationService.sendOrderNotification(
          request.buyerAddress,
          'ORDER_CREATED',
          request.orderId,
          {
            paymentPath: result.paymentPath,
            escrowType: result.escrowType,
            estimatedTime: result.estimatedCompletionTime
          }
        ),
        this.notificationService.sendOrderNotification(
          request.sellerAddress,
          'ORDER_RECEIVED',
          request.orderId,
          {
            paymentPath: result.paymentPath,
            amount: request.amount,
            currency: request.currency
          }
        )
      ]);
    } catch (error) {
      console.error('Error sending checkout notifications:', error);
    }
  }
}