import React, { useState } from 'react';
import { QuickAction } from '../../types/wallet';

interface QuickActionButtonsProps {
  actions: QuickAction[];
  onActionClick: (action: QuickAction) => void;
  className?: string;
}

const QuickActionButtons = React.memo(function QuickActionButtons({ 
  actions, 
  onActionClick,
  className = '' 
}: QuickActionButtonsProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleActionClick = async (action: QuickAction) => {
    if (action.disabled || loadingAction) return;

    setLoadingAction(action.id);
    try {
      await onActionClick(action);
    } finally {
      setLoadingAction(null);
    }
  };

  // Only show actions if they are provided from wallet data
  const displayActions = actions;

  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
          <svg className="h-5 w-5 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Quick Actions
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          One-click operations
        </p>
      </div>

      {/* Action Buttons Grid */}
      <div className="p-4">
        {displayActions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">⚡</div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
              Quick actions will appear here
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Connect your wallet to see available actions
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayActions.map((action) => {
            const isLoading = loadingAction === action.id;
            const isDisabled = action.disabled || isLoading;

            return (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                disabled={isDisabled}
                className={`
                  relative group p-4 rounded-xl text-center transition-all duration-200
                  ${isDisabled 
                    ? 'opacity-50 cursor-not-allowed bg-gray-100/50 dark:bg-gray-700/30' 
                    : 'bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 hover:scale-105 active:scale-95'
                  }
                  ${isLoading ? 'animate-pulse' : ''}
                `}
                title={action.tooltip}
              >
                {/* Loading Overlay */}
                {isLoading && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 rounded-xl flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {/* Action Icon */}
                <div className={`text-2xl mb-2 transition-transform duration-200 ${
                  !isDisabled ? 'group-hover:scale-110' : ''
                }`}>
                  {action.icon}
                </div>

                {/* Action Label */}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                  {action.label}
                </span>

                {/* Hover Effect */}
                {!isDisabled && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/10 to-secondary-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                )}
              </button>
            );
            })}
          </div>
        )}

        {/* Network Status */}
        <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Ethereum Mainnet
            </div>
            {/* Gas price will be loaded from real network data */}
          </div>
        </div>
      </div>
    </div>
  );
});

export default QuickActionButtons;