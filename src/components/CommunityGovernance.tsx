import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import { communityWeb3Service, CommunityGovernanceProposal } from '@/services/communityWeb3Service';
import { Community } from '@/models/Community';

interface CommunityGovernanceProps {
  community: Community;
  className?: string;
}

export default function CommunityGovernance({ community, className = '' }: CommunityGovernanceProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();

  const [proposals, setProposals] = useState<CommunityGovernanceProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingPower, setVotingPower] = useState<string>('0');
  const [showCreateProposal, setShowCreateProposal] = useState(false);
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: ''
  });
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [votingOnProposal, setVotingOnProposal] = useState<string | null>(null);

  // Load proposals and voting power
  useEffect(() => {
    loadGovernanceData();
  }, [community.id, address]);

  const loadGovernanceData = async () => {
    try {
      setLoading(true);
      
      // Load proposals
      const proposalsData = await communityWeb3Service.getCommunityProposals(community.id);
      setProposals(proposalsData);
      
      // Load user's voting power if connected
      if (address) {
        const power = await communityWeb3Service.getVotingPower(community.id, address);
        setVotingPower(power);
      }
    } catch (error) {
      console.error('Error loading governance data:', error);
      addToast('Failed to load governance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      addToast('Please connect your wallet to create proposals', 'error');
      return;
    }

    if (!newProposal.title.trim() || !newProposal.description.trim()) {
      addToast('Please fill in all fields', 'error');
      return;
    }

    try {
      setSubmittingProposal(true);
      
      const proposalId = await communityWeb3Service.createGovernanceProposal(
        community.id,
        newProposal.title,
        newProposal.description,
        [] // No actions for now
      );
      
      addToast('Proposal created successfully!', 'success');
      setNewProposal({ title: '', description: '' });
      setShowCreateProposal(false);
      
      // Reload proposals
      await loadGovernanceData();
    } catch (error) {
      console.error('Error creating proposal:', error);
      addToast('Failed to create proposal', 'error');
    } finally {
      setSubmittingProposal(false);
    }
  };

  const handleVote = async (proposalId: string, support: boolean) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to vote', 'error');
      return;
    }

    try {
      setVotingOnProposal(proposalId);
      
      const txHash = await communityWeb3Service.voteOnProposal(proposalId, support, votingPower);
      
      addToast(`Vote cast successfully! Transaction: ${txHash.slice(0, 10)}...`, 'success');
      
      // Reload proposals to update vote counts
      await loadGovernanceData();
    } catch (error) {
      console.error('Error voting:', error);
      addToast('Failed to cast vote', 'error');
    } finally {
      setVotingOnProposal(null);
    }
  };

  const getProposalStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'passed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const formatVotes = (votes: string) => {
    const num = parseFloat(votes);
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toFixed(1);
  };

  const calculateVotePercentage = (forVotes: string, againstVotes: string) => {
    const total = parseFloat(forVotes) + parseFloat(againstVotes);
    if (total === 0) return 50;
    return (parseFloat(forVotes) / total) * 100;
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Community Governance
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Participate in community decision making
            </p>
          </div>
          
          {isConnected && (
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">Your Voting Power</div>
              <div className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                {formatVotes(votingPower)} {community.governanceToken || 'VOTES'}
              </div>
            </div>
          )}
        </div>

        {isConnected && (
          <button
            onClick={() => setShowCreateProposal(true)}
            className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
          >
            Create Proposal
          </button>
        )}
      </div>

      {/* Create Proposal Modal */}
      {showCreateProposal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create New Proposal
            </h4>
            
            <form onSubmit={handleCreateProposal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={newProposal.title}
                  onChange={(e) => setNewProposal(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter proposal title"
                  disabled={submittingProposal}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newProposal.description}
                  onChange={(e) => setNewProposal(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  placeholder="Describe your proposal in detail"
                  disabled={submittingProposal}
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={submittingProposal}
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingProposal ? 'Creating...' : 'Create Proposal'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateProposal(false)}
                  disabled={submittingProposal}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proposals List */}
      <div className="p-6">
        {proposals.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <p>No governance proposals yet</p>
            <p className="text-sm mt-1">Be the first to create a proposal!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal) => (
              <div
                key={proposal.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
              >
                {/* Proposal Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {proposal.title}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      by {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
                    </p>
                  </div>
                  
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProposalStatusColor(proposal.status)}`}>
                    {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                  </span>
                </div>

                {/* Proposal Description */}
                <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                  {proposal.description}
                </p>

                {/* Vote Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>For: {formatVotes(proposal.forVotes)}</span>
                    <span>Against: {formatVotes(proposal.againstVotes)}</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${calculateVotePercentage(proposal.forVotes, proposal.againstVotes)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>Quorum: {formatVotes(proposal.quorum)}</span>
                    <span>
                      Ends: {new Date(proposal.endTime).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Voting Buttons */}
                {isConnected && proposal.status === 'active' && (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleVote(proposal.id, true)}
                      disabled={votingOnProposal === proposal.id}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {votingOnProposal === proposal.id ? 'Voting...' : 'Vote For'}
                    </button>
                    <button
                      onClick={() => handleVote(proposal.id, false)}
                      disabled={votingOnProposal === proposal.id}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {votingOnProposal === proposal.id ? 'Voting...' : 'Vote Against'}
                    </button>
                  </div>
                )}

                {!isConnected && proposal.status === 'active' && (
                  <div className="text-center py-2 text-sm text-gray-500 dark:text-gray-400">
                    Connect your wallet to vote
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}