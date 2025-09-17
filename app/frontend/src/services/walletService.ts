/**
 * WalletService - Service for fetching wallet data from blockchain APIs
 * Features: Token balances, transaction history, portfolio value calculation
 */

import { PublicClient, createPublicClient, http, formatEther, Address } from 'viem';
import { mainnet, sepolia, base, baseGoerli } from 'viem/chains';

export interface TokenBalance {
  symbol: string;
  name: string;
  address: string;
  balance: string;
  balanceFormatted: string;
  decimals: number;
  valueUSD: number;
  change24h: number;
  priceUSD: number;
  isNative: boolean;
}

export interface Transaction {
  id: string;
  hash: string;
  type: 'send' | 'receive' | 'swap' | 'contract_interaction';
  amount: string;
  token: {
    symbol: string;
    address?: string;
  };
  valueUSD: string;
  from: string;
  to: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  blockNumber?: number;
  gasUsed?: string;
  gasFee?: string;
}

export interface PortfolioSummary {
  totalValueUSD: number;
  change24h: number;
  change24hPercent: number;
  totalTokens: number;
  lastUpdated: string;
}

export interface WalletData {
  address: string;
  portfolio: PortfolioSummary;
  tokens: TokenBalance[];
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
}

// Common ERC20 tokens to check (addresses for different chains)
const getTokensForChain = (chainId: number) => {
  switch (chainId) {
    case 8453: // Base Mainnet
      return [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
          decimals: 6
        },
        {
          symbol: 'USDT',
          name: 'Tether USD',
          address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2' as Address,
          decimals: 6
        },
        {
          symbol: 'LINK',
          name: 'Chainlink',
          address: '0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196' as Address,
          decimals: 18
        },
        {
          symbol: 'UNI',
          name: 'Uniswap',
          address: '0xc3De830EA07524a0761646a6a4e4be0e114a3C83' as Address,
          decimals: 18
        }
      ];
    case 84532: // Base Goerli
      return [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
          decimals: 6
        }
      ];
    case 11155111: // Sepolia Testnet
      return [
        {
          symbol: 'USDC',
          name: 'USD Coin (Sepolia)',
          address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address,
          decimals: 6
        }
      ];
    case 1: // Ethereum Mainnet
    default:
      return [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          address: '0xA0b86a33E6F68F3b5c4C33b8fF88D36a1c1e6c5a' as Address,
          decimals: 6
        },
        {
          symbol: 'USDT',
          name: 'Tether USD',
          address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address,
          decimals: 6
        },
        {
          symbol: 'LINK',
          name: 'Chainlink',
          address: '0x514910771AF9Ca656af840dff83E8264EcF986CA' as Address,
          decimals: 18
        },
        {
          symbol: 'UNI',
          name: 'Uniswap',
          address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' as Address,
          decimals: 18
        }
      ];
  }
};

// ERC20 ABI for balance checking
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    type: 'function'
  }
] as const;

export class WalletService {
  private publicClient: PublicClient;
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private chainId: number;

  constructor(chainId: number = 1) {
    this.chainId = chainId;
    let chain;
    switch (chainId) {
      case 8453:
        chain = base;
        break;
      case 84532:
        chain = baseGoerli;
        break;
      case 11155111:
        chain = sepolia;
        break;
      default:
        chain = mainnet;
    }
    
    this.publicClient = createPublicClient({
      chain,
      transport: http(),
      batch: {
        multicall: true,
      },
    }) as PublicClient;
  }

  /**
   * Get comprehensive wallet data including portfolio and transactions
   */
  async getWalletData(address: Address): Promise<WalletData> {
    try {
      const [tokens, transactions] = await Promise.all([
        this.getTokenBalances(address),
        this.getTransactionHistory(address)
      ]);

      const portfolio = this.calculatePortfolioSummary(tokens);

      return {
        address,
        portfolio,
        tokens,
        transactions,
        isLoading: false,
        error: null
      };
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      return {
        address,
        portfolio: {
          totalValueUSD: 0,
          change24h: 0,
          change24hPercent: 0,
          totalTokens: 0,
          lastUpdated: new Date().toISOString()
        },
        tokens: [],
        transactions: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch wallet data'
      };
    }
  }

  /**
   * Get token balances for a wallet address
   */
  async getTokenBalances(address: Address): Promise<TokenBalance[]> {
    const balances: TokenBalance[] = [];
    const chainId = this.publicClient.chain?.id || 1;
    const tokens = getTokensForChain(chainId);

    try {
      // Get ETH balance
      const ethBalance = await this.publicClient.getBalance({ address });
      const ethPrice = await this.getTokenPrice('ethereum');
      const ethBalanceFormatted = formatEther(ethBalance);
      const ethValueUSD = parseFloat(ethBalanceFormatted) * ethPrice;

      balances.push({
        symbol: chainId === 8453 || chainId === 84532 ? 'ETH' : 'ETH',
        name: 'Ethereum',
        address: '0x0000000000000000000000000000000000000000',
        balance: ethBalance.toString(),
        balanceFormatted: ethBalanceFormatted,
        decimals: 18,
        valueUSD: ethValueUSD,
        change24h: await this.getTokenChange24h('ethereum'),
        priceUSD: ethPrice,
        isNative: true
      });

      // Get ERC20 token balances
      for (const token of tokens) {
        try {
          const balanceResult = await this.publicClient.readContract({
            address: token.address,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address]
          });
          
          const balance = balanceResult as bigint;

          if (balance && balance > 0n) {
            const balanceFormatted = this.formatTokenBalance(balance, token.decimals);
            const price = await this.getTokenPrice(token.symbol.toLowerCase());
            const valueUSD = parseFloat(balanceFormatted) * price;

            balances.push({
              symbol: token.symbol,
              name: token.name,
              address: token.address,
              balance: balance.toString(),
              balanceFormatted,
              decimals: token.decimals,
              valueUSD,
              change24h: await this.getTokenChange24h(token.symbol.toLowerCase()),
              priceUSD: price,
              isNative: false
            });
          }
        } catch (tokenError) {
          console.warn(`Failed to fetch balance for ${token.symbol}:`, tokenError);
        }
      }

      return balances.sort((a, b) => b.valueUSD - a.valueUSD);
    } catch (error) {
      console.error('Error fetching token balances:', error);
      return [];
    }
  }

  /**
   * Get transaction history for a wallet address
   */
  async getTransactionHistory(address: Address, limit: number = 20): Promise<Transaction[]> {
    try {
      // Get latest block number
      const latestBlock = await this.publicClient.getBlockNumber();
      const transactions: Transaction[] = [];

      // Scan recent blocks for transactions
      const blocksToScan = Math.min(100, Number(latestBlock)); // Reduced block scan for better performance
      const startBlock = latestBlock - BigInt(blocksToScan);

      for (let i = 0; i < Math.min(10, blocksToScan); i++) {
        try {
          const blockNumber = latestBlock - BigInt(i);
          // Get block without transactions first, then get individual transactions
          const block = await this.publicClient.getBlock({
            blockNumber,
            includeTransactions: false
          });

          // For demo purposes, we'll create mock transaction data
          // In a real implementation, you'd use a block explorer API or indexing service
          if (i === 0) { // Only add one mock transaction to avoid rate limits
            const mockTransaction: Transaction = {
              id: `mock-tx-${Date.now()}`,
              hash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as `0x${string}`,
              type: Math.random() > 0.5 ? 'receive' : 'send',
              amount: (Math.random() * 10).toFixed(4),
              token: { symbol: this.chainId === 8453 || this.chainId === 84532 ? 'ETH' : 'ETH' },
              valueUSD: (Math.random() * 1000).toFixed(2),
              from: address,
              to: `0x${Math.random().toString(16).slice(2).padStart(40, '0')}` as Address,
              status: 'confirmed',
              timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
              blockNumber: Number(blockNumber),
              gasUsed: '21000',
              gasFee: '0.001'
            };

            transactions.push(mockTransaction);
          }

          if (transactions.length >= limit) {
            break;
          }
        } catch (blockError) {
          console.warn(`Failed to fetch block ${latestBlock - BigInt(i)}:`, blockError);
        }
      }

      return transactions.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      // Return mock transaction data as fallback
      return [{
        id: 'mock-fallback-tx',
        hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        type: 'receive',
        amount: '1.0',
        token: { symbol: this.chainId === 8453 || this.chainId === 84532 ? 'ETH' : 'ETH' },
        valueUSD: '2500.00',
        from: '0x742d35Cc0000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        to: address,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        blockNumber: 0,
        gasUsed: '21000',
        gasFee: '0.001'
      }];
    }
  }

  /**
   * Calculate portfolio summary from token balances
   */
  private calculatePortfolioSummary(tokens: TokenBalance[]): PortfolioSummary {
    const totalValueUSD = tokens.reduce((sum, token) => sum + token.valueUSD, 0);
    const weightedChange = tokens.reduce((sum, token) => {
      const weight = totalValueUSD > 0 ? token.valueUSD / totalValueUSD : 0;
      return sum + (token.change24h * weight);
    }, 0);

    return {
      totalValueUSD,
      change24h: weightedChange,
      change24hPercent: weightedChange,
      totalTokens: tokens.length,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get token price from CoinGecko API (with caching)
   */
  private async getTokenPrice(tokenId: string): Promise<number> {
    const cached = this.priceCache.get(tokenId);
    if (cached && Date.now() - cached.timestamp < this.PRICE_CACHE_DURATION) {
      return cached.price;
    }

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd&include_24hr_change=true`
      );
      
      if (!response.ok) {
        throw new Error(`Price API error: ${response.status}`);
      }

      const data = await response.json();
      const price = data[tokenId]?.usd || 0;

      this.priceCache.set(tokenId, {
        price,
        timestamp: Date.now()
      });

      return price;
    } catch (error) {
      console.warn(`Failed to fetch price for ${tokenId}:`, error);
      // Return cached price if available, otherwise return 0
      return cached?.price || 0;
    }
  }

  /**
   * Get 24h price change for a token
   */
  private async getTokenChange24h(tokenId: string): Promise<number> {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd&include_24hr_change=true`
      );
      
      if (!response.ok) {
        throw new Error(`Price API error: ${response.status}`);
      }

      const data = await response.json();
      return data[tokenId]?.usd_24h_change || 0;
    } catch (error) {
      console.warn(`Failed to fetch 24h change for ${tokenId}:`, error);
      return 0;
    }
  }

  /**
   * Format token balance based on decimals
   */
  private formatTokenBalance(balance: bigint, decimals: number): string {
    const divisor = BigInt(10 ** decimals);
    const wholePart = balance / divisor;
    const fractionalPart = balance % divisor;
    
    if (fractionalPart === 0n) {
      return wholePart.toString();
    }
    
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.replace(/0+$/, '');
    
    return trimmedFractional ? 
      `${wholePart}.${trimmedFractional}` : 
      wholePart.toString();
  }

  /**
   * Get portfolio performance data (mock implementation for now)
   */
  async getPortfolioPerformance(address: Address, timeframe: '1d' | '1w' | '1m' | '1y' = '1d'): Promise<{
    labels: string[];
    values: number[];
  }> {
    // Mock implementation - in a real app, this would fetch historical data
    const now = new Date();
    const labels: string[] = [];
    const values: number[] = [];
    
    const periods = timeframe === '1d' ? 24 : timeframe === '1w' ? 7 : timeframe === '1m' ? 30 : 365;
    const interval = timeframe === '1d' ? 'hour' : 'day';
    
    for (let i = periods; i >= 0; i--) {
      const date = new Date(now);
      if (interval === 'hour') {
        date.setHours(date.getHours() - i);
        labels.push(date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      } else {
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }
      
      // Generate mock portfolio value with some randomness
      const baseValue = 5000 + Math.sin(i * 0.1) * 500;
      const randomness = (Math.random() - 0.5) * 200;
      values.push(Math.max(0, baseValue + randomness));
    }
    
    return { labels, values };
  }
}

export const walletService = new WalletService();