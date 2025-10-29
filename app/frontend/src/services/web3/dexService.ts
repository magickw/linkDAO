/**
 * DEX Service - Integrates with Uniswap and SushiSwap for direct crypto swaps
 */

import { ethers } from 'ethers';
import { getSigner, getProvider } from '@/utils/web3';
import { web3ErrorHandler } from '@/utils/web3ErrorHandling';
import { uniswapRouterABI } from '@/lib/abi/UniswapRouterABI';
import { sushiswapRouterABI } from '@/lib/abi/SushiSwapRouterABI';

// DEX Router contract addresses (Ethereum mainnet)
const UNISWAP_ROUTER_ADDRESS = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
const SUSHISWAP_ROUTER_ADDRESS = '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F';

// Token addresses and decimals (Ethereum mainnet)
const TOKEN_INFO: Record<string, { address: string; decimals: number }> = {
  'ETH': { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  'WETH': { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
  'USDC': { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  'USDT': { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  'DAI': { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
  'LDAO': { address: '0xc9F690B45e33ca909bB9ab97836091673232611B', decimals: 18 } // LDAO token address on Sepolia
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

  private constructor() {}

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
    slippage: number = 0.5
  ): Promise<DexSwapQuote[]> {
    try {
      const [uniswapQuote, sushiswapQuote] = await Promise.allSettled([
        this.getUniswapQuote(fromToken, toToken, fromAmount, slippage),
        this.getSushiswapQuote(fromToken, toToken, fromAmount, slippage)
      ]);

      const quotes: DexSwapQuote[] = [];

      if (uniswapQuote.status === 'fulfilled') {
        quotes.push(uniswapQuote.value);
      }

      if (sushiswapQuote.status === 'fulfilled') {
        quotes.push(sushiswapQuote.value);
      }

      // Sort by best expected amount (highest first)
      return quotes.sort((a, b) => 
        parseFloat(b.expectedAmount) - parseFloat(a.expectedAmount)
      );
    } catch (error) {
      console.error('Failed to get DEX swap quotes:', error);
      return [];
    }
  }

  /**
   * Get quote from Uniswap
   */
  private async getUniswapQuote(
    fromToken: string,
    toToken: string,
    fromAmount: string,
    slippage: number
  ): Promise<DexSwapQuote> {
    try {
      const provider = await getProvider();
      if (!provider) {
        throw new Error('No provider available');
      }

      const fromTokenInfo = TOKEN_INFO[fromToken] || { address: fromToken, decimals: 18 };
      const toTokenInfo = TOKEN_INFO[toToken] || { address: toToken, decimals: 18 };
      
      // Create contract instance
      const uniswapRouter = new ethers.Contract(
        UNISWAP_ROUTER_ADDRESS,
        uniswapRouterABI,
        provider
      );

      // Convert amount to proper units based on token decimals
      const amountIn = ethers.utils.parseUnits(fromAmount, fromTokenInfo.decimals);
      
      // Define token path
      const path = [fromTokenInfo.address, toTokenInfo.address];
      
      // Get amounts out
      const amountsOut = await uniswapRouter.getAmountsOut(amountIn, path);
      const expectedAmount = amountsOut[amountsOut.length - 1];
      
      // Calculate minimum amount with slippage
      const slippageFactor = 1000 - (slippage * 10);
      const minAmount = expectedAmount.mul(slippageFactor).div(1000);
      
      // Estimate gas
      let estimatedGas = ethers.BigNumber.from('200000');
      try {
        // Get signer address for gas estimation
        const signer = await getSigner();
        const signerAddress = signer ? await signer.getAddress() : ethers.constants.AddressZero;
        
        // Try to get a more accurate gas estimate
        estimatedGas = await uniswapRouter.estimateGas.swapExactTokensForTokens(
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
        toAmount: ethers.utils.formatUnits(minAmount, toTokenInfo.decimals),
        expectedAmount: ethers.utils.formatUnits(expectedAmount, toTokenInfo.decimals),
        priceImpact,
        fee: '0', // This would be calculated from the actual swap
        path,
        estimatedGas: estimatedGas.toString(),
        slippage
      };
    } catch (error) {
      throw new Error(`Uniswap quote failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get quote from SushiSwap
   */
  private async getSushiswapQuote(
    fromToken: string,
    toToken: string,
    fromAmount: string,
    slippage: number
  ): Promise<DexSwapQuote> {
    try {
      const provider = await getProvider();
      if (!provider) {
        throw new Error('No provider available');
      }

      const fromTokenInfo = TOKEN_INFO[fromToken] || { address: fromToken, decimals: 18 };
      const toTokenInfo = TOKEN_INFO[toToken] || { address: toToken, decimals: 18 };
      
      // Create contract instance
      const sushiswapRouter = new ethers.Contract(
        SUSHISWAP_ROUTER_ADDRESS,
        sushiswapRouterABI,
        provider
      );

      // Convert amount to proper units based on token decimals
      const amountIn = ethers.utils.parseUnits(fromAmount, fromTokenInfo.decimals);
      
      // Define token path
      const path = [fromTokenInfo.address, toTokenInfo.address];
      
      // Get amounts out
      const amountsOut = await sushiswapRouter.getAmountsOut(amountIn, path);
      const expectedAmount = amountsOut[amountsOut.length - 1];
      
      // Calculate minimum amount with slippage
      const slippageFactor = 1000 - (slippage * 10);
      const minAmount = expectedAmount.mul(slippageFactor).div(1000);
      
      // Estimate gas
      let estimatedGas = ethers.BigNumber.from('200000');
      try {
        // Get signer address for gas estimation
        const signer = await getSigner();
        const signerAddress = signer ? await signer.getAddress() : ethers.constants.AddressZero;
        
        // Try to get a more accurate gas estimate
        estimatedGas = await sushiswapRouter.estimateGas.swapExactTokensForTokens(
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
        toAmount: ethers.utils.formatUnits(minAmount, toTokenInfo.decimals),
        expectedAmount: ethers.utils.formatUnits(expectedAmount, toTokenInfo.decimals),
        priceImpact,
        fee: '0', // This would be calculated from the actual swap
        path,
        estimatedGas: estimatedGas.toString(),
        slippage
      };
    } catch (error) {
      throw new Error(`SushiSwap quote failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute swap on Uniswap
   */
  async swapOnUniswap(
    fromToken: string,
    toToken: string,
    fromAmount: string,
    minAmountOut: string,
    deadline: number
  ): Promise<DexSwapTransaction> {
    try {
      const signer = await getSigner();
      if (!signer) {
        throw new Error('No wallet connected');
      }

      const fromTokenInfo = TOKEN_INFO[fromToken] || { address: fromToken, decimals: 18 };
      const toTokenInfo = TOKEN_INFO[toToken] || { address: toToken, decimals: 18 };
      
      // Create contract instance
      const uniswapRouter = new ethers.Contract(
        UNISWAP_ROUTER_ADDRESS,
        uniswapRouterABI,
        signer
      );

      // Convert amounts to proper units based on token decimals
      const amountIn = ethers.utils.parseUnits(fromAmount, fromTokenInfo.decimals);
      const amountOutMin = ethers.utils.parseUnits(minAmountOut, toTokenInfo.decimals);
      
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
        transactionHash: receipt.transactionHash,
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
    deadline: number
  ): Promise<DexSwapTransaction> {
    try {
      const signer = await getSigner();
      if (!signer) {
        throw new Error('No wallet connected');
      }

      const fromTokenInfo = TOKEN_INFO[fromToken] || { address: fromToken, decimals: 18 };
      const toTokenInfo = TOKEN_INFO[toToken] || { address: toToken, decimals: 18 };
      
      // Create contract instance
      const sushiswapRouter = new ethers.Contract(
        SUSHISWAP_ROUTER_ADDRESS,
        sushiswapRouterABI,
        signer
      );

      // Convert amounts to proper units based on token decimals
      const amountIn = ethers.utils.parseUnits(fromAmount, fromTokenInfo.decimals);
      const amountOutMin = ethers.utils.parseUnits(minAmountOut, toTokenInfo.decimals);
      
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
        transactionHash: receipt.transactionHash,
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
    amount: string
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

      const tokenInfo = TOKEN_INFO[tokenSymbol] || { address: tokenSymbol, decimals: 18 };

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
      const parsedAmount = ethers.utils.parseUnits(amount, tokenInfo.decimals);
      
      // Approve spending
      const tx = await tokenContract.approve(spenderAddress, parsedAmount);
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.transactionHash
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
  getTokenInfo(tokenSymbol: string): { address: string; decimals: number } | null {
    return TOKEN_INFO[tokenSymbol] || null;
  }
}

export const dexService = DexService.getInstance();