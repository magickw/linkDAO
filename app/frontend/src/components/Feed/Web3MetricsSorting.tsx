import React, { useState, useCallback, useEffect } from 'react';
import { FeedSortType } from '../../types/feed';

interface Web3MetricsSortingProps {
  onSortChange: (sortType: Web3SortType, direction: 'asc' | 'desc') => void;
  currentSort?: Web3SortType;
  currentDirection?: 'asc' | 'desc';
  className?: string;
}

export enum Web3SortType {
  TOKEN_ACTIVITY = 'token_activity',
  STAKING_AMOUNT = 'staking_amount',
  GOVERNANCE_RELEVANCE = 'governance_relevance',
  TIP_AMOUNT = 'tip_amount',
  UNIQUE_STAKERS = 'unique_stakers',
  SOCIAL_PROOF = 'social_proof',
  ENGAGEMENT_VELOCITY = 'engagement_velocity',
  COMMUNITY_IMPACT = 'community_impact'
}

interface Web3SortOption {
  type: Web3SortType;
  label: string;
  description: string;
  icon: string;
  color: string;
  algorithm: string;
  weight: number;
}

const WEB3_SORT_OPTIONS: Web3SortOption[] = [
  {
    type: Web3SortType.TOKEN_ACTIVITY,
    label: 'Token Activity',
    description: 'Posts with highest token engagement',
    icon: '💎',
    color: 'purple',
    algorithm: 'Total staked + tipped tokens weighted by recency',
    weight: 1.0
  },
  {
    type: Web3SortType.STAKING_AMOUNT,
    label: 'Staking Amount',
    description: 'Posts with most tokens staked',
    icon: '🔒',
    color: 'blue',
    algorithm: 'Sum of all tokens staked on post',
    weight: 0.9
  },
  {
    type: Web3SortType.GOVERNANCE_RELEVANCE,
    label: 'Governance',
    description: 'Governance proposals and DAO discussions',
    icon: '🏛️',
    color: 'indigo',
    algorithm: 'Governance tags + voting activity + proposal status',
    weight: 0.8
  },
  {
    type: Web3SortType.TIP_AMOUNT,
    label: 'Tips Received',
    description: 'Posts with highest tip amounts',
    icon: '💰',
    color: 'yellow',
    algorithm: 'Total tips received weighted by token value',
    weight: 0.7
  },
  {
    type: Web3SortType.UNIQUE_STAKERS,
    label: 'Unique Stakers',
    description: 'Posts with most individual stakers',
    icon: '👥',
    color: 'green',
    algorithm: 'Count of unique addresses that staked',
    weight: 0.6
  },
  {
    type: Web3SortType.SOCIAL_PROOF,
    label: 'Social Proof',
    description: 'Engagement from verified/followed users',
    icon: '✅',
    color: 'pink',
    algorithm: 'Weighted engagement from verified and followed users',
    weight: 0.5
  },
  {
    type: Web3SortType.ENGAGEMENT_VELOCITY,
    label: 'Velocity',
    description: 'Rate of engagement growth',
    icon: '🚀',
    color: 'red',
    algorithm: 'Engagement growth rate over time windows',
    weight: 0.4
  },
  {
    type: Web3SortType.COMMUNITY_IMPACT,
    label: 'Community Impact',
    description: 'Cross-community engagement and mentions',
    icon: '🌐',
    color: 'teal',
    algorithm: 'Engagement across multiple communities',
    weight: 0.3
  }
];

export const Web3MetricsSorting: React.FC<Web3MetricsSortingProps> = ({
  onSortChange,
  currentSort = Web3SortType.TOKEN_ACTIVITY,
  currentDirection = 'desc',
  className = ''
}) => {
  const [expandedOption, setExpandedOption] = useState<Web3SortType | null>(null);
  const [showAlgorithmDetails, setShowAlgorithmDetails] = useState(false);

  // Handle sort selection
  const handleSortSelect = useCallback((sortType: Web3SortType) => {
    const newDirection = currentSort === sortType && currentDirection === 'desc' ? 'asc' : 'desc';
    onSortChange(sortType, newDirection);
  }, [currentSort, currentDirection, onSortChange]);

  // Toggle algorithm details
  const toggleAlgorithmDetails = useCallback(() => {
    setShowAlgorithmDetails(!showAlgorithmDetails);
  }, [showAlgorithmDetails]);

  // Get color classes for sort option
  const getColorClasses = useCallback((color: string, isActive: boolean) => {
    const baseClasses = 'transition-all duration-200';
    
    if (isActive) {
      switch (color) {
        case 'purple':
          return `${baseClasses} bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 ring-2 ring-purple-200 dark:ring-purple-800`;
        case 'blue':
          return `${baseClasses} bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-2 ring-blue-200 dark:ring-blue-800`;
        case 'indigo':
          return `${baseClasses} bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-200 dark:ring-indigo-800`;
        case 'yellow':
          return `${baseClasses} bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 ring-2 ring-yellow-200 dark:ring-yellow-800`;
        case 'green':
          return `${baseClasses} bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 ring-2 ring-green-200 dark:ring-green-800`;
        case 'pink':
          return `${baseClasses} bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 ring-2 ring-pink-200 dark:ring-pink-800`;
        case 'red':
          return `${baseClasses} bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 ring-2 ring-red-200 dark:ring-red-800`;
        case 'teal':
          return `${baseClasses} bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 ring-2 ring-teal-200 dark:ring-teal-800`;
        default:
          return `${baseClasses} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 ring-2 ring-gray-200 dark:ring-gray-600`;
      }
    }
    
    return `${baseClasses} bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500`;
  }, []);

  // Get current sort option
  const currentSortOption = WEB3_SORT_OPTIONS.find(option => option.type === currentSort);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <span>💎</span>
            <span>Web3 Metrics Sorting</span>
            {currentSortOption && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full">
                {currentSortOption.icon} {currentSortOption.label}
                <span className="ml-1">
                  {currentDirection === 'desc' ? '↓' : '↑'}
                </span>
              </span>
            )}
          </h3>
          
          <button
            onClick={toggleAlgorithmDetails}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200 flex items-center space-x-1"
          >
            <span>ℹ️</span>
            <span>{showAlgorithmDetails ? 'Hide' : 'Show'} Details</span>
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Sort Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {WEB3_SORT_OPTIONS.map(option => {
            const isActive = currentSort === option.type;
            
            return (
              <button
                key={option.type}
                onClick={() => handleSortSelect(option.type)}
                onMouseEnter={() => setExpandedOption(option.type)}
                onMouseLeave={() => setExpandedOption(null)}
                className={`flex items-start space-x-3 p-4 text-left rounded-lg ${getColorClasses(option.color, isActive)}`}
              >
                <span className="text-xl mt-0.5">{option.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{option.label}</span>
                    <div className="flex items-center space-x-1">
                      {isActive && (
                        <span className="text-xs font-medium">
                          {currentDirection === 'desc' ? '↓ High to Low' : '↑ Low to High'}
                        </span>
                      )}
                      <div className={`w-2 h-2 rounded-full ${
                        isActive ? 'animate-pulse' : ''
                      } ${
                        option.color === 'purple' ? 'bg-purple-500' :
                        option.color === 'blue' ? 'bg-blue-500' :
                        option.color === 'indigo' ? 'bg-indigo-500' :
                        option.color === 'yellow' ? 'bg-yellow-500' :
                        option.color === 'green' ? 'bg-green-500' :
                        option.color === 'pink' ? 'bg-pink-500' :
                        option.color === 'red' ? 'bg-red-500' :
                        option.color === 'teal' ? 'bg-teal-500' : 'bg-gray-500'
                      }`} />
                    </div>
                  </div>
                  <div className="text-xs opacity-75 mt-1">{option.description}</div>
                  
                  {/* Weight indicator */}
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                      <div 
                        className={`h-1 rounded-full ${
                          option.color === 'purple' ? 'bg-purple-500' :
                          option.color === 'blue' ? 'bg-blue-500' :
                          option.color === 'indigo' ? 'bg-indigo-500' :
                          option.color === 'yellow' ? 'bg-yellow-500' :
                          option.color === 'green' ? 'bg-green-500' :
                          option.color === 'pink' ? 'bg-pink-500' :
                          option.color === 'red' ? 'bg-red-500' :
                          option.color === 'teal' ? 'bg-teal-500' : 'bg-gray-500'
                        }`}
                        style={{ width: `${option.weight * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {(option.weight * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* Algorithm details */}
                  {showAlgorithmDetails && (
                    <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-xs italic">
                      <strong>Algorithm:</strong> {option.algorithm}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Current Selection Summary */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-gray-500 dark:text-gray-400">Current:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {currentSortOption?.icon} {currentSortOption?.label}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                ({currentDirection === 'desc' ? 'Highest first' : 'Lowest first'})
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600 dark:text-green-400">
                Real-time Web3 Data
              </span>
            </div>
          </div>
        </div>

        {/* Performance Note */}
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">💡</span>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Performance Tip:</strong> Web3 metrics are cached for 30 seconds to ensure fast loading. 
              Token activity and staking data are updated in real-time via WebSocket connections.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Web3MetricsSorting;