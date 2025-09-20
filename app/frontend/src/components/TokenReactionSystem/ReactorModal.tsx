/**
 * ReactorModal Component
 * Modal to show who reacted with token amounts
 */

import React, { useState, useEffect } from 'react';
import {
  TokenReaction,
  ReactionType,
  REACTION_TYPES,
  ReactorModalData
} from '../../types/tokenReaction';
import tokenReactionService from '../../services/tokenReactionService';

interface ReactorModalProps {
  isOpen: boolean;
  postId: string;
  reactionType?: ReactionType;
  onClose: () => void;
}

const ReactorModal: React.FC<ReactorModalProps> = ({
  isOpen,
  postId,
  reactionType,
  onClose
}) => {
  const [data, setData] = useState<ReactorModalData>({
    postId,
    reactionType,
    reactions: [],
    totalAmount: 0,
    totalCount: 0,
    isLoading: true
  });

  const [selectedTab, setSelectedTab] = useState<ReactionType | 'all'>('all');

  useEffect(() => {
    if (isOpen && postId) {
      loadReactions();
    }
  }, [isOpen, postId, reactionType]);

  const loadReactions = async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true }));

      const response = await tokenReactionService.getReactions({
        postId,
        reactionType,
        limit: 100
      });

      setData({
        postId,
        reactionType,
        reactions: response.reactions,
        totalAmount: response.reactions.reduce((sum, r) => sum + r.amount, 0),
        totalCount: response.reactions.length,
        isLoading: false
      });

      // Set initial tab
      if (reactionType) {
        setSelectedTab(reactionType);
      } else {
        setSelectedTab('all');
      }
    } catch (error) {
      console.error('Failed to load reactions:', error);
      setData(prev => ({ ...prev, isLoading: false }));
    }
  };

  const getFilteredReactions = () => {
    if (selectedTab === 'all') {
      return data.reactions;
    }
    return data.reactions.filter(r => r.type === selectedTab);
  };

  const getReactionTabs = () => {
    const tabs: Array<{ key: ReactionType | 'all'; label: string; count: number }> = [
      {
        key: 'all',
        label: 'All',
        count: data.reactions.length
      }
    ];

    // Add tabs for each reaction type that has reactions
    const reactionTypes = [...new Set(data.reactions.map(r => r.type))];
    reactionTypes.forEach(type => {
      const typeReactions = data.reactions.filter(r => r.type === type);
      tabs.push({
        key: type,
        label: REACTION_TYPES[type].name,
        count: typeReactions.length
      });
    });

    return tabs;
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isOpen) return null;

  const filteredReactions = getFilteredReactions();
  const tabs = getReactionTabs();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Reactions
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {data.totalCount} reactions • {tokenReactionService.formatReactionAmount(data.totalAmount)} tokens staked
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        {tabs.length > 1 && (
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key)}
                className={`
                  flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors
                  ${selectedTab === tab.key
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }
                `}
              >
                {tab.key !== 'all' && (
                  <span className="text-lg">{REACTION_TYPES[tab.key as ReactionType].emoji}</span>
                )}
                <span>{tab.label}</span>
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          {data.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredReactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">🤷‍♂️</div>
              <p className="text-gray-500 dark:text-gray-400">No reactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredReactions.map((reaction) => {
                const config = REACTION_TYPES[reaction.type];
                const theme = tokenReactionService.getReactionTheme(reaction.type);
                
                return (
                  <div key={reaction.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center space-x-3">
                      {/* User Avatar */}
                      <div className="flex-shrink-0">
                        {reaction.user?.avatar ? (
                          <img
                            src={reaction.user.avatar}
                            alt={reaction.user.handle || 'User'}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-semibold">
                            {reaction.user?.handle?.[0]?.toUpperCase() || 
                             reaction.user?.walletAddress.slice(2, 4).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {reaction.user?.handle || formatWalletAddress(reaction.user?.walletAddress || '')}
                          </p>
                          {reaction.user?.handle && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatWalletAddress(reaction.user.walletAddress)}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(reaction.createdAt).toLocaleDateString()} at{' '}
                          {new Date(reaction.createdAt).toLocaleTimeString()}
                        </p>
                      </div>

                      {/* Reaction Info */}
                      <div className="flex items-center space-x-3">
                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full bg-gradient-to-r ${theme.gradient} text-white`}>
                          <span className="text-lg">{config.emoji}</span>
                          <span className="font-semibold">
                            {tokenReactionService.formatReactionAmount(reaction.amount)}
                          </span>
                        </div>
                        
                        {reaction.rewardsEarned > 0 && (
                          <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                            +{reaction.rewardsEarned.toFixed(2)} rewards
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              Showing {filteredReactions.length} of {data.totalCount} reactions
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReactorModal;