import React, { useState, useEffect } from 'react';
import { GovernanceProposal, VotingProgress } from '../../../types/communityEnhancements';
import { useCommunityWebSocket } from '../../../hooks/useCommunityWebSocket';
import { MicroInteractionLayer } from '../SharedComponents/MicroInteractionLayer';

interface TokenPriceInfo {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
}

interface ExpiringVote {
  proposalId: string;
  proposalTitle: string;
  timeRemaining: number;
  userVotingPower: number;
  priority: 'urgent' | 'normal' | 'low';
}

interface ExpandedGovernanceWidgetProps {
  activeProposals: GovernanceProposal[];
  userVotingPower: number;
  onVoteClick: (proposalId: string) => void;
  showProgressBars?: boolean;
  communityId: string;
  // Web3 enhancements
  tokenPrice?: TokenPriceInfo;
  expiringVotes?: ExpiringVote[];
  delegatedVotingPower?: number;
  totalTokensStaked?: number;
  onDelegateVotes?: () => void;
  onViewTokenDetails?: () => void;
}

interface CountdownTimerProps {
  deadline: Date;
  priority: 'urgent' | 'normal' | 'low';
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ deadline, priority }) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const deadlineTime = new Date(deadline).getTime();
      const difference = deadlineTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
          setTimeRemaining(`${days}d ${hours}h`);
        } else if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m`);
        } else {
          setTimeRemaining(`${minutes}m`);
        }

        // Mark as urgent if less than 24 hours remaining
        setIsUrgent(difference < 24 * 60 * 60 * 1000);
      } else {
        setTimeRemaining('Expired');
        setIsUrgent(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [deadline]);

  const urgencyClass = isUrgent || priority === 'urgent' 
    ? 'text-red-500 animate-pulse' 
    : priority === 'normal' 
    ? 'text-yellow-500' 
    : 'text-green-500';

  return (
    <div className={`text-sm font-medium ${urgencyClass}`}>
      {timeRemaining}
    </div>
  );
};

interface ProgressBarProps {
  progress: VotingProgress;
  showDetails?: boolean;
}

const VotingProgressBar: React.FC<ProgressBarProps> = ({ progress, showDetails = true }) => {
  const totalVotes = progress.totalVotes;
  const yesPercentage = totalVotes > 0 ? (progress.yesVotes / totalVotes) * 100 : 0;
  const noPercentage = totalVotes > 0 ? (progress.noVotes / totalVotes) * 100 : 0;
  const abstainPercentage = totalVotes > 0 ? (progress.abstainVotes / totalVotes) * 100 : 0;

  return (
    <div className="space-y-2">
      {/* Visual Progress Bar */}
      <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-500 ease-out"
          style={{ width: `${yesPercentage}%` }}
        />
        <div 
          className="absolute top-0 h-full bg-red-500 transition-all duration-500 ease-out"
          style={{ 
            left: `${yesPercentage}%`,
            width: `${noPercentage}%` 
          }}
        />
        <div 
          className="absolute top-0 h-full bg-gray-400 transition-all duration-500 ease-out"
          style={{ 
            left: `${yesPercentage + noPercentage}%`,
            width: `${abstainPercentage}%` 
          }}
        />
      </div>

      {/* Vote Counts */}
      {showDetails && (
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
          <span className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
            Yes: {progress.yesVotes}
          </span>
          <span className="flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-1" />
            No: {progress.noVotes}
          </span>
          <span className="flex items-center">
            <div className="w-2 h-2 bg-gray-400 rounded-full mr-1" />
            Abstain: {progress.abstainVotes}
          </span>
        </div>
      )}

      {/* Participation Rate */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Participation: {progress.participationRate.toFixed(1)}%
      </div>
    </div>
  );
};

interface VoteButtonProps {
  proposalId: string;
  userHasVoted: boolean;
  userVotingPower: number;
  onVoteClick: (proposalId: string) => void;
  priority: 'urgent' | 'normal' | 'low';
}

const TokenPriceDisplay: React.FC<{
  tokenPrice: TokenPriceInfo;
  onViewDetails?: () => void;
}> = ({ tokenPrice, onViewDetails }) => {
  const isPositiveChange = tokenPrice.priceChange24h >= 0;
  
  return (
    <div 
      className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-md transition-all duration-200"
      onClick={onViewDetails}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {tokenPrice.symbol.slice(0, 2)}
          </div>
          <span className="font-medium text-gray-900 dark:text-white">
            {tokenPrice.symbol}
          </span>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            ${tokenPrice.currentPrice.toFixed(4)}
          </div>
          <div className={`text-sm font-medium ${
            isPositiveChange ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {isPositiveChange ? '+' : ''}{tokenPrice.priceChange24h.toFixed(2)}%
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-400">
        <div>
          <div className="font-medium">Market Cap</div>
          <div>${(tokenPrice.marketCap / 1000000).toFixed(1)}M</div>
        </div>
        <div>
          <div className="font-medium">24h Volume</div>
          <div>${(tokenPrice.volume24h / 1000000).toFixed(1)}M</div>
        </div>
      </div>
    </div>
  );
};

const ExpiringVotesAlert: React.FC<{
  expiringVotes: ExpiringVote[];
  onVoteClick: (proposalId: string) => void;
}> = ({ expiringVotes, onVoteClick }) => {
  if (expiringVotes.length === 0) return null;

  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
      <div className="flex items-center space-x-2 mb-3">
        <svg className="w-5 h-5 text-red-600 dark:text-red-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span className="font-medium text-red-900 dark:text-red-100">
          Expiring Votes
        </span>
      </div>
      
      <div className="space-y-2">
        {expiringVotes.slice(0, 2).map((vote) => (
          <div key={vote.proposalId} className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-red-900 dark:text-red-100 truncate">
                {vote.proposalTitle}
              </div>
              <div className="text-xs text-red-700 dark:text-red-300">
                {Math.floor(vote.timeRemaining / 3600)}h remaining
              </div>
            </div>
            <button
              onClick={() => onVoteClick(vote.proposalId)}
              className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
            >
              Vote Now
            </button>
          </div>
        ))}
      </div>
      
      {expiringVotes.length > 2 && (
        <div className="text-xs text-red-700 dark:text-red-300 mt-2">
          +{expiringVotes.length - 2} more expiring soon
        </div>
      )}
    </div>
  );
};

const VoteWithWalletButton: React.FC<VoteButtonProps> = ({
  proposalId,
  userHasVoted,
  userVotingPower,
  onVoteClick,
  priority
}) => {
  const buttonClass = userHasVoted
    ? 'bg-gray-500 cursor-not-allowed'
    : priority === 'urgent'
    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
    : 'bg-blue-600 hover:bg-blue-700';

  return (
    <MicroInteractionLayer interactionType="click">
      <button
        onClick={() => !userHasVoted && onVoteClick(proposalId)}
        disabled={userHasVoted}
        className={`
          w-full px-4 py-2 text-white text-sm font-medium rounded-lg
          transition-all duration-200 transform hover:scale-105
          ${buttonClass}
          disabled:transform-none disabled:hover:scale-100
        `}
      >
        {userHasVoted ? (
          <span className="flex items-center justify-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Voted
          </span>
        ) : (
          <span className="flex items-center justify-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Vote with Wallet ({userVotingPower.toLocaleString()})
          </span>
        )}
      </button>
    </MicroInteractionLayer>
  );
};

export const ExpandedGovernanceWidget: React.FC<ExpandedGovernanceWidgetProps> = ({
  activeProposals,
  userVotingPower,
  onVoteClick,
  showProgressBars = true,
  communityId,
  tokenPrice,
  expiringVotes = [],
  delegatedVotingPower = 0,
  totalTokensStaked,
  onDelegateVotes,
  onViewTokenDetails
}) => {
  const [proposals, setProposals] = useState<GovernanceProposal[]>(activeProposals);
  const { isConnected } = useCommunityWebSocket(communityId);

  // Sort proposals by priority and deadline
  const sortedProposals = [...proposals].sort((a, b) => {
    // First sort by priority
    const priorityOrder = { urgent: 0, normal: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    // Then by deadline (earliest first)
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  // Update proposals when activeProposals prop changes
  useEffect(() => {
    setProposals(activeProposals);
  }, [activeProposals]);

  if (proposals.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Governance
        </h3>
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">No active proposals</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Governance
        </h3>
        <div className="flex items-center space-x-2">
          {isConnected && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {proposals.length} active
          </span>
        </div>
      </div>

      {/* Token Price Display */}
      {tokenPrice && (
        <div className="mb-6">
          <TokenPriceDisplay 
            tokenPrice={tokenPrice} 
            onViewDetails={onViewTokenDetails}
          />
        </div>
      )}

      {/* Expiring Votes Alert */}
      {expiringVotes.length > 0 && (
        <div className="mb-6">
          <ExpiringVotesAlert 
            expiringVotes={expiringVotes}
            onVoteClick={onVoteClick}
          />
        </div>
      )}

      {/* Enhanced Voting Power Display */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Your Voting Power
          </span>
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {userVotingPower.toLocaleString()}
          </span>
        </div>
        
        {/* Voting Power Breakdown */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-blue-700 dark:text-blue-300">
            <span>Direct Holdings:</span>
            <span>{(userVotingPower - delegatedVotingPower).toLocaleString()}</span>
          </div>
          {delegatedVotingPower > 0 && (
            <div className="flex justify-between text-blue-700 dark:text-blue-300">
              <span>Delegated to You:</span>
              <span>{delegatedVotingPower.toLocaleString()}</span>
            </div>
          )}
          {totalTokensStaked && (
            <div className="flex justify-between text-blue-700 dark:text-blue-300">
              <span>Tokens Staked:</span>
              <span>{totalTokensStaked.toLocaleString()}</span>
            </div>
          )}
        </div>
        
        {/* Delegation Button */}
        {onDelegateVotes && (
          <button
            onClick={onDelegateVotes}
            className="mt-3 w-full text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
          >
            Manage Delegation →
          </button>
        )}
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        {sortedProposals.map((proposal) => (
          <div
            key={proposal.id}
            className={`
              p-4 rounded-lg border transition-all duration-200
              ${proposal.priority === 'urgent' 
                ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' 
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
              }
            `}
          >
            {/* Proposal Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">
                  {proposal.title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {proposal.description}
                </p>
              </div>
              <div className="ml-3 flex flex-col items-end">
                <CountdownTimer 
                  deadline={proposal.deadline} 
                  priority={proposal.priority}
                />
                {proposal.priority === 'urgent' && (
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                    URGENT
                  </span>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {showProgressBars && (
              <div className="mb-4">
                <VotingProgressBar progress={proposal.votingProgress} />
              </div>
            )}

            {/* Vote Button */}
            <VoteWithWalletButton
              proposalId={proposal.id}
              userHasVoted={proposal.userHasVoted}
              userVotingPower={userVotingPower}
              onVoteClick={onVoteClick}
              priority={proposal.priority}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
          View All Proposals →
        </button>
      </div>
    </div>
  );
};

export default ExpandedGovernanceWidget;