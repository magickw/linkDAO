/**
 * Live governance widget with real-time voting progress and results updates
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRealTimeGovernance } from '../../hooks/useRealTimeBlockchain';

interface LiveGovernanceWidgetProps {
  communityId?: string;
  className?: string;
  maxProposals?: number;
  showVotingProgress?: boolean;
  autoRefresh?: boolean;
}

interface VotingProgressAnimationState {
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  isAnimating: boolean;
  lastUpdate?: Date;
}

export const LiveGovernanceWidget: React.FC<LiveGovernanceWidgetProps> = ({
  communityId: propCommunityId,
  className = '',
  maxProposals = 5,
  showVotingProgress = true,
  autoRefresh = true
}) => {
  // Ensure communityId is always a valid string with more defensive checking
  const communityId = propCommunityId && typeof propCommunityId === 'string' && propCommunityId.length > 0
    ? propCommunityId 
    : 'default-community';
    
  // Pass communityId as an array to the hook
  const { governanceUpdates, getGovernanceUpdates, forceUpdate } = useRealTimeGovernance([communityId]);
  
  const [animationStates, setAnimationStates] = useState<Map<string, VotingProgressAnimationState>>(new Map());
  const [expandedProposals, setExpandedProposals] = useState<Set<string>>(new Set());

  // Get governance updates for this community with stable reference
  const updates = useMemo(() =>
    getGovernanceUpdates(communityId).slice(0, maxProposals),
    [communityId, maxProposals, governanceUpdates]
  );

  // Handle voting progress animations
  useEffect(() => {
    if (updates.length === 0) return;

    const timeouts: NodeJS.Timeout[] = [];
    let hasChanges = false;

    // Check if any updates have actually changed
    updates.forEach(update => {
      const currentState = animationStates.get(update.proposalId);
      const updateHasChanged = !currentState ||
        currentState.forVotes !== update.votingProgress.for ||
        currentState.againstVotes !== update.votingProgress.against ||
        currentState.abstainVotes !== update.votingProgress.abstain;

      if (updateHasChanged) {
        hasChanges = true;
        
        // Set animation state
        setAnimationStates(prev => {
          const newStates = new Map(prev);
          newStates.set(update.proposalId, {
            forVotes: update.votingProgress.for,
            againstVotes: update.votingProgress.against,
            abstainVotes: update.votingProgress.abstain,
            isAnimating: true,
            lastUpdate: update.timestamp
          });
          return newStates;
        });

        // Reset animation after duration
        const timeout = setTimeout(() => {
          setAnimationStates(prevState => {
            const newStates = new Map(prevState);
            const state = newStates.get(update.proposalId);
            if (state) {
              newStates.set(update.proposalId, { ...state, isAnimating: false });
            }
            return newStates;
          });
        }, 2000);

        timeouts.push(timeout);
      }
    });

    // Only trigger state updates if there are actual changes
    if (!hasChanges) {
      return;
    }

    // Cleanup timeouts
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [updates, animationStates]); // Depend on both updates and animationStates

  // Toggle proposal expansion
  const toggleProposal = (proposalId: string) => {
    setExpandedProposals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(proposalId)) {
        newSet.delete(proposalId);
      } else {
        newSet.add(proposalId);
      }
      return newSet;
    });
  };

  // Calculate total votes
  const getTotalVotes = (update: any): number => {
    return update.votingProgress.for + update.votingProgress.against + update.votingProgress.abstain;
  };

  // Calculate vote percentages
  const getVotePercentages = (update: any) => {
    const total = getTotalVotes(update);
    if (total === 0) return { for: 0, against: 0, abstain: 0 };

    return {
      for: (update.votingProgress.for / total) * 100,
      against: (update.votingProgress.against / total) * 100,
      abstain: (update.votingProgress.abstain / total) * 100
    };
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return 'text-blue-600 bg-blue-100';
      case 'passed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'executed': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Format vote count
  const formatVoteCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Loading state
  if (updates.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-2 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Live Governance
          </h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">Live Updates</span>
          </div>
        </div>
      </div>

      {/* Proposals List */}
      <div className="divide-y divide-gray-200">
        {updates.map((update) => {
          const animationState = animationStates.get(update.proposalId);
          const isExpanded = expandedProposals.has(update.proposalId);
          const percentages = getVotePercentages(update);
          const totalVotes = getTotalVotes(update);

          return (
            <div key={update.proposalId} className="p-4">
              {/* Proposal Header */}
              <div 
                className="cursor-pointer"
                onClick={() => toggleProposal(update.proposalId)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      Proposal #{update.proposalId.slice(-6)}
                    </h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(update.status)}`}>
                        {update.status.charAt(0).toUpperCase() + update.status.slice(1)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatVoteCount(totalVotes)} votes
                      </span>
                    </div>
                  </div>
                  
                  {/* Animation indicator */}
                  {animationState?.isAnimating && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                      <span className="text-xs text-blue-600">Updating</span>
                    </div>
                  )}
                  
                  {/* Expand/Collapse Icon */}
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Voting Progress Bar */}
                {showVotingProgress && totalVotes > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>For: {formatVoteCount(update.votingProgress.for)}</span>
                      <span>Against: {formatVoteCount(update.votingProgress.against)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div className="h-full flex">
                        <div 
                          className={`bg-green-500 transition-all duration-1000 ease-out ${animationState?.isAnimating ? 'animate-pulse' : ''}`}
                          style={{ width: `${percentages.for}%` }}
                        />
                        <div 
                          className={`bg-red-500 transition-all duration-1000 ease-out ${animationState?.isAnimating ? 'animate-pulse' : ''}`}
                          style={{ width: `${percentages.against}%` }}
                        />
                        <div 
                          className={`bg-gray-400 transition-all duration-1000 ease-out ${animationState?.isAnimating ? 'animate-pulse' : ''}`}
                          style={{ width: `${percentages.abstain}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  {/* Detailed Vote Breakdown */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-green-600 font-semibold">
                        {formatVoteCount(update.votingProgress.for)}
                      </div>
                      <div className="text-gray-500">For ({percentages.for.toFixed(1)}%)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-600 font-semibold">
                        {formatVoteCount(update.votingProgress.against)}
                      </div>
                      <div className="text-gray-500">Against ({percentages.against.toFixed(1)}%)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-semibold">
                        {formatVoteCount(update.votingProgress.abstain)}
                      </div>
                      <div className="text-gray-500">Abstain ({percentages.abstain.toFixed(1)}%)</div>
                    </div>
                  </div>

                  {/* Last Update Time */}
                  {animationState?.lastUpdate && (
                    <div className="text-xs text-gray-400 text-center">
                      Last updated: {animationState.lastUpdate.toLocaleTimeString()}
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex space-x-2">
                    <button className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors">
                      View Details
                    </button>
                    <button className="flex-1 px-3 py-2 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors">
                      Vote Now
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Updates every minute</span>
          <button 
            onClick={() => forceUpdate(communityId)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            Refresh Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveGovernanceWidget;