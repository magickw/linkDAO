/**
 * LinkDAO Wallet Dashboard Component
 * Main dashboard component that integrates all wallet features
 */

import React, { useState } from 'react';
import { LayoutDashboard, Wallet, TrendingUp, History, Vote, Bell, Settings, Menu, X } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useWalletData } from '@/hooks/useWalletData';
import { useWalletStore, DashboardView } from '@/stores/walletStore';
import { PortfolioSummary } from './PortfolioSummary';
import { StakingQuickActions } from './StakingQuickActions';
import { TransactionHistoryView } from './TransactionHistoryView';
import { GovernanceVotingPanel } from './GovernanceVotingPanel';
import { useToast } from '@/context/ToastContext';

interface LinkDAOWalletDashboardProps {
  className?: string;
}

export const LinkDAOWalletDashboard: React.FC<LinkDAOWalletDashboardProps> = ({
  className = '',
}) => {
  const { address, isConnected } = useAccount();
  const { dashboardView, setDashboardView, isSidebarOpen, toggleSidebar, notifications } =
    useWalletStore();
  const { addToast } = useToast();

  const [portfolioTimeframe, setPortfolioTimeframe] = useState<'1d' | '1w' | '1m' | '1y'>('1d');

  const {
    walletData,
    portfolio,
    tokens,
    transactions,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    refresh,
    clearError,
  } = useWalletData({
    autoRefresh: true,
    refreshInterval: 300000,
    enableTransactionHistory: true,
    maxTransactions: 20,
  });

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  const handleRefresh = async () => {
    try {
      await refresh();
      addToast('Wallet data refreshed', 'success');
    } catch (err) {
      addToast('Failed to refresh wallet data', 'error');
    }
  };

  const navigationItems = [
    { id: 'overview' as DashboardView, label: 'Overview', icon: LayoutDashboard },
    { id: 'portfolio' as DashboardView, label: 'Portfolio', icon: Wallet },
    { id: 'staking' as DashboardView, label: 'Staking', icon: TrendingUp },
    { id: 'transactions' as DashboardView, label: 'Transactions', icon: History },
    { id: 'governance' as DashboardView, label: 'Governance', icon: Vote },
  ];

  if (!isConnected || !address) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="text-center">
          <Wallet className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Please connect your wallet to view the dashboard
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  LinkDAO Wallet
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setDashboardView(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  dashboardView === item.id
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                // Open settings
                addToast('Settings feature coming soon', 'info');
              }}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white capitalize">
                {dashboardView}
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${
                  isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title="Refresh"
              >
                <div
                  className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
              </button>

              {/* Notifications */}
              <button
                onClick={() => {
                  // Open notifications
                  addToast('Notifications feature coming soon', 'info');
                }}
                className="relative p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                <button
                  onClick={clearError}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Content */}
        <div className="p-6">
          {isLoading && !walletData ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Loading wallet data...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Overview View */}
              {dashboardView === 'overview' && (
                <div className="space-y-6">
                  <PortfolioSummary
                    totalValue={portfolio?.totalValueUSD || 0}
                    change24h={portfolio?.change24hPercent || 0}
                    change24hPercent={portfolio?.change24hPercent || 0}
                    tokens={tokens}
                    timeframe={portfolioTimeframe}
                    onTimeframeChange={setPortfolioTimeframe}
                  />
                </div>
              )}

              {/* Portfolio View */}
              {dashboardView === 'portfolio' && (
                <div className="space-y-6">
                  <PortfolioSummary
                    totalValue={portfolio?.totalValueUSD || 0}
                    change24h={portfolio?.change24hPercent || 0}
                    change24hPercent={portfolio?.change24hPercent || 0}
                    tokens={tokens}
                    timeframe={portfolioTimeframe}
                    onTimeframeChange={setPortfolioTimeframe}
                  />
                </div>
              )}

              {/* Staking View */}
              {dashboardView === 'staking' && (
                <div>
                  <StakingQuickActions
                    stakingInfo={{
                      totalStaked: '0',
                      totalRewards: '0',
                      activePositions: 0,
                      isPremiumMember: false,
                      totalClaimableRewards: '0',
                    }}
                  />
                </div>
              )}

              {/* Transactions View */}
              {dashboardView === 'transactions' && (
                <TransactionHistoryView transactions={transactions} isLoading={isLoading} />
              )}

              {/* Governance View */}
              {dashboardView === 'governance' && (
                <GovernanceVotingPanel votingPower={0} />
              )}

              {/* Last Updated */}
              {lastUpdated && (
                <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Last updated: {lastUpdated.toLocaleString()}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};