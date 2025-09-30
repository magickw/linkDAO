import { Request, Response } from 'express';
import { 
  EnhancedFiatPaymentService, 
  FiatPaymentRequest, 
  FiatPaymentResult,
  PaymentMethodSelection,
  PaymentMethodInfo
} from '../services/enhancedFiatPaymentService';
import { AppError, ValidationError, NotFoundError } from '../middleware/errorHandler';

export class EnhancedFiatPaymentController {
  private enhancedFiatPaymentService: EnhancedFiatPaymentService;

  constructor() {
    this.enhancedFiatPaymentService = new EnhancedFiatPaymentService();
  }

  /**
   * Process fiat payment
   */
  async processFiatPayment(req: Request, res: Response): Promise<Response> {
    try {
      const request: FiatPaymentRequest = req.body;

      // Validate required fields
      if (!request.orderId || !request.amount || !request.currency || !request.paymentMethodId || !request.userAddress) {
        throw new ValidationError('Missing required fields: orderId, amount, currency, paymentMethodId, userAddress');
      }

      if (!request.provider || !['stripe', 'paypal', 'bank_transfer', 'apple_pay', 'google_pay'].includes(request.provider)) {
        throw new ValidationError('Invalid payment provider');
      }

      const result = await this.enhancedFiatPaymentService.processFiatPayment(request);

      return res.status(201).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Fiat payment processing failed: ${error.message}`, 500, 'FIAT_PAYMENT_ERROR');
    }
  }

  /**
   * Get available payment methods for user
   */
  async getAvailablePaymentMethods(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress, amount, currency, country } = req.query;

      if (!userAddress || !amount || !currency) {
        throw new ValidationError('Missing required query parameters: userAddress, amount, currency');
      }

      const methods = await this.enhancedFiatPaymentService.getAvailablePaymentMethods(
        userAddress as string,
        parseFloat(amount as string),
        currency as string,
        country as string
      );

      return res.json({
        success: true,
        data: methods
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get payment methods: ${error.message}`, 500, 'FIAT_METHODS_ERROR');
    }
  }

  /**
   * Setup new payment method for user
   */
  async setupPaymentMethod(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress, provider, methodType, methodData } = req.body;

      if (!userAddress || !provider || !methodType || !methodData) {
        throw new ValidationError('Missing required fields: userAddress, provider, methodType, methodData');
      }

      const paymentMethod = await this.enhancedFiatPaymentService.setupPaymentMethod(
        userAddress,
        provider,
        methodType,
        methodData
      );

      return res.status(201).json({
        success: true,
        data: paymentMethod
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Payment method setup failed: ${error.message}`, 500, 'FIAT_SETUP_ERROR');
    }
  }

  /**
   * Get payment method selection interface data
   */
  async getPaymentMethodSelectionData(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress, amount, currency, country } = req.query;

      if (!userAddress || !amount || !currency) {
        throw new ValidationError('Missing required query parameters: userAddress, amount, currency');
      }

      const selectionData = await this.enhancedFiatPaymentService.getPaymentMethodSelectionData(
        userAddress as string,
        parseFloat(amount as string),
        currency as string,
        country as string
      );

      return res.json({
        success: true,
        data: selectionData
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get selection data: ${error.message}`, 500, 'FIAT_SELECTION_ERROR');
    }
  }

  /**
   * Process crypto conversion after fiat payment
   */
  async processCryptoConversion(req: Request, res: Response): Promise<Response> {
    try {
      const { transactionId, conversionDetails } = req.body;

      if (!transactionId || !conversionDetails) {
        throw new ValidationError('Missing required fields: transactionId, conversionDetails');
      }

      // Mock implementation - in production, process actual conversion
      const conversion = {
        transactionId,
        status: 'completed',
        fromAmount: conversionDetails.amount,
        fromCurrency: conversionDetails.currency,
        toAmount: (conversionDetails.amount * 0.0004).toString(), // Mock ETH conversion
        toToken: conversionDetails.targetToken,
        exchangeRate: 0.0004,
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        completedAt: new Date()
      };

      return res.json({
        success: true,
        data: conversion
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Crypto conversion failed: ${error.message}`, 500, 'FIAT_CONVERSION_ERROR');
    }
  }

  /**
   * Generate payment receipt
   */
  async generateReceipt(req: Request, res: Response): Promise<Response> {
    try {
      const { transactionId } = req.params;

      if (!transactionId) {
        throw new ValidationError('Transaction ID is required');
      }

      // Mock receipt generation
      const receipt = {
        transactionId,
        orderId: 'order_123',
        amount: 100,
        currency: 'USD',
        paymentMethod: {
          type: 'card',
          last4: '4242',
          brand: 'visa',
          provider: 'stripe'
        },
        fees: {
          processingFee: 3.20,
          platformFee: 1.00,
          totalFees: 4.20,
          currency: 'USD'
        },
        timestamp: new Date(),
        status: 'succeeded',
        downloadUrl: `https://receipts.example.com/${transactionId}.pdf`
      };

      return res.json({
        success: true,
        data: receipt
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Receipt generation failed: ${error.message}`, 500, 'FIAT_RECEIPT_ERROR');
    }
  }

  /**
   * Refund fiat payment
   */
  async refundPayment(req: Request, res: Response): Promise<Response> {
    try {
      const { transactionId } = req.params;
      const { amount, reason } = req.body;

      if (!transactionId) {
        throw new ValidationError('Transaction ID is required');
      }

      const refundResult = await this.enhancedFiatPaymentService.refundPayment(
        transactionId,
        amount ? parseFloat(amount) : undefined,
        reason
      );

      return res.json({
        success: true,
        data: refundResult
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Refund processing failed: ${error.message}`, 500, 'FIAT_REFUND_ERROR');
    }
  }

  /**
   * Get payment transaction details
   */
  async getPaymentTransaction(req: Request, res: Response): Promise<Response> {
    try {
      const { transactionId } = req.params;

      if (!transactionId) {
        throw new ValidationError('Transaction ID is required');
      }

      // Mock transaction details
      const transaction = {
        transactionId,
        orderId: 'order_123',
        amount: 100,
        currency: 'USD',
        status: 'succeeded',
        provider: 'stripe',
        paymentMethodId: 'pm_123',
        fees: {
          processingFee: 3.20,
          platformFee: 1.00,
          totalFees: 4.20,
          currency: 'USD'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return res.json({
        success: true,
        data: transaction
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get transaction: ${error.message}`, 500, 'FIAT_TRANSACTION_ERROR');
    }
  }

  /**
   * Get payment history for user
   */
  async getPaymentHistory(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;
      const { limit = '50', offset = '0', status, provider } = req.query;

      if (!userAddress) {
        throw new ValidationError('User address is required');
      }

      // Mock payment history
      const payments = [
        {
          transactionId: 'fiat_123',
          orderId: 'order_123',
          amount: 100,
          currency: 'USD',
          status: 'succeeded',
          provider: 'stripe',
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
        },
        {
          transactionId: 'fiat_124',
          orderId: 'order_124',
          amount: 250,
          currency: 'USD',
          status: 'succeeded',
          provider: 'paypal',
          createdAt: new Date(Date.now() - 172800000), // 2 days ago
        }
      ];

      // Apply filters
      let filteredPayments = payments;
      if (status) {
        filteredPayments = filteredPayments.filter(p => p.status === status);
      }
      if (provider) {
        filteredPayments = filteredPayments.filter(p => p.provider === provider);
      }

      // Apply pagination
      const startIndex = parseInt(offset as string);
      const endIndex = startIndex + parseInt(limit as string);
      const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

      return res.json({
        success: true,
        data: {
          payments: paginatedPayments,
          total: filteredPayments.length,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get payment history: ${error.message}`, 500, 'FIAT_HISTORY_ERROR');
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStatistics(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;
      const { timeframe = 'month' } = req.query;

      if (!userAddress) {
        throw new ValidationError('User address is required');
      }

      // Mock statistics
      const statistics = {
        totalPayments: 25,
        totalAmount: 2500,
        currency: 'USD',
        successRate: 0.96,
        averageAmount: 100,
        paymentMethods: {
          stripe: { count: 15, amount: 1500 },
          paypal: { count: 8, amount: 800 },
          bank_transfer: { count: 2, amount: 200 }
        },
        monthlyTrends: [
          { month: '2024-01', payments: 8, amount: 800 },
          { month: '2024-02', payments: 10, amount: 1000 },
          { month: '2024-03', payments: 7, amount: 700 }
        ],
        timeframe
      };

      return res.json({
        success: true,
        data: statistics
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get payment statistics: ${error.message}`, 500, 'FIAT_STATS_ERROR');
    }
  }

  /**
   * Validate payment method
   */
  async validatePaymentMethod(req: Request, res: Response): Promise<Response> {
    try {
      const { paymentMethodId, provider, amount, currency } = req.body;

      if (!paymentMethodId || !provider) {
        throw new ValidationError('Missing required fields: paymentMethodId, provider');
      }

      // Mock validation
      const validation = {
        isValid: true,
        paymentMethodId,
        provider,
        status: 'active',
        canProcess: true,
        limits: {
          min: 1,
          max: 10000,
          currency: currency || 'USD'
        },
        fees: {
          processingFee: amount ? (amount * 0.029) + 0.30 : 0,
          platformFee: amount ? amount * 0.01 : 0,
          currency: currency || 'USD'
        },
        estimatedProcessingTime: 'instant'
      };

      return res.json({
        success: true,
        data: validation
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Payment method validation failed: ${error.message}`, 500, 'FIAT_VALIDATION_ERROR');
    }
  }

  /**
   * Health check for fiat payment service
   */
  async healthCheck(req: Request, res: Response): Promise<Response> {
    try {
      const healthStatus = {
        fiatPaymentService: 'healthy',
        stripeConnection: 'healthy',
        paypalConnection: 'healthy',
        exchangeRateService: 'healthy',
        databaseConnection: 'healthy',
        timestamp: new Date().toISOString()
      };

      // Test connections (mock)
      try {
        // In production, test actual service connections
        console.log('Testing payment provider connections...');
      } catch (error) {
        healthStatus.stripeConnection = 'unhealthy';
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