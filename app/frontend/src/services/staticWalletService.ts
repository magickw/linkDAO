/**
 * Static Wallet Service - Provides static wallet data to prevent API spam
 * This is a temporary fix to stop the rapid refresh issue
 */

import { EnhancedWalletData, TokenBalance, Transaction, QuickAction, TransactionType, TransactionStatus } from '../types/wallet';

class StaticWalletService {
  private staticData: EnhancedWalletData | null = null;

  getStaticWalletData(): EnhancedWalletData {
    if (this.staticData) {
      return this.staticData;
    }

    const mockAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b7';

    // Static token balances with fixed prices
    const staticBalances: TokenBalance[] = [
      {
        symbol: 'ETH',
        name: 'Ethereum',
        balance: 2.5,
        valueUSD: 5000, // Fixed at $2000 per ETH
        change24h: 2.5,
        contractAddress: '0x0000000000000000000000000000000000000000'
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        balance: 1250.75,
        valueUSD: 1250.75, // Fixed at $1 per USDC
        change24h: 0.1,
        contractAddress: '0xA0b86a33E6441b8C4505B8C4b4b4b4b4b4b4b4b4'
      },
      {
        symbol: 'UNI',
        name: 'Uniswap',
        balance: 45.2,
        valueUSD: 325.44, // Fixed at $7.20 per UNI
        change24h: 3.1,
        contractAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'
      },
      {
        symbol: 'LINK',
        name: 'Chainlink',
        balance: 125.8,
        valueUSD: 1824.1, // Fixed at $14.50 per LINK
        change24h: -1.2,
        contractAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA'
      },
      {
        symbol: 'AAVE',
        name: 'Aave',
        balance: 8.5,
        valueUSD: 807.5, // Fixed at $95 per AAVE
        change24h: -0.8,
        contractAddress: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'
      }
    ];

    const staticTransactions: Transaction[] = [
      {
        id: '1',
        type: TransactionType.RECEIVE,
        status: TransactionStatus.CONFIRMED,
        amount: 0.5,
        token: 'ETH',
        valueUSD: 1000,
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
        type: TransactionType.SEND,
        status: TransactionStatus.PENDING,
        amount: 0.1,
        token: 'ETH',
        valueUSD: 200,
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        from: mockAddress,
        to: '0x1111222233334444555566667777888899990000',
        hash: '0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
        gasUsed: 21000,
        gasPrice: 25
      }
    ];

    const staticQuickActions: QuickAction[] = [
      {
        id: 'send',
        label: 'Send',
        icon: '📤',
        action: async () => {
          // This will be handled by the parent component
          console.log('Send action triggered');
        },
        tooltip: 'Send tokens to another address'
      },
      {
        id: 'receive',
        label: 'Receive',
        icon: '📥',
        action: async () => {
          // This will be handled by the parent component
          console.log('Receive action triggered');
        },
        tooltip: 'Show receive address and QR code'
      },
      {
        id: 'swap',
        label: 'Swap',
        icon: '🔄',
        action: async () => {
          // This will be handled by the parent component
          console.log('Swap action triggered');
        },
        tooltip: 'Swap tokens on DEX'
      },
      {
        id: 'stake',
        label: 'Stake',
        icon: '🏦',
        action: async () => {
          // This will be handled by the parent component
          console.log('Stake action triggered');
        },
        tooltip: 'Stake tokens to earn rewards'
      }
    ];

    // Calculate total portfolio value
    const totalValue = staticBalances.reduce((sum, balance) => sum + balance.valueUSD, 0);
    
    // Calculate weighted average change
    const totalChange = staticBalances.reduce((sum, balance) => {
      const weight = balance.valueUSD / totalValue;
      return sum + (balance.change24h * weight);
    }, 0);

    this.staticData = {
      address: mockAddress,
      balances: staticBalances,
      recentTransactions: staticTransactions,
      portfolioValue: totalValue,
      portfolioChange: totalChange,
      quickActions: staticQuickActions
    };

    return this.staticData;
  }

  // Simulate a small change occasionally to show it's "live"
  getWalletDataWithMinorUpdates(): EnhancedWalletData {
    const data = this.getStaticWalletData();
    
    // Add tiny random variations every 30 seconds
    const now = Date.now();
    const variation = Math.sin(now / 30000) * 0.001; // Very small variation
    
    return {
      ...data,
      portfolioValue: data.portfolioValue * (1 + variation),
      portfolioChange: data.portfolioChange + (variation * 100)
    };
  }
}

export const staticWalletService = new StaticWalletService();
export default staticWalletService;