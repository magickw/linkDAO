import { Request, Response } from 'express';
import { LDAOAcquisitionService } from '../services/ldaoAcquisitionService';
import { ldaoAcquisitionConfig } from '../config/ldaoAcquisitionConfig';
import { PurchaseRequest, EarnRequest } from '../types/ldaoAcquisition';

export class LDAOAcquisitionController {
  private acquisitionService: LDAOAcquisitionService;

  constructor(acquisitionService: LDAOAcquisitionService) {
    this.acquisitionService = acquisitionService;
  }

  // POST /api/ldao/purchase - Direct token purchase
  public purchaseTokens = async (req: Request, res: Response): Promise<void> => {
    try {
      const { amount, paymentMethod, paymentToken, userAddress } = req.body;

      // Validate request
      if (!amount || !paymentMethod || !userAddress) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: amount, paymentMethod, userAddress',
        });
        return;
      }

      if (amount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Amount must be greater than 0',
        });
        return;
      }

      const purchaseRequest: PurchaseRequest = {
        amount,
        paymentMethod,
        paymentToken,
        userAddress,
      };

      let result;
      if (paymentMethod === 'fiat') {
        result = await this.acquisitionService.purchaseWithFiat(purchaseRequest);
      } else if (paymentMethod === 'crypto') {
        result = await this.acquisitionService.purchaseWithCrypto(purchaseRequest);
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid payment method. Must be "fiat" or "crypto"',
        });
        return;
      }

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in purchaseTokens:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };

  // GET /api/ldao/price - Get current LDAO price and quote
  public getPrice = async (req: Request, res: Response): Promise<void> => {
    try {
      const { amount, paymentToken } = req.query;

      if (amount) {
        // Get quote for specific amount
        const amountNum = parseFloat(amount as string);
        if (isNaN(amountNum) || amountNum <= 0) {
          res.status(400).json({
            success: false,
            error: 'Invalid amount parameter',
          });
          return;
        }

        const quote = await this.acquisitionService.getPriceQuote(
          amountNum,
          (paymentToken as string) || 'ETH'
        );

        res.status(200).json({
          success: true,
          quote,
        });
      } else {
        // Get current price
        const currentPrice = await this.acquisitionService.getCurrentPrice();
        res.status(200).json({
          success: true,
          price: currentPrice,
          currency: 'USD',
        });
      }
    } catch (error) {
      console.error('Error in getPrice:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get price information',
      });
    }
  };

  // POST /api/ldao/earn - Earn tokens through activities
  public earnTokens = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, activityType, activityId, metadata } = req.body;

      // Validate request
      if (!userId || !activityType || !activityId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, activityType, activityId',
        });
        return;
      }

      const validActivityTypes = ['post', 'comment', 'referral', 'marketplace'];
      if (!validActivityTypes.includes(activityType)) {
        res.status(400).json({
          success: false,
          error: `Invalid activity type. Must be one of: ${validActivityTypes.join(', ')}`,
        });
        return;
      }

      const earnRequest: EarnRequest = {
        userId,
        activityType,
        activityId,
        metadata,
      };

      const result = await this.acquisitionService.earnTokens(earnRequest);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in earnTokens:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };

  // GET /api/ldao/history - Get transaction history
  public getTransactionHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, type, limit = '50', offset = '0' } = req.query;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: userId',
        });
        return;
      }

      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);

      if (isNaN(limitNum) || isNaN(offsetNum) || limitNum <= 0 || offsetNum < 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid limit or offset parameters',
        });
        return;
      }

      let transactions = [];
      let earnings = [];

      if (!type || type === 'purchase') {
        transactions = await this.acquisitionService.getTransactionHistory(userId as string);
      }

      if (!type || type === 'earning') {
        earnings = await this.acquisitionService.getEarningHistory(userId as string);
      }

      res.status(200).json({
        success: true,
        data: {
          transactions: transactions.slice(offsetNum, offsetNum + limitNum),
          earnings: earnings.slice(offsetNum, offsetNum + limitNum),
        },
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: transactions.length + earnings.length,
        },
      });
    } catch (error) {
      console.error('Error in getTransactionHistory:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get transaction history',
      });
    }
  };

  // GET /api/ldao/payment-methods - Get supported payment methods
  public getPaymentMethods = async (req: Request, res: Response): Promise<void> => {
    try {
      const paymentMethods = this.acquisitionService.getSupportedPaymentMethods();
      const networks = this.acquisitionService.getSupportedNetworks();

      res.status(200).json({
        success: true,
        data: {
          paymentMethods,
          supportedNetworks: networks,
        },
      });
    } catch (error) {
      console.error('Error in getPaymentMethods:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get payment methods',
      });
    }
  };

  // POST /api/ldao/swap - DEX token swap
  public swapTokens = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fromToken, toToken, amount, userAddress } = req.body;

      // Validate request
      if (!fromToken || !toToken || !amount || !userAddress) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: fromToken, toToken, amount, userAddress',
        });
        return;
      }

      if (amount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Amount must be greater than 0',
        });
        return;
      }

      const result = await this.acquisitionService.swapOnDEX(
        fromToken,
        toToken,
        amount,
        userAddress
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in swapTokens:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };

  // POST /api/ldao/bridge - Cross-chain bridge
  public bridgeTokens = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fromChain, toChain, amount, userAddress } = req.body;

      // Validate request
      if (!fromChain || !toChain || !amount || !userAddress) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: fromChain, toChain, amount, userAddress',
        });
        return;
      }

      if (amount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Amount must be greater than 0',
        });
        return;
      }

      if (fromChain === toChain) {
        res.status(400).json({
          success: false,
          error: 'Source and destination chains cannot be the same',
        });
        return;
      }

      const result = await this.acquisitionService.bridgeTokens(
        fromChain,
        toChain,
        amount,
        userAddress
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in bridgeTokens:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };

  // GET /api/ldao/staking - Get staking positions
  public getStakingPositions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.query;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: userId',
        });
        return;
      }

      const positions = await this.acquisitionService.getStakingPositions(userId as string);

      res.status(200).json({
        success: true,
        data: positions,
      });
    } catch (error) {
      console.error('Error in getStakingPositions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get staking positions',
      });
    }
  };

  // GET /api/ldao/status - Get service status
  public getServiceStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const status = this.acquisitionService.getServiceStatus();
      const config = ldaoAcquisitionConfig.getConfig();
      const integrations = ldaoAcquisitionConfig.getAllIntegrations();

      res.status(200).json({
        success: true,
        data: {
          serviceStatus: status,
          configuration: {
            treasuryContract: config.treasuryContract,
            supportedTokens: config.supportedTokens,
            supportedNetworks: config.supportedNetworks,
            featuresEnabled: {
              fiatPayment: config.fiatPaymentEnabled,
              dexIntegration: config.dexIntegrationEnabled,
              earnToOwn: config.earnToOwnEnabled,
              staking: config.stakingEnabled,
              bridge: config.bridgeEnabled,
            },
          },
          integrations: integrations.map(integration => ({
            name: integration.name,
            type: integration.type,
            enabled: integration.enabled,
          })),
        },
      });
    } catch (error) {
      console.error('Error in getServiceStatus:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get service status',
      });
    }
  };
}