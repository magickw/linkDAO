import { useState, useCallback } from 'react';
import { pollService } from '@/services/pollService';
import { PollResult, PollVoteInput } from '@/types/poll';

interface UsePollVotingReturn {
  isVoting: boolean;
  error: string | null;
  vote: (pollId: string, optionIds: string[], tokenAmount?: number) => Promise<PollResult | null>;
  clearError: () => void;
}

export const usePollVoting = (): UsePollVotingReturn => {
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vote = useCallback(async (
    pollId: string, 
    optionIds: string[], 
    tokenAmount?: number
  ): Promise<PollResult | null> => {
    setIsVoting(true);
    setError(null);

    try {
      const input: PollVoteInput = {
        pollId,
        optionIds,
        tokenAmount,
      };

      const updatedPoll = await pollService.voteOnPoll(input);
      return updatedPoll;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to vote on poll';
      setError(errorMessage);
      return null;
    } finally {
      setIsVoting(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isVoting,
    error,
    vote,
    clearError,
  };
};