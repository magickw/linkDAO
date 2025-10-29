import { EnhancedWalletData, TokenBalance, Transaction, QuickAction, TransactionType, TransactionStatus } from '../types/wallet';
import { cryptoPriceService } from './cryptoPriceService';

interface WalletProvider {
  getAddress(): Promise<string>;
  getBalance(tokenAddress?: string): Promise<number>;
  getTokenBalances(): Promise<TokenBalance[]>;
  getTransactions(limit?: number): Promise<Transaction[]>;
}

class WalletDataService {
  private provider: WalletProvider | null = null;
  private mockMode = true; // Set to false when real Web3 provider is available

  setProvider(provider: WalletProvider) {
    this.provider = provider;
    this.mockMode = false;
  }

  async getWalletData(address?: string): Promise<EnhancedWalletData> {
    if (this.mockMode || !this.provider) {
      return this.getMockWalletData(address);
    }

    try {
      const walletAddress = await this.provider.getAddress();
      const tokenBalances = await this.provider.getTokenBalances();
      const transactions = await this.provider.getTransactions(10);

      // Update balances with current prices
      const portfolioData = await cryptoPriceService.calculatePortfolioValue(tokenBalances);

      return {
        address: walletAddress,
        balances: portfolioData.updatedBalances,
        recentTransactions: transactions,
        portfolioValue: portfolioData.totalValue,
        portfolioChange: portfolioData.totalChange24h,
        quickActions: this.getQuickActions()
      };
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
      return this.getMockWalletData(address);
    }
  }

  private getMockWalletData(address?: string): EnhancedWalletData {
    const mockAddress = address || '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b7';
    
    // Mock token balances with realistic amounts
    const mockBalances: TokenBalance[] = [
      {
        symbol: 'ETH',
        name: 'Ethereum',
        balance: 2.5,
        valueUSD: 0, // Will be updated by price service
        change24h: 0, // Will be updated by price service
        contractAddress: '0x0000000000000000000000000000000000000000'
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        balance: 1250.75,
        valueUSD: 0,
        change24h: 0,
        contractAddress: '0xA0b86a33E6441b8C4505B8C4b4b4b4b4b4b4b4b4'
      },
      {
        symbol: 'UNI',
        name: 'Uniswap',
        balance: 45.2,
        valueUSD: 0,
        change24h: 0,
        contractAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'
      },
      {
        symbol: 'LINK',
        name: 'Chainlink',
        balance: 125.8,
        valueUSD: 0,
        change24h: 0,
        contractAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA'
      },
      {
        symbol: 'AAVE',
        name: 'Aave',
        balance: 8.5,
        valueUSD: 0,
        change24h: 0,
        contractAddress: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'
      }
    ];

    const mockTransactions: Transaction[] = [
      {
        id: '1',
        type: TransactionType.RECEIVE,
        status: TransactionStatus.CONFIRMED,
        amount: 0.5,
        token: 'ETH',
        valueUSD: 1200,
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        from: '0x8ba1f109551bD432803012645Hac136c22C57592',
        to: mockAddress,
        hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        gasUsed: 21000,
        gasPrice: 20
      },
      {
        id: '2',
        type: TransactionType.SWAP,
        status: TransactionStatus.CONFIRMED,
        amount: 100,
        token: 'USDC',
        toToken: 'UNI',
        valueUSD: 100,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        gasUsed: 150000,
        gasPrice: 25
      },
      {
        id: '3',
        type: TransactionType.SEND,
        status: TransactionStatus.CONFIRMED,
        amount: 50,
        token: 'USDC',
        valueUSD: 50,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
        from: mockAddress,
        to: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
        hash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
        gasUsed: 21000,
        gasPrice: 18
      },
      {
        id: '4',
        type: TransactionType.STAKE,
        status: TransactionStatus.CONFIRMED,
        amount: 5,
        token: 'AAVE',
        valueUSD: 400,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        hash: '0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
        contractName: 'Aave Staking',
        gasUsed: 200000,
        gasPrice: 30
      },
      {
        id: '5',
        type: TransactionType.NFT,
        status: TransactionStatus.CONFIRMED,
        amount: 1,
        token: 'ETH',
        valueUSD: 2400,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
        hash: '0x2222333344445555666677778888999900001111aaaabbbbccccddddeeeeffff',
        nftAction: 'mint',
        nftName: 'CryptoPunk #1234',
        gasUsed: 180000,
        gasPrice: 35
      }
    ];

    return {
      address: mockAddress,
      balances: mockBalances,
      recentTransactions: mockTransactions,
      portfolioValue: 0, // Will be calculated by price service
      portfolioChange: 0, // Will be calculated by price service
      quickActions: this.getQuickActions()
    };
  }

  private getQuickActions(): QuickAction[] {
    return [
      {
        id: 'send',
        label: 'Send',
        icon: '📤',
        action: async () => {
          // This will be handled by the UI components
          console.log('Send action triggered');
        },
        tooltip: 'Send tokens to another address'
      },
      {
        id: 'receive',
        label: 'Receive',
        icon: '📥',
        action: async () => {
          // This will be handled by the UI components
          console.log('Receive action triggered');
        },
        tooltip: 'Show receive address and QR code'
      },
      {
        id: 'swap',
        label: 'Swap',
        icon: '🔄',
        action: async () => {
          // This will be handled by the UI components
          console.log('Swap action triggered');
        },
        tooltip: 'Swap tokens on DEX'
      },
      {
        id: 'stake',
        label: 'Stake',
        icon: '🏦',
        action: async () => {
          // This will be handled by the UI components
          console.log('Stake action triggered');
        },
        tooltip: 'Stake tokens to earn rewards'
      }
    ];
  }

  // Method to refresh wallet data
  async refreshWalletData(currentData: EnhancedWalletData): Promise<EnhancedWalletData> {
    return this.getWalletData(currentData.address);
  }

  // Method to get historical portfolio data
  async getPortfolioHistory(address: string, days: number = 30): Promise<{date: Date, value: number}[]> {
    // This would typically fetch from a backend service or blockchain indexer
    // For now, return mock data
    const history: {date: Date, value: number}[] = [];
    const baseValue = 5000;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const randomVariation = (Math.random() - 0.5) * 0.1; // ±5% variation
      const value = baseValue * (1 + randomVariation);
      history.push({ date, value });
    }
    
    return history;
  }

  // Method to estimate gas fees
  async estimateGasFees(): Promise<{
    slow: number;
    standard: number;
    fast: number;
  }> {
    // This would typically fetch from a gas price API
    return {
      slow: 15,
      standard: 25,
      fast: 40
    };
  }
}

export const walletDataService = new WalletDataService();
export default walletDataService;