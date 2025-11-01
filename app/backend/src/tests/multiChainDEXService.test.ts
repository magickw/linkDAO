import { MultiChainDEXService } from '../services/multiChainDEXService';
import { SwapParams, TokenInfo } from '../types/uniswapV3';

// Mock the UniswapV3Service
jest.mock('../services/uniswapV3Service', () => ({
  UniswapV3Service: jest.fn().mockImplementation(() => ({
    getSwapQuote: jest.fn().mockResolvedValue({
      amountIn: '1000',
      amountOut: '1000000000000000000',
      amountOutMinimum: '950000000000000000',
      priceImpact: '0.01',
      gasEstimate: '200000',
      route: [{
        tokenIn: '0x123',
        tokenOut: '0x456',
        fee: 3000,
        pool: '0x789',
      }],
      blockNumber: 18000000,
      timestamp: Date.now(),
    }),
    getOptimizedGasPrice: jest.fn().mockResolvedValue({ toString: () => '20000000000' }),
    validateAndGetTokenInfo: jest.fn().mockResolvedValue({
      symbol: 'TEST',
      decimals: 18,
      name: 'Test Token',
    }),
  })),
}));

describe('MultiChainDEXService', () => {
  let multiChainService: MultiChainDEXService;
  let mockTokenIn: TokenInfo;
  let mockTokenOut: TokenInfo;

  beforeEach(() => {
    multiChainService = new MultiChainDEXService();
    
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

  describe('Chain Management', () => {
    it('should switch to a supported chain', async () => {
      const success = await multiChainService.switchChain(137); // Polygon
      expect(success).toBe(true);

      const currentConfig = multiChainService.getCurrentChainConfig();
      expect(currentConfig.chainId).toBe(137);
      expect(currentConfig.name).toBe('Polygon');
    });

    it('should throw error for unsupported chain', async () => {
      await expect(multiChainService.switchChain(999))
        .rejects
        .toThrow('Unsupported chain ID: 999');
    });

    it('should return all supported chains', () => {
      const supportedChains = multiChainService.getSupportedChains();
      
      expect(supportedChains).toHaveLength(3);
      expect(supportedChains.map(c => c.chainId)).toContain(1);   // Ethereum
      expect(supportedChains.map(c => c.chainId)).toContain(137); // Polygon
      expect(supportedChains.map(c => c.chainId)).toContain(42161); // Arbitrum
    });

    it('should get current chain configuration', () => {
      const config = multiChainService.getCurrentChainConfig();
      
      expect(config).toBeDefined();
      expect(config.chainId).toBe(1); // Default to Ethereum
      expect(config.name).toBe('Ethereum');
      expect(config.rpcUrl).toBeDefined();
      expect(config.quoterAddress).toBeDefined();
      expect(config.routerAddress).toBeDefined();
    });
  });

  describe('Multi-Chain Price Comparison', () => {
    it('should compare prices across multiple chains', async () => {
      const swapParams: SwapParams = {
        tokenIn: mockTokenIn,
        tokenOut: mockTokenOut,
        amountIn: 1000,
      };

      const priceComparisons = await multiChainService.compareChainPrices(swapParams);

      expect(priceComparisons).toBeInstanceOf(Map);
      expect(priceComparisons.size).toBeGreaterThan(0);
      
      // Check that we have quotes for supported chains
      for (const [chainId, quote] of priceComparisons) {
        expect([1, 137, 42161]).toContain(chainId);
        expect(quote.amountIn).toBe('1000');
        expect(quote.amountOut).toBeDefined();
        expect(quote.gasEstimate).toBeDefined();
      }
    });

    it('should compare prices for specific chains only', async () => {
      const swapParams: SwapParams = {
        tokenIn: mockTokenIn,
        tokenOut: mockTokenOut,
        amountIn: 1000,
      };

      const specificChains = [1, 137]; // Ethereum and Polygon only
      const priceComparisons = await multiChainService.compareChainPrices(swapParams, specificChains);

      expect(priceComparisons.size).toBeLessThanOrEqual(2);
      
      for (const [chainId] of priceComparisons) {
        expect(specificChains).toContain(chainId);
      }
    });
  });

  describe('Cross-Chain Quotes', () => {
    it('should get cross-chain quote', async () => {
      const swapParams: SwapParams = {
        tokenIn: mockTokenIn,
        tokenOut: mockTokenOut,
        amountIn: 1000,
      };

      const crossChainQuote = await multiChainService.getCrossChainQuote(1, 137, swapParams);

      expect(crossChainQuote).toBeDefined();
      expect(crossChainQuote.sourceChain).toBe(1);
      expect(crossChainQuote.targetChain).toBe(137);
      expect(crossChainQuote.amountIn).toBe('1000');
      expect(crossChainQuote.amountOut).toBeDefined();
      expect(crossChainQuote.bridgeFee).toBeDefined();
      expect(crossChainQuote.totalGasCost).toBeDefined();
      expect(crossChainQuote.estimatedTime).toBeGreaterThan(0);
      expect(crossChainQuote.route).toEqual(['1', '137']);
    });

    it('should throw error for unsupported cross-chain pair', async () => {
      const swapParams: SwapParams = {
        tokenIn: mockTokenIn,
        tokenOut: mockTokenOut,
        amountIn: 1000,
      };

      await expect(multiChainService.getCrossChainQuote(999, 1000, swapParams))
        .rejects
        .toThrow('Unsupported chain for cross-chain swap');
    });
  });

  describe('Gas Fee Calculations', () => {
    it('should get network gas fees for current chain', async () => {
      const gasFees = await multiChainService.getNetworkGasFees();

      expect(gasFees).toBeDefined();
      expect(gasFees.chainId).toBe(1); // Default Ethereum
      expect(gasFees.chainName).toBe('Ethereum');
      expect(gasFees.gasPrice).toBeDefined();
      expect(gasFees.estimatedSwapCost).toBeDefined();
    });

    it('should get network gas fees for specific chain', async () => {
      const gasFees = await multiChainService.getNetworkGasFees(137); // Polygon

      expect(gasFees).toBeDefined();
      expect(gasFees.chainId).toBe(137);
      expect(gasFees.chainName).toBe('Polygon');
      expect(gasFees.gasPrice).toBeDefined();
      expect(gasFees.estimatedSwapCost).toBeDefined();
    });

    it('should throw error for unsupported chain gas fees', async () => {
      await expect(multiChainService.getNetworkGasFees(999))
        .rejects
        .toThrow('No service or config available for chain ID: 999');
    });
  });

  describe('Best Chain Selection', () => {
    it('should find best chain for swap', async () => {
      const swapParams: SwapParams = {
        tokenIn: mockTokenIn,
        tokenOut: mockTokenOut,
        amountIn: 1000,
      };

      const bestChain = await multiChainService.getBestChainForSwap(swapParams);

      expect(bestChain).toBeDefined();
      expect(bestChain.chainId).toBeDefined();
      expect(bestChain.chainName).toBeDefined();
      expect(bestChain.quote).toBeDefined();
      expect(bestChain.gasCost).toBeDefined();
      expect(bestChain.totalCost).toBeDefined();
      expect([1, 137, 42161]).toContain(bestChain.chainId);
    });
  });

  describe('Token Availability', () => {
    it('should check if common tokens are available on chains', async () => {
      const usdcOnEthereum = await multiChainService.isTokenAvailableOnChain('USDC', 1);
      const wethOnPolygon = await multiChainService.isTokenAvailableOnChain('WETH', 137);
      const ldaoOnArbitrum = await multiChainService.isTokenAvailableOnChain('LDAO', 42161);

      expect(usdcOnEthereum).toBe(true);
      expect(wethOnPolygon).toBe(true);
      expect(ldaoOnArbitrum).toBe(true);
    });

    it('should return false for unknown tokens', async () => {
      const unknownToken = await multiChainService.isTokenAvailableOnChain('UNKNOWN', 1);
      expect(unknownToken).toBe(false);
    });

    it('should return false for unsupported chains', async () => {
      const tokenOnUnsupportedChain = await multiChainService.isTokenAvailableOnChain('USDC', 999);
      expect(tokenOnUnsupportedChain).toBe(false);
    });
  });

  describe('Swap Quote Integration', () => {
    it('should get swap quote using multi-chain service', async () => {
      const swapParams: SwapParams = {
        tokenIn: mockTokenIn,
        tokenOut: mockTokenOut,
        amountIn: 1000,
        slippageTolerance: 0.5,
      };

      const quote = await multiChainService.getSwapQuote(swapParams);

      expect(quote).toBeDefined();
      expect(quote.amountIn).toBe('1000');
      expect(quote.amountOut).toBe('1000000000000000000');
      expect(quote.gasEstimate).toBe('200000');
      expect(quote.route).toHaveLength(1);
    });

    it('should throw error when no service available for current chain', async () => {
      // Switch to an unsupported chain (this should not happen in practice)
      const originalChainId = multiChainService.getCurrentChainConfig().chainId;
      
      // Manually set an invalid chain ID (simulating error condition)
      (multiChainService as any).currentChainId = 999;

      const swapParams: SwapParams = {
        tokenIn: mockTokenIn,
        tokenOut: mockTokenOut,
        amountIn: 1000,
      };

      await expect(multiChainService.getSwapQuote(swapParams))
        .rejects
        .toThrow('No Uniswap service available for chain ID: 999');

      // Restore original chain ID
      (multiChainService as any).currentChainId = originalChainId;
    });
  });
});
