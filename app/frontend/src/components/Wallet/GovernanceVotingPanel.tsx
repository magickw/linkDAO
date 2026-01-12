/**
 * Governance Voting Panel Component
 * Displays governance proposals and voting interface
 */

import React, { useState } from 'react';
import { Vote, CheckCircle, XCircle, Clock, TrendingUp, Users, Calendar } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface Proposal {
  id: number;
  title: string;
  description: string;
  status: 'active' | 'passed' | 'rejected' | 'pending';
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  endTime: Date;
  userVote?: 'for' | 'against' | 'abstain';
}

interface GovernanceVotingPanelProps {
  votingPower?: number;
  className?: string;
}

export const GovernanceVotingPanel: React.FC<GovernanceVotingPanelProps> = ({
  votingPower = 0,
  className = '',
}) => {
  const { addToast } = useToast();
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  // Mock proposals - in production, this would come from the governance contract
  const proposals: Proposal[] = [
    {
      id: 1,
      title: 'Increase Staking Rewards to 15% APY',
      description:
        'Proposal to increase the base staking rewards from 12% to 15% APY for all tiers to attract more stakers.',
      status: 'active',
      votesFor: 45000,
      votesAgainst: 12000,
      totalVotes: 57000,
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: 2,
      title: 'Add Polygon Network Support',
      description:
        'Proposal to add Polygon network support for LDAO token and staking contracts.',
      status: 'active',
      votesFor: 32000,
      votesAgainst: 5000,
      totalVotes: 37000,
      endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: 3,
      title: 'Community Treasury Allocation',
      description:
        'Proposal to allocate 100,000 LDAO tokens from treasury to community development grants.',
      status: 'passed',
      votesFor: 78000,
      votesAgainst: 2000,
      totalVotes: 80000,
      endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ];

  const handleVote = async (proposalId: number, vote: 'for' | 'against' | 'abstain') => {
    if (votingPower === 0) {
      addToast('You need LDAO tokens to vote', 'error');
      return;
    }

    try {
      // This would call the governance contract to cast a vote
      addToast(`Voted ${vote} on proposal #${proposalId}`, 'success');
      setSelectedProposal(null);
    } catch (error: any) {
      addToast(`Failed to vote: ${error.message}`, 'error');
    }
  };

  const getStatusBadge = (status: Proposal['status']) => {
    const styles = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200',
      passed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
    };

    const icons = {
      active: <Clock className="w-3 h-3" />,
      passed: <CheckCircle className="w-3 h-3" />,
      rejected: <XCircle className="w-3 h-3" />,
      pending: <Clock className="w-3 h-3" />,
    };

    return (
      <span
        className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {icons[status]}
        <span className="capitalize">{status}</span>
      </span>
    );
  };

  const calculateVotePercentage = (votes: number, total: number): number => {
    return total > 0 ? (votes / total) * 100 : 0;
  };

  const getTimeRemaining = (endTime: Date): string => {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Voting Power Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Your Voting Power</h3>
          <Vote className="w-6 h-6" />
        </div>
        <div className="flex items-baseline space-x-2">
          <p className="text-4xl font-bold">{votingPower.toLocaleString()}</p>
          <p className="text-lg text-indigo-100">LDAO</p>
        </div>
        <p className="text-sm text-indigo-100 mt-2">
          {votingPower > 0
            ? 'You can vote on active proposals'
            : 'Stake LDAO tokens to gain voting power'}
        </p>
      </div>

      {/* Governance Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Proposals</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {proposals.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active Proposals</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {proposals.filter((p) => p.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Proposals
          </h3>
          <button
            onClick={() => {
              // Open create proposal modal
              addToast('Create proposal feature coming soon', 'info');
            }}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            Create Proposal
          </button>
        </div>

        <div className="space-y-3">
          {proposals.map((proposal) => (
            <div
              key={proposal.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer"
              onClick={() => setSelectedProposal(proposal)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      #{proposal.id} {proposal.title}
                    </h4>
                    {getStatusBadge(proposal.status)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {proposal.description}
                  </p>
                </div>
              </div>

              {/* Voting Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    {proposal.votesFor.toLocaleString()} For
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {calculateVotePercentage(proposal.votesFor, proposal.totalVotes).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${calculateVotePercentage(
                        proposal.votesFor,
                        proposal.totalVotes
                      )}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    {proposal.votesAgainst.toLocaleString()} Against
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {calculateVotePercentage(
                      proposal.votesAgainst,
                      proposal.totalVotes
                    ).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${calculateVotePercentage(
                        proposal.votesAgainst,
                        proposal.totalVotes
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                  <Calendar className="w-3 h-3" />
                  <span>{getTimeRemaining(proposal.endTime)}</span>
                </div>
                {proposal.userVote && (
                  <div className="flex items-center space-x-1 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Your vote:</span>
                    <span
                      className={`font-medium ${
                        proposal.userVote === 'for'
                          ? 'text-green-600 dark:text-green-400'
                          : proposal.userVote === 'against'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {proposal.userVote}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Proposal Details Modal */}
      {selectedProposal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  #{selectedProposal.id} {selectedProposal.title}
                </h3>
                {getStatusBadge(selectedProposal.status)}
              </div>
              <button
                onClick={() => setSelectedProposal(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Description
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                {selectedProposal.description}
              </p>
            </div>

            {/* Voting Details */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Current Votes
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="font-semibold text-green-800 dark:text-green-200">
                      For
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                    {selectedProposal.votesFor.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {calculateVotePercentage(
                      selectedProposal.votesFor,
                      selectedProposal.totalVotes
                    ).toFixed(1)}%
                  </p>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span className="font-semibold text-red-800 dark:text-red-200">
                      Against
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-red-800 dark:text-red-200">
                    {selectedProposal.votesAgainst.toLocaleString()}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {calculateVotePercentage(
                      selectedProposal.votesAgainst,
                      selectedProposal.totalVotes
                    ).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Time Remaining */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Time Remaining
                  </span>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {getTimeRemaining(selectedProposal.endTime)}
                </span>
              </div>
            </div>

            {/* Vote Buttons */}
            {selectedProposal.status === 'active' && votingPower > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Cast your vote ({votingPower.toLocaleString()} voting power)
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleVote(selectedProposal.id, 'for')}
                    className="py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-all"
                  >
                    Vote For
                  </button>
                  <button
                    onClick={() => handleVote(selectedProposal.id, 'against')}
                    className="py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-all"
                  >
                    Vote Against
                  </button>
                  <button
                    onClick={() => handleVote(selectedProposal.id, 'abstain')}
                    className="py-3 bg-gray-500 text-white font-semibold rounded-xl hover:bg-gray-600 transition-all"
                  >
                    Abstain
                  </button>
                </div>
              </div>
            )}

            {selectedProposal.status === 'active' && votingPower === 0 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-center">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  You need LDAO tokens to vote on this proposal
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};