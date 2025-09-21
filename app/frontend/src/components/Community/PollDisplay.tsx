import React, { useState, useEffect } from 'react';
import { PollResult, PollOptionResult, UserVoteResult } from '@/types/poll';
import { usePollVoting } from '@/hooks/usePollVoting';
import { formatDistanceToNow } from 'date-fns';

interface PollDisplayProps {
  poll: PollResult;
  onVote?: (optionIds: string[], tokenAmount?: number) => Promise<void>;
  className?: string;
  showResults?: boolean;
  disabled?: boolean;
}

export const PollDisplay: React.FC<PollDisplayProps> = ({
  poll,
  onVote,
  className = '',
  showResults = false,
  disabled = false
}) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [tokenAmount, setTokenAmount] = useState<number>(1);
  const [isVoting, setIsVoting] = useState(false);
  const [showResultsState, setShowResultsState] = useState(showResults);

  // Show results if poll is expired, user has voted, or explicitly requested
  const shouldShowResults = showResultsState || poll.isExpired || poll.userVote;

  useEffect(() => {
    // Pre-select user's previous votes if they exist
    if (poll.userVote) {
      setSelectedOptions(poll.userVote.optionIds);
      setTokenAmount(poll.userVote.tokenAmount);
    } else if (poll.tokenWeighted && poll.minTokens > 0) {
      // Set initial token amount to minimum required
      setTokenAmount(poll.minTokens);
    }
  }, [poll.userVote, poll.tokenWeighted, poll.minTokens]);

  const handleOptionSelect = (optionId: string) => {
    if (disabled || poll.isExpired || poll.userVote) return;

    if (poll.allowMultiple) {
      setSelectedOptions(prev => 
        prev.includes(optionId) 
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const handleVote = async () => {
    if (!onVote || selectedOptions.length === 0 || isVoting) return;

    setIsVoting(true);
    try {
      await onVote(selectedOptions, poll.tokenWeighted ? tokenAmount : undefined);
      setShowResultsState(true);
    } catch (error) {
      console.error('Error voting:', error);
      // Handle error (show toast, etc.)
    } finally {
      setIsVoting(false);
    }
  };

  const getOptionPercentage = (option: PollOptionResult) => {
    if (poll.tokenWeighted && poll.totalTokenVotes > 0) {
      return option.tokenPercentage;
    }
    return option.percentage;
  };

  const getOptionVotes = (option: PollOptionResult) => {
    if (poll.tokenWeighted) {
      return `${option.tokenVotes} tokens`;
    }
    return `${option.votes} vote${option.votes !== 1 ? 's' : ''}`;
  };

  const isOptionSelected = (optionId: string) => selectedOptions.includes(optionId);
  const isOptionUserVoted = (optionId: string) => poll.userVote?.optionIds.includes(optionId);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      {/* Poll Question */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          📊 {poll.question}
        </h3>
        
        {/* Poll Metadata */}
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>
            {poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}
          </span>
          {poll.tokenWeighted && (
            <span>
              {poll.totalTokenVotes} tokens
            </span>
          )}
          {poll.expiresAt && (
            <span className={poll.isExpired ? 'text-red-500' : ''}>
              {poll.isExpired ? 'Expired' : `Expires ${formatDistanceToNow(poll.expiresAt, { addSuffix: true })}`}
            </span>
          )}
          {poll.allowMultiple && (
            <span className="text-blue-500">Multiple choice</span>
          )}
        </div>
      </div>

      {/* Token Amount Input (for token-weighted polls) */}
      {poll.tokenWeighted && !shouldShowResults && !poll.userVote && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Token Amount {poll.minTokens > 0 && `(min: ${poll.minTokens})`}
          </label>
          <input
            type="number"
            min={poll.minTokens}
            value={tokenAmount}
            onChange={(e) => {
              const value = parseInt(e.target.value) || poll.minTokens;
              setTokenAmount(Math.max(poll.minTokens, value));
            }}
            className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            disabled={disabled}
          />
        </div>
      )}

      {/* Poll Options */}
      <div className="space-y-3">
        {poll.options.map((option) => {
          const percentage = getOptionPercentage(option);
          const votes = getOptionVotes(option);
          const selected = isOptionSelected(option.id);
          const userVoted = isOptionUserVoted(option.id);

          return (
            <div key={option.id} className="relative">
              {shouldShowResults ? (
                // Results View
                <div className="relative">
                  <div 
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      userVoted 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {userVoted && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                      <span className="text-gray-900 dark:text-white font-medium">
                        {option.text}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {percentage.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {votes}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="absolute bottom-0 left-0 h-1 bg-blue-500 rounded-b-lg transition-all duration-500"
                       style={{ width: `${percentage}%` }} />
                </div>
              ) : (
                // Voting View
                <button
                  onClick={() => handleOptionSelect(option.id)}
                  disabled={disabled || poll.isExpired}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    selected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                  } ${disabled || poll.isExpired ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                    selected 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selected && (
                      <div className="w-full h-full rounded-full bg-white scale-50" />
                    )}
                  </div>
                  <span className="text-gray-900 dark:text-white font-medium text-left">
                    {option.text}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      {!shouldShowResults && !poll.userVote && !poll.isExpired && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowResultsState(true)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            View results
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={handleVote}
              disabled={selectedOptions.length === 0 || isVoting || disabled}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isVoting ? 'Voting...' : 'Vote'}
            </button>
          </div>
        </div>
      )}

      {/* Results Toggle */}
      {shouldShowResults && !poll.isExpired && (
        <div className="flex justify-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowResultsState(false)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Hide results
          </button>
        </div>
      )}

      {/* User Vote Indicator */}
      {poll.userVote && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            You voted {formatDistanceToNow(poll.userVote.votedAt, { addSuffix: true })}
            {poll.tokenWeighted && ` with ${poll.userVote.tokenAmount} tokens`}
          </div>
        </div>
      )}
    </div>
  );
};