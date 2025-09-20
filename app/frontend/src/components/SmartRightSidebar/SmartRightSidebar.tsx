import React, { useState, useEffect } from 'react';
import WalletDashboard from './WalletDashboard';
import TransactionMiniFeed from './TransactionMiniFeed';
import QuickActionButtons from './QuickActionButtons';
import PortfolioModal from './PortfolioModal';
import TrendingContentWidget from './TrendingContentWidget';
import { EnhancedWalletData, QuickAction, Transaction, TransactionType, TransactionStatus } from '../../types/wallet';

interface SmartRightSidebarProps {
  context: 'feed' | 'community';
  communityId?: string;
  className?: string;
}

export default function SmartRightSidebar({ 
  context, 
  communityId,
  className = '' 
}: SmartRightSidebarProps) {
  const [walletData, setWalletData] = useState<EnhancedWalletData | null>(null);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize wallet data
  useEffect(() => {
    // Mock wallet data - in real app, this would come from wallet connection
    const mockWalletData: EnhancedWalletData = {
      address: '0x1234567890123456789012345678901234567890',
      balances: [
        {
          symbol: 'ETH',
          name: 'Ethereum',
          balance: 12.5,
          valueUSD: 25000,
          change24h: 3.2,
          contractAddress: '0x0000000000000000000000000000000000000000'
        },
        {
          symbol: 'USDC',
          name: 'USD Coin',
          balance: 15000,
          valueUSD: 15000,
          change24h: 0.1,
          contractAddress: '0xa0b86a33e6c3b4c6c6c6c6c6c6c6c6c6c6c6c6c6'
        },
        {
          symbol: 'LINK',
          name: 'Chainlink',
          balance: 500,
          valueUSD: 7250,
          change24h: -2.1,
          contractAddress: '0x514910771af9ca656af840dff83e8264ecf986ca'
        },
        {
          symbol: 'UNI',
          name: 'Uniswap',
          balance: 200,
          valueUSD: 1400,
          change24h: 5.8,
          contractAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984'
        }
      ],
      recentTransactions: [
        {
          id: '1',
          type: TransactionType.SEND,
          status: TransactionStatus.CONFIRMED,
          amount: 0.5,
          token: 'ETH',
          valueUSD: 1000,
          timestamp: new Date(Date.now() - 3600000),
          to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          gasUsed: 21000,
          hash: '0x123...'
        },
        {
          id: '2',
          type: TransactionType.RECEIVE,
          status: TransactionStatus.CONFIRMED,
          amount: 1000,
          token: 'USDC',
          valueUSD: 1000,
          timestamp: new Date(Date.now() - 7200000),
          from: '0xfedcbafedcbafedcbafedcbafedcbafedcbafedcba',
          gasUsed: 65000,
          hash: '0x456...'
        },
        {
          id: '3',
          type: TransactionType.SWAP,
          status: TransactionStatus.PENDING,
          amount: 100,
          token: 'LINK',
          toToken: 'UNI',
          valueUSD: 1450,
          timestamp: new Date(Date.now() - 300000),
          gasUsed: 150000,
          hash: '0x789...'
        }
      ],
      portfolioValue: 48650,
      portfolioChange: 2.8,
      quickActions: [
        {
          id: 'send-eth',
          label: 'Send ETH',
          icon: '💸',
          action: async () => {
            console.log('Send ETH action');
          },
          tooltip: 'Send Ethereum to another wallet'
        },
        {
          id: 'receive',
          label: 'Receive',
          icon: '📥',
          action: async () => {
            console.log('Receive action');
          },
          tooltip: 'Show QR code to receive payments'
        },
        {
          id: 'send-usdc',
          label: 'Send USDC',
          icon: '💵',
          action: async () => {
            console.log('Send USDC action');
          },
          tooltip: 'Send USDC stablecoin'
        },
        {
          id: 'swap',
          label: 'Swap',
          icon: '🔄',
          action: async () => {
            console.log('Swap action');
          },
          tooltip: 'Swap between different tokens'
        }
      ]
    };

    // Simulate loading
    setTimeout(() => {
      setWalletData(mockWalletData);
      setIsLoading(false);
    }, 1000);
  }, []);

  // Real-time updates simulation
  useEffect(() => {
    if (!walletData) return;

    const interval = setInterval(() => {
      setWalletData(prev => {
        if (!prev) return prev;
        
        // Simulate small price changes
        const updatedBalances = prev.balances.map(balance => ({
          ...balance,
          change24h: balance.change24h + (Math.random() - 0.5) * 0.5,
          valueUSD: balance.valueUSD * (1 + (Math.random() - 0.5) * 0.001)
        }));

        const newPortfolioValue = updatedBalances.reduce((sum, balance) => sum + balance.valueUSD, 0);
        const portfolioChange = ((newPortfolioValue - prev.portfolioValue) / prev.portfolioValue) * 100;

        return {
          ...prev,
          balances: updatedBalances,
          portfolioValue: newPortfolioValue,
          portfolioChange: prev.portfolioChange + portfolioChange
        };
      });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [walletData]);

  const handleQuickAction = async (action: QuickAction) => {
    try {
      await action.action();
      // Handle success (show toast, update UI, etc.)
    } catch (error) {
      console.error('Quick action failed:', error);
      // Handle error (show error toast, etc.)
    }
  };

  const handleTransactionClick = (transaction: Transaction) => {
    // Navigate to transaction details or open transaction modal
    console.log('Transaction clicked:', transaction);
  };

  const handlePortfolioClick = () => {
    setIsPortfolioModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Loading skeletons */}
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
            <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
            </div>
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!walletData) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
          <div className="p-8 text-center">
            <div className="text-4xl mb-4">👛</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Connect Your Wallet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Connect your wallet to see portfolio and transaction data
            </p>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              Connect Wallet
            </button>
          </div>
        </div>
        
        {/* Still show trending content */}
        <TrendingContentWidget 
          context={context}
          communityId={communityId}
        />
      </div>
    );
  }

  return (
    <>
      <div className={`space-y-6 ${className}`}>
        {/* Wallet Dashboard */}
        <WalletDashboard
          walletData={walletData}
          onQuickAction={handleQuickAction}
          onPortfolioClick={handlePortfolioClick}
        />

        {/* Transaction Mini Feed */}
        <TransactionMiniFeed
          transactions={walletData.recentTransactions}
          onTransactionClick={handleTransactionClick}
        />

        {/* Quick Action Buttons */}
        <QuickActionButtons
          actions={walletData.quickActions}
          onActionClick={handleQuickAction}
        />

        {/* Trending Content Widget */}
        <TrendingContentWidget 
          context={context}
          communityId={communityId}
        />
      </div>

      {/* Portfolio Modal */}
      <PortfolioModal
        isOpen={isPortfolioModalOpen}
        onClose={() => setIsPortfolioModalOpen(false)}
        walletData={walletData}
      />
    </>
  );
}