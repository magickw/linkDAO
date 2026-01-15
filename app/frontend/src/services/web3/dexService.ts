/**
 * DEX Service - Integrates with Uniswap and SushiSwap for direct crypto swaps
 */

import { ethers } from 'ethers';
import { getSigner, getProvider } from '@/utils/web3';
import { web3ErrorHandler } from '@/utils/web3ErrorHandling';
import { uniswapRouterABI } from '@/lib/abi/UniswapRouterABI';
import { sushiswapRouterABI } from '@/lib/abi/SushiSwapRouterABI';

// DEX Router contract addresses
const UNISWAP_ROUTER_ADDRESSES: Record<number, string> = {
  1: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Ethereum Mainnet
  8453: '0x2626664c2603336E57B271c5C0b26F421741e481', // Base Mainnet (Uniswap V3)
  84532: '0x94Cc0AaC535CCDB3C01d6787D6413C739ae12bc4', // Base Sepolia (Uniswap V3)
};

const SUSHISWAP_ROUTER_ADDRESSES: Record<number, string> = {
  1: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F', // Ethereum Mainnet
  // SushiSwap might not be on Base or addresses differ. Keeping mainnet for now.
  // Add Base addresses if available/needed.
};

// Token addresses and decimals
const TOKEN_INFO: Record<number, Record<string, { address: string; decimals: number }>> = {
  1: { // Ethereum
    'ETH': { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
    'WETH': { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
    'USDC': { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    'USDT': { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    'DAI': { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
    'LDAO': { address: '0xc9F690B45e33ca909bB9ab97836091673232611B', decimals: 18 }
  },
  8453: { // Base
    'ETH': { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
    'WETH': { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
    'USDC': { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    // Add LDAO address for Base when available
  },
  84532: { // Base Sepolia
    'ETH': { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
    'WETH': { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
    'USDC': { address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', decimals: 6 },
    // Add LDAO address for Base Sepolia when available
  }
};

export interface DexSwapQuote {
  dex: 'uniswap' | 'sushiswap';
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  expectedAmount: string;
  priceImpact: number;
  fee: string;
  path: string[];
  estimatedGas: string;
  slippage: number;
}

export interface DexSwapTransaction {
  dex: 'uniswap' | 'sushiswap';
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  transactionHash: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
}

export class DexService {
  private static instance: DexService;

  private constructor() { }

  static getInstance(): DexService {
    if (!DexService.instance) {
      DexService.instance = new DexService();
    }
    return DexService.instance;
  }

  /**
   * Get swap quotes from both DEXes
   */
  async getSwapQuotes(
    fromToken: string,
    toToken: string,
    fromAmount: string,
    slippage: number = 0.5,
    chainId: number = 1
  ): Promise<DexSwapQuote[]> {
    try {
      const [uniswapQuote, sushiswapQuote] = await Promise.allSettled([
        this.getUniswapQuote(fromToken, toToken, fromAmount, slippage, chainId),
        this.getSushiswapQuote(fromToken, toToken, fromAmount, slippage, chainId)
      ]);

      const quotes: DexSwapQuote[] = [];

      if (uniswapQuote.status === 'fulfilled') {
        quotes.push(uniswapQuote.value);
      }

      if (sushiswapQuote.status === 'fulfilled') {
        quotes.push(sushiswapQuote.value);
      }

      // If no quotes are available, return mock quotes
      if (quotes.length === 0) {
        console.warn('No DEX quotes available, returning mock quotes');
        quotes.push(
          this.getMockQuote('uniswap', fromToken, toToken, fromAmount, slippage),
          this.getMockQuote('sushiswap', fromToken, toToken, fromAmount, slippage)
        );
      }

      // Sort by best expected amount (highest first)
      return quotes.sort((a, b) =>
        parseFloat(b.expectedAmount) - parseFloat(a.expectedAmount)
      );
    } catch (error) {
      console.error('Failed to get DEX swap quotes, returning mock data:', error);
      // Return mock quotes as fallback
      return [
        this.getMockQuote('uniswap', fromToken, toToken, fromAmount, slippage),
        this.getMockQuote('sushiswap', fromToken, toToken, fromAmount, slippage)
      ];
    }
  }

  /**
   * Get quote from Uniswap
   */
  private async getUniswapQuote(
    fromToken: string,
    toToken: string,
    fromAmount: string,
    slippage: number,
    chainId: number
  ): Promise<DexSwapQuote> {
    try {
      const provider = await getProvider();
      if (!provider) {
        return this.getMockQuote('uniswap', fromToken, toToken, fromAmount, slippage);
      }

      const routerAddress = UNISWAP_ROUTER_ADDRESSES[chainId];
      const chainTokens = TOKEN_INFO[chainId];

      if (!routerAddress || !chainTokens) {
        console.warn(`Uniswap not supported on chain ${chainId}`);
        return this.getMockQuote('uniswap', fromToken, toToken, fromAmount, slippage);
      }

      const fromTokenInfo = chainTokens[fromToken] || { address: fromToken, decimals: 18 };
      const toTokenInfo = chainTokens[toToken] || { address: toToken, decimals: 18 };

      // Create contract instance
      const uniswapRouter = new ethers.Contract(
        routerAddress,
        uniswapRouterABI,
        provider
      );

      // Convert amount to proper units based on token decimals
      const amountIn = ethers.parseUnits(fromAmount, fromTokenInfo.decimals);

      // Define token path
      const path = [fromTokenInfo.address, toTokenInfo.address];

      // Get amounts out with error handling
      let amountsOut;
      try {
        amountsOut = await uniswapRouter.getAmountsOut(amountIn, path);
      } catch (error) {
        console.warn('Uniswap quote failed, returning mock data:', error);
        return this.getMockQuote('uniswap', fromToken, toToken, fromAmount, slippage);
      }
      
      // Validate amountsOut result
      if (!amountsOut || amountsOut.length === 0) {
        console.warn('Invalid amountsOut from Uniswap, returning mock data');
        return this.getMockQuote('uniswap', fromToken, toToken, fromAmount, slippage);
      }
      
      const expectedAmount = amountsOut[amountsOut.length - 1];
      
      // Check if expectedAmount is valid
      if (expectedAmount === 0n) {
        console.warn('Zero expected amount from Uniswap, returning mock data');
        return this.getMockQuote('uniswap', fromToken, toToken, fromAmount, slippage);
      }

      // Calculate minimum amount with slippage
      const slippageFactor = BigInt(Math.floor(1000 - (slippage * 10)));
      const minAmount = (expectedAmount * slippageFactor) / 1000n;

      // Estimate gas
      let estimatedGas = 200000n;
      try {
        // Get signer address for gas estimation
        const signer = await getSigner();
        const signerAddress = signer ? await signer.getAddress() : ethers.ZeroAddress;

        // Try to get a more accurate gas estimate
        estimatedGas = await (uniswapRouter.estimateGas as any).swapExactTokensForTokens(
          amountIn,
          minAmount,
          path,
          signerAddress,
          Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes deadline
        );
      } catch (gasError) {
        console.warn('Could not estimate gas, using default:', gasError);
      }

      // Calculate price impact (simplified)
      const priceImpact = 0.1; // This would be calculated properly in a real implementation

      return {
        dex: 'uniswap',
        fromToken,
        toToken,
        fromAmount,
        toAmount: ethers.formatUnits(minAmount, toTokenInfo.decimals),
        expectedAmount: ethers.formatUnits(expectedAmount, toTokenInfo.decimals),
        priceImpact,
        fee: '0.001', // Mock fee
        path,
        estimatedGas: estimatedGas.toString(),
        slippage
      };
    } catch (error) {
      // Return mock data if real quote fails
      console.warn('Uniswap quote failed, returning mock data:', error);
      return this.getMockQuote('uniswap', fromToken, toToken, fromAmount, slippage);
    }
  }

  /**
   * Get quote from SushiSwap
   */
  private async getSushiswapQuote(
    fromToken: string,
    toToken: string,
    fromAmount: string,
    slippage: number,
    chainId: number
  ): Promise<DexSwapQuote> {
    try {
      const provider = await getProvider();
      if (!provider) {
        return this.getMockQuote('sushiswap', fromToken, toToken, fromAmount, slippage);
      }

      const routerAddress = SUSHISWAP_ROUTER_ADDRESSES[chainId];
      const chainTokens = TOKEN_INFO[chainId];

      if (!routerAddress || !chainTokens) {
        // SushiSwap might not be on this chain
        return this.getMockQuote('sushiswap', fromToken, toToken, fromAmount, slippage);
      }

      const fromTokenInfo = chainTokens[fromToken] || { address: fromToken, decimals: 18 };
      const toTokenInfo = chainTokens[toToken] || { address: toToken, decimals: 18 };

      // Create contract instance
      const sushiswapRouter = new ethers.Contract(
        routerAddress,
        sushiswapRouterABI,
        provider
      );

      // Convert amount to proper units based on token decimals
      const amountIn = ethers.parseUnits(fromAmount, fromTokenInfo.decimals);

      // Define token path
      const path = [fromTokenInfo.address, toTokenInfo.address];

      // Get amounts out with error handling
      let amountsOut;
      try {
        amountsOut = await sushiswapRouter.getAmountsOut(amountIn, path);
      } catch (error) {
        console.warn('SushiSwap quote failed, returning mock data:', error);
        return this.getMockQuote('sushiswap', fromToken, toToken, fromAmount, slippage);
      }
      
      // Validate amountsOut result
      if (!amountsOut || amountsOut.length === 0) {
        console.warn('Invalid amountsOut from SushiSwap, returning mock data');
        return this.getMockQuote('sushiswap', fromToken, toToken, fromAmount, slippage);
      }
      
      const expectedAmount = amountsOut[amountsOut.length - 1];
      
      // Check if expectedAmount is valid
      if (expectedAmount === 0n) {
        console.warn('Zero expected amount from SushiSwap, returning mock data');
        return this.getMockQuote('sushiswap', fromToken, toToken, fromAmount, slippage);
      }

      // Calculate minimum amount with slippage
      const slippageFactor = BigInt(Math.floor(1000 - (slippage * 10)));
      const minAmount = (expectedAmount * slippageFactor) / 1000n;

      // Estimate gas
      let estimatedGas = 200000n;
      try {
        // Get signer address for gas estimation
        const signer = await getSigner();
        const signerAddress = signer ? await signer.getAddress() : ethers.ZeroAddress;

        // Try to get a more accurate gas estimate
        estimatedGas = await (sushiswapRouter.estimateGas as any).swapExactTokensForTokens(
          amountIn,
          minAmount,
          path,
          signerAddress,
          Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes deadline
        );
      } catch (gasError) {
        console.warn('Could not estimate gas, using default:', gasError);
      }

      // Calculate price impact (simplified)
      const priceImpact = 0.15; // This would be calculated properly in a real implementation

      return {
        dex: 'sushiswap',
        fromToken,
        toToken,
        fromAmount,
        toAmount: ethers.formatUnits(minAmount, toTokenInfo.decimals),
        expectedAmount: ethers.formatUnits(expectedAmount, toTokenInfo.decimals),
        priceImpact,
        fee: '0.0015', // Mock fee
        path,
        estimatedGas: estimatedGas.toString(),
        slippage
      };
    } catch (error) {
      // Return mock data if real quote fails
      console.warn('SushiSwap quote failed, returning mock data:', error);
      return this.getMockQuote('sushiswap', fromToken, toToken, fromAmount, slippage);
    }
  }

  /**
   * Generate mock quote for development/testing
   */
  private getMockQuote(
    dex: 'uniswap' | 'sushiswap',
    fromToken: string,
    toToken: string,
    fromAmount: string,
    slippage: number
  ): DexSwapQuote {
    // Mock exchange rates
    const exchangeRates: Record<string, Record<string, number>> = {
      'ETH': {
        'LDAO': 0.00025, // 1 ETH = 4000 LDAO (at $0.50 per LDAO and $2000 per ETH)
      },
      'USDC': {
        'LDAO': 2, // 1 USDC = 2 LDAO (at $0.50 per LDAO)
      }
    };

    const rate = exchangeRates[fromToken]?.[toToken] || 1;
    const expectedAmount = (parseFloat(fromAmount) * rate).toString();

    // Apply slippage
    const slippageFactor = slippage / 100;
    const minAmount = (parseFloat(expectedAmount) * (1 - slippageFactor)).toString();

    return {
      dex,
      fromToken,
      toToken,
      fromAmount,
      toAmount: minAmount,
      expectedAmount,
      priceImpact: 0.1,
      fee: dex === 'uniswap' ? '0.001' : '0.0015',
      path: [fromToken, toToken],
      estimatedGas: '200000',
      slippage
    };
  }

  /**
   * Execute swap on Uniswap
   */
  async swapOnUniswap(
    fromToken: string,
    toToken: string,
    fromAmount: string,
    minAmountOut: string,
    deadline: number,
    chainId: number = 1
  ): Promise<DexSwapTransaction> {
    try {
      const signer = await getSigner();
      if (!signer) {
        throw new Error('No wallet connected');
      }

      const routerAddress = UNISWAP_ROUTER_ADDRESSES[chainId];
      const chainTokens = TOKEN_INFO[chainId];

      if (!routerAddress || !chainTokens) {
        throw new Error(`Uniswap not supported on chain ${chainId}`);
      }

      const fromTokenInfo = chainTokens[fromToken] || { address: fromToken, decimals: 18 };
      const toTokenInfo = chainTokens[toToken] || { address: toToken, decimals: 18 };

      // Create contract instance
      const uniswapRouter = new ethers.Contract(
        routerAddress,
        uniswapRouterABI,
        signer
      );

      // Convert amounts to proper units based on token decimals
      const amountIn = ethers.parseUnits(fromAmount, fromTokenInfo.decimals);
      const amountOutMin = ethers.parseUnits(minAmountOut, toTokenInfo.decimals);

      // Define token path
      const path = [fromTokenInfo.address, toTokenInfo.address];

      // Execute swap
      const tx = await uniswapRouter.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        await signer.getAddress(),
        deadline
      );

      // Wait for transaction
      const receipt = await tx.wait();

      return {
        dex: 'uniswap',
        fromToken,
        toToken,
        fromAmount,
        toAmount: minAmountOut,
        transactionHash: receipt.hash,
        status: 'success'
      };
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'swapOnUniswap',
        component: 'DexService'
      });

      return {
        dex: 'uniswap',
        fromToken,
        toToken,
        fromAmount,
        toAmount: '0',
        transactionHash: '',
        status: 'failed',
        error: errorResponse.message
      };
    }
  }

  /**
   * Execute swap on SushiSwap
   */
  async swapOnSushiswap(
    fromToken: string,
    toToken: string,
    fromAmount: string,
    minAmountOut: string,
    deadline: number,
    chainId: number = 1
  ): Promise<DexSwapTransaction> {
    try {
      const signer = await getSigner();
      if (!signer) {
        throw new Error('No wallet connected');
      }

      const routerAddress = SUSHISWAP_ROUTER_ADDRESSES[chainId];
      const chainTokens = TOKEN_INFO[chainId];

      if (!routerAddress || !chainTokens) {
        throw new Error(`SushiSwap not supported on chain ${chainId}`);
      }

      const fromTokenInfo = chainTokens[fromToken] || { address: fromToken, decimals: 18 };
      const toTokenInfo = chainTokens[toToken] || { address: toToken, decimals: 18 };

      // Create contract instance
      const sushiswapRouter = new ethers.Contract(
        routerAddress,
        sushiswapRouterABI,
        signer
      );

      // Convert amounts to proper units based on token decimals
      const amountIn = ethers.parseUnits(fromAmount, fromTokenInfo.decimals);
      const amountOutMin = ethers.parseUnits(minAmountOut, toTokenInfo.decimals);

      // Define token path
      const path = [fromTokenInfo.address, toTokenInfo.address];

      // Execute swap
      const tx = await sushiswapRouter.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        await signer.getAddress(),
        deadline
      );

      // Wait for transaction
      const receipt = await tx.wait();

      return {
        dex: 'sushiswap',
        fromToken,
        toToken,
        fromAmount,
        toAmount: minAmountOut,
        transactionHash: receipt.hash,
        status: 'success'
      };
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'swapOnSushiswap',
        component: 'DexService'
      });

      return {
        dex: 'sushiswap',
        fromToken,
        toToken,
        fromAmount,
        toAmount: '0',
        transactionHash: '',
        status: 'failed',
        error: errorResponse.message
      };
    }
  }

  /**
   * Approve token spending for DEX router
   */
  async approveToken(
    tokenSymbol: string,
    spenderAddress: string,
    amount: string,
    chainId: number = 1
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      const signer = await getSigner();
      if (!signer) {
        throw new Error('No wallet connected');
      }

      const chainTokens = TOKEN_INFO[chainId];
      if (!chainTokens) {
        throw new Error(`Chain ${chainId} not configured`);
      }

      const tokenInfo = chainTokens[tokenSymbol] || { address: tokenSymbol, decimals: 18 };

      // ERC20 ABI for approve function
      const erc20ABI = [
        'function approve(address spender, uint256 amount) returns (bool)'
      ];

      // Create token contract instance
      const tokenContract = new ethers.Contract(
        tokenInfo.address,
        erc20ABI,
        signer
      );

      // Parse amount based on token decimals
      const parsedAmount = ethers.parseUnits(amount, tokenInfo.decimals);

      // Approve spending
      const tx = await tokenContract.approve(spenderAddress, parsedAmount);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'approveToken',
        component: 'DexService'
      });

      return {
        success: false,
        error: errorResponse.message
      };
    }
  }

  /**
   * Get token info by symbol
   */
  getTokenInfo(tokenSymbol: string, chainId: number = 1): { address: string; decimals: number } | null {
    const chainTokens = TOKEN_INFO[chainId];
    return chainTokens?.[tokenSymbol] || null;
  }
}

export const dexService = DexService.getInstance();