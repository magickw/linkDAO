import { ethers } from 'ethers';
import { safeLogger } from '../utils/safeLogger';
import { MultiChainDEXService } from './multiChainDEXService';
import { SwapParams, TokenInfo } from '../types/uniswapV3';

export interface LimitOrder {
  id: string;
  userId: string;
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountIn: string;
  targetPrice: string;
  slippageTolerance: number;
  chainId: number;
  status: 'pending' | 'filled' | 'cancelled' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  filledAt?: Date;
  transactionHash?: string;
}

export interface PriceAlert {
  id: string;
  userId: string;
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  targetPrice: string;
  condition: 'above' | 'below';
  chainId: number;
  isActive: boolean;
  createdAt: Date;
  triggeredAt?: Date;
}

export interface PortfolioPosition {
  tokenAddress: string;
  symbol: string;
  balance: string;
  valueUSD: string;
  chainId: number;
  lastUpdated: Date;
}

export interface TradingHistory {
  id: string;
  userId: string;
  type: 'swap' | 'limit_order' | 'cross_chain';
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountIn: string;
  amountOut: string;
  price: string;
  gasCost: string;
  chainId: number;
  transactionHash: string;
  timestamp: Date;
}

export class AdvancedTradingService {
  private multiChainService: MultiChainDEXService;
  private limitOrders: Map<string, LimitOrder>;
  private priceAlerts: Map<string, PriceAlert>;
  private portfolios: Map<string, PortfolioPosition[]>;
  private tradingHistory: Map<string, TradingHistory[]>;

  constructor() {
    this.multiChainService = new MultiChainDEXService();
    this.limitOrders = new Map();
    this.priceAlerts = new Map();
    this.portfolios = new Map();
    this.tradingHistory = new Map();
  }
}  /**
 
  * Create a limit order
   */
  async createLimitOrder(
    userId: string,
    tokenIn: TokenInfo,
    tokenOut: TokenInfo,
    amountIn: string,
    targetPrice: string,
    slippageTolerance: number = 0.5,
    chainId: number = 1,
    expirationHours: number = 24
  ): Promise<LimitOrder> {
    const orderId = this.generateOrderId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationHours * 60 * 60 * 1000);

    const limitOrder: LimitOrder = {
      id: orderId,
      userId,
      tokenIn,
      tokenOut,
      amountIn,
      targetPrice,
      slippageTolerance,
      chainId,
      status: 'pending',
      createdAt: now,
      expiresAt,
    };

    this.limitOrders.set(orderId, limitOrder);
    
    // Start monitoring this order
    this.monitorLimitOrder(orderId);

    return limitOrder;
  }

  /**
   * Cancel a limit order
   */
  async cancelLimitOrder(userId: string, orderId: string): Promise<boolean> {
    const order = this.limitOrders.get(orderId);
    
    if (!order || order.userId !== userId) {
      throw new Error('Order not found or unauthorized');
    }

    if (order.status !== 'pending') {
      throw new Error('Order cannot be cancelled');
    }

    order.status = 'cancelled';
    this.limitOrders.set(orderId, order);

    return true;
  }

  /**
   * Get user's limit orders
   */
  getUserLimitOrders(userId: string, status?: string): LimitOrder[] {
    const userOrders: LimitOrder[] = [];
    
    for (const order of this.limitOrders.values()) {
      if (order.userId === userId) {
        if (!status || order.status === status) {
          userOrders.push(order);
        }
      }
    }

    return userOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Create a price alert
   */
  async createPriceAlert(
    userId: string,
    tokenIn: TokenInfo,
    tokenOut: TokenInfo,
    targetPrice: string,
    condition: 'above' | 'below',
    chainId: number = 1
  ): Promise<PriceAlert> {
    const alertId = this.generateAlertId();

    const priceAlert: PriceAlert = {
      id: alertId,
      userId,
      tokenIn,
      tokenOut,
      targetPrice,
      condition,
      chainId,
      isActive: true,
      createdAt: new Date(),
    };

    this.priceAlerts.set(alertId, priceAlert);
    
    // Start monitoring this alert
    this.monitorPriceAlert(alertId);

    return priceAlert;
  }

  /**
   * Remove a price alert
   */
  async removePriceAlert(userId: string, alertId: string): Promise<boolean> {
    const alert = this.priceAlerts.get(alertId);
    
    if (!alert || alert.userId !== userId) {
      throw new Error('Alert not found or unauthorized');
    }

    this.priceAlerts.delete(alertId);
    return true;
  }

  /**
   * Get user's price alerts
   */
  getUserPriceAlerts(userId: string, isActive?: boolean): PriceAlert[] {
    const userAlerts: PriceAlert[] = [];
    
    for (const alert of this.priceAlerts.values()) {
      if (alert.userId === userId) {
        if (isActive === undefined || alert.isActive === isActive) {
          userAlerts.push(alert);
        }
      }
    }

    return userAlerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }  /
**
   * Update user's portfolio
   */
  async updatePortfolio(userId: string, walletAddress: string, chainId: number): Promise<PortfolioPosition[]> {
    try {
      // This would typically query the blockchain for token balances
      // For now, we'll simulate portfolio positions
      const positions: PortfolioPosition[] = [
        {
          tokenAddress: '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8',
          symbol: 'USDC',
          balance: '1000.50',
          valueUSD: '1000.50',
          chainId,
          lastUpdated: new Date(),
        },
        {
          tokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          symbol: 'WETH',
          balance: '0.5',
          valueUSD: '1200.00',
          chainId,
          lastUpdated: new Date(),
        },
      ];

      this.portfolios.set(userId, positions);
      return positions;
    } catch (error) {
      safeLogger.error('Error updating portfolio:', error);
      throw new Error('Failed to update portfolio');
    }
  }

  /**
   * Get user's portfolio
   */
  getUserPortfolio(userId: string): PortfolioPosition[] {
    return this.portfolios.get(userId) || [];
  }

  /**
   * Add trading history entry
   */
  async addTradingHistory(
    userId: string,
    type: 'swap' | 'limit_order' | 'cross_chain',
    tokenIn: TokenInfo,
    tokenOut: TokenInfo,
    amountIn: string,
    amountOut: string,
    gasCost: string,
    chainId: number,
    transactionHash: string
  ): Promise<void> {
    const historyEntry: TradingHistory = {
      id: this.generateHistoryId(),
      userId,
      type,
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      price: (parseFloat(amountOut) / parseFloat(amountIn)).toString(),
      gasCost,
      chainId,
      transactionHash,
      timestamp: new Date(),
    };

    const userHistory = this.tradingHistory.get(userId) || [];
    userHistory.unshift(historyEntry); // Add to beginning
    
    // Keep only last 100 entries
    if (userHistory.length > 100) {
      userHistory.splice(100);
    }

    this.tradingHistory.set(userId, userHistory);
  }

  /**
   * Get user's trading history
   */
  getUserTradingHistory(userId: string, limit: number = 50): TradingHistory[] {
    const history = this.tradingHistory.get(userId) || [];
    return history.slice(0, limit);
  }

  /**
   * Generate tax report for user
   */
  async generateTaxReport(userId: string, year: number): Promise<{
    totalTrades: number;
    totalVolume: string;
    totalGasCost: string;
    profitLoss: string;
    trades: TradingHistory[];
  }> {
    const allHistory = this.tradingHistory.get(userId) || [];
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const yearTrades = allHistory.filter(trade => 
      trade.timestamp >= yearStart && trade.timestamp < yearEnd
    );

    const totalVolume = yearTrades.reduce((sum, trade) => 
      sum + parseFloat(trade.amountIn), 0
    ).toString();

    const totalGasCost = yearTrades.reduce((sum, trade) => 
      sum + parseFloat(trade.gasCost), 0
    ).toString();

    // Simplified P&L calculation
    const profitLoss = '0'; // Would require more complex calculation

    return {
      totalTrades: yearTrades.length,
      totalVolume,
      totalGasCost,
      profitLoss,
      trades: yearTrades,
    };
  }  /
**
   * Monitor limit order for execution
   */
  private async monitorLimitOrder(orderId: string): Promise<void> {
    const order = this.limitOrders.get(orderId);
    if (!order || order.status !== 'pending') {
      return;
    }

    try {
      // Switch to the order's chain
      await this.multiChainService.switchChain(order.chainId);

      // Get current price
      const swapParams: SwapParams = {
        tokenIn: order.tokenIn,
        tokenOut: order.tokenOut,
        amountIn: parseFloat(order.amountIn),
        slippageTolerance: order.slippageTolerance,
      };

      const quote = await this.multiChainService.getSwapQuote(swapParams);
      const currentPrice = parseFloat(quote.amountOut) / parseFloat(quote.amountIn);
      const targetPrice = parseFloat(order.targetPrice);

      // Check if target price is reached
      if (currentPrice >= targetPrice) {
        // Execute the order (simplified - would need actual execution logic)
        order.status = 'filled';
        order.filledAt = new Date();
        order.transactionHash = '0x' + Math.random().toString(16).substr(2, 64);
        
        this.limitOrders.set(orderId, order);

        // Add to trading history
        await this.addTradingHistory(
          order.userId,
          'limit_order',
          order.tokenIn,
          order.tokenOut,
          order.amountIn,
          quote.amountOut,
          quote.gasEstimate,
          order.chainId,
          order.transactionHash!
        );

        safeLogger.info(`Limit order ${orderId} filled at price ${currentPrice}`);
      } else {
        // Check if order expired
        if (new Date() > order.expiresAt) {
          order.status = 'expired';
          this.limitOrders.set(orderId, order);
          safeLogger.info(`Limit order ${orderId} expired`);
        } else {
          // Continue monitoring (in real implementation, this would be handled by a job queue)
          setTimeout(() => this.monitorLimitOrder(orderId), 30000); // Check every 30 seconds
        }
      }
    } catch (error) {
      safeLogger.error(`Error monitoring limit order ${orderId}:`, error);
      // Retry monitoring after delay
      setTimeout(() => this.monitorLimitOrder(orderId), 60000);
    }
  }

  /**
   * Monitor price alert for triggering
   */
  private async monitorPriceAlert(alertId: string): Promise<void> {
    const alert = this.priceAlerts.get(alertId);
    if (!alert || !alert.isActive) {
      return;
    }

    try {
      // Switch to the alert's chain
      await this.multiChainService.switchChain(alert.chainId);

      // Get current price
      const swapParams: SwapParams = {
        tokenIn: alert.tokenIn,
        tokenOut: alert.tokenOut,
        amountIn: 1, // Use 1 unit for price checking
      };

      const quote = await this.multiChainService.getSwapQuote(swapParams);
      const currentPrice = parseFloat(quote.amountOut);
      const targetPrice = parseFloat(alert.targetPrice);

      // Check if alert condition is met
      const shouldTrigger = alert.condition === 'above' 
        ? currentPrice >= targetPrice 
        : currentPrice <= targetPrice;

      if (shouldTrigger) {
        alert.isActive = false;
        alert.triggeredAt = new Date();
        this.priceAlerts.set(alertId, alert);

        // In a real implementation, this would send a notification
        safeLogger.info(`Price alert ${alertId} triggered: ${alert.tokenIn.symbol}/${alert.tokenOut.symbol} is ${alert.condition} ${targetPrice}`);
      } else {
        // Continue monitoring
        setTimeout(() => this.monitorPriceAlert(alertId), 60000); // Check every minute
      }
    } catch (error) {
      safeLogger.error(`Error monitoring price alert ${alertId}:`, error);
      // Retry monitoring after delay
      setTimeout(() => this.monitorPriceAlert(alertId), 120000);
    }
  }

  /**
   * Generate unique order ID
   */
  private generateOrderId(): string {
    return 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate unique history ID
   */
  private generateHistoryId(): string {
    return 'history_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get performance analytics for user
   */
  async getPerformanceAnalytics(userId: string, days: number = 30): Promise<{
    totalTrades: number;
    successRate: number;
    averageGasCost: string;
    totalVolume: string;
    profitLoss: string;
    bestTrade: TradingHistory | null;
    worstTrade: TradingHistory | null;
  }> {
    const history = this.getUserTradingHistory(userId, 1000);
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const recentTrades = history.filter(trade => trade.timestamp >= cutoffDate);
    
    if (recentTrades.length === 0) {
      return {
        totalTrades: 0,
        successRate: 0,
        averageGasCost: '0',
        totalVolume: '0',
        profitLoss: '0',
        bestTrade: null,
        worstTrade: null,
      };
    }

    const totalVolume = recentTrades.reduce((sum, trade) => 
      sum + parseFloat(trade.amountIn), 0
    );

    const totalGasCost = recentTrades.reduce((sum, trade) => 
      sum + parseFloat(trade.gasCost), 0
    );

    const averageGasCost = (totalGasCost / recentTrades.length).toString();

    // Find best and worst trades by price
    let bestTrade = recentTrades[0];
    let worstTrade = recentTrades[0];

    for (const trade of recentTrades) {
      if (parseFloat(trade.price) > parseFloat(bestTrade.price)) {
        bestTrade = trade;
      }
      if (parseFloat(trade.price) < parseFloat(worstTrade.price)) {
        worstTrade = trade;
      }
    }

    return {
      totalTrades: recentTrades.length,
      successRate: 100, // Simplified - assume all trades are successful
      averageGasCost,
      totalVolume: totalVolume.toString(),
      profitLoss: '0', // Would require more complex calculation
      bestTrade,
      worstTrade,
    };
  }
}
