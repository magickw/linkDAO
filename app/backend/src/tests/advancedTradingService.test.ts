import { AdvancedTradingService } from '../services/advancedTradingService';
import { TokenInfo } from '../types/uniswapV3';

// Mock the MultiChainDEXService
jest.mock('../services/multiChainDEXService', () => ({
  MultiChainDEXService: jest.fn().mockImplementation(() => ({
    switchChain: jest.fn().mockResolvedValue(true),
    getSwapQuote: jest.fn().mockResolvedValue({
      amountIn: '1000',
      amountOut: '1000000000000000000',
      amountOutMinimum: '950000000000000000',
      priceImpact: '0.01',
      gasEstimate: '200000',
      route: [],
      blockNumber: 18000000,
      timestamp: Date.now(),
    }),
  })),
}));

describe('AdvancedTradingService', () => {
  let advancedTradingService: AdvancedTradingService;
  let mockTokenIn: TokenInfo;
  let mockTokenOut: TokenInfo;

  beforeEach(() => {
    advancedTradingService = new AdvancedTradingService();
    
    mockTokenIn = {
      address: '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8',
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
    };

    mockTokenOut = {
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      symbol: 'WETH',
      decimals: 18,
      name: 'Wrapped Ether',
    };
  });

  describe('Limit Orders', () => {
    it('should create a limit order', async () => {
      const userId = 'user123';
      const amountIn = '1000';
      const targetPrice = '2400';

      const limitOrder = await advancedTradingService.createLimitOrder(
        userId,
        mockTokenIn,
        mockTokenOut,
        amountIn,
        targetPrice,
        0.5,
        1,
        24
      );

      expect(limitOrder).toBeDefined();
      expect(limitOrder.userId).toBe(userId);
      expect(limitOrder.tokenIn).toEqual(mockTokenIn);
      expect(limitOrder.tokenOut).toEqual(mockTokenOut);
      expect(limitOrder.amountIn).toBe(amountIn);
      expect(limitOrder.targetPrice).toBe(targetPrice);
      expect(limitOrder.status).toBe('pending');
      expect(limitOrder.id).toMatch(/^order_/);
    });

    it('should cancel a limit order', async () => {
      const userId = 'user123';
      
      // Create an order first
      const limitOrder = await advancedTradingService.createLimitOrder(
        userId,
        mockTokenIn,
        mockTokenOut,
        '1000',
        '2400'
      );

      // Cancel the order
      const success = await advancedTradingService.cancelLimitOrder(userId, limitOrder.id);

      expect(success).toBe(true);

      // Verify order is cancelled
      const userOrders = advancedTradingService.getUserLimitOrders(userId);
      const cancelledOrder = userOrders.find(order => order.id === limitOrder.id);
      expect(cancelledOrder?.status).toBe('cancelled');
    });

    it('should not allow cancelling order by different user', async () => {
      const userId1 = 'user123';
      const userId2 = 'user456';
      
      // Create an order with user1
      const limitOrder = await advancedTradingService.createLimitOrder(
        userId1,
        mockTokenIn,
        mockTokenOut,
        '1000',
        '2400'
      );

      // Try to cancel with user2
      await expect(advancedTradingService.cancelLimitOrder(userId2, limitOrder.id))
        .rejects
        .toThrow('Order not found or unauthorized');
    });

    it('should get user limit orders', async () => {
      const userId = 'user123';
      
      // Create multiple orders
      await advancedTradingService.createLimitOrder(userId, mockTokenIn, mockTokenOut, '1000', '2400');
      await advancedTradingService.createLimitOrder(userId, mockTokenIn, mockTokenOut, '2000', '2500');

      const userOrders = advancedTradingService.getUserLimitOrders(userId);

      expect(userOrders).toHaveLength(2);
      expect(userOrders[0].userId).toBe(userId);
      expect(userOrders[1].userId).toBe(userId);
    });

    it('should filter orders by status', async () => {
      const userId = 'user123';
      
      // Create and cancel one order
      const order1 = await advancedTradingService.createLimitOrder(userId, mockTokenIn, mockTokenOut, '1000', '2400');
      await advancedTradingService.cancelLimitOrder(userId, order1.id);
      
      // Create another pending order
      await advancedTradingService.createLimitOrder(userId, mockTokenIn, mockTokenOut, '2000', '2500');

      const pendingOrders = advancedTradingService.getUserLimitOrders(userId, 'pending');
      const cancelledOrders = advancedTradingService.getUserLimitOrders(userId, 'cancelled');

      expect(pendingOrders).toHaveLength(1);
      expect(cancelledOrders).toHaveLength(1);
      expect(pendingOrders[0].status).toBe('pending');
      expect(cancelledOrders[0].status).toBe('cancelled');
    });
  });

  describe('Price Alerts', () => {
    it('should create a price alert', async () => {
      const userId = 'user123';
      const targetPrice = '2400';
      const condition = 'above';

      const priceAlert = await advancedTradingService.createPriceAlert(
        userId,
        mockTokenIn,
        mockTokenOut,
        targetPrice,
        condition,
        1
      );

      expect(priceAlert).toBeDefined();
      expect(priceAlert.userId).toBe(userId);
      expect(priceAlert.tokenIn).toEqual(mockTokenIn);
      expect(priceAlert.tokenOut).toEqual(mockTokenOut);
      expect(priceAlert.targetPrice).toBe(targetPrice);
      expect(priceAlert.condition).toBe(condition);
      expect(priceAlert.isActive).toBe(true);
      expect(priceAlert.id).toMatch(/^alert_/);
    });

    it('should remove a price alert', async () => {
      const userId = 'user123';
      
      // Create an alert first
      const priceAlert = await advancedTradingService.createPriceAlert(
        userId,
        mockTokenIn,
        mockTokenOut,
        '2400',
        'above'
      );

      // Remove the alert
      const success = await advancedTradingService.removePriceAlert(userId, priceAlert.id);

      expect(success).toBe(true);

      // Verify alert is removed
      const userAlerts = advancedTradingService.getUserPriceAlerts(userId);
      expect(userAlerts.find(alert => alert.id === priceAlert.id)).toBeUndefined();
    });

    it('should get user price alerts', async () => {
      const userId = 'user123';
      
      // Create multiple alerts
      await advancedTradingService.createPriceAlert(userId, mockTokenIn, mockTokenOut, '2400', 'above');
      await advancedTradingService.createPriceAlert(userId, mockTokenIn, mockTokenOut, '2200', 'below');

      const userAlerts = advancedTradingService.getUserPriceAlerts(userId);

      expect(userAlerts).toHaveLength(2);
      expect(userAlerts[0].userId).toBe(userId);
      expect(userAlerts[1].userId).toBe(userId);
    });

    it('should filter alerts by active status', async () => {
      const userId = 'user123';
      
      // Create alerts
      const alert1 = await advancedTradingService.createPriceAlert(userId, mockTokenIn, mockTokenOut, '2400', 'above');
      await advancedTradingService.createPriceAlert(userId, mockTokenIn, mockTokenOut, '2200', 'below');

      // Manually deactivate one alert
      (advancedTradingService as any).priceAlerts.get(alert1.id).isActive = false;

      const activeAlerts = advancedTradingService.getUserPriceAlerts(userId, true);
      const inactiveAlerts = advancedTradingService.getUserPriceAlerts(userId, false);

      expect(activeAlerts).toHaveLength(1);
      expect(inactiveAlerts).toHaveLength(1);
      expect(activeAlerts[0].isActive).toBe(true);
      expect(inactiveAlerts[0].isActive).toBe(false);
    });
  });

  describe('Portfolio Management', () => {
    it('should update user portfolio', async () => {
      const userId = 'user123';
      const walletAddress = '0x123456789abcdef';
      const chainId = 1;

      const portfolio = await advancedTradingService.updatePortfolio(userId, walletAddress, chainId);

      expect(portfolio).toBeDefined();
      expect(Array.isArray(portfolio)).toBe(true);
      expect(portfolio.length).toBeGreaterThan(0);
      
      portfolio.forEach(position => {
        expect(position.tokenAddress).toBeDefined();
        expect(position.symbol).toBeDefined();
        expect(position.balance).toBeDefined();
        expect(position.valueUSD).toBeDefined();
        expect(position.chainId).toBe(chainId);
      });
    });

    it('should get user portfolio', async () => {
      const userId = 'user123';
      
      // Update portfolio first
      await advancedTradingService.updatePortfolio(userId, '0x123456789abcdef', 1);

      const portfolio = advancedTradingService.getUserPortfolio(userId);

      expect(portfolio).toBeDefined();
      expect(Array.isArray(portfolio)).toBe(true);
      expect(portfolio.length).toBeGreaterThan(0);
    });

    it('should return empty portfolio for new user', () => {
      const userId = 'newuser';
      const portfolio = advancedTradingService.getUserPortfolio(userId);

      expect(portfolio).toEqual([]);
    });
  });

  describe('Trading History', () => {
    it('should add trading history entry', async () => {
      const userId = 'user123';

      await advancedTradingService.addTradingHistory(
        userId,
        'swap',
        mockTokenIn,
        mockTokenOut,
        '1000',
        '0.4',
        '0.01',
        1,
        '0x123456789abcdef'
      );

      const history = advancedTradingService.getUserTradingHistory(userId);

      expect(history).toHaveLength(1);
      expect(history[0].userId).toBe(userId);
      expect(history[0].type).toBe('swap');
      expect(history[0].tokenIn).toEqual(mockTokenIn);
      expect(history[0].tokenOut).toEqual(mockTokenOut);
      expect(history[0].transactionHash).toBe('0x123456789abcdef');
    });

    it('should limit trading history entries', async () => {
      const userId = 'user123';

      // Add more than 100 entries
      for (let i = 0; i < 105; i++) {
        await advancedTradingService.addTradingHistory(
          userId,
          'swap',
          mockTokenIn,
          mockTokenOut,
          '1000',
          '0.4',
          '0.01',
          1,
          `0x${i.toString().padStart(64, '0')}`
        );
      }

      const history = advancedTradingService.getUserTradingHistory(userId);

      expect(history).toHaveLength(100); // Should be limited to 100
    });

    it('should get limited trading history', () => {
      const userId = 'user123';
      const limit = 10;

      const history = advancedTradingService.getUserTradingHistory(userId, limit);

      expect(history.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('Tax Reporting', () => {
    it('should generate tax report', async () => {
      const userId = 'user123';
      const year = 2024;

      // Add some trading history
      await advancedTradingService.addTradingHistory(
        userId,
        'swap',
        mockTokenIn,
        mockTokenOut,
        '1000',
        '0.4',
        '0.01',
        1,
        '0x123456789abcdef'
      );

      const taxReport = await advancedTradingService.generateTaxReport(userId, year);

      expect(taxReport).toBeDefined();
      expect(taxReport.totalTrades).toBeDefined();
      expect(taxReport.totalVolume).toBeDefined();
      expect(taxReport.totalGasCost).toBeDefined();
      expect(taxReport.profitLoss).toBeDefined();
      expect(Array.isArray(taxReport.trades)).toBe(true);
    });
  });

  describe('Performance Analytics', () => {
    it('should get performance analytics', async () => {
      const userId = 'user123';

      // Add some trading history
      await advancedTradingService.addTradingHistory(
        userId,
        'swap',
        mockTokenIn,
        mockTokenOut,
        '1000',
        '0.4',
        '0.01',
        1,
        '0x123456789abcdef'
      );

      const analytics = await advancedTradingService.getPerformanceAnalytics(userId, 30);

      expect(analytics).toBeDefined();
      expect(analytics.totalTrades).toBeGreaterThan(0);
      expect(analytics.successRate).toBeDefined();
      expect(analytics.averageGasCost).toBeDefined();
      expect(analytics.totalVolume).toBeDefined();
      expect(analytics.profitLoss).toBeDefined();
      expect(analytics.bestTrade).toBeDefined();
      expect(analytics.worstTrade).toBeDefined();
    });

    it('should return zero analytics for user with no trades', async () => {
      const userId = 'newuser';

      const analytics = await advancedTradingService.getPerformanceAnalytics(userId, 30);

      expect(analytics.totalTrades).toBe(0);
      expect(analytics.successRate).toBe(0);
      expect(analytics.averageGasCost).toBe('0');
      expect(analytics.totalVolume).toBe('0');
      expect(analytics.profitLoss).toBe('0');
      expect(analytics.bestTrade).toBeNull();
      expect(analytics.worstTrade).toBeNull();
    });
  });
});