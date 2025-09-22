import React, { useState } from 'react';
import WalletDashboard from './WalletDashboard';
import TransactionMiniFeed from './TransactionMiniFeed';
import QuickActionButtons from './QuickActionButtons';
import PortfolioModal from './PortfolioModal';
import TrendingContentWidget from './TrendingContentWidget';
import { QuickAction, Transaction } from '../../types/wallet';
import { useWalletData } from '../../hooks/useWalletData';

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
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  
  // Use real wallet data with live prices
  const {
    walletData,
    isLoading
  } = useWalletData({
    autoRefresh: true,
    refreshInterval: 300000 // Refresh every 5 minutes
  });





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