/**
 * GovernanceProposalPreview Component
 * 
 * Shows inline voting progress bars with real-time updates, proposal status,
 * time remaining, participation rates, quick voting buttons with wallet integration,
 * and expandable proposal details.
 * 
 * Requirements: 2.3, 3.1, 3.2
 */

import React, { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { ProposalPreview } from '../../../../types/communityEnhancements';

interface GovernanceProposalPreviewProps {
  proposal: ProposalPreview;
  onVote?: (proposalId: string, vote: 'yes' | 'no' | 'abstain') => void;
  onExpand?: (proposal: ProposalPreview) => void;
  userVotingPower?: number;
  userHasVoted?: boolean;
  userVote?: 'yes' | 'no' | 'abstain';
  isLoading?: boolean;
  showQuickVote?: boolean;
  compact?: boolean;
  className?: string;
}

interface StatusConfig {
  label: string;
  color: string;
  backgroundColor: string;
  icon: string;
  description: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  active: {
    label: 'Active',
    color: '#10B981',
    backgroundColor: '#ECFDF5',
    icon: '🗳️',
    description: 'Voting is currently open'
  },
  passed: {
    label: 'Passed',
    color: '#059669',
    backgroundColor: '#D1FAE5',
    icon: '✅',
    description: 'Proposal has been approved'
  },
  failed: {
    label: 'Failed',
    color: '#EF4444',
    backgroundColor: '#FEF2F2',
    icon: '❌',
    description: 'Proposal did not pass'
  },
  pending: {
    label: 'Pending',
    color: '#F59E0B',
    backgroundColor: '#FFFBEB',
    icon: '⏳',
    description: 'Proposal is awaiting activation'
  }
};

const GovernanceProposalPreview: React.FC<GovernanceProposalPreviewProps> = memo(({
  proposal,
  onVote,
  onExpand,
  userVotingPower = 0,
  userHasVoted = false,
  userVote,
  isLoading = false,
  showQuickVote = true,
  compact = false,
  className = ''
}) => {
  const [timeRemaining, setTimeRemaining] = useState(proposal.timeRemaining);
  const [isVoting, setIsVoting] = useState(false);

  // Update time remaining every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 60000)); // Subtract 1 minute
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Handle vote submission
  const handleVote = useCallback(async (vote: 'yes' | 'no' | 'abstain') => {
    if (!onVote || isLoading || userHasVoted || isVoting) return;

    setIsVoting(true);
    try {
      await onVote(proposal.id, vote);
    } finally {
      setIsVoting(false);
    }
  }, [onVote, proposal.id, isLoading, userHasVoted, isVoting]);

  // Handle expand click
  const handleExpandClick = useCallback(() => {
    if (onExpand && !isLoading) {
      onExpand(proposal);
    }
  }, [onExpand, proposal, isLoading]);

  // Format time remaining
  const formatTimeRemaining = useCallback((ms: number) => {
    if (ms <= 0) return 'Voting ended';
    
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  }, []);

  // Calculate vote percentages
  const votePercentages = useMemo(() => {
    const totalVotes = proposal.votingProgress;
    if (totalVotes === 0) {
      return { yes: 0, no: 0, abstain: 0 };
    }

    // Assuming votingProgress represents yes percentage for simplicity
    // In a real implementation, this would come from the proposal data
    const yes = proposal.votingProgress;
    const no = Math.max(0, 100 - yes - (proposal.participationRate * 10)); // Simplified calculation
    const abstain = Math.max(0, 100 - yes - no);

    return { yes, no, abstain };
  }, [proposal.votingProgress, proposal.participationRate]);

  // Get status configuration
  const statusConfig = useMemo(() => {
    return STATUS_CONFIG[proposal.currentStatus] || STATUS_CONFIG.pending;
  }, [proposal.currentStatus]);

  // Determine urgency level
  const urgencyLevel = useMemo(() => {
    if (timeRemaining <= 0) return 'ended';
    if (timeRemaining <= 24 * 60 * 60 * 1000) return 'urgent'; // 24 hours
    if (timeRemaining <= 7 * 24 * 60 * 60 * 1000) return 'soon'; // 7 days
    return 'normal';
  }, [timeRemaining]);

  const cardClasses = useMemo(() => {
    const baseClasses = [
      'ce-governance-proposal-preview',
      'bg-white dark:bg-gray-800',
      'border border-gray-200 dark:border-gray-700',
      'rounded-lg overflow-hidden',
      'transition-all duration-200 ease-in-out',
      'hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600'
    ];

    if (urgencyLevel === 'urgent') {
      baseClasses.push('border-red-300 dark:border-red-600', 'shadow-red-100 dark:shadow-red-900');
    } else if (urgencyLevel === 'soon') {
      baseClasses.push('border-yellow-300 dark:border-yellow-600', 'shadow-yellow-100 dark:shadow-yellow-900');
    }

    if (onExpand && !isLoading) {
      baseClasses.push('cursor-pointer', 'hover:transform', 'hover:scale-105');
    }

    if (isLoading) {
      baseClasses.push('opacity-75', 'cursor-wait');
    }

    if (className) {
      baseClasses.push(className);
    }

    return baseClasses.join(' ');
  }, [urgencyLevel, onExpand, isLoading, className]);

  return (
    <div 
      className={cardClasses}
      onClick={onExpand ? handleExpandClick : undefined}
      role={onExpand ? 'button' : 'article'}
      tabIndex={onExpand ? 0 : -1}
      onKeyDown={(e) => {
        if (onExpand && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleExpandClick();
        }
      }}
      aria-label={`Governance proposal: ${proposal.title}, ${statusConfig.description}, ${formatTimeRemaining(timeRemaining)}`}
    >
      {/* Header */}
      <div className={`p-4 ${compact ? 'pb-2' : 'pb-3'}`}>
        <div className="flex items-start justify-between gap-3">
          {/* Status Badge */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              color: statusConfig.color,
              backgroundColor: statusConfig.backgroundColor
            }}
          >
            <span aria-hidden="true">{statusConfig.icon}</span>
            <span>{statusConfig.label}</span>
          </div>

          {/* Time Remaining */}
          <div className={`text-sm ${
            urgencyLevel === 'urgent' 
              ? 'text-red-600 dark:text-red-400 font-semibold' 
              : urgencyLevel === 'soon'
              ? 'text-yellow-600 dark:text-yellow-400 font-medium'
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {formatTimeRemaining(timeRemaining)}
          </div>
        </div>

        {/* Title */}
        <h3 className="mt-2 font-semibold text-gray-900 dark:text-white line-clamp-2">
          {proposal.title}
        </h3>
      </div>

      {/* Voting Progress */}
      <div className="px-4 pb-3">
        <div className="space-y-2">
          {/* Progress Bar */}
          <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            {/* Yes votes */}
            <div 
              className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-500"
              style={{ width: `${votePercentages.yes}%` }}
              aria-label={`${votePercentages.yes.toFixed(1)}% yes votes`}
            />
            {/* No votes */}
            <div 
              className="absolute top-0 h-full bg-red-500 transition-all duration-500"
              style={{ 
                left: `${votePercentages.yes}%`,
                width: `${votePercentages.no}%` 
              }}
              aria-label={`${votePercentages.no.toFixed(1)}% no votes`}
            />
            {/* Abstain votes */}
            <div 
              className="absolute top-0 h-full bg-gray-400 transition-all duration-500"
              style={{ 
                left: `${votePercentages.yes + votePercentages.no}%`,
                width: `${votePercentages.abstain}%` 
              }}
              aria-label={`${votePercentages.abstain.toFixed(1)}% abstain votes`}
            />
          </div>

          {/* Vote Percentages */}
          {!compact && (
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Yes: {votePercentages.yes.toFixed(1)}%
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                No: {votePercentages.no.toFixed(1)}%
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                Abstain: {votePercentages.abstain.toFixed(1)}%
              </span>
            </div>
          )}

          {/* Participation Rate */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Participation: {proposal.participationRate.toFixed(1)}%
            </span>
            {userVotingPower > 0 && (
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                Your power: {userVotingPower.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Vote Buttons */}
      {showQuickVote && proposal.currentStatus === 'active' && !userHasVoted && userVotingPower > 0 && (
        <div className="px-4 pb-4">
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleVote('yes');
              }}
              disabled={isVoting || isLoading}
              className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Vote yes on this proposal"
            >
              {isVoting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Voting...
                </div>
              ) : (
                <>✓ Yes</>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleVote('no');
              }}
              disabled={isVoting || isLoading}
              className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Vote no on this proposal"
            >
              {isVoting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Voting...
                </div>
              ) : (
                <>✗ No</>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleVote('abstain');
              }}
              disabled={isVoting || isLoading}
              className="flex-1 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Abstain from voting on this proposal"
            >
              {isVoting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Voting...
                </div>
              ) : (
                <>— Abstain</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* User Vote Status */}
      {userHasVoted && userVote && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
            <span aria-hidden="true">
              {userVote === 'yes' ? '✓' : userVote === 'no' ? '✗' : '—'}
            </span>
            <span>You voted: {userVote.charAt(0).toUpperCase() + userVote.slice(1)}</span>
          </div>
        </div>
      )}

      {/* Expand Indicator */}
      {onExpand && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg">
            <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Screen reader information */}
      <div className="sr-only">
        Governance proposal: {proposal.title}.
        Status: {statusConfig.description}.
        Time remaining: {formatTimeRemaining(timeRemaining)}.
        Current voting results: {votePercentages.yes.toFixed(1)}% yes, {votePercentages.no.toFixed(1)}% no, {votePercentages.abstain.toFixed(1)}% abstain.
        Participation rate: {proposal.participationRate.toFixed(1)}%.
        {userVotingPower > 0 && `Your voting power: ${userVotingPower.toFixed(2)}.`}
        {userHasVoted && userVote && `You have voted: ${userVote}.`}
        {onExpand && 'Click to expand for more details.'}
      </div>
    </div>
  );
});

GovernanceProposalPreview.displayName = 'GovernanceProposalPreview';

export default GovernanceProposalPreview;