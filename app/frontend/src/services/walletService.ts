/**
 * WalletService - Service for fetching wallet data from blockchain APIs
 * Features: Token balances, transaction history, portfolio value calculation
 */

import { PublicClient, createPublicClient, http, formatEther, Address } from 'viem';
import { mainnet, sepolia, base, baseSepolia, polygon, arbitrum } from 'viem/chains';
import { cryptoPriceService } from './cryptoPriceService';

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

// Rate limiting queue for RPC calls
class RPCCallQueue {
  private queue: Array<() => Promise<any>> = [];
  private pendingPromises = 0;
  private readonly maxConcurrent = 3; // Limit concurrent RPC calls
  private readonly minDelay = 200; // Minimum delay between calls (ms)

  async add<T>(call: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await call();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.pendingPromises >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const call = this.queue.shift();
    if (!call) return;

    this.pendingPromises++;
    
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, this.minDelay));

    try {
      await call();
    } catch (error) {
      console.error('RPC call failed:', error);
    } finally {
      this.pendingPromises--;
      this.process(); // Process next call
    }
  }
}

const rpcCallQueue = new RPCCallQueue();

// Common ERC20 tokens to check (addresses for different chains)
const getTokensForChain = (chainId: number) => {
  switch (chainId) {
    case 8453: // Base Mainnet
      // Optionally include DAI/WBTC via env-configured addresses to avoid hardcoding incorrect addresses
      const baseDai = process.env.NEXT_PUBLIC_BASE_DAI_ADDRESS as `0x${string}` | undefined;
      const baseWbtc = process.env.NEXT_PUBLIC_BASE_WBTC_ADDRESS as `0x${string}` | undefined;
      return [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
          decimals: 6
        },
        // WETH on OP-Stack chains (canonical)
        {
          symbol: 'WETH',
          name: 'Wrapped Ether',
          address: '0x4200000000000000000000000000000000000006' as Address,
          decimals: 18
        },
        {
          symbol: 'LINK',
          name: 'Chainlink',
          address: '0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196' as Address,
          decimals: 18
        },
        // Note: LDAO token is only deployed on Sepolia testnet
        ...(baseDai ? [{ symbol: 'DAI', name: 'Dai (Base)', address: baseDai as Address, decimals: 18 }] : []),
        ...(baseWbtc ? [{ symbol: 'WBTC', name: 'Wrapped Bitcoin (Base)', address: baseWbtc as Address, decimals: 8 }] : []),
      ];
    case 84532: // Base Sepolia
      return [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
          decimals: 6
        },
        {
          symbol: 'WETH',
          name: 'Wrapped Ether',
          address: '0x4200000000000000000000000000000000000006' as Address,
          decimals: 18
        },
        // Note: LDAO token is only deployed on Ethereum Sepolia testnet
      ];
    case 11155111: // Sepolia Testnet
      const ethSepoliaLdaoAddress = process.env.NEXT_PUBLIC_LDAO_TOKEN_ADDRESS as `0x${string}` | undefined;
      return [
        {
          symbol: 'USDC',
          name: 'USD Coin (Sepolia)',
          address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address,
          decimals: 6
        },
        // LDAO Token
        ...(ethSepoliaLdaoAddress ? [{
          symbol: 'LDAO',
          name: 'LinkDAO Token',
          address: ethSepoliaLdaoAddress as Address,
          decimals: 18
        }] : []),
      ];
    case 137: // Polygon
      return [
        {
          symbol: 'USDC',
          name: 'USD Coin (Polygon)',
          address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as Address, // USDC.e (Polygon PoS)
          decimals: 6
        },
        {
          symbol: 'USDT',
          name: 'Tether USD (Polygon)',
          address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as Address, // Official USDT (PoS) - EIP-55 checksummed
          decimals: 6
        },
        {
          symbol: 'WETH',
          name: 'Wrapped Ether (Polygon)',
          address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619' as Address,
          decimals: 18
        },
        {
          symbol: 'LINK',
          name: 'Chainlink (Polygon)',
          address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39' as Address, // EIP-55 checksummed
          decimals: 18
        },
        {
          symbol: 'DAI',
          name: 'Dai (Polygon)',
          address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063' as Address,
          decimals: 18
        },
        {
          symbol: 'WBTC',
          name: 'Wrapped Bitcoin (Polygon)',
          address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6' as Address,
          decimals: 8
        },
        {
          symbol: 'AAVE',
          name: 'Aave (Polygon)',
          address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B' as Address,
          decimals: 18
        },
        {
          symbol: 'UNI',
          name: 'Uniswap (Polygon)',
          address: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f' as Address, // EIP-55 checksummed
          decimals: 18
        }
      ];
    case 42161: // Arbitrum One
      return [
        {
          symbol: 'USDC',
          name: 'USD Coin (Arbitrum)',
          address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as Address, // Native USDC
          decimals: 6
        },
        {
          symbol: 'USDT',
          name: 'Tether USD (Arbitrum)',
          address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' as Address, // EIP-55 checksummed
          decimals: 6
        },
        {
          symbol: 'WETH',
          name: 'Wrapped Ether (Arbitrum)',
          address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' as Address,
          decimals: 18
        },
        {
          symbol: 'LINK',
          name: 'Chainlink (Arbitrum)',
          address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4' as Address,
          decimals: 18
        },
        {
          symbol: 'DAI',
          name: 'Dai (Arbitrum)',
          address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' as Address, // EIP-55 checksummed
          decimals: 18
        },
        {
          symbol: 'WBTC',
          name: 'Wrapped Bitcoin (Arbitrum)',
          address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f' as Address,
          decimals: 8
        },
        {
          symbol: 'AAVE',
          name: 'Aave (Arbitrum)',
          address: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196' as Address,
          decimals: 18
        },
        {
          symbol: 'UNI',
          name: 'Uniswap (Arbitrum)',
          address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0' as Address, // EIP-55 checksummed
          decimals: 18
        }
      ];
    case 1: // Ethereum Mainnet
    default:
      return [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
          decimals: 6
        },
        {
          symbol: 'USDT',
          name: 'Tether USD',
          address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address,
          decimals: 6
        },
        {
          symbol: 'WETH',
          name: 'Wrapped Ether',
          address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address,
          decimals: 18
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
  private lastPriceApiCallTime: number = 0;
  private readonly MIN_PRICE_API_CALL_INTERVAL = 1000; // 1 second minimum between price API calls

  constructor(chainId: number = 1) {
    this.chainId = chainId;
    let chain;
    let rpcUrl: string | undefined;

    // Get RPC URL from environment variables based on chain, with fallback public RPCs
    switch (chainId) {
      case 8453: // Base Mainnet
        chain = base;
        rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || process.env.BASE_RPC_URL || 'https://mainnet.base.org';
        break;
      case 84532: // Base Sepolia
        chain = baseSepolia;
        rpcUrl = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_BASE_GOERLI_RPC_URL || 'https://sepolia.base.org';
        break;
      case 11155111: // Sepolia Testnet
        chain = sepolia;
        rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
        break;
      case 137: // Polygon
        chain = polygon;
        rpcUrl = process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com';
        break;
      case 42161: // Arbitrum
        chain = arbitrum;
        rpcUrl = process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
        break;
      case 1: // Ethereum Mainnet
      default:
        chain = mainnet;
        rpcUrl = process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://eth.llamarpc.com';
        break;
    }

    // Create public client with configured RPC URL or fallback to default
    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl || undefined)
    }) as any;
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
   * Discover all ERC-20 tokens held by an address using block explorer API
   */
  private async discoverTokensFromExplorer(address: Address): Promise<Array<{ address: string; symbol: string; name: string; decimals: number }>> {
    const chainId = this.publicClient.chain?.id || 1;

    // Map chain IDs to their explorer APIs
    // Note: Basescan has been deprecated - use Etherscan V2 API for Base chains
    const explorerConfigs: Record<number, { baseUrl: string; apiKey?: string }> = {
      1: { baseUrl: 'https://api.etherscan.io/api', apiKey: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY },
      8453: { baseUrl: 'https://api.etherscan.io/v2/api', apiKey: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY }, // Base uses Etherscan V2
      84532: { baseUrl: 'https://api.etherscan.io/v2/api', apiKey: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY }, // Base Sepolia uses Etherscan V2
      137: { baseUrl: 'https://api.polygonscan.com/api', apiKey: process.env.NEXT_PUBLIC_POLYGONSCAN_API_KEY },
      42161: { baseUrl: 'https://api.arbiscan.io/api', apiKey: process.env.NEXT_PUBLIC_ARBISCAN_API_KEY },
      11155111: { baseUrl: 'https://api-sepolia.etherscan.io/api', apiKey: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY },
    };

    const config = explorerConfigs[chainId];
    if (!config) {
      console.warn(`No explorer config for chain ${chainId}`);
      return [];
    }

    // Try unified v2 endpoint first (for chains that support it)
    const unifiedKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
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
        console.warn(`No API key configured for chain ${chainId}`);
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