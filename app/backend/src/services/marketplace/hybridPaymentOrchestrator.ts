import { PaymentValidationService } from './paymentValidationService';
import { safeLogger } from '../../utils/safeLogger';
import { getTokenAddress } from '../../config/tokenAddresses';
import { EnhancedFiatPaymentService } from './enhancedFiatPaymentService';
import { EnhancedEscrowService } from './enhancedEscrowService';
import { ExchangeRateService } from './exchangeRateService';
import { DatabaseService } from './databaseService';
import { NotificationService } from './notificationService';
import { StripePaymentService } from './stripePaymentService';
import { TaxCalculationService } from './taxCalculationService';
import { receiptService } from './receiptService';

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
  paymentMethodDetails?: {
    type?: string;
    tokenAddress?: string;
    chainId?: number;
    provider?: string;
  };
  shippingAddress?: any;
  shippingCost?: number;
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
    taxAmount: number;
    totalFees: number; // Includes tax + fees
    currency: string;
  };
  totalAmount: number; // subtotal + tax + fees
  estimatedTime: string;
  fallbackOptions: PaymentPathDecision[];
}

export interface HybridPaymentResult {
  orderId: string;
  orderNumber?: string; // Friendly order number
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
  private stripeService: StripePaymentService;
  private taxService: TaxCalculationService;

  constructor() {
    this.paymentValidationService = new PaymentValidationService();
    this.fiatPaymentService = new EnhancedFiatPaymentService();
    this.escrowService = new EnhancedEscrowService(
      process.env.RPC_URL || 'https://sepolia.drpc.org',
      process.env.ENHANCED_ESCROW_CONTRACT_ADDRESS || '',
      process.env.MARKETPLACE_CONTRACT_ADDRESS || ''
    );
    this.exchangeRateService = new ExchangeRateService();
    this.databaseService = new DatabaseService();
    this.notificationService = new NotificationService();
    this.stripeService = new StripePaymentService({
      secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_mock',
      apiVersion: '2023-10-16'
    });
    this.taxService = new TaxCalculationService();
  }

  /**
   * Intelligent payment path selection based on user context
   */
  async determineOptimalPaymentPath(request: HybridCheckoutRequest): Promise<PaymentPathDecision> {
    try {
      // Calculate Tax
      let taxAmount = 0;
      if (request.shippingAddress) {
        try {
          const taxResult = await this.taxService.calculateTax(
            [{
              id: request.listingId,
              name: 'Item', // Retrieve actual name if possible, simplified for now
              price: request.amount,
              quantity: 1,
              isDigital: false, // Assume physical for safety, or check listing type
              isTaxExempt: false
            }],
            request.shippingAddress,
            0, // Shipping cost should be passed in request if available
            request.currency
          );
          taxAmount = taxResult.taxAmount;
        } catch (taxError) {
          safeLogger.warn('Tax calculation failed in hybrid flow:', taxError);
        }
      }

      // Check crypto balance and availability
      // Determine target chain ID (default to Sepolia for testnet, or environment default)
      // If request includes chainId, use it. Otherwise default to configured default or Sepolia.
      const defaultChainId = process.env.DEFAULT_CHAIN_ID ? parseInt(process.env.DEFAULT_CHAIN_ID) : 11155111;
      const targetChainId = request.paymentMethodDetails?.chainId || defaultChainId;

      // Check crypto balance and availability
      const cryptoValidation = await this.paymentValidationService.validatePayment({
        paymentMethod: 'crypto',
        amount: request.amount + taxAmount, // Check balance for amount + tax
        currency: 'USDC', // Default to USDC for crypto
        userAddress: request.buyerAddress,
        paymentDetails: {
          tokenAddress: getTokenAddress('USDC', targetChainId), // Use correct USDC address for target chain
          tokenSymbol: 'USDC',
          tokenDecimals: 6,
          chainId: targetChainId,
          recipientAddress: request.sellerAddress
        }
      });

      // Check fiat availability
      const fiatMethods = await this.fiatPaymentService.getAvailablePaymentMethods(
        request.buyerAddress,
        request.amount + taxAmount,
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

      // Force fiat if crypto not available, UNLESS explicitly preferred
      if ((!cryptoValidation.isValid || !cryptoValidation.hasSufficientBalance) && request.preferredMethod !== 'crypto') {
        selectedPath = 'fiat';
        reason = 'Fiat payment required - insufficient crypto balance or validation failed';
      } else if (request.preferredMethod === 'crypto' && (!cryptoValidation.isValid || !cryptoValidation.hasSufficientBalance)) {
        // Log warning but respect user preference to try crypto
        safeLogger.warn('Crypto validation failed but user preferred crypto:', {
          isValid: cryptoValidation.isValid,
          balance: cryptoValidation.hasSufficientBalance
        });
        selectedPath = 'crypto';
        reason = 'User explicitly preferred crypto despite validation warning';
      }

      // Build payment method details
      // Extract chainId from request.paymentMethodDetails (sent from frontend)
      const requestedChainId = request.paymentMethodDetails?.chainId || 11155111; // Default to Sepolia if not specified
      const requestedTokenAddress = request.paymentMethodDetails?.tokenAddress;

      // DEBUG: Log the chainId extraction
      safeLogger.info('[processHybridCheckout] ChainId extraction:', {
        'request.paymentMethodDetails': request.paymentMethodDetails,
        'request.paymentMethodDetails?.chainId': request.paymentMethodDetails?.chainId,
        'requestedChainId': requestedChainId,
        'requestedTokenAddress': requestedTokenAddress
      });

      const method = selectedPath === 'crypto' ? {
        type: 'crypto' as const,
        tokenAddress: requestedTokenAddress || getTokenAddress('USDC', requestedChainId), // Use requested token address or get USDC for the chain
        tokenSymbol: 'USDC',
        chainId: requestedChainId // Use the chainId from the frontend request
      } : {
        type: 'fiat' as const,
        provider: 'stripe'
      };

      // DEBUG: Log the final method object
      safeLogger.info('[processHybridCheckout] Payment method object:', method);

      // Calculate fees
      // 1. Platform Listing/Sale Fee: 15% (Charged to SELLER)
      const platformFeeRate = 0.15;
      const platformFee = request.amount * platformFeeRate;

      // 2. Tax Calculation
      // taxAmount is already calculated above using taxService

      // 3. Financial Processing Fee (Transaction specific - Charged to BUYER)
      let processingFee = 0;
      let gasFee = 0;

      if (selectedPath === 'crypto') {
        gasFee = 0.01; // Estimate gas for crypto transactions
        // For crypto, we might charge a small additional processing fee or just gas
        processingFee = 0;
      } else {
        // Stripe fees: 2.9% + $0.30 
        // This is calculated on the TOTAL amount charged to the card (Price + Tax)
        // Platform fee is NOT added to the buyer's total, so it doesn't affect Stripe fee base here directly,
        // UNLESS the platform fee is added on top. User said "charged to seller", so it comes out of the request.amount.
        // Therefore, Buyer pays: Price + Tax. Processing fee is on (Price + Tax).
        processingFee = ((request.amount + taxAmount) * 0.029) + 0.30;
      }

      // Total charged to Buyer
      const shippingCost = request.shippingCost || 0;
      const totalAmount = request.amount + taxAmount + processingFee + (gasFee || 0) + shippingCost;

      // Total Fees object (informational)
      const fees = {
        processingFee,
        platformFee, // Still tracked for seller deduction
        gasFee,
        taxAmount,
        shippingCost,
        currency: request.currency,
        totalFees: platformFee + processingFee + (gasFee || 0) + taxAmount + shippingCost
      };

      // Generate fallback options
      const fallbackOptions: PaymentPathDecision[] = [];
      if (selectedPath === 'crypto' && fiatMethods.availableMethods.length > 0) {
        const fiatPlatformFee = request.amount * platformFeeRate;
        const fiatProcessingFee = ((request.amount + taxAmount) * 0.029) + 0.30;
        const fiatTotalAmount = request.amount + taxAmount + fiatProcessingFee;

        fallbackOptions.push({
          selectedPath: 'fiat',
          reason: 'Fiat fallback if crypto payment fails',
          method: { type: 'fiat', provider: 'stripe' },
          fees: {
            processingFee: fiatProcessingFee,
            platformFee: fiatPlatformFee,
            gasFee: 0,
            taxAmount,
            currency: request.currency
          },
          totalAmount: fiatTotalAmount,
          estimatedTime: 'Instant',
          fallbackOptions: []
        });
      }

      return {
        selectedPath,
        reason,
        method,
        fees: fees as any, // Cast to any to match interface if strict
        totalAmount,
        estimatedTime: selectedPath === 'crypto' ? '1-5 minutes' : 'Instant',
        fallbackOptions
      };
    } catch (error) {
      safeLogger.error('Error determining payment path:', error);

      // Default to fiat on error
      const platformFee = request.amount * 0.15;
      const processingFee = (request.amount * 0.029) + 0.30;
      const totalAmount = request.amount + processingFee;

      return {
        selectedPath: 'fiat',
        reason: 'Defaulting to fiat due to path determination error',
        method: { type: 'fiat', provider: 'stripe' },
        fees: {
          processingFee,
          platformFee,
          gasFee: 0,
          taxAmount: 0,
          currency: request.currency,
          totalFees: processingFee // Legacy field support
        } as any,
        totalAmount,
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
      safeLogger.info('[processHybridCheckout] Starting checkout process:', {
        orderId: request.orderId,
        listingId: request.listingId,
        buyerAddress: request.buyerAddress,
        sellerAddress: request.sellerAddress,
        amount: request.amount,
        currency: request.currency,
        preferredMethod: request.preferredMethod
      });

      // Determine optimal payment path
      const pathDecision = await this.determineOptimalPaymentPath(request);

      safeLogger.info('[processHybridCheckout] Payment path determined:', {
        selectedPath: pathDecision.selectedPath,
        reason: pathDecision.reason
      });

      // Create order record immediately for visibility
      const orderRecord = await this.createOrderRecord(request, pathDecision);

      safeLogger.info('[processHybridCheckout] Order record created:', {
        orderId: orderRecord?.id
      });

      let result: HybridPaymentResult;

      try {
        if (pathDecision.selectedPath === 'crypto') {
          result = await this.processCryptoEscrowPath(request, pathDecision, orderRecord);
        } else {
          result = await this.processFiatEscrowPath(request, pathDecision, orderRecord);
        }
      } catch (paymentError) {
        safeLogger.error('[processHybridCheckout] Payment processing failed, marking order as failed:', paymentError);
        // Mark order as failed in database
        if (orderRecord && orderRecord.id) {
          await this.databaseService.updateOrder(orderRecord.id, {
            status: 'failed',
            metadata: JSON.stringify({
              ...JSON.parse(orderRecord.metadata || '{}'),
              failureReason: paymentError instanceof Error ? paymentError.message : 'Payment processing failed',
              failedAt: new Date()
            })
          });
        }
        throw paymentError;
      }

      // Send notifications
      await this.sendCheckoutNotifications(request, result, pathDecision);

      return result;
    } catch (error) {
      safeLogger.error('[processHybridCheckout] Checkout failed:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        request: {
          orderId: request.orderId,
          listingId: request.listingId,
          buyerAddress: request.buyerAddress,
          sellerAddress: request.sellerAddress,
          amount: request.amount
        }
      });

      // Re-throw the error with original message preserved
      // Re-throw the error with original message preserved
      if (error instanceof Error) {
        throw error;
      }
      // If it's an object with a message, use that
      if (typeof error === 'object' && error !== null && 'message' in error) {
        throw new Error((error as any).message);
      }
      // If it's a string, wrap it
      if (typeof error === 'string') {
        throw new Error(error);
      }

      throw new Error('Checkout processing failed with unknown error');
    }
  }

  /**
   * Process crypto escrow path (smart contract)
   */
  private async processCryptoEscrowPath(
    request: HybridCheckoutRequest,
    pathDecision: PaymentPathDecision,
    orderRecord: any
  ): Promise<HybridPaymentResult & { transactionData?: any }> {
    try {
      // Create smart contract escrow
      // Use totalAmount from decision to include tax and fees

      // Determine token address - use zero address for native currency (ETH)
      const tokenAddress = pathDecision.method.tokenAddress || '0x0000000000000000000000000000000000000000';

      safeLogger.info('[processCryptoEscrowPath] Creating escrow with parameters:', {
        listingId: request.listingId,
        buyerAddress: request.buyerAddress,
        sellerAddress: request.sellerAddress,
        tokenAddress,
        amount: pathDecision.totalAmount.toString(),
        methodDetails: pathDecision.method
      });

      // DEBUG: Log the chainId being passed to createEscrow
      const chainIdToUse = pathDecision.method.chainId || 11155111;
      safeLogger.info('[processCryptoEscrowPath] ChainId being passed to createEscrow:', {
        'pathDecision.method.chainId': pathDecision.method.chainId,
        'chainIdToUse': chainIdToUse,
        'pathDecision.method': pathDecision.method
      });

      const escrowResult = await this.escrowService.createEscrow(
        request.listingId,
        request.buyerAddress,
        request.sellerAddress,
        tokenAddress,
        pathDecision.totalAmount.toString(),
        chainIdToUse // Use chainId from payment method, default to Sepolia
      );

      // Update order with escrow details
      await this.databaseService.updateOrder(orderRecord.id, {
        escrowId: escrowResult.escrowId.toString(),
        paymentMethod: 'crypto',
        status: 'pending'
      });

      return {
        orderId: orderRecord.id,
        orderNumber: orderRecord.orderNumber, // Pass friendly order number
        paymentPath: 'crypto',
        escrowType: 'smart_contract',
        escrowId: escrowResult.escrowId,
        status: 'pending',
        fees: pathDecision.fees,
        createdAt: new Date(),
        estimatedCompletionTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        transactionData: escrowResult.transactionData // Return transaction data to frontend
      };
    } catch (error) {
      safeLogger.error('Crypto escrow path failed:', error);
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
        await this.databaseService.updateOrder(orderRecord.id, {
          paymentMethod: 'fiat',
          stripePaymentIntentId: stripeResult.paymentIntentId,
          stripeTransferGroup: stripeResult.transferGroup,
          status: 'processing'
        });
      }

      return {
        orderId: orderRecord.id,
        orderNumber: orderRecord.orderNumber, // Pass friendly order number
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
      safeLogger.error('Fiat escrow path failed:', error);
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
    clientSecret?: string;
  }> {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY environment variable is required for real Stripe integration');
      }

      const transferGroup = `order_${request.orderId}_${Date.now()}`;

      // Look up seller's Stripe Connect account ID
      let sellerAccountId: string | undefined;
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.sellerAddress);
        let seller;

        if (isUuid) {
          seller = await this.databaseService.getUserById(request.sellerAddress);
        } else {
          seller = await this.databaseService.getUserByAddress?.(request.sellerAddress);
        }

        if (seller?.stripeAccountId) {
          sellerAccountId = seller.stripeAccountId;
        }
      } catch (error) {
        safeLogger.warn('Could not retrieve seller Stripe account:', error);
      }

      // Calculate total amount (Stripe expects amount in cents)
      const totalAmount = Math.round(pathDecision.totalAmount * 100);

      // Calculate application fee (Platform Fee + Tax)
      // Note: Tax is typically collected by platform and remitted, so it's part of the application fee in Stripe Connect
      // unless using Stripe Tax automatic remittance. Assuming manual handling here.
      const applicationFee = Math.round((pathDecision.fees.platformFee + pathDecision.fees.taxAmount) * 100);

      safeLogger.info(`Stripe PaymentIntent calculation:`, {
        requestAmount: request.amount,
        totalAmountFromDecision: pathDecision.totalAmount,
        fees: pathDecision.fees,
        totalAmountInCents: totalAmount,
        applicationFeeInCents: applicationFee
      });

      // Validate minimum amount for Stripe ($0.50 USD = 50 cents)
      if (totalAmount < 50) {
        throw new Error(`Payment amount ($${(totalAmount / 100).toFixed(2)}) is below the Stripe minimum requirement of $0.50 USD.`);
      }

      // Create marketplace payment intent using service
      const result = await this.stripeService.createMarketplacePaymentIntent({
        amount: totalAmount,
        currency: pathDecision.fees.currency.toLowerCase(),
        transferGroup,
        captureMethod: 'manual', // Don't capture immediately for escrow-like behavior
        metadata: {
          orderId: request.orderId,
          listingId: request.listingId,
          buyerAddress: request.buyerAddress,
          sellerAddress: request.sellerAddress,
          platformFee: pathDecision.fees.platformFee.toString(),
          taxAmount: pathDecision.fees.taxAmount.toString(),
          originalAmount: request.amount.toString()
        },
        description: `Order ${request.orderId} - LinkDAO Marketplace`,
        sellerAccountId,
        platformFee: applicationFee / 100 // Service expects dollars/units? No, stripeService expects whatever the underlying API expects.
        // Checking StripePaymentService... it takes "platformFee" and subtracts it.
        // It expects "amount" and "platformFee" in same units as "amount" passed to it.
        // Wait, createMarketplacePaymentIntent in stripePaymentService takes `platformFee?: number`.
        // And does `params.amount - params.platformFee`.
        // So I should pass `applicationFee` (in cents) as `platformFee`.
      });

      safeLogger.info(`Created Stripe PaymentIntent ${result.paymentIntentId} for order ${request.orderId}`);

      // Store payment intent details in database for tracking
      try {
        // Look up buyer and seller user IDs
        const buyer = await this.databaseService.getUserByAddress?.(request.buyerAddress);
        const seller = await this.databaseService.getUserByAddress?.(request.sellerAddress);

        if (buyer?.id && seller?.id) {
          await this.databaseService.createPayment(
            buyer.id,
            seller.id,
            'USD',
            pathDecision.totalAmount.toString(), // Store total amount paid
            result.paymentIntentId,
            `Order ${request.orderId} payment intent`
          );
        }
      } catch (dbError) {
        safeLogger.warn('Failed to store payment intent in database:', dbError);
      }

      return {
        paymentIntentId: result.paymentIntentId,
        transferGroup,
        sellerAccountId: sellerAccountId || 'platform',
        clientSecret: result.clientSecret || undefined
      };
    } catch (error) {
      safeLogger.error('Error creating Stripe PaymentIntent:', error);
      throw new Error('Failed to create Stripe payment: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Create order record for immediate visibility
   */
  private async createOrderRecord(
    request: HybridCheckoutRequest,
    pathDecision: PaymentPathDecision
  ): Promise<any> {
    // 1. Idempotency Check: Resume existing order if present
    try {
      const existingOrder = await this.databaseService.getOrderById(request.orderId);
      if (existingOrder) {
        safeLogger.info(`[createOrderRecord] Order ${request.orderId} already exists, resuming checkout.`, {
          status: existingOrder.status,
          paymentMethod: existingOrder.paymentMethod
        });

        // Update existing order with latest decision details if it's still actionable
        // Update existing order with latest decision details if it's still actionable or if we are retrying a failed order
        if (existingOrder.status === 'created' || existingOrder.status === 'pending' || existingOrder.status === 'failed') {
          // Parse current metadata to remove failure info if retrying
          let currentMetadata = {};
          try {
            currentMetadata = JSON.parse(existingOrder.metadata || '{}');
            if (existingOrder.status === 'failed') {
              delete (currentMetadata as any).failureReason;
              delete (currentMetadata as any).failedAt;
            }
          } catch (e) {
            currentMetadata = {};
          }

          await this.databaseService.updateOrder(existingOrder.id, {
            status: 'pending', // Reset status to pending for retry
            paymentMethod: pathDecision.selectedPath,
            amount: pathDecision.totalAmount.toString(),
            paymentToken: pathDecision.method.tokenSymbol || request.currency,
            metadata: JSON.stringify({
              ...currentMetadata,
              ...request.metadata,
              paymentPath: pathDecision.selectedPath,
              fees: pathDecision.fees,
              subtotal: request.amount,
              shippingAddress: request.shippingAddress
            }),
            // Update fees/shipping/tax columns
            taxAmount: pathDecision.fees.taxAmount.toString(),
            shippingCost: (pathDecision.fees as any).shippingCost?.toString() || '0',
            platformFee: pathDecision.fees.platformFee.toString()
          });

          // Return refreshed order
          return await this.databaseService.getOrderById(request.orderId);
        }

        return existingOrder;
      }
    } catch (e) {
      safeLogger.warn('[createOrderRecord] Error checking for existing order (proceeding to create):', e);
    }

    // Get user profiles
    const isBuyerUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.buyerAddress);
    const isSellerUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.sellerAddress);

    let buyer: any;
    let seller: any;

    // Try to get buyer
    if (isBuyerUuid) {
      buyer = await this.databaseService.getUserById(request.buyerAddress);
    } else {
      // Try getUserByAddress first, then fallback to getUserById if it fails
      try {
        buyer = await this.databaseService.getUserByAddress?.(request.buyerAddress);
      } catch (e) {
        safeLogger.warn('getUserByAddress failed for buyer, trying getUserById:', e);
      }

      if (!buyer) {
        // Try to find user by wallet address in a different way
        try {
          const allUsers = await this.databaseService.executeQuery(async () => {
            return this.databaseService.db.select().from(require('../../db/schema').users).limit(100);
          });
          buyer = allUsers.find((u: any) => u.walletAddress?.toLowerCase() === request.buyerAddress.toLowerCase());
        } catch (e) {
          safeLogger.error('Failed to find buyer by wallet address:', e);
        }
      }

      // Auto-provision buyer if still not found and looks like a valid wallet address
      if (!buyer && /^0x[a-fA-F0-9]{40}$/i.test(request.buyerAddress)) {
        safeLogger.info('Auto-provisioning buyer account for:', request.buyerAddress);
        try {
          const handle = 'user_' + request.buyerAddress.substring(2, 8).toLowerCase();
          buyer = await this.databaseService.createUser(request.buyerAddress, handle);
        } catch (createError) {
          safeLogger.error('Failed to auto-provision buyer:', createError);
        }
      }
    }

    // Try to get seller
    if (isSellerUuid) {
      seller = await this.databaseService.getUserById(request.sellerAddress);
    } else {
      // Try getUserByAddress first, then fallback
      try {
        seller = await this.databaseService.getUserByAddress?.(request.sellerAddress);
      } catch (e) {
        safeLogger.warn('getUserByAddress failed for seller, trying getUserById:', e);
      }

      if (!seller) {
        // Try to find user by wallet address in a different way
        try {
          const allUsers = await this.databaseService.executeQuery(async () => {
            return this.databaseService.db.select().from(require('../../db/schema').users).limit(100);
          });
          seller = allUsers.find((u: any) => u.walletAddress?.toLowerCase() === request.sellerAddress.toLowerCase());
        } catch (e) {
          safeLogger.error('Failed to find seller by wallet address:', e);
        }
      }

      // Auto-provision seller if still not found and looks like a valid wallet address
      if (!seller && /^0x[a-fA-F0-9]{40}$/i.test(request.sellerAddress)) {
        safeLogger.info('Auto-provisioning seller account for:', request.sellerAddress);
        try {
          const handle = 'seller_' + request.sellerAddress.substring(2, 8).toLowerCase();
          seller = await this.databaseService.createUser(request.sellerAddress, handle);
        } catch (createError) {
          safeLogger.error('Failed to auto-provision seller:', createError);
        }
      }
    }

    if (!buyer?.id) {
      const error = new Error(`Buyer account not found. Please ensure you are logged in with a valid account.`);
      safeLogger.error('Cannot create order - missing buyer record:', {
        buyerAddress: request.buyerAddress,
        buyerId: buyer?.id
      });
      throw error;
    }

    if (!seller?.id) {
      const error = new Error(`Seller account not found. Please contact support.`);
      safeLogger.error('Cannot create order - missing seller record:', {
        sellerAddress: request.sellerAddress,
        sellerId: seller?.id
      });
      throw error;
    }

    // Create order in database
    const orderData = {
      listingId: request.listingId, // Keep as string since frontend now sends UUIDs
      buyerId: buyer.id,
      sellerId: seller.id,
      amount: pathDecision.totalAmount.toString(), // Store TOTAL amount
      paymentToken: pathDecision.method.tokenSymbol || request.currency,
      status: 'created',
      paymentMethod: pathDecision.selectedPath,
      metadata: JSON.stringify({
        ...request.metadata,
        paymentPath: pathDecision.selectedPath,
        fees: pathDecision.fees,
        subtotal: request.amount, // Store original subtotal
        shippingAddress: request.shippingAddress
      })
    };

    try {
      const order = await this.databaseService.createOrder(
        orderData.listingId,
        orderData.buyerId,
        orderData.sellerId,
        orderData.amount, // Total amount paid by buyer
        orderData.paymentToken,
        1, // quantity
        undefined, // escrowId
        undefined, // variantId
        request.orderId, // orderId
        pathDecision.fees.taxAmount.toString(),
        (pathDecision.fees as any).shippingCost?.toString() || '0', // Shipping cost
        pathDecision.fees.platformFee.toString(),
        [], // Tax breakdown
        request.shippingAddress,
        null, // Billing address
        pathDecision.selectedPath,
        JSON.stringify({ ...pathDecision.method, processingFee: pathDecision.fees.processingFee }) // Include processing fee in payment details
      );

      safeLogger.info(`Successfully created order ${request.orderId}`, {
        orderId: request.orderId,
        buyerId: orderData.buyerId,
        sellerId: orderData.sellerId,
        amount: orderData.amount,
        fees: pathDecision.fees
      });

      return order;
    } catch (error) {
      safeLogger.error('Error creating order record:', {
        error,
        orderId: request.orderId,
        listingId: orderData.listingId,
        buyerId: orderData.buyerId,
        sellerId: orderData.sellerId
      });
      throw error; // Re-throw instead of returning null
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
      const order = await this.databaseService.getOrderById(orderId);
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

      await this.databaseService.updateOrder(orderId, { status: newStatus });

    } catch (error) {
      safeLogger.error('Error handling order fulfillment:', error);
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
      const order = await this.databaseService.getOrderById(orderId);
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
      safeLogger.error('Error getting unified order status:', error);
      throw error;
    }
  }

  // Private helper methods for Stripe Connect operations

  private async confirmStripeDelivery(paymentIntentId: string, metadata: any): Promise<void> {
    safeLogger.info(`Confirming delivery for Stripe payment ${paymentIntentId}:`, metadata);
    // In production: Update Stripe metadata, prepare for transfer
  }

  private async releaseStripeEscrow(paymentIntentId: string, transferGroup?: string): Promise<void> {
    safeLogger.info(`Releasing Stripe escrow for payment ${paymentIntentId}, transfer group: ${transferGroup}`);
    // In production: Execute transfer to seller's connected account
  }

  private async handleStripeDispute(paymentIntentId: string, metadata: any): Promise<void> {
    safeLogger.info(`Handling Stripe dispute for payment ${paymentIntentId}:`, metadata);
    // In production: Create dispute record, hold transfer
  }

  private async sendCheckoutNotifications(
    request: HybridCheckoutRequest,
    result: HybridPaymentResult,
    pathDecision: PaymentPathDecision
  ): Promise<void> {
    try {
      // 1. Generate Receipt for the buyer
      const receipt = await receiptService.generateReceipt({
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        buyerId: request.buyerAddress, // Using address as ID if UUID not available, logic in service handles resolution if needed
        sellerId: request.sellerAddress,
        amount: pathDecision.totalAmount.toString(),
        currency: request.currency,
        taxAmount: pathDecision.fees.taxAmount.toString(),
        platformFee: pathDecision.fees.platformFee.toString(),
        processingFee: pathDecision.fees.processingFee.toString(),
        paymentMethod: result.paymentPath,
        items: [{ id: request.listingId, amount: request.amount }] // Simplified items
      });

      // 2. Send Order Notifications (Database + Real-time + Email)
      await Promise.all([
        // Buyer Notification
        this.notificationService.sendOrderNotification(
          request.buyerAddress,
          'ORDER_CREATED',
          result.orderId,
          {
            paymentPath: result.paymentPath,
            escrowType: result.escrowType,
            estimatedTime: result.estimatedCompletionTime,
            totalAmount: pathDecision.totalAmount,
            currency: request.currency
          }
        ),
        // Buyer Receipt Email
        this.notificationService.sendReceiptEmail(
          request.buyerAddress,
          result.orderId,
          receipt
        ),
        // Seller Notification
        this.notificationService.sendOrderNotification(
          request.sellerAddress,
          'ORDER_RECEIVED',
          result.orderId,
          {
            paymentPath: result.paymentPath,
            amount: request.amount,
            currency: request.currency,
            platformFeeDeduction: pathDecision.fees.platformFee
          }
        )
      ]);

      safeLogger.info(`Checkout notifications sent for order ${result.orderId}`);
    } catch (error) {
      safeLogger.error('Error sending checkout notifications:', error);
    }
  }

  /**
   * Capture Stripe payment after delivery confirmation
   */
  async captureStripePayment(paymentIntentId: string, orderId: string): Promise<{
    captured: boolean;
    amount: number;
    currency: string;
    transferId?: string;
  }> {
    try {
      const result = await this.stripeService.capturePayment(paymentIntentId);

      if (!result.success) {
        throw new Error(result.error || 'Capture failed');
      }

      safeLogger.info(`Captured Stripe payment ${paymentIntentId} for order ${orderId}`);

      return {
        captured: true,
        amount: result.amount || 0,
        currency: result.currency || 'USD',
        transferId: result.transferId
      };
    } catch (error) {
      safeLogger.error('Error capturing Stripe payment:', error);
      throw error;
    }
  }

  /**
   * Issue refund for Stripe payment
   */
  async refundStripePayment(paymentIntentId: string, orderId: string, reason?: string): Promise<{
    refunded: boolean;
    amount: number;
    currency: string;
    refundId: string;
  }> {
    try {
      const result = await this.stripeService.processRefund(
        paymentIntentId,
        undefined, // Full refund
        reason,
        {
          orderId: orderId,
          refundReason: reason || 'Customer requested refund'
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'Refund failed');
      }

      safeLogger.info(`Created Stripe refund ${result.refundId} for payment ${paymentIntentId}`);

      return {
        refunded: true,
        amount: result.amount || 0,
        currency: result.currency || 'USD',
        refundId: result.refundId || ''
      };
    } catch (error) {
      safeLogger.error('Error refunding Stripe payment:', error);
      throw error;
    }
  }

  /**
   * Cancel Stripe payment intent
   */
  async cancelStripePayment(paymentIntentId: string, orderId: string): Promise<boolean> {
    try {
      const result = await this.stripeService.cancelPayment(paymentIntentId);

      if (!result.success) {
        throw new Error(result.error || 'Cancellation failed');
      }

      safeLogger.info(`Cancelled Stripe payment intent ${paymentIntentId} for order ${orderId}`);
      return true;
    } catch (error) {
      safeLogger.error('Error cancelling Stripe payment:', error);
      throw error;
    }
  }

  /**
   * Get Stripe payment status
   */
  async getStripePaymentStatus(paymentIntentId: string): Promise<{
    status: string;
    amount: number;
    currency: string;
    captured: boolean;
    refunds: Array<any>;
  }> {
    try {
      const paymentIntent = await this.stripeService.getPaymentIntent(paymentIntentId);

      if (!paymentIntent) {
        throw new Error('Payment intent not found');
      }

      // Note: Full refund details might need another call if not in the simplified response
      // For now we return what we have
      return {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        captured: paymentIntent.status === 'succeeded',
        refunds: [] // Detailed refunds would require additional API call
      };
    } catch (error) {
      safeLogger.error('Error getting Stripe payment status:', error);
      throw error;
    }
  }
}
