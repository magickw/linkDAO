/**
 * Live post updates component with real-time comment and engagement updates
 */

import React, { useState, useEffect } from 'react';
import { useRealTimePostActivity } from '../../hooks/useRealTimeBlockchain';

interface LivePostUpdatesProps {
  postIds: string[];
  className?: string;
  showAnimations?: boolean;
  maxUpdatesPerPost?: number;
}

interface PostActivityState {
  postId: string;
  commentCount: number;
  reactionCount: number;
  stakeAmount: number;
  tipAmount: number;
  lastUpdate?: Date;
  isAnimating: boolean;
  recentActivity: any[];
}

export const LivePostUpdates: React.FC<LivePostUpdatesProps> = ({
  postIds,
  className = '',
  showAnimations = true,
  maxUpdatesPerPost = 5
}) => {
  const { postActivity, getPostActivity } = useRealTimePostActivity(postIds);
  
  const [postStates, setPostStates] = useState<Map<string, PostActivityState>>(new Map());
  const [visibleUpdates, setVisibleUpdates] = useState<Map<string, any[]>>(new Map());

  // Initialize and update post states
  useEffect(() => {
    postIds.forEach(postId => {
      const activity = getPostActivity(postId);
      const currentState = postStates.get(postId);
      
      if (activity.length > 0) {
        const latestUpdate = activity[0];
        const hasNewActivity = !currentState || 
          currentState.lastUpdate?.getTime() !== latestUpdate.timestamp.getTime();

        if (hasNewActivity) {
          // Calculate aggregated stats
          const stats = activity.reduce((acc, update) => {
            switch (update.updateType) {
              case 'new_comment':
                acc.commentCount += update.data.count || 1;
                break;
              case 'reaction_added':
                acc.reactionCount += update.data.count || 1;
                break;
              case 'stake_added':
                acc.stakeAmount += update.data.amount || 0;
                break;
              case 'tip_received':
                acc.tipAmount += update.data.amount || 0;
                break;
            }
            return acc;
          }, { commentCount: 0, reactionCount: 0, stakeAmount: 0, tipAmount: 0 });

          setPostStates(prev => {
            const newStates = new Map(prev);
            newStates.set(postId, {
              postId,
              ...stats,
              lastUpdate: latestUpdate.timestamp,
              isAnimating: showAnimations,
              recentActivity: activity.slice(0, maxUpdatesPerPost)
            });
            return newStates;
          });

          // Show recent updates with animation
          if (showAnimations) {
            setVisibleUpdates(prev => {
              const newVisible = new Map(prev);
              newVisible.set(postId, activity.slice(0, 3)); // Show last 3 updates
              return newVisible;
            });

            // Reset animation after duration
            const timeout = setTimeout(() => {
              setPostStates(prev => {
                const newStates = new Map(prev);
                const state = newStates.get(postId);
                if (state) {
                  newStates.set(postId, { ...state, isAnimating: false });
                }
                return newStates;
              });
            }, 2000);

            return () => clearTimeout(timeout);
          }
        }
      }
    });
  }, [postIds, postActivity, getPostActivity, postStates, showAnimations, maxUpdatesPerPost]);

  // Format update type for display
  const formatUpdateType = (updateType: 'new_comment' | 'reaction_added' | 'stake_added' | 'tip_received'): string => {
    switch (updateType) {
      case 'new_comment': return 'New Comment';
      case 'reaction_added': return 'Reaction';
      case 'stake_added': return 'Stake Added';
      case 'tip_received': return 'Tip Received';
      default: return 'Update';
    }
  };

  // Get update icon
  const getUpdateIcon = (updateType: 'new_comment' | 'reaction_added' | 'stake_added' | 'tip_received'): JSX.Element => {
    const iconClass = "w-4 h-4";
    
    switch (updateType) {
      case 'new_comment':
        return (
          <svg className={`${iconClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'reaction_added':
        return (
          <svg className={`${iconClass} text-yellow-500`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        );
      case 'stake_added':
        return (
          <svg className={`${iconClass} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'tip_received':
        return (
          <svg className={`${iconClass} text-purple-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        );
      default:
        return (
          <svg className={`${iconClass} text-gray-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Format amount for display
  const formatAmount = (amount: number, type: 'stake' | 'tip'): string => {
    if (amount === 0) return '';
    
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    
    return type === 'stake' ? `${amount.toFixed(2)} tokens` : `$${amount.toFixed(2)}`;
  };

  // Get animation classes
  const getAnimationClasses = (isAnimating: boolean): string => {
    if (!isAnimating || !showAnimations) return '';
    return 'animate-pulse scale-105 transition-all duration-1000 ease-out';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {postIds.map(postId => {
        const state = postStates.get(postId);
        const updates = visibleUpdates.get(postId) || [];
        
        if (!state) {
          return (
            <div key={postId} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          );
        }

        return (
          <div key={postId} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {/* Post Activity Summary */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">
                  Post #{postId.slice(-6)}
                </h4>
                {state.isAnimating && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                    <span className="text-xs text-blue-600">Live</span>
                  </div>
                )}
              </div>

              {/* Activity Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`text-center ${getAnimationClasses(state.isAnimating)}`}>
                  <div className="text-lg font-semibold text-blue-600">
                    {state.commentCount}
                  </div>
                  <div className="text-xs text-gray-500">Comments</div>
                </div>
                
                <div className={`text-center ${getAnimationClasses(state.isAnimating)}`}>
                  <div className="text-lg font-semibold text-yellow-600">
                    {state.reactionCount}
                  </div>
                  <div className="text-xs text-gray-500">Reactions</div>
                </div>
                
                <div className={`text-center ${getAnimationClasses(state.isAnimating)}`}>
                  <div className="text-lg font-semibold text-green-600">
                    {formatAmount(state.stakeAmount, 'stake') || '0'}
                  </div>
                  <div className="text-xs text-gray-500">Staked</div>
                </div>
                
                <div className={`text-center ${getAnimationClasses(state.isAnimating)}`}>
                  <div className="text-lg font-semibold text-purple-600">
                    {formatAmount(state.tipAmount, 'tip') || '$0'}
                  </div>
                  <div className="text-xs text-gray-500">Tips</div>
                </div>
              </div>
            </div>

            {/* Recent Updates */}
            {updates.length > 0 && (
              <div className="p-4">
                <h5 className="text-sm font-medium text-gray-700 mb-3">Recent Activity</h5>
                <div className="space-y-2">
                  {updates.map((update, index) => (
                    <div 
                      key={`${update.postId}-${update.timestamp.getTime()}-${index}`}
                      className={`flex items-center space-x-3 p-2 rounded-lg bg-gray-50 ${
                        index === 0 && state.isAnimating ? 'animate-slideInRight' : ''
                      }`}
                    >
                      {getUpdateIcon(update.updateType)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            {formatUpdateType(update.updateType)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {update.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        {update.data.amount > 0 && (
                          <div className="text-xs text-gray-600">
                            {update.updateType === 'stake_added' && formatAmount(update.data.amount, 'stake')}
                            {update.updateType === 'tip_received' && formatAmount(update.data.amount, 'tip')}
                            {update.updateType === 'new_comment' && `${update.data.count} new`}
                            {update.updateType === 'reaction_added' && `+${update.data.count}`}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last Update Time */}
            {state.lastUpdate && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                <div className="text-xs text-gray-500 text-center">
                  Last updated: {state.lastUpdate.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default LivePostUpdates;