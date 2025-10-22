/**
 * Payment WebSocket Service
 * Provides WebSocket connections specifically for payment method prioritization updates
 */

import { WebSocketClientService } from './webSocketClientService';
import { 
  PaymentMethod,
  PrioritizedPaymentMethod,
  NetworkConditions,
  CostEstimate,
  MarketConditions
} from '../types/paymentPrioritization';
import { realTimeCostMonitoringService } from './realTimeCostMonitoringService';

interface PaymentWebSocketConfig {
  url?: string;
  walletAddress: string;
  enableGasPriceUpdates: boolean;
  enableExchangeRateUpdates: boolean;
  enablePrioritizationUpdates: boolean;
}

interface GasPriceUpdate {
  chainId: number;
  gasPrice: bigint;
  gasPriceUSD: number;
  networkCongestion: 'low' | 'medium' | 'high';
  timestamp: Date;
  source: string;
}

interface ExchangeRateUpdate {
  currency: string;
  rate: number;
  change24h: number;
  timestamp: Date;
  source: string;
}

interface PrioritizationUpdate {
  context: string; // checkout session or user identifier
  updatedMethods: PrioritizedPaymentMethod[];
  reason: string;
  timestamp: Date;
}

export class PaymentWebSocketService {
  private wsService: WebSocketClientService | null = null;
  private config: PaymentWebSocketConfig;
  private subscriptions: Set<string> = new Set();
  private listeners: Map<string, Set<Function>> = new Map();
  private isConnected = false;

  constructor(config: PaymentWebSocketConfig) {
    this.config = {
      url: config.url || process.env.NEXT_PUBLIC_PAYMENT_WS_URL || 'ws://localhost:10001',
      ...config
    };
  }

  /**
   * Initialize WebSocket connection for payment updates
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      this.wsService = new WebSocketClientService({
        url: this.config.url!,
        walletAddress: this.config.walletAddress,
        autoReconnect: true,
        reconnectAttempts: 5,
        reconnectDelay: 2000
      });

      await this.wsService.connect();
      this.setupEventHandlers();
      this.setupSubscriptions();
      
      this.isConnected = true;
      this.emit('connected', { timestamp: new Date() });
      
      console.log('Payment WebSocket service connected');
    } catch (error) {
      console.error('Failed to connect payment WebSocket service:', error);
      throw error;
    }
  }

  /**
   * Disconnect WebSocket service
   */
  disconnect(): void {
    if (this.wsService) {
      this.wsService.disconnect();
      this.wsService = null;
    }
    
    this.subscriptions.clear();
    this.isConnected = false;
    this.emit('disconnected', { timestamp: new Date() });
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.wsService) return;

    // Gas price updates
    this.wsService.on('gas_price_update', (data: any) => {
      const update: GasPriceUpdate = {
        chainId: data.chainId,
        gasPrice: BigInt(data.gasPrice),
        gasPriceUSD: data.gasPriceUSD,
        networkCongestion: data.networkCongestion,
        timestamp: new Date(data.timestamp),
        source: data.source || 'websocket'
      };

      this.handleGasPriceUpdate(update);
    });

    // Exchange rate updates
    this.wsService.on('exchange_rate_update', (data: any) => {
      const update: ExchangeRateUpdate = {
        currency: data.currency,
        rate: data.rate,
        change24h: data.change24h || 0,
        timestamp: new Date(data.timestamp),
        source: data.source || 'websocket'
      };

      this.handleExchangeRateUpdate(update);
    });

    // Prioritization updates
    this.wsService.on('prioritization_update', (data: any) => {
      const update: PrioritizationUpdate = {
        context: data.context,
        updatedMethods: data.updatedMethods,
        reason: data.reason,
        timestamp: new Date(data.timestamp)
      };

      this.handlePrioritizationUpdate(update);
    });

    // Network congestion alerts
    this.wsService.on('network_congestion_alert', (data: any) => {
      this.emit('network_congestion_alert', {
        chainId: data.chainId,
        level: data.level,
        message: data.message,
        timestamp: new Date(data.timestamp)
      });
    });

    // Market volatility alerts
    this.wsService.on('market_volatility_alert', (data: any) => {
      this.emit('market_volatility_alert', {
        currencies: data.currencies,
        volatilityIndex: data.volatilityIndex,
        message: data.message,
        timestamp: new Date(data.timestamp)
      });
    });

    // Connection events
    this.wsService.on('authenticated', () => {
      console.log('Payment WebSocket authenticated');
      this.emit('authenticated', { timestamp: new Date() });
    });

    this.wsService.on('disconnected', (data: any) => {
      this.isConnected = false;
      this.emit('disconnected', { reason: data.reason, timestamp: new Date() });
    });
  }

  /**
   * Setup initial subscriptions
   */
  private setupSubscriptions(): void {
    if (!this.wsService) return;

    // Subscribe to gas price updates for relevant chains
    if (this.config.enableGasPriceUpdates) {
      const chains = [1, 137, 42161, 11155111]; // Mainnet, Polygon, Arbitrum, Sepolia
      chains.forEach(chainId => {
        this.subscribeToGasPriceUpdates(chainId);
      });
    }

    // Subscribe to exchange rate updates
    if (this.config.enableExchangeRateUpdates) {
      const currencies = ['ETH', 'USDC', 'USDT', 'MATIC'];
      currencies.forEach(currency => {
        this.subscribeToExchangeRateUpdates(currency);
      });
    }

    // Subscribe to prioritization updates for this wallet
    if (this.config.enablePrioritizationUpdates) {
      this.subscribeToPrioritizationUpdates(this.config.walletAddress);
    }
  }

  /**
   * Subscribe to gas price updates for a specific chain
   */
  subscribeToGasPriceUpdates(chainId: number): void {
    if (!this.wsService) return;

    const subscriptionId = this.wsService.subscribe('global', `gas_prices_${chainId}`, {
      eventTypes: ['gas_price_update', 'network_congestion_alert'],
      priority: ['high', 'urgent']
    });

    this.subscriptions.add(subscriptionId);
    console.log(`Subscribed to gas price updates for chain ${chainId}`);
  }

  /**
   * Subscribe to exchange rate updates for a currency
   */
  subscribeToExchangeRateUpdates(currency: string): void {
    if (!this.wsService) return;

    const subscriptionId = this.wsService.subscribe('global', `exchange_rates_${currency}`, {
      eventTypes: ['exchange_rate_update', 'market_volatility_alert'],
      priority: ['medium', 'high']
    });

    this.subscriptions.add(subscriptionId);
    console.log(`Subscribed to exchange rate updates for ${currency}`);
  }

  /**
   * Subscribe to prioritization updates for a wallet
   */
  subscribeToPrioritizationUpdates(walletAddress: string): void {
    if (!this.wsService) return;

    const subscriptionId = this.wsService.subscribe('user', walletAddress, {
      eventTypes: ['prioritization_update'],
      priority: ['medium', 'high']
    });

    this.subscriptions.add(subscriptionId);
    console.log(`Subscribed to prioritization updates for wallet ${walletAddress}`);
  }

  /**
   * Handle gas price updates
   */
  private handleGasPriceUpdate(update: GasPriceUpdate): void {
    console.log('Received gas price update:', update);

    // Update real-time monitoring service (emit is private, using console.log as fallback)
    console.log('WebSocket gas price update:', update);

    // Emit to listeners
    this.emit('gas_price_update', update);

    // Check for significant changes and emit notifications
    this.checkGasPriceSignificance(update);
  }

  /**
   * Handle exchange rate updates
   */
  private handleExchangeRateUpdate(update: ExchangeRateUpdate): void {
    console.log('Received exchange rate update:', update);

    // Update real-time monitoring service (emit is private, using console.log as fallback)
    console.log('WebSocket exchange rate update:', update);

    // Emit to listeners
    this.emit('exchange_rate_update', update);

    // Check for significant changes
    this.checkExchangeRateSignificance(update);
  }

  /**
   * Handle prioritization updates
   */
  private handlePrioritizationUpdate(update: PrioritizationUpdate): void {
    console.log('Received prioritization update:', update);

    // Emit to listeners
    this.emit('prioritization_update', update);

    // Emit notification for UI updates
    this.emit('prioritization_changed', {
      context: update.context,
      reason: update.reason,
      methodCount: update.updatedMethods.length,
      timestamp: update.timestamp
    });
  }

  /**
   * Check gas price significance and emit notifications
   */
  private checkGasPriceSignificance(update: GasPriceUpdate): void {
    // Emit notifications based on gas price levels
    if (update.gasPriceUSD > 50) {
      this.emit('high_gas_fee_alert', {
        chainId: update.chainId,
        gasPriceUSD: update.gasPriceUSD,
        severity: 'high',
        message: `Very high gas fees detected: $${update.gasPriceUSD.toFixed(2)}`,
        recommendation: 'Consider using fiat payment or waiting for lower fees'
      });
    } else if (update.gasPriceUSD > 25) {
      this.emit('moderate_gas_fee_alert', {
        chainId: update.chainId,
        gasPriceUSD: update.gasPriceUSD,
        severity: 'medium',
        message: `Elevated gas fees: $${update.gasPriceUSD.toFixed(2)}`,
        recommendation: 'Review payment method options'
      });
    }

    // Network congestion notifications
    if (update.networkCongestion === 'high') {
      this.emit('network_congestion_notification', {
        chainId: update.chainId,
        level: 'high',
        message: 'Network congestion is high - expect slower confirmations',
        estimatedDelay: '10-30 minutes'
      });
    }
  }

  /**
   * Check exchange rate significance
   */
  private checkExchangeRateSignificance(update: ExchangeRateUpdate): void {
    if (Math.abs(update.change24h) > 10) {
      this.emit('significant_rate_change', {
        currency: update.currency,
        change: update.change24h,
        rate: update.rate,
        severity: Math.abs(update.change24h) > 20 ? 'high' : 'medium',
        message: `${update.currency} has ${update.change24h > 0 ? 'increased' : 'decreased'} by ${Math.abs(update.change24h).toFixed(1)}% in 24h`
      });
    }
  }

  /**
   * Request immediate prioritization update
   */
  requestPrioritizationUpdate(context: string, paymentMethods: PaymentMethod[]): void {
    if (!this.wsService || !this.isConnected) return;

    this.wsService.send('request_prioritization_update', {
      context,
      paymentMethods: paymentMethods.map(method => ({
        id: method.id,
        type: method.type,
        chainId: method.chainId
      })),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Request current market data
   */
  requestMarketData(chainIds: number[]): void {
    if (!this.wsService || !this.isConnected) return;

    this.wsService.send('request_market_data', {
      chainIds,
      includeGasPrices: true,
      includeExchangeRates: true,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Set gas price alert thresholds
   */
  setGasPriceAlerts(chainId: number, thresholds: { warning: number; critical: number }): void {
    if (!this.wsService || !this.isConnected) return;

    this.wsService.send('set_gas_price_alerts', {
      chainId,
      thresholds,
      walletAddress: this.config.walletAddress
    });
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    subscriptionCount: number;
    lastUpdate?: Date;
  } {
    return {
      isConnected: this.isConnected,
      subscriptionCount: this.subscriptions.size,
      lastUpdate: this.isConnected ? new Date() : undefined
    };
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in payment WebSocket event callback:', error);
        }
      });
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.disconnect();
    this.listeners.clear();
    this.subscriptions.clear();
  }
}

export default PaymentWebSocketService;