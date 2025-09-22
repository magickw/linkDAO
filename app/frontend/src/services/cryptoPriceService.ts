import { TokenBalance } from '../types/wallet';
import { networkService } from './networkService';

export interface CryptoPriceData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  last_updated: string;
}

export interface PriceUpdateSubscription {
  tokens: string[];
  callback: (prices: Map<string, CryptoPriceData>) => void;
  interval?: number;
}

class CryptoPriceService {
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private priceCache = new Map<string, CryptoPriceData>();
  private subscriptions = new Set<PriceUpdateSubscription>();
  private updateInterval: NodeJS.Timeout | null = null;
  private lastUpdateTime = 0;
  private lastApiCallTime = 0;
  private readonly CACHE_DURATION = 300000; // 5 minutes
  private readonly UPDATE_INTERVAL = 300000; // 5 minutes
  private readonly MIN_API_INTERVAL = 60000; // 1 minute minimum between API calls
  private readonly MAX_RETRIES = 3;
  private retryCount = 0;
  private circuitBreakerOpen = false;
  private circuitBreakerOpenTime = 0;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 600000; // 10 minutes

  // Common token mappings to CoinGecko IDs
  private tokenIdMap = new Map<string, string>([
    ['ETH', 'ethereum'],
    ['BTC', 'bitcoin'],
    ['USDC', 'usd-coin'],
    ['USDT', 'tether'],
    ['DAI', 'dai'],
    ['WETH', 'weth'],
    ['LINK', 'chainlink'],
    ['UNI', 'uniswap'],
    ['AAVE', 'aave'],
    ['COMP', 'compound-governance-token'],
    ['MKR', 'maker'],
    ['SNX', 'havven'],
    ['YFI', 'yearn-finance'],
    ['SUSHI', 'sushi'],
    ['1INCH', '1inch'],
    ['CRV', 'curve-dao-token'],
    ['BAL', 'balancer'],
    ['MATIC', 'matic-network'],
    ['AVAX', 'avalanche-2'],
    ['SOL', 'solana'],
    ['ADA', 'cardano'],
    ['DOT', 'polkadot'],
    ['ATOM', 'cosmos'],
    ['NEAR', 'near'],
    ['FTM', 'fantom'],
    ['ALGO', 'algorand'],
    ['XTZ', 'tezos'],
    ['FLOW', 'flow'],
    ['ICP', 'internet-computer'],
    ['THETA', 'theta-token'],
    ['VET', 'vechain'],
    ['FIL', 'filecoin'],
    ['TRX', 'tron'],
    ['EOS', 'eos'],
    ['XLM', 'stellar'],
    ['XMR', 'monero'],
    ['DASH', 'dash'],
    ['ZEC', 'zcash'],
    ['LTC', 'litecoin'],
    ['BCH', 'bitcoin-cash'],
    ['ETC', 'ethereum-classic']
  ]);

  constructor() {
    // Initialize with some default prices to avoid empty state
    this.initializeDefaultPrices();
    this.startPriceUpdates();
  }

  /**
   * Initialize with default/fallback prices
   */
  private initializeDefaultPrices(): void {
    const defaultPrices = [
      { symbol: 'ETH', price: 2000, change: 2.5 },
      { symbol: 'BTC', price: 43000, change: 1.8 },
      { symbol: 'USDC', price: 1.00, change: 0.1 },
      { symbol: 'USDT', price: 1.00, change: 0.0 },
      { symbol: 'LINK', price: 14.50, change: -1.2 },
      { symbol: 'UNI', price: 7.20, change: 3.1 },
      { symbol: 'AAVE', price: 95.00, change: -0.8 }
    ];

    defaultPrices.forEach(({ symbol, price, change }) => {
      this.priceCache.set(symbol, {
        id: this.tokenIdMap.get(symbol) || symbol.toLowerCase(),
        symbol,
        name: symbol,
        current_price: price,
        price_change_percentage_24h: change,
        market_cap: 0,
        total_volume: 0,
        last_updated: new Date().toISOString()
      });
    });
  }

  /**
   * Get current prices for multiple tokens
   */
  async getPrices(symbols: string[]): Promise<Map<string, CryptoPriceData>> {
    const now = Date.now();
    const cachedPrices = new Map<string, CryptoPriceData>();
    const tokensToFetch: string[] = [];

    // Check cache first - use longer cache duration
    for (const symbol of symbols) {
      const cached = this.priceCache.get(symbol.toUpperCase());
      if (cached && (now - this.lastUpdateTime) < this.CACHE_DURATION) {
        cachedPrices.set(symbol.toUpperCase(), cached);
      } else {
        tokensToFetch.push(symbol);
      }
    }

    // Only fetch if we have tokens to fetch AND enough time has passed since last API call
    if (tokensToFetch.length > 0 && (now - this.lastApiCallTime) >= this.MIN_API_INTERVAL) {
      try {
        const freshPrices = await this.fetchPricesFromAPI(tokensToFetch);
        freshPrices.forEach((price, symbol) => {
          this.priceCache.set(symbol, price);
          cachedPrices.set(symbol, price);
        });
        this.lastUpdateTime = now;
        this.lastApiCallTime = now;
        this.retryCount = 0; // Reset retry count on success
        this.circuitBreakerOpen = false; // Close circuit breaker on success
      } catch (error) {
        console.error('Failed to fetch crypto prices:', error);
        this.retryCount++;
        
        // Return cached prices even if stale
        for (const symbol of tokensToFetch) {
          const cached = this.priceCache.get(symbol.toUpperCase());
          if (cached) {
            cachedPrices.set(symbol.toUpperCase(), cached);
          }
        }
      }
    } else if (tokensToFetch.length > 0) {
      // Return stale cached data if we can't make API call yet
      for (const symbol of tokensToFetch) {
        const cached = this.priceCache.get(symbol.toUpperCase());
        if (cached) {
          cachedPrices.set(symbol.toUpperCase(), cached);
        }
      }
    }

    return cachedPrices;
  }

  /**
   * Get price for a single token
   */
  async getPrice(symbol: string): Promise<CryptoPriceData | null> {
    const prices = await this.getPrices([symbol]);
    return prices.get(symbol.toUpperCase()) || null;
  }

  /**
   * Subscribe to price updates
   */
  subscribe(subscription: PriceUpdateSubscription): () => void {
    this.subscriptions.add(subscription);
    
    // Only fetch prices immediately if we have cached data or enough time has passed
    const now = Date.now();
    if (this.priceCache.size > 0 || (now - this.lastApiCallTime) >= this.MIN_API_INTERVAL) {
      this.getPrices(subscription.tokens).then(prices => {
        subscription.callback(prices);
      }).catch(error => {
        console.error('Failed to fetch prices for new subscription:', error);
      });
    }

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(subscription);
    };
  }

  /**
   * Update token balances with current market prices
   */
  async updateTokenBalances(balances: TokenBalance[]): Promise<TokenBalance[]> {
    const symbols = balances.map(balance => balance.symbol);
    const prices = await this.getPrices(symbols);

    return balances.map(balance => {
      const priceData = prices.get(balance.symbol.toUpperCase());
      if (priceData) {
        return {
          ...balance,
          valueUSD: balance.balance * priceData.current_price,
          change24h: priceData.price_change_percentage_24h || 0
        };
      }
      return balance;
    });
  }

  /**
   * Calculate portfolio value from token balances
   */
  async calculatePortfolioValue(balances: TokenBalance[]): Promise<{
    totalValue: number;
    totalChange24h: number;
    updatedBalances: TokenBalance[];
  }> {
    const updatedBalances = await this.updateTokenBalances(balances);
    
    const totalValue = updatedBalances.reduce((sum, balance) => sum + balance.valueUSD, 0);
    
    // Calculate weighted average change
    const totalChange24h = updatedBalances.reduce((sum, balance) => {
      const weight = balance.valueUSD / totalValue;
      return sum + (balance.change24h * weight);
    }, 0);

    return {
      totalValue,
      totalChange24h,
      updatedBalances
    };
  }

  /**
   * Fetch prices from CoinGecko API with rate limiting
   */
  private async fetchPricesFromAPI(symbols: string[]): Promise<Map<string, CryptoPriceData>> {
    // Circuit breaker pattern - if too many failures, stop trying for a while
    if (this.circuitBreakerOpen) {
      const now = Date.now();
      if (now - this.circuitBreakerOpenTime < this.CIRCUIT_BREAKER_TIMEOUT) {
        console.log('Circuit breaker open, using cached data only');
        return new Map();
      } else {
        // Try to close circuit breaker
        console.log('Attempting to close circuit breaker');
        this.circuitBreakerOpen = false;
        this.retryCount = 0;
      }
    }

    // Check if we're being rate limited
    if (this.retryCount >= this.MAX_RETRIES) {
      console.warn('Max retries reached, opening circuit breaker');
      this.circuitBreakerOpen = true;
      this.circuitBreakerOpenTime = Date.now();
      return new Map();
    }

    // Check network connectivity
    if (!networkService.getOnlineStatus()) {
      console.log('Network is offline, using cached prices');
      return new Map();
    }

    const coinIds = symbols
      .map(symbol => this.tokenIdMap.get(symbol.toUpperCase()))
      .filter(Boolean);

    if (coinIds.length === 0) {
      return new Map();
    }

    const url = `${this.baseUrl}/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true&include_last_updated_at=true`;

    try {
      const response = await fetch(url);
      
      if (response.status === 429) {
        // Rate limited - exponentially increase wait time
        const backoffTime = this.MIN_API_INTERVAL * Math.pow(2, this.retryCount);
        console.warn(`CoinGecko API rate limit hit, backing off for ${backoffTime}ms`);
        this.lastApiCallTime = Date.now() + backoffTime;
        throw new Error('Rate limit exceeded');
      }
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const priceMap = new Map<string, CryptoPriceData>();

      // Map response back to symbols
      symbols.forEach(symbol => {
        const coinId = this.tokenIdMap.get(symbol.toUpperCase());
        if (coinId && data[coinId]) {
          const coinData = data[coinId];
          priceMap.set(symbol.toUpperCase(), {
            id: coinId,
            symbol: symbol.toUpperCase(),
            name: symbol, // We could fetch full names separately if needed
            current_price: coinData.usd || 0,
            price_change_percentage_24h: coinData.usd_24h_change || 0,
            market_cap: coinData.usd_market_cap || 0,
            total_volume: coinData.usd_24h_vol || 0,
            last_updated: new Date().toISOString()
          });
        }
      });

      return priceMap;
    } catch (error) {
      console.error('CoinGecko API fetch failed:', error);
      throw error;
    }
  }

  /**
   * Start automatic price updates for subscriptions
   */
  private startPriceUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      if (this.subscriptions.size === 0) return;

      const now = Date.now();
      
      // Only update if enough time has passed since last API call
      if ((now - this.lastApiCallTime) < this.MIN_API_INTERVAL) {
        return;
      }

      // Collect all unique tokens from subscriptions
      const allTokens = new Set<string>();
      this.subscriptions.forEach(sub => {
        sub.tokens.forEach(token => allTokens.add(token));
      });

      if (allTokens.size > 0) {
        try {
          const prices = await this.getPrices(Array.from(allTokens));
          
          // Only notify subscribers if we have price data
          if (prices.size > 0) {
            this.subscriptions.forEach(subscription => {
              const relevantPrices = new Map<string, CryptoPriceData>();
              subscription.tokens.forEach(token => {
                const price = prices.get(token.toUpperCase());
                if (price) {
                  relevantPrices.set(token.toUpperCase(), price);
                }
              });
              if (relevantPrices.size > 0) {
                subscription.callback(relevantPrices);
              }
            });
          }
        } catch (error) {
          console.error('Failed to update prices:', error);
        }
      }
    }, this.UPDATE_INTERVAL);
  }

  /**
   * Add custom token mapping
   */
  addTokenMapping(symbol: string, coinGeckoId: string): void {
    this.tokenIdMap.set(symbol.toUpperCase(), coinGeckoId);
  }

  /**
   * Get supported tokens
   */
  getSupportedTokens(): string[] {
    return Array.from(this.tokenIdMap.keys());
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    this.priceCache.clear();
    this.lastUpdateTime = 0;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.subscriptions.clear();
    this.priceCache.clear();
  }
}

// Export singleton instance
export const cryptoPriceService = new CryptoPriceService();
export default cryptoPriceService;