import axios from 'axios';
import { getPrimaryFrontendUrl } from '../utils/urlUtils';
import { safeLogger } from '../utils/safeLogger';
import crypto from 'crypto';

export interface MoonPayConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  webhookSecret: string;
}

export interface MoonPayTransaction {
  id: string;
  status: string;
  currency: string;
  baseCurrency: string;
  quoteCurrency: string;
  baseAmount: number;
  quoteAmount: number;
  feeAmount: number;
  extraFeeAmount: number;
  networkFeeAmount: number;
  walletAddress: string;
  externalTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MoonPayQuote {
  baseCurrency: string;
  quoteCurrency: string;
  baseAmount: number;
  quoteAmount: number;
  feeAmount: number;
  extraFeeAmount: number;
  networkFeeAmount: number;
  totalAmount: number;
  validUntil: string;
}

export interface MoonPayWebhookEvent {
  type: string;
  data: MoonPayTransaction;
  externalTransactionId?: string;
}

export class MoonPayService {
  private config: MoonPayConfig;

  constructor(config: MoonPayConfig) {
    this.config = config;
  }

  private generateSignature(url: string, body?: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const method = body ? 'POST' : 'GET';
    const payload = `${timestamp}${method}${url}${body || ''}`;
    
    return crypto
      .createHmac('sha256', this.config.secretKey)
      .update(payload)
      .digest('hex');
  }

  private getHeaders(url: string, body?: string): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = this.generateSignature(url, body);

    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
    };
  }

  public async getQuote(
    baseCurrency: string,
    quoteCurrency: string,
    baseAmount: number,
    walletAddress: string
  ): Promise<MoonPayQuote | null> {
    try {
      const url = '/v3/currencies/quote';
      const params = new URLSearchParams({
        baseCurrency,
        quoteCurrency,
        baseAmount: baseAmount.toString(),
        walletAddress,
      });

      const fullUrl = `${this.config.baseUrl}${url}?${params}`;
      const headers = this.getHeaders(url);

      const response = await axios.get(fullUrl, { headers, timeout: 10000 });

      if (response.data && response.data.quoteCurrency) {
        return {
          baseCurrency: response.data.baseCurrency,
          quoteCurrency: response.data.quoteCurrency,
          baseAmount: response.data.baseAmount,
          quoteAmount: response.data.quoteAmount,
          feeAmount: response.data.feeAmount,
          extraFeeAmount: response.data.extraFeeAmount || 0,
          networkFeeAmount: response.data.networkFeeAmount || 0,
          totalAmount: response.data.totalAmount,
          validUntil: response.data.validUntil,
        };
      }

      return null;
    } catch (error) {
      safeLogger.error('MoonPay quote error:', error);
      return null;
    }
  }

  public async createTransaction(
    baseCurrency: string,
    quoteCurrency: string,
    baseAmount: number,
    walletAddress: string,
    externalTransactionId?: string
  ): Promise<MoonPayTransaction | null> {
    try {
      const url = '/v3/transactions';
      const body = JSON.stringify({
        baseCurrency,
        quoteCurrency,
        baseAmount,
        walletAddress,
        externalTransactionId,
        redirectURL: `${getPrimaryFrontendUrl()}/ldao/purchase/success`,
        webhookUrl: `${process.env.BACKEND_URL}/api/moonpay/webhook`,
      });

      const headers = this.getHeaders(url, body);

      const response = await axios.post(`${this.config.baseUrl}${url}`, body, { 
        headers, 
        timeout: 15000 
      });

      return response.data;
    } catch (error) {
      safeLogger.error('MoonPay transaction creation error:', error);
      return null;
    }
  }

  public async getTransaction(transactionId: string): Promise<MoonPayTransaction | null> {
    try {
      const url = `/v3/transactions/${transactionId}`;
      const headers = this.getHeaders(url);

      const response = await axios.get(`${this.config.baseUrl}${url}`, { 
        headers, 
        timeout: 10000 
      });

      return response.data;
    } catch (error) {
      safeLogger.error('MoonPay transaction retrieval error:', error);
      return null;
    }
  }

  public async getSupportedCurrencies(): Promise<{ fiat: string[]; crypto: string[] }> {
    try {
      const url = '/v3/currencies';
      const headers = this.getHeaders(url);

      const response = await axios.get(`${this.config.baseUrl}${url}`, { 
        headers, 
        timeout: 10000 
      });

      const currencies = response.data;
      const fiat: string[] = [];
      const crypto: string[] = [];

      currencies.forEach((currency: any) => {
        if (currency.type === 'fiat') {
          fiat.push(currency.code);
        } else if (currency.type === 'crypto') {
          crypto.push(currency.code);
        }
      });

      return { fiat, crypto };
    } catch (error) {
      safeLogger.error('MoonPay supported currencies error:', error);
      return { fiat: ['USD', 'EUR', 'GBP'], crypto: ['ETH', 'BTC', 'USDC'] };
    }
  }

  public async verifyWebhook(payload: string, signature: string): Promise<boolean> {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      safeLogger.error('MoonPay webhook verification error:', error);
      return false;
    }
  }

  public async processWebhookEvent(event: MoonPayWebhookEvent): Promise<void> {
    try {
      safeLogger.info(`Processing MoonPay webhook event: ${event.type}`);

      switch (event.type) {
        case 'transaction_completed':
          await this.handleTransactionCompleted(event.data);
          break;
        case 'transaction_failed':
          await this.handleTransactionFailed(event.data);
          break;
        case 'transaction_pending':
          await this.handleTransactionPending(event.data);
          break;
        default:
          safeLogger.info(`Unhandled MoonPay event type: ${event.type}`);
      }
    } catch (error) {
      safeLogger.error('MoonPay webhook processing error:', error);
    }
  }

  private async handleTransactionCompleted(transaction: MoonPayTransaction): Promise<void> {
    safeLogger.info('MoonPay transaction completed:', transaction.id);
    
    // In a real implementation, this would:
    // 1. Update database with completed transaction
    // 2. Trigger LDAO token minting
    // 3. Send confirmation notification
    // 4. Update user's token balance
  }

  private async handleTransactionFailed(transaction: MoonPayTransaction): Promise<void> {
    safeLogger.info('MoonPay transaction failed:', transaction.id);
    
    // In a real implementation, this would:
    // 1. Update database with failed transaction
    // 2. Send failure notification
    // 3. Initiate refund if applicable
    // 4. Log failure for analysis
  }

  private async handleTransactionPending(transaction: MoonPayTransaction): Promise<void> {
    safeLogger.info('MoonPay transaction pending:', transaction.id);
    
    // In a real implementation, this would:
    // 1. Update database with pending status
    // 2. Send pending notification
    // 3. Set up monitoring for status changes
  }

  public async getTransactionLimits(currency: string): Promise<{ min: number; max: number } | null> {
    try {
      const url = `/v3/currencies/${currency}/limits`;
      const headers = this.getHeaders(url);

      const response = await axios.get(`${this.config.baseUrl}${url}`, { 
        headers, 
        timeout: 10000 
      });

      return {
        min: response.data.minAmount || 0,
        max: response.data.maxAmount || 10000,
      };
    } catch (error) {
      safeLogger.error('MoonPay transaction limits error:', error);
      return { min: 10, max: 10000 }; // Default limits
    }
  }

  public async estimateTransactionTime(baseCurrency: string, quoteCurrency: string): Promise<number> {
    // Return estimated transaction time in minutes
    if (baseCurrency === 'USD' && ['ETH', 'USDC'].includes(quoteCurrency)) {
      return 10; // 10 minutes for USD to major cryptos
    }
    
    return 15; // 15 minutes for other conversions
  }

  public generatePaymentUrl(
    baseCurrency: string,
    quoteCurrency: string,
    baseAmount: number,
    walletAddress: string,
    externalTransactionId?: string
  ): string {
    const params = new URLSearchParams({
      apiKey: this.config.apiKey,
      baseCurrency,
      quoteCurrency,
      baseAmount: baseAmount.toString(),
      walletAddress,
      redirectURL: `${getPrimaryFrontendUrl()}/ldao/purchase/success`,
      ...(externalTransactionId && { externalTransactionId }),
    });

    return `${this.config.baseUrl}/buy?${params}`;
  }

  public async cancelTransaction(transactionId: string): Promise<boolean> {
    try {
      const url = `/v3/transactions/${transactionId}/cancel`;
      const headers = this.getHeaders(url, '{}');

      const response = await axios.post(`${this.config.baseUrl}${url}`, {}, { 
        headers, 
        timeout: 10000 
      });

      return response.status === 200;
    } catch (error) {
      safeLogger.error('MoonPay transaction cancellation error:', error);
      return false;
    }
  }

  public async getTransactionHistory(walletAddress: string): Promise<MoonPayTransaction[]> {
    try {
      const url = '/v3/transactions';
      const params = new URLSearchParams({
        walletAddress,
        limit: '50',
      });

      const fullUrl = `${this.config.baseUrl}${url}?${params}`;
      const headers = this.getHeaders(url);

      const response = await axios.get(fullUrl, { headers, timeout: 10000 });

      return response.data || [];
    } catch (error) {
      safeLogger.error('MoonPay transaction history error:', error);
      return [];
    }
  }
}
