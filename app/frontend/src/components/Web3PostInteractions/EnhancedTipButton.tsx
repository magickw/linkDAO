import React, { useState } from 'react';
import { Heart, Coins } from 'lucide-react';

interface EnhancedTipButtonProps {
  postId: string;
  authorAddress: string;
  currentTipAmount?: number;
  userBalance?: number;
  onTip: (postId: string, amount: number) => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const EnhancedTipButton: React.FC<EnhancedTipButtonProps> = ({
  postId,
  authorAddress,
  currentTipAmount = 0,
  userBalance = 0,
  onTip,
  size = 'md',
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickAmounts, setShowQuickAmounts] = useState(false);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-4 py-2 text-base';
      default:
        return 'px-3 py-1.5 text-sm';
    }
  };

  const quickAmounts = [1, 5, 10, 25];

  const handleQuickTip = async (amount: number) => {
    if (isLoading || amount > userBalance) return;

    setIsLoading(true);
    try {
      await onTip(postId, amount);
      setShowQuickAmounts(false);
    } catch (error) {
      console.error('Error tipping:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toString();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowQuickAmounts(!showQuickAmounts)}
        disabled={isLoading || userBalance === 0}
        className={`
          inline-flex items-center space-x-1 font-medium rounded-md
          bg-pink-100 hover:bg-pink-200 text-pink-700
          transition-all duration-200 hover:scale-105
          disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
          ${getSizeClasses()} ${className}
        `}
      >
        <Heart className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}`} />
        <span>Tip</span>
        {currentTipAmount > 0 && (
          <span className="px-1.5 py-0.5 bg-pink-200 rounded-full text-xs">
            {formatAmount(currentTipAmount)}
          </span>
        )}
      </button>

      {/* Quick tip amounts dropdown */}
      {showQuickAmounts && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-20 min-w-full">
          <div className="p-3">
            <div className="text-xs font-medium text-gray-600 mb-2">
              Quick Tip Amounts
            </div>
            
            <div className="text-xs text-gray-500 mb-3">
              Balance: {formatAmount(userBalance)} tokens
            </div>

            <div className="grid grid-cols-2 gap-2">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleQuickTip(amount)}
                  disabled={amount > userBalance || isLoading}
                  className={`
                    px-3 py-2 text-sm font-medium rounded-md
                    transition-all duration-200 hover:scale-105
                    ${amount <= userBalance 
                      ? 'bg-pink-100 hover:bg-pink-200 text-pink-700' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {formatAmount(amount)}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowQuickAmounts(false)}
              className="w-full mt-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showQuickAmounts && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowQuickAmounts(false)}
        />
      )}
    </div>
  );
};

export default EnhancedTipButton;