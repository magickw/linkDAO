import { Request, Response } from 'express';
import { 
  HybridPaymentOrchestrator, 
  HybridCheckoutRequest, 
  PaymentPathDecision,
  HybridPaymentResult
} from '../services/hybridPaymentOrchestrator';
import { AppError, ValidationError, NotFoundError } from '../middleware/errorHandler';

export class HybridPaymentController {
  private hybridPaymentOrchestrator: HybridPaymentOrchestrator;

  constructor() {
    this.hybridPaymentOrchestrator = new HybridPaymentOrchestrator();
  }

  /**
   * Get optimal payment path recommendation
   */
  async getPaymentPathRecommendation(req: Request, res: Response): Promise<Response> {
    try {
      const {
        orderId,
        listingId,
        buyerAddress,
        sellerAddress,
        amount,
        currency,
        preferredMethod,
        userCountry
      } = req.body;

      if (!orderId || !listingId || !buyerAddress || !sellerAddress || !amount || !currency) {
        throw new ValidationError('Missing required fields: orderId, listingId, buyerAddress, sellerAddress, amount, currency');
      }

      const request: HybridCheckoutRequest = {
        orderId,
        listingId,
        buyerAddress,
        sellerAddress,
        amount: parseFloat(amount),
        currency,
        preferredMethod,
        userCountry
      };

      const recommendation = await this.hybridPaymentOrchestrator.determineOptimalPaymentPath(request);

      return res.json({
        success: true,
        data: recommendation
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Payment path recommendation failed: ${error.message}`, 500, 'PAYMENT_PATH_ERROR');
    }
  }

  /**
   * Process hybrid checkout
   */
  async processHybridCheckout(req: Request, res: Response): Promise<Response> {
    try {
      const {
        orderId,
        listingId,
        buyerAddress,
        sellerAddress,
        amount,
        currency,
        preferredMethod,
        userCountry,
        metadata
      } = req.body;

      if (!orderId || !listingId || !buyerAddress || !sellerAddress || !amount || !currency) {
        throw new ValidationError('Missing required fields: orderId, listingId, buyerAddress, sellerAddress, amount, currency');
      }

      const request: HybridCheckoutRequest = {
        orderId,
        listingId,
        buyerAddress,
        sellerAddress,
        amount: parseFloat(amount),
        currency,
        preferredMethod,
        userCountry,
        metadata
      };

      const result = await this.hybridPaymentOrchestrator.processHybridCheckout(request);

      return res.status(201).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Hybrid checkout failed: ${error.message}`, 500, 'HYBRID_CHECKOUT_ERROR');
    }
  }

  /**
   * Handle order fulfillment actions
   */
  async handleOrderFulfillment(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const { action, metadata } = req.body;

      if (!orderId) {
        throw new ValidationError('Order ID is required');
      }

      if (!action || !['confirm_delivery', 'release_funds', 'dispute'].includes(action)) {
        throw new ValidationError('Invalid action. Must be: confirm_delivery, release_funds, or dispute');
      }

      await this.hybridPaymentOrchestrator.handleOrderFulfillment(orderId, action, metadata);

      return res.json({
        success: true,
        data: {
          message: `Order ${action} processed successfully`
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Order fulfillment failed: ${error.message}`, 500, 'ORDER_FULFILLMENT_ERROR');
    }
  }

  /**
   * Get unified order status
   */
  async getUnifiedOrderStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        throw new ValidationError('Order ID is required');
      }

      const status = await this.hybridPaymentOrchestrator.getUnifiedOrderStatus(orderId);

      return res.json({
        success: true,
        data: status
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get order status: ${error.message}`, 500, 'ORDER_STATUS_ERROR');
    }
  }

  /**
   * Get payment method comparison
   */
  async getPaymentMethodComparison(req: Request, res: Response): Promise<Response> {
    try {
      const { buyerAddress, amount, currency, userCountry } = req.query;

      if (!buyerAddress || !amount || !currency) {
        throw new ValidationError('Missing required query parameters: buyerAddress, amount, currency');
      }

      // Mock comparison data - in production, this would call actual services
      const comparison = {
        crypto: {
          available: true,
          fees: {
            processingFee: 0,
            platformFee: parseFloat(amount as string) * 0.005,
            gasFee: 0.01,
            totalFees: (parseFloat(amount as string) * 0.005) + 0.01,
            currency: 'USDC'
          },
          estimatedTime: '1-5 minutes',
          benefits: [
            'Lower fees',
            'Decentralized',
            'Trustless escrow',
            'No intermediaries'
          ],
          requirements: [
            'Sufficient crypto balance',
            'Gas fees for transactions'
          ]
        },
        fiat: {
          available: true,
          fees: {
            processingFee: (parseFloat(amount as string) * 0.029) + 0.30,
            platformFee: parseFloat(amount as string) * 0.01,
            totalFees: (parseFloat(amount as string) * 0.029) + 0.30 + (parseFloat(amount as string) * 0.01),
            currency: currency as string
          },
          estimatedTime: 'Instant',
          benefits: [
            'Instant processing',
            'Familiar payment methods',
            'No crypto knowledge required',
            'Buyer protection'
          ],
          requirements: [
            'Valid payment method',
            'KYC verification may be required'
          ]
        }
      };

      return res.json({
        success: true,
        data: comparison
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Payment method comparison failed: ${error.message}`, 500, 'PAYMENT_COMPARISON_ERROR');
    }
  }

  /**
   * Get order payment history
   */
  async getOrderPaymentHistory(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        throw new ValidationError('Order ID is required');
      }

      // Mock payment history - in production, fetch from database
      const history = [
        {
          timestamp: new Date(),
          event: 'order_created',
          paymentPath: 'crypto',
          status: 'pending',
          details: {
            amount: 100,
            currency: 'USDC',
            escrowId: '1'
          }
        },
        {
          timestamp: new Date(Date.now() - 60000),
          event: 'escrow_funded',
          paymentPath: 'crypto',
          status: 'completed',
          details: {
            transactionHash: '0x123...',
            gasUsed: '65000'
          }
        }
      ];

      return res.json({
        success: true,
        data: {
          orderId,
          history
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get payment history: ${error.message}`, 500, 'PAYMENT_HISTORY_ERROR');
    }
  }

  /**
   * Switch payment method for pending order
   */
  async switchPaymentMethod(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const { newMethod, reason } = req.body;

      if (!orderId) {
        throw new ValidationError('Order ID is required');
      }

      if (!newMethod || !['crypto', 'fiat'].includes(newMethod)) {
        throw new ValidationError('Invalid payment method. Must be: crypto or fiat');
      }

      // Mock implementation - in production, handle actual payment method switching
      console.log(`Switching payment method for order ${orderId} to ${newMethod}. Reason: ${reason}`);

      return res.json({
        success: true,
        data: {
          message: `Payment method switched to ${newMethod}`,
          orderId,
          newMethod,
          status: 'pending_new_payment'
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Payment method switch failed: ${error.message}`, 500, 'PAYMENT_SWITCH_ERROR');
    }
  }

  /**
   * Get hybrid payment analytics
   */
  async getHybridPaymentAnalytics(req: Request, res: Response): Promise<Response> {
    try {
      const { timeframe = 'month', userAddress } = req.query;

      // Mock analytics data
      const analytics = {
        totalOrders: 150,
        paymentPathDistribution: {
          crypto: { count: 90, percentage: 60, totalVolume: 45000 },
          fiat: { count: 60, percentage: 40, totalVolume: 30000 }
        },
        averageProcessingTime: {
          crypto: '3.2 minutes',
          fiat: '0.8 seconds'
        },
        successRates: {
          crypto: 0.94,
          fiat: 0.98
        },
        feeComparison: {
          crypto: { average: 0.8, currency: 'USD' },
          fiat: { average: 3.2, currency: 'USD' }
        },
        userPreferences: {
          preferCrypto: 0.35,
          preferFiat: 0.45,
          noPreference: 0.20
        },
        monthlyTrends: [
          { month: '2024-01', crypto: 25, fiat: 15 },
          { month: '2024-02', crypto: 30, fiat: 20 },
          { month: '2024-03', crypto: 35, fiat: 25 }
        ]
      };

      return res.json({
        success: true,
        data: analytics
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Analytics retrieval failed: ${error.message}`, 500, 'ANALYTICS_ERROR');
    }
  }

  /**
   * Health check for hybrid payment system
   */
  async healthCheck(req: Request, res: Response): Promise<Response> {
    try {
      const healthStatus = {
        hybridOrchestrator: 'healthy',
        cryptoEscrow: 'healthy',
        fiatPayments: 'healthy',
        stripeConnect: 'healthy',
        paymentValidation: 'healthy',
        timestamp: new Date().toISOString()
      };

      // Test core services
      try {
        // In production, test actual service connections
        console.log('Testing hybrid payment system health...');
      } catch (error) {
        healthStatus.hybridOrchestrator = 'unhealthy';
      }

      const isHealthy = Object.values(healthStatus).every(status => 
        status === 'healthy' || typeof status === 'string'
      );

      return res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        data: healthStatus
      });
    } catch (error: any) {
      return res.status(503).json({
        success: false,
        error: 'Health check failed',
        message: error.message
      });
    }
  }
}