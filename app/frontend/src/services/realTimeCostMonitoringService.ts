/**
 * Real-Time Cost Monitoring Service
 * Provides WebSocket connections for live gas price updates and automatic prioritization updates
 */

import { 
  PaymentMethod,
  PrioritizedPaymentMethod,
  NetworkConditions,
  MarketConditions,
  CostEstimate,
  PrioritizationContext
} from '../types/paymentPrioritization';
import { gasFeeEstimationService } from './gasFeeEstimationService';
import { exchangeRateService } from './exchangeRateService';
import { PaymentMethodPrioritizationService } from './paymentMethodPrioritizationService';

interface CostChangeNotification {
  type: 'gas_price_change' | 'exchange_rate_change' | 'prioritization_update';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  oldValue?: number;
  newValue?: number;
  affectedMethods: PaymentMethod[];
  timestamp: Date;
  actionRequired?: string;
}

interface RealTimeCostData {
  chainId: number;
  gasPrice: bigint;
  gasPriceUSD: number;
  exchangeRates: Record<string, number>;
  networkCongestion: 'low' | 'medium' | 'high';
  lastUpdated: Date;
}

interface MonitoringConfig {
  updateIntervalMs: number;
  gasPriceThresholds: {
    warningIncrease: number; // Percentage increase to trigger warning
    criticalIncrease: number; // Percentage increase to trigger critical alert
  };
  exchangeRateThresholds: {
    warningChange: number; // Percentage change to trigger warning
    criticalChange: number; // Percentage change to trigger critical alert
  };
  enableNotifications: boolean;
  enableAutomaticReordering: boolean;
}

export class RealTimeCostMonitoringService {
  private monitoringIntervals: Map<number, NodeJS.Timeout> = new Map();
  private costDataCache: Map<number, RealTimeCostData> = new Map();
  private listeners: Map<string, Set<Function>> = new Map();
  private config: MonitoringConfig;
  private prioritizationService?: PaymentMethodPrioritizationService;
  private isMonitoring = false;

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      updateIntervalMs: 30000, // 30 seconds
      gasPriceThresholds: {
        warningIncrease: 25, // 25% increase
        criticalIncrease: 50 // 50% increase
      },
      exchangeRateThresholds: {
        warningChange: 5, // 5% change
        criticalChange: 10 // 10% change
      },
      enableNotifications: true,
      enableAutomaticReordering: true,
      ...config
    };
  }

  /**
   * Start real-time monitoring for specified chains
   */
  startMonitoring(
    chainIds: number[],
    prioritizationService?: PaymentMethodPrioritizationService
  ): void {
    if (this.isMonitoring) {
      console.warn('Real-time monitoring is already active');
      return;
    }

    this.prioritizationService = prioritizationService;
    this.isMonitoring = true;

    console.log('Starting real-time cost monitoring for chains:', chainIds);

    chainIds.forEach(chainId => {
      this.startChainMonitoring(chainId);
    });

    // Start exchange rate monitoring
    this.startExchangeRateMonitoring();

    this.emit('monitoring_started', { chainIds });
  }

  /**
   * Stop all real-time monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    console.log('Stopping real-time cost monitoring');

    // Clear all monitoring intervals
    this.monitoringIntervals.forEach((interval, chainId) => {
      clearInterval(interval);
      console.log(`Stopped monitoring for chain ${chainId}`);
    });

    this.monitoringIntervals.clear();
    this.isMonitoring = false;

    this.emit('monitoring_stopped', {});
  }

  /**
   * Start monitoring for a specific chain
   */
  private startChainMonitoring(chainId: number): void {
    // Initial data fetch
    this.updateChainCostData(chainId);

    // Set up periodic updates
    const interval = setInterval(() => {
      this.updateChainCostData(chainId);
    }, this.config.updateIntervalMs);

    this.monitoringIntervals.set(chainId, interval);
    console.log(`Started monitoring for chain ${chainId} with ${this.config.updateIntervalMs}ms interval`);
  }

  /**
   * Update cost data for a specific chain
   */
  private async updateChainCostData(chainId: number): Promise<void> {
    try {
      const previousData = this.costDataCache.get(chainId);
      
      // Get current network conditions
      const networkConditions = await gasFeeEstimationService.getNetworkConditions(chainId);
      
      // Get exchange rates for relevant tokens
      const exchangeRates = await this.getRelevantExchangeRates(chainId);

      const newData: RealTimeCostData = {
        chainId,
        gasPrice: networkConditions.gasPrice,
        gasPriceUSD: networkConditions.gasPriceUSD,
        exchangeRates,
        networkCongestion: networkConditions.networkCongestion,
        lastUpdated: new Date()
      };

      // Check for significant changes and emit notifications
      if (previousData) {
        await this.checkForSignificantChanges(previousData, newData);
      }

      // Update cache
      this.costDataCache.set(chainId, newData);

      // Emit real-time update
      this.emit('cost_data_updated', {
        chainId,
        data: newData,
        previousData
      });

      // Trigger automatic prioritization update if enabled
      if (this.config.enableAutomaticReordering && this.prioritizationService) {
        await this.triggerPrioritizationUpdate(chainId, newData, previousData);
      }

    } catch (error) {
      console.error(`Failed to update cost data for chain ${chainId}:`, error);
      this.emit('monitoring_error', {
        chainId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Start exchange rate monitoring
   */
  private startExchangeRateMonitoring(): void {
    const updateExchangeRates = async () => {
      try {
        // Monitor key exchange rates
        const currencies = ['ETH', 'USDC', 'USDT', 'MATIC'];
        
        for (const currency of currencies) {
          const rate = await exchangeRateService.getExchangeRate(currency, 'USD');
          if (rate) {
            this.emit('exchange_rate_updated', {
              currency,
              rate: rate.rate,
              timestamp: rate.lastUpdated
            });
          }
        }
      } catch (error) {
        console.error('Exchange rate monitoring error:', error);
      }
    };

    // Initial update
    updateExchangeRates();

    // Set up periodic updates (less frequent than gas prices)
    const exchangeRateInterval = setInterval(updateExchangeRates, this.config.updateIntervalMs * 2);
    this.monitoringIntervals.set(-1, exchangeRateInterval); // Use -1 as key for exchange rates
  }

  /**
   * Get relevant exchange rates for a chain
   */
  private async getRelevantExchangeRates(chainId: number): Promise<Record<string, number>> {
    const rates: Record<string, number> = {};

    try {
      // Get native token rate
      const nativeToken = this.getNativeTokenSymbol(chainId);
      const nativeRate = await exchangeRateService.getExchangeRate(nativeToken, 'USD');
      if (nativeRate) {
        rates[nativeToken] = nativeRate.rate;
      }

      // Get stablecoin rates
      const stablecoins = ['USDC', 'USDT'];
      for (const stablecoin of stablecoins) {
        const rate = await exchangeRateService.getExchangeRate(stablecoin, 'USD');
        if (rate) {
          rates[stablecoin] = rate.rate;
        }
      }
    } catch (error) {
      console.error('Failed to get exchange rates:', error);
    }

    return rates;
  }

  /**
   * Check for significant changes in cost data
   */
  private async checkForSignificantChanges(
    previousData: RealTimeCostData,
    newData: RealTimeCostData
  ): Promise<void> {
    // Check gas price changes
    const gasPriceChange = this.calculatePercentageChange(
      previousData.gasPriceUSD,
      newData.gasPriceUSD
    );

    if (Math.abs(gasPriceChange) >= this.config.gasPriceThresholds.warningIncrease) {
      const severity = Math.abs(gasPriceChange) >= this.config.gasPriceThresholds.criticalIncrease 
        ? 'critical' 
        : 'high';

      const notification: CostChangeNotification = {
        type: 'gas_price_change',
        severity,
        message: `Gas prices ${gasPriceChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(gasPriceChange).toFixed(1)}%`,
        oldValue: previousData.gasPriceUSD,
        newValue: newData.gasPriceUSD,
        affectedMethods: this.getAffectedPaymentMethods(newData.chainId),
        timestamp: new Date(),
        actionRequired: severity === 'critical' 
          ? 'Consider switching to fiat payment or waiting for lower gas fees'
          : 'Review payment method selection'
      };

      this.emitCostChangeNotification(notification);
    }

    // Check exchange rate changes
    for (const [currency, newRate] of Object.entries(newData.exchangeRates)) {
      const oldRate = previousData.exchangeRates[currency];
      if (oldRate) {
        const rateChange = this.calculatePercentageChange(oldRate, newRate);
        
        if (Math.abs(rateChange) >= this.config.exchangeRateThresholds.warningChange) {
          const severity = Math.abs(rateChange) >= this.config.exchangeRateThresholds.criticalChange 
            ? 'critical' 
            : 'medium';

          const notification: CostChangeNotification = {
            type: 'exchange_rate_change',
            severity,
            message: `${currency} exchange rate ${rateChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(rateChange).toFixed(1)}%`,
            oldValue: oldRate,
            newValue: newRate,
            affectedMethods: this.getAffectedPaymentMethodsByCurrency(currency),
            timestamp: new Date()
          };

          this.emitCostChangeNotification(notification);
        }
      }
    }
  }

  /**
   * Trigger automatic prioritization update
   */
  private async triggerPrioritizationUpdate(
    chainId: number,
    newData: RealTimeCostData,
    previousData?: RealTimeCostData
  ): Promise<void> {
    if (!this.prioritizationService || !previousData) return;

    try {
      // Check if changes are significant enough to trigger reordering
      const gasPriceChange = this.calculatePercentageChange(
        previousData.gasPriceUSD,
        newData.gasPriceUSD
      );

      if (Math.abs(gasPriceChange) >= 15) { // 15% threshold for automatic reordering
        const marketConditions: MarketConditions = {
          gasConditions: [{
            chainId,
            gasPrice: newData.gasPrice,
            gasPriceUSD: newData.gasPriceUSD,
            networkCongestion: newData.networkCongestion,
            blockTime: this.getAverageBlockTime(chainId),
            lastUpdated: newData.lastUpdated
          }],
          exchangeRates: Object.entries(newData.exchangeRates).map(([token, rate]) => ({
            fromToken: token,
            toToken: 'USD',
            rate: rate,
            source: 'realtime',
            lastUpdated: newData.lastUpdated,
            confidence: 0.9
          })),
          networkAvailability: [],
          lastUpdated: newData.lastUpdated
        };

        this.emit('automatic_reordering_triggered', {
          chainId,
          gasPriceChange,
          marketConditions
        });

        const notification: CostChangeNotification = {
          type: 'prioritization_update',
          severity: 'medium',
          message: 'Payment method order updated due to market changes',
          affectedMethods: this.getAffectedPaymentMethods(chainId),
          timestamp: new Date(),
          actionRequired: 'Review updated payment method recommendations'
        };

        this.emitCostChangeNotification(notification);
      }
    } catch (error) {
      console.error('Failed to trigger prioritization update:', error);
    }
  }

  /**
   * Emit cost change notification
   */
  private emitCostChangeNotification(notification: CostChangeNotification): void {
    if (!this.config.enableNotifications) return;

    console.log('Cost change notification:', notification);
    this.emit('cost_change_notification', notification);
  }

  /**
   * Get current cost data for a chain
   */
  getCurrentCostData(chainId: number): RealTimeCostData | null {
    return this.costDataCache.get(chainId) || null;
  }

  /**
   * Get all monitored cost data
   */
  getAllCostData(): Map<number, RealTimeCostData> {
    return new Map(this.costDataCache);
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('Updated monitoring configuration:', this.config);
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): {
    isActive: boolean;
    monitoredChains: number[];
    lastUpdate: Date | null;
    config: MonitoringConfig;
  } {
    const monitoredChains = Array.from(this.monitoringIntervals.keys()).filter(id => id !== -1);
    const lastUpdate = Math.max(...Array.from(this.costDataCache.values()).map(data => data.lastUpdated.getTime()));

    return {
      isActive: this.isMonitoring,
      monitoredChains,
      lastUpdate: lastUpdate > 0 ? new Date(lastUpdate) : null,
      config: this.config
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
          console.error('Error in real-time monitoring event callback:', error);
        }
      });
    }
  }

  // Utility methods
  private calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  private getNativeTokenSymbol(chainId: number): string {
    const symbolMap: Record<number, string> = {
      1: 'ETH',
      137: 'MATIC',
      42161: 'ETH',
      11155111: 'ETH'
    };
    return symbolMap[chainId] || 'ETH';
  }

  private getAverageBlockTime(chainId: number): number {
    const blockTimeMap: Record<number, number> = {
      1: 12, // Ethereum mainnet
      137: 2, // Polygon
      42161: 1, // Arbitrum
      11155111: 12 // Sepolia
    };
    return blockTimeMap[chainId] || 12;
  }

  private getAffectedPaymentMethods(chainId: number): PaymentMethod[] {
    // This would typically come from the payment method registry
    // For now, return mock data based on chain
    const mockMethods: PaymentMethod[] = [];
    
    if (chainId === 1 || chainId === 11155111) {
      mockMethods.push(
        { 
          id: 'eth-native', 
          type: 'NATIVE_ETH' as any, 
          name: 'ETH', 
          description: 'Native Ethereum',
          chainId,
          enabled: true,
          supportedNetworks: [chainId]
        },
        { 
          id: 'usdc-eth', 
          type: 'STABLECOIN_USDC' as any, 
          name: 'USDC', 
          description: 'USD Coin Stablecoin',
          chainId,
          enabled: true,
          supportedNetworks: [chainId]
        },
        { 
          id: 'usdt-eth', 
          type: 'STABLECOIN_USDT' as any, 
          name: 'USDT', 
          description: 'Tether USD Stablecoin',
          chainId,
          enabled: true,
          supportedNetworks: [chainId]
        }
      );
    }

    return mockMethods;
  }

  private getAffectedPaymentMethodsByCurrency(currency: string): PaymentMethod[] {
    // Mock implementation - would typically query payment method registry
    return [];
  }

  private calculateVolatilityIndex(exchangeRates: Record<string, number>): number {
    // Simple volatility calculation - would be more sophisticated in production
    const rates = Object.values(exchangeRates);
    if (rates.length === 0) return 0;

    const mean = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / rates.length;
    
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }
}

// Export singleton instance
export const realTimeCostMonitoringService = new RealTimeCostMonitoringService();

export default RealTimeCostMonitoringService;