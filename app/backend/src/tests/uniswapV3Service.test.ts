import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { UniswapV3Service } from '../services/uniswapV3Service';
import { SwapParams, TokenInfo } from '../types/uniswapV3';

// Mock ethers to avoid actual network calls in tests
jest.mock('ethers', () => ({
  ethers: {
    providers: {
      JsonRpcProvider: jest.fn().mockImplementation(() => ({
        getBlockNumber: jest.fn().mockResolvedValue(18000000),
        getGasPrice: jest.fn().mockResolvedValue({ toString: () => '20000000000' }),
        estimateGas: jest.fn().mockResolvedValue({ toString: () => '200000' }),
      })),
    },
    constants: {
      AddressZero: '0x0000000000000000000000000000000000000000',
    },
    utils: {
      parseUnits: jest.fn().mockReturnValue({ toString: () => '1000000000000000000' }),
      parseUnits: jest.fn().mockReturnValue('20000000000'),
    },
    BigNumber: {
      from: jest.fn().mockReturnValue({ toString: () => '200000' }),
    },
    Wallet: jest.fn().mockImplementation(() => ({
      sendTransaction: jest.fn().mockResolvedValue({
        wait: jest.fn().mockResolvedValue({
          transactionHash: '0x123',
          blockNumber: 18000001,
          gasUsed: { toString: () => '180000' },
          status: 1,
        }),
      }),
    })),
    Contract: jest.fn().mockImplementation(() => ({
      symbol: jest.fn().mockResolvedValue('TEST'),
      decimals: jest.fn().mockResolvedValue(18),
      name: jest.fn().mockResolvedValue('Test Token'),
    })),
  },
}));

// Mock Uniswap SDK
jest.mock('@uniswap/smart-order-router', () => ({
  AlphaRouter: jest.fn().mockImplementation(() => ({
    route: jest.fn().mockResolvedValue({
      quote: {
        toFixed: () => '1000000000000000000',
        multiply: jest.fn().mockReturnValue({
          toFixed: () => '950000000000000000',
        }),
      },
      estimatedGasUsedQuoteToken: {
        toFixed: () => '0.01',
      },
      route: [{
        tokenIn: { address: '0x123' },
        tokenOut: { address: '0x456' },
        pools: [{ fee: 3000, token0: { address: '0x123' } }],
      }],
      methodParameters: {
        to: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        calldata: '0x123',
        value: '0',
      },
    }),
  })),
  SwapType: {
    SWAP_ROUTER_02: 'SWAP_ROUTER_02',
  },
}));

jest.mock('@uniswap/sdk-core', () => ({
  Token: jest.fn().mockImplementation((chainId, address, decimals, symbol, name) => ({
    chainId,
    address,
    decimals,
    symbol,
    name,
  })),
  CurrencyAmount: {
    fromRawAmount: jest.fn().mockReturnValue({
      toString: () => '1000000000000000000',
    }),
  },
  TradeType: {
    EXACT_INPUT: 'EXACT_INPUT',
  },
  Percent: jest.fn().mockImplementation((numerator, denominator) => ({
    numerator,
    denominator,
  })),
}));

describe('UniswapV3Service', () => {
  let uniswapV3Service: UniswapV3Service;
  let mockTokenIn: TokenInfo;
  let mockTokenOut: TokenInfo;

  beforeEach(() => {
    uniswapV3Service = new UniswapV3Service(
      'https://test-rpc-url.com',
      1,
      '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
      '0xE592427A0AEce92De3Edee1F18E0157C05861564'
    );

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

  describe('getSwapQuote', () => {
    it('should return a valid swap quote', async () => {
      const swapParams: SwapParams = {
        tokenIn: mockTokenIn,
        tokenOut: mockTokenOut,
        amountIn: 1000,
        slippageTolerance: 0.5,
      };

      const quote = await uniswapV3Service.getSwapQuote(swapParams);

      expect(quote).toBeDefined();
      expect(quote.amountIn).toBe('1000');
      expect(quote.amountOut).toBe('1000000000000000000');
      expect(quote.amountOutMinimum).toBe('950000000000000000');
      expect(quote.gasEstimate).toBe('200000');
      expect(quote.route).toHaveLength(1);
      expect(quote.methodParameters).toBeDefined();
      expect(quote.blockNumber).toBe(18000000);
      expect(quote.timestamp).toBeGreaterThan(0);
    });

    it('should handle invalid token addresses', async () => {
      const invalidSwapParams: SwapParams = {
        tokenIn: { ...mockTokenIn, address: 'invalid-address' },
        tokenOut: mockTokenOut,
        amountIn: 1000,
      };

      await expect(uniswapV3Service.getSwapQuote(invalidSwapParams))
        .rejects
        .toThrow();
    });

    it('should apply custom slippage tolerance', async () => {
      const swapParams: SwapParams = {
        tokenIn: mockTokenIn,
        tokenOut: mockTokenOut,
        amountIn: 1000,
        slippageTolerance: 1.0, // 1% slippage
      };

      const quote = await uniswapV3Service.getSwapQuote(swapParams);

      expect(quote).toBeDefined();
      expect(parseFloat(quote.amountOutMinimum)).toBeLessThan(parseFloat(quote.amountOut));
    });
  });

  describe('validateAndGetTokenInfo', () => {
    it('should return token information for valid address', async () => {
      const tokenAddress = '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8';

      const tokenInfo = await uniswapV3Service.validateAndGetTokenInfo(tokenAddress);

      expect(tokenInfo).toBeDefined();
      expect(tokenInfo.symbol).toBe('TEST');
      expect(tokenInfo.decimals).toBe(18);
      expect(tokenInfo.name).toBe('Test Token');
    });

    it('should throw error for invalid token address', async () => {
      const invalidAddress = 'invalid-address';

      await expect(uniswapV3Service.validateAndGetTokenInfo(invalidAddress))
        .rejects
        .toThrow('Invalid token address');
    });
  });

  describe('getLiquidityInfo', () => {
    it('should return liquidity information for token pair', async () => {
      const tokenA = '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8';
      const tokenB = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
      const fee = 3000;

      const liquidityInfo = await uniswapV3Service.getLiquidityInfo(tokenA, tokenB, fee);

      expect(liquidityInfo).toBeDefined();
      expect(liquidityInfo.fee).toBe(fee);
      expect(liquidityInfo.token0).toBeDefined();
      expect(liquidityInfo.token1).toBeDefined();
      expect(liquidityInfo.poolAddress).toBeDefined();
    });
  });

  describe('monitorLiquidityPools', () => {
    it('should monitor multiple liquidity pools', async () => {
      const tokenPairs = [
        {
          tokenA: '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8',
          tokenB: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          fee: 3000,
        },
        {
          tokenA: '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8',
          tokenB: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          fee: 500,
        },
      ];

      const liquidityInfos = await uniswapV3Service.monitorLiquidityPools(tokenPairs);

      expect(liquidityInfos).toHaveLength(2);
      expect(liquidityInfos[0].fee).toBe(3000);
      expect(liquidityInfos[1].fee).toBe(500);
    });
  });

  describe('handleSwapFailure', () => {
    it('should return alternative routes on swap failure', async () => {
      const swapParams: SwapParams = {
        tokenIn: mockTokenIn,
        tokenOut: mockTokenOut,
        amountIn: 1000,
        slippageTolerance: 0.5,
      };

      const error = new Error('Swap failed');
      const alternatives = await uniswapV3Service.handleSwapFailure(swapParams, error);

      expect(alternatives).toBeDefined();
      expect(Array.isArray(alternatives)).toBe(true);
    });
  });

  describe('getOptimizedGasPrice', () => {
    it('should return optimized gas price', async () => {
      const gasPrice = await uniswapV3Service.getOptimizedGasPrice();

      expect(gasPrice).toBeDefined();
      expect(gasPrice.toString()).toBeDefined();
    });
  });
});
