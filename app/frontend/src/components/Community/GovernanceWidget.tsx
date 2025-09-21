import React, { useState, useCallback, useMemo } from 'react';
import { 
  Proposal, 
  ProposalStatus, 
  VoteChoice, 
  GovernanceWidgetProps,
  GovernanceWidgetState,
  ProposalCardProps,
  VotingButtonProps,
  ParticipationMetricsProps
} from '../../types/governance';
import VotingParticipationMetrics from './VotingParticipationMetrics';

// Utility function to format time remaining
const formatTimeRemaining = (endTime: Date): string => {
  const now = new Date();
  const diff = endTime.getTime() - now.getTime();
  
  if (diff <= 0) return 'Voting ended';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
};

// Utility function to format vote counts
const formatVoteCount = (count: string): string => {
  const num = parseFloat(count);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(1);
};

// Utility function to get status color
const getStatusColor = (status: ProposalStatus): string => {
  switch (status) {
    case ProposalStatus.ACTIVE:
      return 'text-green-600 bg-green-100';
    case ProposalStatus.SUCCEEDED:
      return 'text-blue-600 bg-blue-100';
    case ProposalStatus.DEFEATED:
      return 'text-red-600 bg-red-100';
    case ProposalStatus.EXECUTED:
      return 'text-purple-600 bg-purple-100';
    case ProposalStatus.QUEUED:
      return 'text-yellow-600 bg-yellow-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

// Voting Button Component
const VotingButton: React.FC<VotingButtonProps> = ({
  proposal,
  choice,
  onVote,
  disabled,
  userVotingPower
}) => {
  const [isVoting, setIsVoting] = useState(false);
  
  const handleVote = async () => {
    if (disabled || isVoting) return;
    
    setIsVoting(true);
    try {
      await onVote(proposal.id, choice);
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setIsVoting(false);
    }
  };
  
  const getButtonStyle = () => {
    const baseStyle = 'px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ';
    
    if (proposal.userVote === choice) {
      switch (choice) {
        case VoteChoice.FOR:
          return baseStyle + 'bg-green-600 text-white';
        case VoteChoice.AGAINST:
          return baseStyle + 'bg-red-600 text-white';
        case VoteChoice.ABSTAIN:
          return baseStyle + 'bg-gray-600 text-white';
      }
    }
    
    if (disabled || isVoting) {
      return baseStyle + 'bg-gray-200 text-gray-400 cursor-not-allowed';
    }
    
    switch (choice) {
      case VoteChoice.FOR:
        return baseStyle + 'bg-green-100 text-green-700 hover:bg-green-200';
      case VoteChoice.AGAINST:
        return baseStyle + 'bg-red-100 text-red-700 hover:bg-red-200';
      case VoteChoice.ABSTAIN:
        return baseStyle + 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    }
  };
  
  const getButtonText = () => {
    if (isVoting) return 'Voting...';
    
    switch (choice) {
      case VoteChoice.FOR:
        return proposal.userVote === choice ? '✓ For' : 'For';
      case VoteChoice.AGAINST:
        return proposal.userVote === choice ? '✓ Against' : 'Against';
      case VoteChoice.ABSTAIN:
        return proposal.userVote === choice ? '✓ Abstain' : 'Abstain';
    }
  };
  
  return (
    <button
      onClick={handleVote}
      disabled={disabled || isVoting}
      className={getButtonStyle()}
      title={`Vote ${choice} with ${userVotingPower} voting power`}
    >
      {getButtonText()}
    </button>
  );
};

// Participation Metrics Component
const ParticipationMetrics: React.FC<ParticipationMetricsProps> = ({
  proposal,
  userVotingPower,
  participationMetrics
}) => {
  const totalVotes = parseFloat(proposal.forVotes) + parseFloat(proposal.againstVotes) + parseFloat(proposal.abstainVotes || '0');
  const quorumProgress = (totalVotes / parseFloat(proposal.quorum)) * 100;
  const forPercentage = totalVotes > 0 ? (parseFloat(proposal.forVotes) / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (parseFloat(proposal.againstVotes) / totalVotes) * 100 : 0;
  
  return (
    <div className="space-y-3">
      {/* Vote Distribution */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">For: {formatVoteCount(proposal.forVotes)}</span>
          <span className="text-gray-600">Against: {formatVoteCount(proposal.againstVotes)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="flex h-2 rounded-full overflow-hidden">
            <div 
              className="bg-green-500" 
              style={{ width: `${forPercentage}%` }}
            />
            <div 
              className="bg-red-500" 
              style={{ width: `${againstPercentage}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Enhanced Participation Metrics */}
      {participationMetrics ? (
        <VotingParticipationMetrics
          communityId={proposal.communityId}
          participationMetrics={participationMetrics}
          className="border-t border-gray-100 pt-3"
        />
      ) : (
        <>
          {/* Quorum Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Quorum Progress</span>
              <span className="text-gray-600">{quorumProgress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  quorumProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(quorumProgress, 100)}%` }}
              />
            </div>
          </div>
          
          {/* Participation Rate */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Participation Rate</span>
            <span className="font-medium">{proposal.participationRate.toFixed(1)}%</span>
          </div>
          
          {/* User Voting Power */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Your Voting Power</span>
            <span className="font-medium">{userVotingPower.toFixed(2)}</span>
          </div>
        </>
      )}
    </div>
  );
};

// Proposal Card Component
const ProposalCard: React.FC<ProposalCardProps> = ({
  proposal,
  userVotingPower,
  onVote,
  onViewDetails,
  isExpanded,
  onToggleExpand,
  votingInProgress
}) => {
  const isActive = proposal.status === ProposalStatus.ACTIVE;
  const canVote = isActive && proposal.canVote && !proposal.userVote;
  const timeRemaining = formatTimeRemaining(proposal.endTime);
  
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">{proposal.title}</h4>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
              {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
            </span>
            <span className="text-xs text-gray-500">{proposal.category}</span>
          </div>
        </div>
        <button
          onClick={() => onToggleExpand(proposal.id)}
          className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg 
            className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      {/* Time Remaining */}
      {isActive && (
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {timeRemaining}
        </div>
      )}
      
      {/* Description (when expanded) */}
      {isExpanded && (
        <div className="space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            {proposal.description}
          </p>
          
          {/* Participation Metrics */}
          <ParticipationMetrics 
            proposal={proposal}
            userVotingPower={userVotingPower}
            participationMetrics={undefined}
          />
        </div>
      )}
      
      {/* Voting Buttons */}
      {isActive && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex space-x-2">
            <VotingButton
              proposal={proposal}
              choice={VoteChoice.FOR}
              onVote={onVote}
              disabled={!canVote || votingInProgress}
              userVotingPower={userVotingPower}
            />
            <VotingButton
              proposal={proposal}
              choice={VoteChoice.AGAINST}
              onVote={onVote}
              disabled={!canVote || votingInProgress}
              userVotingPower={userVotingPower}
            />
            <VotingButton
              proposal={proposal}
              choice={VoteChoice.ABSTAIN}
              onVote={onVote}
              disabled={!canVote || votingInProgress}
              userVotingPower={userVotingPower}
            />
          </div>
          
          <button
            onClick={() => onViewDetails(proposal.id)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View Details
          </button>
        </div>
      )}
      
      {/* Final Results (for closed proposals) */}
      {!isActive && (
        <div className="pt-2 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Final Result: {proposal.status === ProposalStatus.SUCCEEDED ? 'Passed' : 'Failed'}
            </div>
            <button
              onClick={() => onViewDetails(proposal.id)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Main GovernanceWidget Component
const GovernanceWidget: React.FC<GovernanceWidgetProps> = ({
  activeProposals,
  userVotingPower,
  participationRate,
  participationMetrics,
  onVote,
  onViewProposal,
  loading = false,
  error = null
}) => {
  const [state, setState] = useState<GovernanceWidgetState>({
    expandedProposal: null,
    votingInProgress: null,
    showAllProposals: false
  });
  
  // Memoized proposal sorting and filtering
  const { activeProposalsList, closedProposalsList } = useMemo(() => {
    const active = activeProposals.filter(p => p.status === ProposalStatus.ACTIVE);
    const closed = activeProposals.filter(p => p.status !== ProposalStatus.ACTIVE);
    
    // Sort active proposals by end time (soonest first)
    active.sort((a, b) => a.endTime.getTime() - b.endTime.getTime());
    
    // Sort closed proposals by end time (most recent first)
    closed.sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
    
    return {
      activeProposalsList: active,
      closedProposalsList: closed
    };
  }, [activeProposals]);
  
  const handleToggleExpand = useCallback((proposalId: string) => {
    setState(prev => ({
      ...prev,
      expandedProposal: prev.expandedProposal === proposalId ? null : proposalId
    }));
  }, []);
  
  const handleVote = useCallback(async (proposalId: string, choice: VoteChoice) => {
    setState(prev => ({ ...prev, votingInProgress: proposalId }));
    try {
      await onVote(proposalId, choice);
    } finally {
      setState(prev => ({ ...prev, votingInProgress: null }));
    }
  }, [onVote]);
  
  const handleToggleShowAll = useCallback(() => {
    setState(prev => ({ ...prev, showAllProposals: !prev.showAllProposals }));
  }, []);
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-center py-4">
          <div className="text-red-600 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }
  
  const displayedProposals = state.showAllProposals 
    ? [...activeProposalsList, ...closedProposalsList]
    : activeProposalsList.slice(0, 3);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Governance
          </h3>
          <div className="text-sm text-gray-600">
            {activeProposalsList.length} active
          </div>
        </div>
        
        {/* Enhanced Participation Metrics */}
        {participationMetrics ? (
          <div className="mt-3">
            <VotingParticipationMetrics
              communityId={activeProposalsList[0]?.communityId || ''}
              participationMetrics={participationMetrics}
              showHistoricalData={true}
            />
          </div>
        ) : (
          <div className="mt-2 flex items-center text-sm text-gray-600">
            <span>Community Participation: </span>
            <span className="ml-1 font-medium">{participationRate.toFixed(1)}%</span>
            <div className="ml-2 flex-1 max-w-20 bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(participationRate, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        {displayedProposals.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-gray-600 text-sm">No governance proposals at this time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedProposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                userVotingPower={userVotingPower}
                onVote={handleVote}
                onViewDetails={onViewProposal}
                isExpanded={state.expandedProposal === proposal.id}
                onToggleExpand={handleToggleExpand}
                votingInProgress={state.votingInProgress === proposal.id}
              />
            ))}
            
            {/* Show More/Less Button */}
            {(activeProposalsList.length > 3 || closedProposalsList.length > 0) && (
              <button
                onClick={handleToggleShowAll}
                className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium border-t border-gray-100 mt-4 pt-4"
              >
                {state.showAllProposals 
                  ? 'Show Less' 
                  : `Show All Proposals (${activeProposalsList.length + closedProposalsList.length})`
                }
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GovernanceWidget;