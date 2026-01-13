/**
 * WalletService - Service for fetching wallet data from blockchain APIs
 * Features: Token balances, transaction history, portfolio value calculation
 */

import { PublicClient, createPublicClient, http, formatEther, Address } from 'viem';
import { mainnet, sepolia, base, baseSepolia, polygon, arbitrum } from 'viem/chains';
import { cryptoPriceService } from './cryptoPriceService';
import { Config } from '../constants/config';

// ... (Token interface and other constants)

export class WalletService {
  private publicClient: PublicClient;
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private chainId: number;
  private lastPriceApiCallTime: number = 0;
  private readonly MIN_PRICE_API_CALL_INTERVAL = 1000; // 1 second minimum between price API calls

  constructor(chainId: number = 1) {
    this.chainId = chainId;
    let chain;
    let rpcUrl: string | undefined;

    // Get RPC URL from centralized Config
    switch (chainId) {
      case 8453: // Base Mainnet
        chain = base;
        rpcUrl = Config.baseRpcUrl;
        break;
      case 84532: // Base Sepolia
        chain = baseSepolia;
        rpcUrl = 'https://sepolia.base.org';
        break;
      case 11155111: // Sepolia Testnet
        chain = sepolia;
        rpcUrl = 'https://ethereum-sepolia-rpc.publicnode.com';
        break;
      case 137: // Polygon
        chain = polygon;
        rpcUrl = Config.polygonRpcUrl;
        break;
      case 42161: // Arbitrum
        chain = arbitrum;
        rpcUrl = Config.arbitrumRpcUrl;
        break;
      case 1: // Ethereum Mainnet
      default:
        chain = mainnet;
        rpcUrl = Config.mainnetRpcUrl;
        break;
    }

    // Create public client with configured RPC URL or fallback to default
    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl || undefined)
    }) as any;
  }

  // ... (getWalletData methods)

  /**
   * Discover all ERC-20 tokens held by an address using block explorer API
   */
  private async discoverTokensFromExplorer(address: Address): Promise<Array<{ address: string; symbol: string; name: string; decimals: number }>> {
    const chainId = this.publicClient.chain?.id || 1;

    // Map chain IDs to their explorer APIs using Config
    const explorerConfigs: Record<number, { baseUrl: string; apiKey?: string }> = {
      1: { baseUrl: 'https://api.etherscan.io/api', apiKey: Config.etherscanApiKey },
      8453: { baseUrl: 'https://api.etherscan.io/v2/api', apiKey: Config.etherscanApiKey },
      84532: { baseUrl: 'https://api.etherscan.io/v2/api', apiKey: Config.etherscanApiKey },
      137: { baseUrl: 'https://api.polygonscan.com/api', apiKey: Config.polygonscanApiKey },
      42161: { baseUrl: 'https://api.arbiscan.io/api', apiKey: Config.arbiscanApiKey },
      11155111: { baseUrl: 'https://api-sepolia.etherscan.io/api', apiKey: Config.etherscanApiKey },
    };

    const config = explorerConfigs[chainId];
    if (!config) {
      console.warn(`No explorer config for chain ${chainId}`);
      return [];
    }

    // Try unified v2 endpoint first
    const unifiedKey = Config.etherscanApiKey;
    if (unifiedKey && [8453, 84532, 42161, 137].includes(chainId)) { // Base, Base Sepolia, Arbitrum, Polygon
      try {
        const url = new URL('https://api.etherscan.io/v2/api');
        url.searchParams.set('chainid', String(chainId));
        url.searchParams.set('module', 'account');
        url.searchParams.set('action', 'tokenlist');
        url.searchParams.set('address', address);
        url.searchParams.set('apikey', unifiedKey);

        const response = await fetch(url.toString());
        const data = await response.json();

        if (data && data.status === '1' && Array.isArray(data.result)) {
          return data.result.map((token: any) => ({
            address: token.contractAddress || token.TokenAddress,
            symbol: token.symbol || token.TokenSymbol || 'UNKNOWN',
            name: token.name || token.TokenName || 'Unknown Token',
            decimals: parseInt(token.decimals || token.TokenDeccimal || '18', 10)
          }));
        }
      } catch (err) {
        console.warn('Unified API token discovery failed:', err);
      }
    }

    // Fallback to per-chain API
    try {
      if (!config.apiKey) {
        // Only log warning in development mode to reduce console noise in production
        if (process.env.NODE_ENV === 'development') {
          console.debug(`Token discovery: No API key for chain ${chainId}, using known tokens only`);
        }
        return [];
      }

      const url = new URL(config.baseUrl);
      url.searchParams.set('module', 'account');
      url.searchParams.set('action', 'tokenlist');
      url.searchParams.set('address', address);
      url.searchParams.set('apikey', config.apiKey);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data && data.status === '1' && Array.isArray(data.result)) {
        return data.result.map((token: any) => ({
          address: token.contractAddress || token.TokenAddress,
          symbol: token.symbol || token.TokenSymbol || 'UNKNOWN',
          name: token.name || token.TokenName || 'Unknown Token',
          decimals: parseInt(token.decimals || token.TokenDeccimal || '18', 10)
        }));
      }
    } catch (err) {
      console.warn('Explorer token discovery failed:', err);
    }

    return [];
  }

  /**
   * Get token balances for a wallet address with rate limiting
   */
  async getTokenBalances(address: Address): Promise<TokenBalance[]> {
    const balances: TokenBalance[] = [];
    const chainId = this.publicClient.chain?.id || 1;
    const knownTokens = getTokensForChain(chainId);

    try {
      // Get ETH balance with rate limiting
      const ethBalance = await rpcCallQueue.add(() =>
        this.publicClient.getBalance({ address })
      );
      const nativeSymbol = chainId === 137 ? 'MATIC' : 'ETH';
      const ethPrice = await this.getTokenPrice(nativeSymbol);
      const ethBalanceFormatted = formatEther(ethBalance);
      const ethValueUSD = parseFloat(ethBalanceFormatted) * ethPrice;

      const nativeName = chainId === 137 ? 'Polygon' : 'Ethereum';
      balances.push({
        symbol: nativeSymbol,
        name: nativeName,
        address: '0x0000000000000000000000000000000000000000',
        balance: ethBalance.toString(),
        balanceFormatted: ethBalanceFormatted,
        decimals: 18,
        valueUSD: ethValueUSD,
        change24h: await this.getTokenChange24h(nativeSymbol),
        priceUSD: ethPrice,
        isNative: true
      });

      // Discover all tokens from block explorer
      const discoveredTokens = await this.discoverTokensFromExplorer(address);

      // Merge known tokens with discovered tokens (prioritize known tokens for metadata)
      const allTokens = [...knownTokens];
      for (const discovered of discoveredTokens) {
        if (!allTokens.some(t => t.address.toLowerCase() === discovered.address.toLowerCase())) {
          allTokens.push({
            symbol: discovered.symbol,
            name: discovered.name,
            address: discovered.address as Address,
            decimals: discovered.decimals
          });
        }
      }

      // Get ERC20 token balances with rate limiting and retry logic
      const tokenBalancePromises = allTokens.map(async (token) => {
        try {
          // Use rate limiting queue for RPC calls
          const balanceResult = await rpcCallQueue.add(() =>
            this.publicClient.readContract({
              address: token.address,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [address]
            } as any)
          );

          const balance = balanceResult as bigint;

          // Always include the token in the list, even if balance is 0 or very large
          const balanceFormatted = this.formatTokenBalance(balance, token.decimals);
          const price = await this.getTokenPrice(token.symbol);
          
          // Calculate actual value from raw balance, not formatted string
          const actualBalance = Number(balance) / Number(BigInt(10 ** token.decimals));
          const valueUSD = actualBalance * price;

          return {
            symbol: token.symbol,
            name: token.name,
            address: token.address,
            balance: balance.toString(),
            balanceFormatted,
            decimals: token.decimals,
            valueUSD,
            change24h: await this.getTokenChange24h(token.symbol),
            priceUSD: price,
            isNative: false
          } as TokenBalance;
        } catch (tokenError) {
          console.warn(`Failed to fetch balance for ${token.symbol}:`, tokenError);
          // Don't throw error, just return null to filter out later
          return null;
        }
        return null;
      });

      // Wait for all token balance requests with concurrency control
      const tokenResults = await Promise.all(tokenBalancePromises);
      const validTokenBalances = tokenResults.filter((result): result is TokenBalance => result !== null);

      // Add valid token balances to the result
      balances.push(...validTokenBalances);

      // Sort by valueUSD, but ensure all tokens are included
      return balances.sort((a, b) => {
        // Handle NaN or infinite values
        const aValue = isNaN(a.valueUSD) ? 0 : a.valueUSD;
        const bValue = isNaN(b.valueUSD) ? 0 : b.valueUSD;
        return bValue - aValue;
      });
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
      // Map chain IDs to their explorer APIs
      // Note: Basescan has been deprecated - use Etherscan V2 API for Base chains
      const explorerConfigs: Record<number, { baseUrl: string; apiKey?: string; nativeSymbol: string }> = {
        1: { baseUrl: 'https://api.etherscan.io/api', apiKey: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY, nativeSymbol: 'ETH' },
        8453: { baseUrl: 'https://api.etherscan.io/v2/api', apiKey: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY, nativeSymbol: 'ETH' }, // Base uses Etherscan V2
        84532: { baseUrl: 'https://api.etherscan.io/v2/api', apiKey: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY, nativeSymbol: 'ETH' }, // Base Sepolia uses Etherscan V2
        137: { baseUrl: 'https://api.polygonscan.com/api', apiKey: process.env.NEXT_PUBLIC_POLYGONSCAN_API_KEY, nativeSymbol: 'MATIC' },
        42161: { baseUrl: 'https://api.arbiscan.io/api', apiKey: process.env.NEXT_PUBLIC_ARBISCAN_API_KEY, nativeSymbol: 'ETH' },
        11155111: { baseUrl: 'https://api-sepolia.etherscan.io/api', apiKey: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY, nativeSymbol: 'ETH' },
      };

      const config = explorerConfigs[this.chainId];
      if (!config) {
        console.warn(`No explorer config for chain ${this.chainId}`);
        return [];
      }

      const transactions: Transaction[] = [];

      // Try unified v2 endpoint first if API key is available (for chains that support it)
      const unifiedKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
      if (unifiedKey && [8453, 84532, 42161, 137].includes(this.chainId)) { // Base, Base Sepolia, Arbitrum, Polygon
        try {
          // Fetch native token transactions
          const nativeUrl = new URL('https://api.etherscan.io/v2/api');
          nativeUrl.searchParams.set('chainid', String(this.chainId));
          nativeUrl.searchParams.set('module', 'account');
          nativeUrl.searchParams.set('action', 'txlist');
          nativeUrl.searchParams.set('address', address);
          nativeUrl.searchParams.set('sort', 'desc');
          nativeUrl.searchParams.set('apikey', unifiedKey);
          
          const nativeResponse = await fetch(nativeUrl.toString());
          const nativeData = await nativeResponse.json();
          
          // Fetch ERC-20 token transactions
          const erc20Url = new URL('https://api.etherscan.io/v2/api');
          erc20Url.searchParams.set('chainid', String(this.chainId));
          erc20Url.searchParams.set('module', 'account');
          erc20Url.searchParams.set('action', 'tokentx');
          erc20Url.searchParams.set('address', address);
          erc20Url.searchParams.set('sort', 'desc');
          erc20Url.searchParams.set('apikey', unifiedKey);
          
          const erc20Response = await fetch(erc20Url.toString());
          const erc20Data = await erc20Response.json();
          
          // Process native transactions
          if (nativeData && nativeData.status === '1' && Array.isArray(nativeData.result)) {
            for (const tx of nativeData.result.slice(0, limit)) {
              const valueWei = BigInt(tx.value || '0');
              const amount = Number(valueWei) / 1e18;
              const isSend = (tx.from || '').toLowerCase() === address.toLowerCase();
              
              transactions.push({
                id: `${this.chainId}_${tx.hash}`,
                hash: tx.hash,
                type: isSend ? 'send' : 'receive',
                amount: amount.toFixed(6),
                token: { symbol: config.nativeSymbol },
                valueUSD: '0', // Will be updated with real price data
                from: tx.from,
                to: tx.to || (isSend ? tx.to : address),
                status: Number(tx.confirmations || 0) > 0 ? 'confirmed' : 'pending',
                timestamp: new Date((Number(tx.timeStamp) || 0) * 1000).toISOString(),
                blockNumber: Number(tx.blockNumber),
                gasUsed: tx.gasUsed,
                gasFee: tx.gasPrice ? (Number(tx.gasPrice) * Number(tx.gasUsed) / 1e18).toFixed(8) : '0'
              });
            }
          }
          
          // Process ERC-20 transactions
          if (erc20Data && erc20Data.status === '1' && Array.isArray(erc20Data.result)) {
            for (const tx of erc20Data.result.slice(0, limit)) {
              const decimals = Number(tx.tokenDecimal || 18);
              const raw = tx.value || '0';
              const amount = Number(raw) / Math.pow(10, decimals);
              const isSend = (tx.from || '').toLowerCase() === address.toLowerCase();
              const symbol = (tx.tokenSymbol || '').toUpperCase();
              
              transactions.push({
                id: `${this.chainId}_${tx.hash}_${tx.contractAddress}`,
                hash: tx.hash,
                type: isSend ? 'send' : 'receive',
                amount: amount.toFixed(6),
                token: { symbol },
                valueUSD: '0', // Will be updated with real price data
                from: tx.from,
                to: tx.to || (isSend ? tx.to : address),
                status: Number(tx.confirmations || 0) > 0 ? 'confirmed' : 'pending',
                timestamp: new Date((Number(tx.timeStamp) || 0) * 1000).toISOString(),
                blockNumber: Number(tx.blockNumber),
                gasUsed: tx.gasUsed,
                gasFee: tx.gasPrice ? (Number(tx.gasPrice) * Number(tx.gasUsed) / 1e18).toFixed(8) : '0'
              });
            }
          }
        } catch (err) {
          console.warn('Unified API transaction fetch failed:', err);
        }
      } else if (config.apiKey) {
        // Fallback to per-chain API if unified key is not available
        try {
          // Fetch native token transactions
          const nativeUrl = new URL(config.baseUrl);
          nativeUrl.searchParams.set('module', 'account');
          nativeUrl.searchParams.set('action', 'txlist');
          nativeUrl.searchParams.set('address', address);
          nativeUrl.searchParams.set('sort', 'desc');
          nativeUrl.searchParams.set('apikey', config.apiKey);
          
          const nativeResponse = await fetch(nativeUrl.toString());
          const nativeData = await nativeResponse.json();
          
          // Fetch ERC-20 token transactions
          const erc20Url = new URL(config.baseUrl);
          erc20Url.searchParams.set('module', 'account');
          erc20Url.searchParams.set('action', 'tokentx');
          erc20Url.searchParams.set('address', address);
          erc20Url.searchParams.set('sort', 'desc');
          erc20Url.searchParams.set('apikey', config.apiKey);
          
          const erc20Response = await fetch(erc20Url.toString());
          const erc20Data = await erc20Response.json();
          
          // Process native transactions
          if (nativeData && nativeData.status === '1' && Array.isArray(nativeData.result)) {
            for (const tx of nativeData.result.slice(0, limit)) {
              const valueWei = BigInt(tx.value || '0');
              const amount = Number(valueWei) / 1e18;
              const isSend = (tx.from || '').toLowerCase() === address.toLowerCase();
              
              transactions.push({
                id: `${this.chainId}_${tx.hash}`,
                hash: tx.hash,
                type: isSend ? 'send' : 'receive',
                amount: amount.toFixed(6),
                token: { symbol: config.nativeSymbol },
                valueUSD: '0', // Will be updated with real price data
                from: tx.from,
                to: tx.to || (isSend ? tx.to : address),
                status: Number(tx.confirmations || 0) > 0 ? 'confirmed' : 'pending',
                timestamp: new Date((Number(tx.timeStamp) || 0) * 1000).toISOString(),
                blockNumber: Number(tx.blockNumber),
                gasUsed: tx.gasUsed,
                gasFee: tx.gasPrice ? (Number(tx.gasPrice) * Number(tx.gasUsed) / 1e18).toFixed(8) : '0'
              });
            }
          }
          
          // Process ERC-20 transactions
          if (erc20Data && erc20Data.status === '1' && Array.isArray(erc20Data.result)) {
            for (const tx of erc20Data.result.slice(0, limit)) {
              const decimals = Number(tx.tokenDecimal || 18);
              const raw = tx.value || '0';
              const amount = Number(raw) / Math.pow(10, decimals);
              const isSend = (tx.from || '').toLowerCase() === address.toLowerCase();
              const symbol = (tx.tokenSymbol || '').toUpperCase();
              
              transactions.push({
                id: `${this.chainId}_${tx.hash}_${tx.contractAddress}`,
                hash: tx.hash,
                type: isSend ? 'send' : 'receive',
                amount: amount.toFixed(6),
                token: { symbol },
                valueUSD: '0', // Will be updated with real price data
                from: tx.from,
                to: tx.to || (isSend ? tx.to : address),
                status: Number(tx.confirmations || 0) > 0 ? 'confirmed' : 'pending',
                timestamp: new Date((Number(tx.timeStamp) || 0) * 1000).toISOString(),
                blockNumber: Number(tx.blockNumber),
                gasUsed: tx.gasUsed,
                gasFee: tx.gasPrice ? (Number(tx.gasPrice) * Number(tx.gasUsed) / 1e18).toFixed(8) : '0'
              });
            }
          }
        } catch (err) {
          console.warn('Explorer API transaction fetch failed:', err);
        }
      }

      // Sort transactions by timestamp (newest first) and limit to requested amount
      return transactions
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return [];
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
   * Get token price using the centralized crypto price service
   */
  private async getTokenPrice(tokenSymbol: string): Promise<number> {
    try {
      // Use the centralized crypto price service which has better caching and rate limiting
      const priceData = await cryptoPriceService.getPrice(tokenSymbol);
      return priceData?.current_price || 0;
    } catch (error) {
      console.warn(`Failed to fetch price for ${tokenSymbol}:`, error);
      
      // Fallback to cached price if available
      const cached = this.priceCache.get(tokenSymbol);
      return cached?.price || 0;
    }
  }

  /**
   * Get 24h price change for a token using the centralized crypto price service
   */
  private async getTokenChange24h(tokenSymbol: string): Promise<number> {
    try {
      // Use the centralized crypto price service
      const priceData = await cryptoPriceService.getPrice(tokenSymbol);
      return priceData?.price_change_percentage_24h || 0;
    } catch (error) {
      console.warn(`Failed to fetch 24h change for ${tokenSymbol}:`, error);
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
    // Keep all decimal places for maximum precision
    return `${wholePart.toString()}.${fractionalStr}`;
  }

  /**
   * Resolve ENS name to address
   */
  async resolveEnsName(name: string): Promise<string | null> {
    if (this.chainId !== 1 && this.chainId !== 11155111) {
      // ENS is primarily on Mainnet and Sepolia
      // However, for other chains, we could use a Mainnet provider if we had one handy.
      // For now, restrict to supported chains to avoid errors.
      return null;
    }

    try {
      const address = await this.publicClient.getEnsAddress({
        name: name,
      });
      return address;
    } catch (error) {
      console.warn('ENS resolution failed:', error);
      return null;
    }
  }

  /**
   * Lookup ENS name from address
   */
  async lookupEnsAddress(address: Address): Promise<string | null> {
    if (this.chainId !== 1 && this.chainId !== 11155111) {
      return null;
    }

    try {
      const name = await this.publicClient.getEnsName({
        address: address,
      });
      return name;
    } catch (error) {
      console.warn('ENS lookup failed:', error);
      return null;
    }
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