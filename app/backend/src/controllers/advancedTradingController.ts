import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { AdvancedTradingService } from '../services/advancedTradingService';
import { TokenInfo } from '../types/uniswapV3';
import { validationResult } from 'express-validator';

export class AdvancedTradingController {
  private advancedTradingService: AdvancedTradingService;

  constructor() {
    this.advancedTradingService = new AdvancedTradingService();
  }

  /**
   * Create a limit order
   */
  async createLimitOrder(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
        return;
      }

      const userId = (req as any).user?.id || 'anonymous';
      const {
        tokenInAddress,
        tokenInSymbol,
        tokenInDecimals,
        tokenInName,
        tokenOutAddress,
        tokenOutSymbol,
        tokenOutDecimals,
        tokenOutName,
        amountIn,
        targetPrice,
        slippageTolerance = 0.5,
        chainId = 1,
        expirationHours = 24
      } = req.body;

      const tokenIn: TokenInfo = {
        address: tokenInAddress,
        symbol: tokenInSymbol,
        decimals: tokenInDecimals,
        name: tokenInName
      };

      const tokenOut: TokenInfo = {
        address: tokenOutAddress,
        symbol: tokenOutSymbol,
        decimals: tokenOutDecimals,
        name: tokenOutName
      };

      const limitOrder = await this.advancedTradingService.createLimitOrder(
        userId,
        tokenIn,
        tokenOut,
        amountIn,
        targetPrice,
        slippageTolerance,
        chainId,
        expirationHours
      );

      res.json({
        success: true,
        data: limitOrder
      });
    } catch (error) {
      safeLogger.error('Error creating limit order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create limit order',
        error: error.message
      });
    }
  }

  /**
   * Cancel a limit order
   */
  async cancelLimitOrder(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'anonymous';
      const { orderId } = req.params;

      const success = await this.advancedTradingService.cancelLimitOrder(userId, orderId);

      res.json({
        success: true,
        data: { cancelled: success }
      });
    } catch (error) {
      safeLogger.error('Error cancelling limit order:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to cancel limit order',
        error: error.message
      });
    }
  }

  /**
   * Get user's limit orders
   */
  async getUserLimitOrders(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'anonymous';
      const { status } = req.query;

      const orders = this.advancedTradingService.getUserLimitOrders(
        userId,
        status as string
      );

      res.json({
        success: true,
        data: {
          orders,
          totalOrders: orders.length
        }
      });
    } catch (error) {
      safeLogger.error('Error getting limit orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get limit orders',
        error: error.message
      });
    }
  }  /
**
   * Create a price alert
   */
  async createPriceAlert(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
        return;
      }

      const userId = (req as any).user?.id || 'anonymous';
      const {
        tokenInAddress,
        tokenInSymbol,
        tokenInDecimals,
        tokenInName,
        tokenOutAddress,
        tokenOutSymbol,
        tokenOutDecimals,
        tokenOutName,
        targetPrice,
        condition,
        chainId = 1
      } = req.body;

      const tokenIn: TokenInfo = {
        address: tokenInAddress,
        symbol: tokenInSymbol,
        decimals: tokenInDecimals,
        name: tokenInName
      };

      const tokenOut: TokenInfo = {
        address: tokenOutAddress,
        symbol: tokenOutSymbol,
        decimals: tokenOutDecimals,
        name: tokenOutName
      };

      const priceAlert = await this.advancedTradingService.createPriceAlert(
        userId,
        tokenIn,
        tokenOut,
        targetPrice,
        condition,
        chainId
      );

      res.json({
        success: true,
        data: priceAlert
      });
    } catch (error) {
      safeLogger.error('Error creating price alert:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create price alert',
        error: error.message
      });
    }
  }

  /**
   * Remove a price alert
   */
  async removePriceAlert(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'anonymous';
      const { alertId } = req.params;

      const success = await this.advancedTradingService.removePriceAlert(userId, alertId);

      res.json({
        success: true,
        data: { removed: success }
      });
    } catch (error) {
      safeLogger.error('Error removing price alert:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to remove price alert',
        error: error.message
      });
    }
  }

  /**
   * Get user's price alerts
   */
  async getUserPriceAlerts(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'anonymous';
      const { isActive } = req.query;

      const activeFilter = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
      const alerts = this.advancedTradingService.getUserPriceAlerts(userId, activeFilter);

      res.json({
        success: true,
        data: {
          alerts,
          totalAlerts: alerts.length
        }
      });
    } catch (error) {
      safeLogger.error('Error getting price alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get price alerts',
        error: error.message
      });
    }
  }

  /**
   * Update user's portfolio
   */
  async updatePortfolio(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'anonymous';
      const { walletAddress, chainId = 1 } = req.body;

      if (!walletAddress) {
        res.status(400).json({
          success: false,
          message: 'Wallet address is required'
        });
        return;
      }

      const portfolio = await this.advancedTradingService.updatePortfolio(
        userId,
        walletAddress,
        chainId
      );

      res.json({
        success: true,
        data: {
          portfolio,
          totalPositions: portfolio.length
        }
      });
    } catch (error) {
      safeLogger.error('Error updating portfolio:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update portfolio',
        error: error.message
      });
    }
  }

  /**
   * Get user's portfolio
   */
  async getUserPortfolio(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'anonymous';
      const portfolio = this.advancedTradingService.getUserPortfolio(userId);

      const totalValue = portfolio.reduce((sum, position) => 
        sum + parseFloat(position.valueUSD), 0
      );

      res.json({
        success: true,
        data: {
          portfolio,
          totalPositions: portfolio.length,
          totalValueUSD: totalValue.toString()
        }
      });
    } catch (error) {
      safeLogger.error('Error getting portfolio:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get portfolio',
        error: error.message
      });
    }
  }

  /**
   * Get user's trading history
   */
  async getTradingHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'anonymous';
      const { limit = 50 } = req.query;

      const history = this.advancedTradingService.getUserTradingHistory(
        userId,
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: {
          history,
          totalTrades: history.length
        }
      });
    } catch (error) {
      safeLogger.error('Error getting trading history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get trading history',
        error: error.message
      });
    }
  }

  /**
   * Generate tax report
   */
  async generateTaxReport(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'anonymous';
      const { year } = req.params;

      if (!year || isNaN(parseInt(year))) {
        res.status(400).json({
          success: false,
          message: 'Valid year is required'
        });
        return;
      }

      const taxReport = await this.advancedTradingService.generateTaxReport(
        userId,
        parseInt(year)
      );

      res.json({
        success: true,
        data: taxReport
      });
    } catch (error) {
      safeLogger.error('Error generating tax report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate tax report',
        error: error.message
      });
    }
  }

  /**
   * Get performance analytics
   */
  async getPerformanceAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'anonymous';
      const { days = 30 } = req.query;

      const analytics = await this.advancedTradingService.getPerformanceAnalytics(
        userId,
        parseInt(days as string)
      );

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      safeLogger.error('Error getting performance analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get performance analytics',
        error: error.message
      });
    }
  }
}
