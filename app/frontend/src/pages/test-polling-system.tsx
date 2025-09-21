import React, { useState, useEffect } from 'react';
import { PollDisplay } from '@/components/Community/PollDisplay';
import { PollCreator } from '@/components/EnhancedPostComposer/PollCreator';
import { pollService } from '@/services/pollService';
import { usePollVoting } from '@/hooks/usePollVoting';
import { PollResult, CreatePollInput } from '@/types/poll';
import { PollData } from '@/types/enhancedPost';

export default function TestPollingSystem() {
  const [polls, setPolls] = useState<PollResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [pollData, setPollData] = useState<PollData | undefined>();
  const [testPostId] = useState(1); // Mock post ID for testing

  const { vote, isVoting, error: votingError } = usePollVoting();

  // Load test polls
  useEffect(() => {
    loadTestPolls();
  }, []);

  const loadTestPolls = async () => {
    setLoading(true);
    try {
      // Try to load some existing polls
      const expiring = await pollService.getExpiringSoonPolls(168); // 1 week
      setPolls(expiring);
    } catch (err) {
      console.error('Error loading polls:', err);
      setError(err instanceof Error ? err.message : 'Failed to load polls');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePoll = async () => {
    if (!pollData || !pollData.question || pollData.options.length < 2) {
      setError('Please provide a question and at least 2 options');
      return;
    }

    setLoading(true);
    try {
      const input: CreatePollInput = {
        postId: testPostId,
        question: pollData.question,
        options: pollData.options.map(opt => opt.text).filter(text => text.trim()),
        allowMultiple: pollData.allowMultiple,
        tokenWeighted: pollData.tokenWeighted,
        minTokens: pollData.minTokens,
        expiresAt: pollData.endDate,
      };

      const pollId = await pollService.createPoll(input);
      const newPoll = await pollService.getPollById(pollId);
      
      if (newPoll) {
        setPolls(prev => [newPoll, ...prev]);
        setShowCreator(false);
        setPollData(undefined);
        setError(null);
      }
    } catch (err) {
      console.error('Error creating poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to create poll');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId: string, optionIds: string[], tokenAmount?: number) => {
    const updatedPoll = await vote(pollId, optionIds, tokenAmount);
    if (updatedPoll) {
      setPolls(prev => prev.map(p => p.id === pollId ? updatedPoll : p));
    }
  };

  const createSamplePolls = async () => {
    const samplePolls: CreatePollInput[] = [
      {
        postId: testPostId,
        question: "What's your favorite blockchain for DeFi?",
        options: ["Ethereum", "Polygon", "Arbitrum", "Optimism"],
        allowMultiple: false,
        tokenWeighted: true,
        minTokens: 10,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      },
      {
        postId: testPostId + 1,
        question: "Which features should we prioritize next?",
        options: ["Mobile app", "NFT marketplace", "Governance tools", "Analytics dashboard"],
        allowMultiple: true,
        tokenWeighted: false,
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      },
      {
        postId: testPostId + 2,
        question: "How often do you use DeFi protocols?",
        options: ["Daily", "Weekly", "Monthly", "Rarely", "Never"],
        allowMultiple: false,
        tokenWeighted: false,
      },
    ];

    setLoading(true);
    try {
      const createdPolls: PollResult[] = [];
      for (const pollInput of samplePolls) {
        const pollId = await pollService.createPoll(pollInput);
        const poll = await pollService.getPollById(pollId);
        if (poll) {
          createdPolls.push(poll);
        }
      }
      setPolls(prev => [...createdPolls, ...prev]);
      setError(null);
    } catch (err) {
      console.error('Error creating sample polls:', err);
      setError(err instanceof Error ? err.message : 'Failed to create sample polls');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            📊 Quick Polling System Test
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Test the complete polling functionality: creation, voting, real-time results, and expiration handling.
          </p>
        </div>

        {/* Error Display */}
        {(error || votingError) && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300">
              {error || votingError}
            </p>
            <button
              onClick={() => {
                setError(null);
              }}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="mb-8 flex flex-wrap gap-4 justify-center">
          <button
            onClick={() => setShowCreator(!showCreator)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            {showCreator ? 'Hide Creator' : 'Create Poll'}
          </button>
          
          <button
            onClick={createSamplePolls}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            Create Sample Polls
          </button>
          
          <button
            onClick={loadTestPolls}
            disabled={loading}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            Refresh Polls
          </button>
        </div>

        {/* Poll Creator */}
        {showCreator && (
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Create New Poll
            </h2>
            
            <PollCreator
              poll={pollData}
              onPollChange={setPollData}
              disabled={loading}
            />
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCreatePoll}
                disabled={loading || !pollData?.question || (pollData?.options?.length || 0) < 2}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Creating...' : 'Create Poll'}
              </button>
              
              <button
                onClick={() => {
                  setShowCreator(false);
                  setPollData(undefined);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        )}

        {/* Polls List */}
        <div className="space-y-6">
          {polls.length === 0 && !loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                No polls found. Create some sample polls to get started!
              </p>
            </div>
          ) : (
            polls.map((poll) => (
              <div key={poll.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <span>Poll ID: {poll.id}</span>
                    <span>•</span>
                    <span>Post ID: {poll.postId}</span>
                  </div>
                </div>
                
                <PollDisplay
                  poll={poll}
                  onVote={(optionIds, tokenAmount) => handleVote(poll.id, optionIds, tokenAmount)}
                  disabled={isVoting}
                />
              </div>
            ))
          )}
        </div>

        {/* Feature Overview */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            🚀 Polling System Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">📝 Poll Creation</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Custom questions and options</li>
                <li>• Multiple choice support</li>
                <li>• Token-weighted voting</li>
                <li>• Expiration date settings</li>
                <li>• Minimum token requirements</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🗳️ Voting System</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• One vote per user restriction</li>
                <li>• Real-time result updates</li>
                <li>• Token amount specification</li>
                <li>• Vote history tracking</li>
                <li>• Immediate visual feedback</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">📊 Results Display</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Percentage calculations</li>
                <li>• Progress bar visualization</li>
                <li>• Vote count display</li>
                <li>• User vote indicators</li>
                <li>• Expiration status</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}