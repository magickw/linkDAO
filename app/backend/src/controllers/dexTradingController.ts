import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { UniswapV3Service } from '../services/uniswapV3Service';
import { MultiChainDEXService } from '../services/multiChainDEXService';
import { SwapParams, TokenInfo } from '../types/uniswapV3';
import { validationResult } from 'express-validator';

export class DEXTradingController {
  private uniswapV3Service: UniswapV3Service;
  private multiChainService: MultiChainDEXService;

  constructor() {
    // Initialize with default Ethereum mainnet configuration
    // Initialize with Sepolia configuration
    this.uniswapV3Service = new UniswapV3Service(
      process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
      parseInt(process.env.CHAIN_ID || '11155111') // Sepolia
    );

    // Initialize multi-chain service
    this.multiChainService = new MultiChainDEXService();
  }

  /**
   * Get a quote for token swap
   */
  async getSwapQuote(req: Request, res: Response): Promise<void> {
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

      const {
        tokenInAddress,
        tokenOutAddress,
        amountIn,
        slippageTolerance = 0.5,
        recipient
      } = req.body;

      // Validate and get token information
      const [tokenInInfo, tokenOutInfo] = await Promise.all([
        this.uniswapV3Service.validateAndGetTokenInfo(tokenInAddress),
        this.uniswapV3Service.validateAndGetTokenInfo(tokenOutAddress)
      ]);

      const tokenIn: TokenInfo = {
        address: tokenInAddress,
        ...tokenInInfo
      };

      const tokenOut: TokenInfo = {
        address: tokenOutAddress,
        ...tokenOutInfo
      };

      const swapParams: SwapParams = {
        tokenIn,
        tokenOut,
        amountIn: parseFloat(amountIn),
        slippageTolerance,
        recipient
      };

      const quote = await this.uniswapV3Service.getSwapQuote(swapParams);

      res.json({
        success: true,
        data: {
          quote,
          tokenIn,
          tokenOut,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      safeLogger.error('Error getting swap quote:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get swap quote',
        error: error.message
      });
    }
  }

  /**
   * Get real-time price for token pair
   */
  async getTokenPrice(req: Request, res: Response): Promise<void> {
    try {
      const { tokenInAddress, tokenOutAddress, amountIn = '1' } = req.query;

      if (!tokenInAddress || !tokenOutAddress) {
        res.status(400).json({
          success: false,
          message: 'Token addresses are required'
        });
        return;
      }

      // Get token information
      const [tokenInInfo, tokenOutInfo] = await Promise.all([
        this.uniswapV3Service.validateAndGetTokenInfo(tokenInAddress as string),
        this.uniswapV3Service.validateAndGetTokenInfo(tokenOutAddress as string)
      ]);

      const tokenIn: TokenInfo = {
        address: tokenInAddress as string,
        ...tokenInInfo
      };

      const tokenOut: TokenInfo = {
        address: tokenOutAddress as string,
        ...tokenOutInfo
      };

      const swapParams: SwapParams = {
        tokenIn,
        tokenOut,
        amountIn: parseFloat(amountIn as string),
        slippageTolerance: 0.1 // Low slippage for price quotes
      };

      const quote = await this.uniswapV3Service.getSwapQuote(swapParams);

      // Calculate price per unit
      const pricePerUnit = parseFloat(quote.amountOut) / parseFloat(quote.amountIn);

      res.json({
        success: true,
        data: {
          tokenIn: tokenIn.symbol,
          tokenOut: tokenOut.symbol,
          price: pricePerUnit.toString(),
          amountIn: quote.amountIn,
          amountOut: quote.amountOut,
          priceImpact: quote.priceImpact,
          timestamp: quote.timestamp
        }
      });
    } catch (error) {
      safeLogger.error('Error getting token price:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get token price',
        error: error.message
      });
    }
  }

  /**
   * Get liquidity information for token pairs
   */
  async getLiquidityInfo(req: Request, res: Response): Promise<void> {
    try {
      const { tokenA, tokenB, fee = 3000 } = req.query;

      if (!tokenA || !tokenB) {
        res.status(400).json({
          success: false,
          message: 'Token addresses are required'
        });
        return;
      }

      const liquidityInfo = await this.uniswapV3Service.getLiquidityInfo(
        tokenA as string,
        tokenB as string,
        parseInt(fee as string)
      );

      res.json({
        success: true,
        data: liquidityInfo
      });
    } catch (error) {
      safeLogger.error('Error getting liquidity info:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get liquidity information',
        error: error.message
      });
    }
  }

  /**
   * Monitor multiple liquidity pools
   */
  async monitorLiquidityPools(req: Request, res: Response): Promise<void> {
    try {
      const { tokenPairs } = req.body;

      if (!Array.isArray(tokenPairs) || tokenPairs.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Token pairs array is required'
        });
        return;
      }

      const liquidityInfos = await this.uniswapV3Service.monitorLiquidityPools(tokenPairs);

      res.json({
        success: true,
        data: {
          pools: liquidityInfos,
          timestamp: Date.now(),
          totalPools: liquidityInfos.length
        }
      });
    } catch (error) {
      safeLogger.error('Error monitoring liquidity pools:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to monitor liquidity pools',
        error: error.message
      });
    }
  }

  /**
   * Get gas fee estimates
   */
  async getGasEstimate(req: Request, res: Response): Promise<void> {
    try {
      const {
        tokenInAddress,
        tokenOutAddress,
        amountIn
      } = req.body;

      // Get token information
      const [tokenInInfo, tokenOutInfo] = await Promise.all([
        this.uniswapV3Service.validateAndGetTokenInfo(tokenInAddress),
        this.uniswapV3Service.validateAndGetTokenInfo(tokenOutAddress)
      ]);

      const tokenIn: TokenInfo = {
        address: tokenInAddress,
        ...tokenInInfo
      };

      const tokenOut: TokenInfo = {
        address: tokenOutAddress,
        ...tokenOutInfo
      };

      const swapParams: SwapParams = {
        tokenIn,
        tokenOut,
        amountIn: parseFloat(amountIn)
      };

      const quote = await this.uniswapV3Service.getSwapQuote(swapParams);
      const gasPrice = await this.uniswapV3Service.getOptimizedGasPrice();

      res.json({
        success: true,
        data: {
          gasLimit: quote.gasEstimate,
          gasPrice: gasPrice.toString(),
          estimatedCost: (parseFloat(quote.gasEstimate) * parseFloat(gasPrice.toString())).toString(),
          timestamp: Date.now()
        }
      });
    } catch (error) {
      safeLogger.error('Error getting gas estimate:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get gas estimate',
        error: error.message
      });
    }
  }

  /**
   * Get alternative DEX routes when primary fails
   */
  async getAlternativeRoutes(req: Request, res: Response): Promise<void> {
    try {
      const {
        tokenInAddress,
        tokenOutAddress,
        amountIn,
        slippageTolerance = 0.5
      } = req.body;

      // Get token information
      const [tokenInInfo, tokenOutInfo] = await Promise.all([
        this.uniswapV3Service.validateAndGetTokenInfo(tokenInAddress),
        this.uniswapV3Service.validateAndGetTokenInfo(tokenOutAddress)
      ]);

      const tokenIn: TokenInfo = {
        address: tokenInAddress,
        ...tokenInInfo
      };

      const tokenOut: TokenInfo = {
        address: tokenOutAddress,
        ...tokenOutInfo
      };

      const swapParams: SwapParams = {
        tokenIn,
        tokenOut,
        amountIn: parseFloat(amountIn),
        slippageTolerance
      };

      // Simulate a failure to get alternatives
      const mockError = new Error('Primary route failed');
      const alternatives = await this.uniswapV3Service.handleSwapFailure(swapParams, mockError);

      res.json({
        success: true,
        data: {
          alternatives,
          totalAlternatives: alternatives.length,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      safeLogger.error('Error getting alternative routes:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get alternative routes',
        error: error.message
      });
    }
  }

  /**
   * Validate token address and get token information
   */
  async validateToken(req: Request, res: Response): Promise<void> {
    try {
      const { tokenAddress } = req.params;

      if (!tokenAddress) {
        res.status(400).json({
          success: false,
          message: 'Token address is required'
        });
        return;
      }

      const tokenInfo = await this.uniswapV3Service.validateAndGetTokenInfo(tokenAddress);

      res.json({
        success: true,
        data: {
          address: tokenAddress,
          ...tokenInfo,
          isValid: true
        }
      });
    } catch (error) {
      safeLogger.error('Error validating token:', error);
      res.status(400).json({
        success: false,
        message: 'Invalid token address',
        error: error.message,
        data: {
          address: req.params.tokenAddress,
          isValid: false
        }
      });
    }
  }

  /**
   * Switch to a different blockchain network
   */
  async switchNetwork(req: Request, res: Response): Promise<void> {
    try {
      const { chainId } = req.body;

      if (!chainId || typeof chainId !== 'number') {
        res.status(400).json({
          success: false,
          message: 'Valid chain ID is required'
        });
        return;
      }

      const success = await this.multiChainService.switchChain(chainId);
      const chainConfig = this.multiChainService.getCurrentChainConfig();

      res.json({
        success: true,
        data: {
          switched: success,
          currentChain: chainConfig,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      safeLogger.error('Error switching network:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to switch network',
        error: error.message
      });
    }
  }

  /**
   * Get all supported blockchain networks
   */
  async getSupportedNetworks(req: Request, res: Response): Promise<void> {
    try {
      const supportedChains = this.multiChainService.getSupportedChains();
      const currentChain = this.multiChainService.getCurrentChainConfig();

      res.json({
        success: true,
        data: {
          supportedChains,
          currentChain,
          totalChains: supportedChains.length
        }
      });
    } catch (error) {
      safeLogger.error('Error getting supported networks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get supported networks',
        error: error.message
      });
    }
  }

  /**
   * Compare prices across multiple chains
   */
  async compareChainPrices(req: Request, res: Response): Promise<void> {
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

      const {
        tokenInAddress,
        tokenOutAddress,
        amountIn,
        chainIds
      } = req.body;

      // Get token information (using current chain for validation)
      const [tokenInInfo, tokenOutInfo] = await Promise.all([
        this.uniswapV3Service.validateAndGetTokenInfo(tokenInAddress),
        this.uniswapV3Service.validateAndGetTokenInfo(tokenOutAddress)
      ]);

      const tokenIn: TokenInfo = {
        address: tokenInAddress,
        ...tokenInInfo
      };

      const tokenOut: TokenInfo = {
        address: tokenOutAddress,
        ...tokenOutInfo
      };

      const swapParams: SwapParams = {
        tokenIn,
        tokenOut,
        amountIn: parseFloat(amountIn)
      };

      const priceComparisons = await this.multiChainService.compareChainPrices(swapParams, chainIds);

      // Convert Map to object for JSON response
      const comparisons: any = {};
      for (const [chainId, quote] of priceComparisons) {
        const chainConfig = this.multiChainService.getSupportedChains().find(c => c.chainId === chainId);
        comparisons[chainId] = {
          chainName: chainConfig?.name || 'Unknown',
          quote,
          pricePerUnit: parseFloat(quote.amountOut) / parseFloat(quote.amountIn)
        };
      }

      res.json({
        success: true,
        data: {
          comparisons,
          totalChains: Object.keys(comparisons).length,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      safeLogger.error('Error comparing chain prices:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to compare chain prices',
        error: error.message
      });
    }
  }

  /**
   * Get cross-chain swap quote
   */
  async getCrossChainQuote(req: Request, res: Response): Promise<void> {
    try {
      const {
        sourceChain,
        targetChain,
        tokenInAddress,
        tokenOutAddress,
        amountIn
      } = req.body;

      if (!sourceChain || !targetChain || !tokenInAddress || !tokenOutAddress || !amountIn) {
        res.status(400).json({
          success: false,
          message: 'All parameters are required for cross-chain quote'
        });
        return;
      }

      // Get token information
      const [tokenInInfo, tokenOutInfo] = await Promise.all([
        this.uniswapV3Service.validateAndGetTokenInfo(tokenInAddress),
        this.uniswapV3Service.validateAndGetTokenInfo(tokenOutAddress)
      ]);

      const tokenIn: TokenInfo = {
        address: tokenInAddress,
        ...tokenInInfo
      };

      const tokenOut: TokenInfo = {
        address: tokenOutAddress,
        ...tokenOutInfo
      };

      const swapParams: SwapParams = {
        tokenIn,
        tokenOut,
        amountIn: parseFloat(amountIn)
      };

      const crossChainQuote = await this.multiChainService.getCrossChainQuote(
        sourceChain,
        targetChain,
        swapParams
      );

      res.json({
        success: true,
        data: crossChainQuote
      });
    } catch (error) {
      safeLogger.error('Error getting cross-chain quote:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get cross-chain quote',
        error: error.message
      });
    }
  }

  /**
   * Get network-specific gas fees
   */
  async getNetworkGasFees(req: Request, res: Response): Promise<void> {
    try {
      const { chainId } = req.query;
      const targetChainId = chainId ? parseInt(chainId as string) : undefined;

      const gasFees = await this.multiChainService.getNetworkGasFees(targetChainId);

      res.json({
        success: true,
        data: gasFees
      });
    } catch (error) {
      safeLogger.error('Error getting network gas fees:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get network gas fees',
        error: error.message
      });
    }
  }

  /**
   * Get best chain for a specific swap
   */
  async getBestChainForSwap(req: Request, res: Response): Promise<void> {
    try {
      const {
        tokenInAddress,
        tokenOutAddress,
        amountIn
      } = req.body;

      // Get token information
      const [tokenInInfo, tokenOutInfo] = await Promise.all([
        this.uniswapV3Service.validateAndGetTokenInfo(tokenInAddress),
        this.uniswapV3Service.validateAndGetTokenInfo(tokenOutAddress)
      ]);

      const tokenIn: TokenInfo = {
        address: tokenInAddress,
        ...tokenInInfo
      };

      const tokenOut: TokenInfo = {
        address: tokenOutAddress,
        ...tokenOutInfo
      };

      const swapParams: SwapParams = {
        tokenIn,
        tokenOut,
        amountIn: parseFloat(amountIn)
      };

      const bestChain = await this.multiChainService.getBestChainForSwap(swapParams);

      res.json({
        success: true,
        data: bestChain
      });
    } catch (error) {
      safeLogger.error('Error getting best chain for swap:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get best chain for swap',
        error: error.message
      });
    }
  }
}
