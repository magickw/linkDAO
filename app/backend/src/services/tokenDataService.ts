import axios from 'axios';

interface TokenData {
  symbol: string;
  name: string;
  amount?: number;
  usdValue?: number;
  change24h?: number;
  change7d?: number;
  logo?: string;
  decimals?: number;
  marketCap?: number;
  volume24h?: number;
  holders?: number;
  verified?: boolean;
}

export class TokenDataService {
  private readonly coingeckoApiKey = process.env.COINGECKO_API_KEY;
  private readonly etherscanApiKey = process.env.ETHERSCAN_API_KEY;
  private readonly alchemyApiKey = process.env.ALCHEMY_API_KEY;

  async getTokenInfo(network: string, contractAddress: string): Promise<TokenData> {
    try {
      // Try multiple data sources for reliability
      const [coingeckoData, etherscanData] = await Promise.allSettled([
        this.getFromCoingecko(network, contractAddress),
        this.getFromEtherscan(contractAddress)
      ]);

      // Combine data from different sources
      return this.combineTokenData(coingeckoData, etherscanData, contractAddress);
    } catch (error) {
      console.error('Token data fetch failed:', error);
      throw new Error('Unable to fetch token information');
    }
  }

  private async getFromCoingecko(network: string, contractAddress: string): Promise<any> {
    const platformMap: Record<string, string> = {
      'ethereum': 'ethereum',
      'polygon': 'polygon-pos',
      'arbitrum': 'arbitrum-one',
      'optimism': 'optimistic-ethereum',
      'bsc': 'binance-smart-chain'
    };

    const platform = platformMap[network.toLowerCase()];
    if (!platform) {
      throw new Error(`Unsupported network for CoinGecko: ${network}`);
    }

    const headers = this.coingeckoApiKey ? {
      'x-cg-demo-api-key': this.coingeckoApiKey
    } : {};

    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${platform}/contract/${contractAddress}`,
      {
        headers,
        timeout: 10000
      }
    );

    return response.data;
  }

  private async getFromEtherscan(contractAddress: string): Promise<any> {
    if (!this.etherscanApiKey) {
      throw new Error('Etherscan API key not configured');
    }

    const response = await axios.get(
      'https://api.etherscan.io/api',
      {
        params: {
          module: 'token',
          action: 'tokeninfo',
          contractaddress: contractAddress,
          apikey: this.etherscanApiKey
        },
        timeout: 10000
      }
    );

    if (response.data.status !== '1') {
      throw new Error('Etherscan API error');
    }

    return response.data.result[0];
  }

  private combineTokenData(
    coingeckoResult: PromiseSettledResult<any>,
    etherscanResult: PromiseSettledResult<any>,
    contractAddress: string
  ): TokenData {
    const coingecko = coingeckoResult.status === 'fulfilled' ? coingeckoResult.value : null;
    const etherscan = etherscanResult.status === 'fulfilled' ? etherscanResult.value : null;

    return {
      symbol: coingecko?.symbol?.toUpperCase() || etherscan?.symbol || 'UNKNOWN',
      name: coingecko?.name || etherscan?.name || 'Unknown Token',
      usdValue: coingecko?.market_data?.current_price?.usd || 0,
      change24h: coingecko?.market_data?.price_change_percentage_24h || 0,
      change7d: coingecko?.market_data?.price_change_percentage_7d,
      logo: coingecko?.image?.large || coingecko?.image?.small,
      decimals: parseInt(etherscan?.divisor) || 18,
      marketCap: coingecko?.market_data?.market_cap?.usd,
      volume24h: coingecko?.market_data?.total_volume?.usd,
      holders: etherscan?.totalSupply ? parseInt(etherscan.totalSupply) : undefined,
      verified: coingecko?.verified || false
    };
  }

  async getTokenPrice(symbol: string): Promise<number> {
    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: {
            ids: symbol.toLowerCase(),
            vs_currencies: 'usd'
          },
          headers: this.coingeckoApiKey ? {
            'x-cg-demo-api-key': this.coingeckoApiKey
          } : {},
          timeout: 5000
        }
      );

      return response.data[symbol.toLowerCase()]?.usd || 0;
    } catch (error) {
      console.error('Token price fetch failed:', error);
      return 0;
    }
  }

  async getTokenBalance(network: string, contractAddress: string, walletAddress: string): Promise<string> {
    if (!this.alchemyApiKey) {
      throw new Error('Alchemy API key not configured');
    }

    try {
      const baseUrl = this.getAlchemyBaseUrl(network);
      const response = await axios.post(
        baseUrl,
        {
          jsonrpc: '2.0',
          method: 'alchemy_getTokenBalances',
          params: [walletAddress, [contractAddress]],
          id: 1
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const balances = response.data.result.tokenBalances;
      return balances[0]?.tokenBalance || '0x0';
    } catch (error) {
      console.error('Token balance fetch failed:', error);
      return '0x0';
    }
  }

  private getAlchemyBaseUrl(network: string): string {
    const networkMap: Record<string, string> = {
      'ethereum': `https://eth-mainnet.g.alchemy.com/v2/${this.alchemyApiKey}`,
      'polygon': `https://polygon-mainnet.g.alchemy.com/v2/${this.alchemyApiKey}`,
      'arbitrum': `https://arb-mainnet.g.alchemy.com/v2/${this.alchemyApiKey}`,
      'optimism': `https://opt-mainnet.g.alchemy.com/v2/${this.alchemyApiKey}`
    };

    const baseUrl = networkMap[network.toLowerCase()];
    if (!baseUrl) {
      throw new Error(`Unsupported network: ${network}`);
    }

    return baseUrl;
  }

  async searchTokens(query: string, limit: number = 20): Promise<TokenData[]> {
    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/search',
        {
          params: {
            query
          },
          headers: this.coingeckoApiKey ? {
            'x-cg-demo-api-key': this.coingeckoApiKey
          } : {},
          timeout: 10000
        }
      );

      return response.data.coins.slice(0, limit).map((coin: any) => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        logo: coin.large || coin.small,
        verified: true
      }));
    } catch (error) {
      console.error('Token search failed:', error);
      return [];
    }
  }

  async getTopTokens(limit: number = 100): Promise<TokenData[]> {
    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/coins/markets',
        {
          params: {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: limit,
            page: 1,
            sparkline: false
          },
          headers: this.coingeckoApiKey ? {
            'x-cg-demo-api-key': this.coingeckoApiKey
          } : {},
          timeout: 15000
        }
      );

      return response.data.map((token: any) => ({
        symbol: token.symbol.toUpperCase(),
        name: token.name,
        usdValue: token.current_price,
        change24h: token.price_change_percentage_24h,
        logo: token.image,
        marketCap: token.market_cap,
        volume24h: token.total_volume,
        verified: true
      }));
    } catch (error) {
      console.error('Top tokens fetch failed:', error);
      return [];
    }
  }

  // Mock data for development/testing
  getMockTokenData(contractAddress: string): TokenData {
    const mockTokens = [
      {
        symbol: 'MOCK',
        name: 'Mock Token',
        usdValue: 1.25,
        change24h: 5.67,
        change7d: -2.34,
        logo: 'https://via.placeholder.com/64x64?text=MOCK',
        decimals: 18,
        marketCap: 1000000,
        volume24h: 50000,
        holders: 1000,
        verified: true
      },
      {
        symbol: 'TEST',
        name: 'Test Token',
        usdValue: 0.85,
        change24h: -1.23,
        change7d: 8.91,
        logo: 'https://via.placeholder.com/64x64?text=TEST',
        decimals: 18,
        marketCap: 500000,
        volume24h: 25000,
        holders: 500,
        verified: false
      }
    ];

    // Return a mock token based on contract address hash
    const index = parseInt(contractAddress.slice(-1), 16) % mockTokens.length;
    return mockTokens[index];
  }
}

export const tokenDataService = new TokenDataService();