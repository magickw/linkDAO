import React, { useState, useMemo } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { EnhancedWalletData, QuickAction, TokenBalance } from '../../types/wallet';
import { useNetworkSwitch } from '../../hooks/useNetworkSwitch';
import { getTokenLogoWithFallback } from '@/utils/tokenLogoUtils';

interface QuickActionsProps {
  walletData: EnhancedWalletData | null;
  onQuickAction: (action: QuickAction) => void;
  onPortfolioClick: () => void;
  className?: string;
}

// Chain configuration for display
const CHAIN_INFO: Record<number, { name: string; symbol: string; color: string; bgColor: string }> = {
  1: { name: 'Ethereum', symbol: 'ETH', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  8453: { name: 'Base', symbol: 'ETH', color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  137: { name: 'Polygon', symbol: 'MATIC', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  42161: { name: 'Arbitrum', symbol: 'ETH', color: 'text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  11155111: { name: 'Sepolia', symbol: 'ETH', color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
  84532: { name: 'Base Sepolia', symbol: 'ETH', color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
};

const QuickActions = React.memo(function QuickActions({
  walletData,
  onQuickAction,
  onPortfolioClick,
  className = ''
}: QuickActionsProps) {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showChainBreakdown, setShowChainBreakdown] = useState(false);

  // Wallet connection hooks
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { currentChainId, getChainName } = useNetworkSwitch();

  // Only show data when wallet is actually connected - no mock data fallback
  const displayWalletData = isConnected && walletData ? walletData : null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatAddress = (address: string) => {
    if (!address || address.length < 10) return '0x0000...0000';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Calculate per-chain portfolio values from token balances
  const chainBreakdown = useMemo(() => {
    if (!displayWalletData?.balances) return new Map<number, number>();

    const breakdown = new Map<number, number>();
    displayWalletData.balances.forEach(token => {
      if (token.chainBreakdown) {
        token.chainBreakdown.forEach(cb => {
          const current = breakdown.get(cb.chainId) || 0;
          breakdown.set(cb.chainId, current + (cb.valueUSD || 0));
        });
      } else if (token.chains && token.chains.length > 0) {
        // Distribute evenly across chains if no breakdown
        const valuePerChain = (token.valueUSD || 0) / token.chains.length;
        token.chains.forEach(chainId => {
          const current = breakdown.get(chainId) || 0;
          breakdown.set(chainId, current + valuePerChain);
        });
      } else {
        // Default to current chain
        const current = breakdown.get(currentChainId) || 0;
        breakdown.set(currentChainId, current + (token.valueUSD || 0));
      }
    });
    return breakdown;
  }, [displayWalletData?.balances, currentChainId]);

  // Get unique chains from token balances
  const activeChains = useMemo(() => {
    if (!displayWalletData?.balances) return [];

    const chains = new Set<number>();
    displayWalletData.balances.forEach(token => {
      if (token.chainBreakdown) {
        token.chainBreakdown.forEach(cb => chains.add(cb.chainId));
      } else if (token.chains) {
        token.chains.forEach(chainId => chains.add(chainId));
      }
    });
    return Array.from(chains).sort((a, b) => {
      // Sort mainnet chains first, then testnets
      const isTestnetA = a === 11155111 || a === 84532;
      const isTestnetB = b === 11155111 || b === 84532;
      if (isTestnetA && !isTestnetB) return 1;
      if (!isTestnetA && isTestnetB) return -1;
      return a - b;
    });
  }, [displayWalletData?.balances]);

  // Handle case where there are no quick actions
  const quickActions = displayWalletData?.quickActions || [
    { id: 'send', label: 'Send', icon: '💸', disabled: false },
    { id: 'receive', label: 'Receive', icon: '📥', disabled: false },
    { id: 'swap', label: 'Swap', icon: '🔄', disabled: false },
    { id: 'portfolio', label: 'Portfolio', icon: '📊', disabled: false }
  ];

  // If wallet is not connected, show connection UI
  if (!isConnected) {
    return (
      <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden ${className}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
              <svg className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Actions
            </h3>
          </div>

          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Connect your wallet to view your multi-chain portfolio
            </p>

            <button
              onClick={() => setShowConnectModal(true)}
              className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Connect Wallet
            </button>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Multi-Chain Support:</strong> View balances across Ethereum, Base, Polygon, and Arbitrum.
              </p>
            </div>
          </div>
        </div>

        {/* Wallet Connection Modal */}
        {showConnectModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="h-5 w-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Connect Your Wallet
                </h3>
                <button
                  onClick={() => setShowConnectModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Connect to view your portfolio across all supported networks. Network selection happens at transaction time.
                </p>

                {/* Supported Networks Badge */}
                <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Supported Networks:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(CHAIN_INFO).filter(([id]) => ![11155111, 84532].includes(Number(id))).map(([id, info]) => (
                      <span key={id} className={`text-xs px-2 py-1 rounded-full ${info.bgColor} ${info.color}`}>
                        {info.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {connectors.map((connector) => (
                    <button
                      key={connector.id}
                      onClick={() => {
                        connect({ connector });
                        setShowConnectModal(false);
                      }}
                      className="w-full flex items-center justify-between p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
                          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {connector.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {connector.id === 'injected' ? 'Browser Wallet' : `Connect via ${connector.name}`}
                          </p>
                        </div>
                      </div>
                      <svg className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If wallet is connected but no data yet, show loading state
  if (!displayWalletData) {
    return (
      <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden ${className}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
              <svg className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Actions
            </h3>
          </div>

          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400 mb-2">Loading multi-chain portfolio...</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentChainInfo = CHAIN_INFO[currentChainId] || { name: 'Unknown', symbol: 'ETH', color: 'text-gray-500', bgColor: 'bg-gray-100' };

  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
            <svg className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Actions
          </h3>

          <button
            onClick={() => disconnect()}
            className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-2 py-1 rounded border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 transition-colors"
            title="Disconnect Wallet"
          >
            Disconnect
          </button>
        </div>

        <div className="mt-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatAddress(displayWalletData.address)}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${currentChainInfo.bgColor} ${currentChainInfo.color}`}>
              {currentChainInfo.name}
            </span>
          </div>

          {/* Total Portfolio Value */}
          <div className="mt-2">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(displayWalletData.portfolioValue || 0)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Total across {activeChains.length} chain{activeChains.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Chain Breakdown Toggle */}
          {activeChains.length > 1 && (
            <button
              onClick={() => setShowChainBreakdown(!showChainBreakdown)}
              className="mt-2 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
            >
              <svg
                className={`h-3 w-3 transition-transform ${showChainBreakdown ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {showChainBreakdown ? 'Hide' : 'Show'} chain breakdown
            </button>
          )}

          {/* Chain Breakdown List */}
          {showChainBreakdown && activeChains.length > 0 && (
            <div className="mt-3 space-y-2 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
              {activeChains.map(chainId => {
                const info = CHAIN_INFO[chainId] || { name: `Chain ${chainId}`, symbol: 'ETH', color: 'text-gray-500', bgColor: 'bg-gray-100' };
                const value = chainBreakdown.get(chainId) || 0;
                const percentage = displayWalletData.portfolioValue > 0
                  ? ((value / displayWalletData.portfolioValue) * 100).toFixed(1)
                  : '0';

                return (
                  <div
                    key={chainId}
                    className={`flex items-center justify-between p-2 rounded-lg ${chainId === currentChainId ? info.bgColor : 'bg-gray-50 dark:bg-gray-700/30'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${info.color.replace('text-', 'bg-')}`}></span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {info.name}
                        {chainId === currentChainId && (
                          <span className="ml-1 text-green-500">(active)</span>
                        )}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(value)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {percentage}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Assets Snippet */}
      {displayWalletData.balances && displayWalletData.balances.length > 0 && (
        <div className="mt-4 px-4 pb-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Top Assets</p>
          <div className="space-y-2">
            {displayWalletData.balances
              .sort((a, b) => (b.valueUSD || 0) - (a.valueUSD || 0))
              .slice(0, 3)
              .map((token, idx) => (
                <div key={`${token.symbol}-${idx}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Token Icon with Logo Support */}
                    {(() => {
                      const logo = getTokenLogoWithFallback(token.symbol);
                      return logo ? (
                        <img
                          src={logo}
                          alt={token.symbol}
                          className="w-6 h-6 rounded-full"
                          onError={(e) => {
                            // Fallback to initials if image fails to load
                            (e.target as HTMLImageElement).style.display = 'none';
                            const fallback = (e.target as HTMLImageElement).nextElementSibling;
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                      ) : null;
                    })()}
                    <div className={`w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 ${getTokenLogoWithFallback(token.symbol) ? 'hidden' : ''}`}>
                      {token.symbol[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{token.symbol}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {token.balance.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(token.valueUSD || 0)}
                    </p>
                    {token.chains && token.chains.length > 1 && (
                      <div className="flex justify-end gap-1 mt-0.5">
                        {token.chains.map(cid => (
                          <span
                            key={cid}
                            className={`w-1.5 h-1.5 rounded-full ${CHAIN_INFO[cid]?.bgColor.replace('bg-', 'bg-') || 'bg-gray-400'}`}
                            title={CHAIN_INFO[cid]?.name}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-4 pt-2">
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action, index) => (
            <button
              key={action.id || index}
              onClick={() => action.id === 'portfolio' ? onPortfolioClick() : onQuickAction(action)}
              disabled={action.disabled}
              className={`
                bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50
                rounded-lg p-3 text-center transition-all duration-200 group
                ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
              `}
              title={action.tooltip}
            >
              <div className="text-xl mb-1 group-hover:scale-110 transition-transform duration-200">
                {action.icon || '⚡'}
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {action.label || 'Action'}
              </span>
            </button>
          ))}
        </div>

        {/* Network Info */}
        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            <strong>Network-Agnostic:</strong> Select network when sending or swapping tokens.
          </p>
        </div>

        {/* View Full Portfolio Button */}
        <button
          onClick={onPortfolioClick}
          className="w-full mt-3 py-3 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors duration-200 border border-primary-200 dark:border-primary-800 hover:border-primary-300 dark:hover:border-primary-700"
        >
          View Full Portfolio
        </button>
      </div>
    </div>
  );
});

export default QuickActions;
