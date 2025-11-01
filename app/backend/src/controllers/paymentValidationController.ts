import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { 
  PaymentValidationService, 
  PaymentValidationRequest, 
  PaymentValidationResult 
} from '../services/paymentValidationService';
import { PaymentMethodAvailabilityService } from '../services/paymentMethodAvailabilityService';
import { ExchangeRateService } from '../services/exchangeRateService';
import { AppError, ValidationError, NotFoundError } from '../middleware/errorHandler';

export class PaymentValidationController {
  private paymentValidationService: PaymentValidationService;
  private paymentMethodAvailabilityService: PaymentMethodAvailabilityService;
  private exchangeRateService: ExchangeRateService;

  constructor() {
    this.paymentValidationService = new PaymentValidationService();
    this.paymentMethodAvailabilityService = new PaymentMethodAvailabilityService();
    this.exchangeRateService = new ExchangeRateService();
  }

  /**
   * Validate a payment request
   */
  async validatePayment(req: Request, res: Response): Promise<Response> {
    try {
      const validationRequest: PaymentValidationRequest = req.body;

      // Basic request validation
      if (!validationRequest.paymentMethod || !validationRequest.amount || !validationRequest.userAddress) {
        throw new ValidationError('Missing required fields: paymentMethod, amount, userAddress');
      }

      if (validationRequest.amount <= 0) {
        throw new ValidationError('Amount must be greater than 0');
      }

      const result = await this.paymentValidationService.validatePayment(validationRequest);
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Payment validation failed: ${error.message}`);
    }
  }

  /**
   * Check crypto balance for a user
   */
  async checkCryptoBalance(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress, tokenAddress, amount, chainId } = req.body;

      if (!userAddress || !tokenAddress || !amount || !chainId) {
        throw new ValidationError('Missing required fields: userAddress, tokenAddress, amount, chainId');
      }

      const balanceCheck = await this.paymentValidationService.checkCryptoBalance(
        userAddress,
        tokenAddress,
        amount.toString(),
        parseInt(chainId)
      );

      return res.json({
        success: true,
        data: balanceCheck
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Balance check failed: ${error.message}`);
    }
  }

  /**
   * Get payment alternatives when primary method fails
   */
  async getPaymentAlternatives(req: Request, res: Response): Promise<Response> {
    try {
      const validationRequest: PaymentValidationRequest = req.body.paymentRequest;
      const { failureReason } = req.body;

      if (!validationRequest || !failureReason) {
        throw new ValidationError('Missing required fields: paymentRequest, failureReason');
      }

      const alternatives = await this.paymentValidationService.getPaymentAlternatives(
        validationRequest,
        failureReason
      );

      return res.json({
        success: true,
        data: {
          alternatives,
          originalRequest: validationRequest,
          failureReason
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get payment alternatives: ${error.message}`);
    }
  }

  /**
   * Estimate payment fees for different methods
   */
  async estimatePaymentFees(req: Request, res: Response): Promise<Response> {
    try {
      const validationRequest: PaymentValidationRequest = req.body;

      if (!validationRequest.paymentMethod || !validationRequest.amount) {
        throw new ValidationError('Missing required fields: paymentMethod, amount');
      }

      const fees = await this.paymentValidationService.estimatePaymentFees(validationRequest);

      return res.json({
        success: true,
        data: fees
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Fee estimation failed: ${error.message}`);
    }
  }

  /**
   * Check availability of all payment methods for a user
   */
  async checkPaymentMethodAvailability(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress, amount, currency, country } = req.query;

      if (!userAddress || !amount || !currency) {
        throw new ValidationError('Missing required query parameters: userAddress, amount, currency');
      }

      const availability = await this.paymentMethodAvailabilityService.checkPaymentMethodAvailability(
        userAddress as string,
        parseFloat(amount as string),
        currency as string,
        country as string
      );

      return res.json({
        success: true,
        data: availability
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Availability check failed: ${error.message}`);
    }
  }

  /**
   * Get recommended payment method for a transaction
   */
  async getRecommendedPaymentMethod(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress, amount, currency, country } = req.query;

      if (!userAddress || !amount || !currency) {
        throw new ValidationError('Missing required query parameters: userAddress, amount, currency');
      }

      const recommendation = await this.paymentMethodAvailabilityService.getRecommendedPaymentMethod(
        userAddress as string,
        parseFloat(amount as string),
        currency as string,
        country as string
      );

      return res.json({
        success: true,
        data: recommendation
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Recommendation failed: ${error.message}`);
    }
  }

  /**
   * Check if specific payment method is available
   */
  async isPaymentMethodAvailable(req: Request, res: Response): Promise<Response> {
    try {
      const { method, userAddress, amount, currency, country } = req.query;

      if (!method || !userAddress || !amount || !currency) {
        throw new ValidationError('Missing required query parameters: method, userAddress, amount, currency');
      }

      if (!['crypto', 'fiat', 'escrow'].includes(method as string)) {
        throw new ValidationError('Invalid payment method. Must be: crypto, fiat, or escrow');
      }

      const availability = await this.paymentMethodAvailabilityService.isPaymentMethodAvailable(
        method as 'crypto' | 'fiat' | 'escrow',
        userAddress as string,
        parseFloat(amount as string),
        currency as string,
        country as string
      );

      return res.json({
        success: true,
        data: availability
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Method availability check failed: ${error.message}`);
    }
  }

  /**
   * Get payment limits for a user
   */
  async getPaymentLimits(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress, method, country } = req.query;

      if (!userAddress || !method) {
        throw new ValidationError('Missing required query parameters: userAddress, method');
      }

      if (!['crypto', 'fiat', 'escrow'].includes(method as string)) {
        throw new ValidationError('Invalid payment method. Must be: crypto, fiat, or escrow');
      }

      const limits = await this.paymentMethodAvailabilityService.getPaymentLimits(
        userAddress as string,
        method as 'crypto' | 'fiat' | 'escrow',
        country as string
      );

      return res.json({
        success: true,
        data: limits
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Limits check failed: ${error.message}`);
    }
  }

  /**
   * Get user's payment profile
   */
  async getUserPaymentProfile(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;

      if (!userAddress) {
        throw new ValidationError('User address is required');
      }

      const profile = await this.paymentMethodAvailabilityService.getUserPaymentProfile(userAddress);

      return res.json({
        success: true,
        data: profile
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Profile retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get exchange rates
   */
  async getExchangeRate(req: Request, res: Response): Promise<Response> {
    try {
      const { from, to } = req.query;

      if (!from || !to) {
        throw new ValidationError('Missing required query parameters: from, to');
      }

      const rate = await this.exchangeRateService.getExchangeRate(
        from as string,
        to as string
      );

      return res.json({
        success: true,
        data: rate
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Exchange rate retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get multiple exchange rates
   */
  async getMultipleExchangeRates(req: Request, res: Response): Promise<Response> {
    try {
      const { pairs } = req.body;

      if (!pairs || !Array.isArray(pairs)) {
        throw new ValidationError('Pairs array is required');
      }

      const rates = await this.exchangeRateService.getMultipleExchangeRates(pairs);

      return res.json({
        success: true,
        data: rates
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Exchange rates retrieval failed: ${error.message}`);
    }
  }

  /**
   * Convert currency amount
   */
  async convertCurrency(req: Request, res: Response): Promise<Response> {
    try {
      const { amount, from, to } = req.body;

      if (!amount || !from || !to) {
        throw new ValidationError('Missing required fields: amount, from, to');
      }

      if (amount <= 0) {
        throw new ValidationError('Amount must be greater than 0');
      }

      const conversion = await this.exchangeRateService.convertCurrency(
        parseFloat(amount),
        from,
        to
      );

      return res.json({
        success: true,
        data: conversion
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Currency conversion failed: ${error.message}`);
    }
  }

  /**
   * Get supported currencies
   */
  async getSupportedCurrencies(req: Request, res: Response): Promise<Response> {
    try {
      const { type } = req.query;

      let currencies;
      if (type === 'fiat') {
        currencies = this.exchangeRateService.getSupportedFiatCurrencies();
      } else if (type === 'crypto') {
        currencies = this.exchangeRateService.getSupportedCryptoCurrencies();
      } else {
        currencies = this.exchangeRateService.getAllSupportedCurrencies();
      }

      return res.json({
        success: true,
        data: currencies
      });
    } catch (error: any) {
      throw new AppError(`Failed to get supported currencies: ${error.message}`);
    }
  }

  /**
   * Get currency information
   */
  async getCurrencyInfo(req: Request, res: Response): Promise<Response> {
    try {
      const { currency } = req.params;

      if (!currency) {
        throw new ValidationError('Currency code is required');
      }

      const info = this.exchangeRateService.getCurrencyInfo(currency);

      if (!info) {
        throw new NotFoundError(`Currency ${currency} not found`);
      }

      return res.json({
        success: true,
        data: info
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Currency info retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get rate trends and analysis
   */
  async getRateTrends(req: Request, res: Response): Promise<Response> {
    try {
      const { from, to } = req.query;

      if (!from || !to) {
        throw new ValidationError('Missing required query parameters: from, to');
      }

      const trends = await this.exchangeRateService.getRateTrends(
        from as string,
        to as string
      );

      return res.json({
        success: true,
        data: trends
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Rate trends retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get historical exchange rates
   */
  async getHistoricalRates(req: Request, res: Response): Promise<Response> {
    try {
      const { from, to, days = '30' } = req.query;

      if (!from || !to) {
        throw new ValidationError('Missing required query parameters: from, to');
      }

      const historicalRates = await this.exchangeRateService.getHistoricalRates(
        from as string,
        to as string,
        parseInt(days as string)
      );

      return res.json({
        success: true,
        data: historicalRates
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Historical rates retrieval failed: ${error.message}`);
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(req: Request, res: Response): Promise<Response> {
    try {
      // Check if services are working
      const healthStatus = {
        paymentValidation: 'healthy',
        paymentMethodAvailability: 'healthy',
        exchangeRates: 'healthy',
        timestamp: new Date().toISOString()
      };

      // Test exchange rate service
      try {
        await this.exchangeRateService.getExchangeRate('USD', 'EUR');
      } catch (error) {
        healthStatus.exchangeRates = 'unhealthy';
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
