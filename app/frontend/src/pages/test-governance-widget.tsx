import React, { useState, useEffect } from 'react';
import { GovernanceWidget } from '../components/Community';
import { governanceService } from '../services/governanceService';
import { Proposal, VoteChoice } from '../types/governance';

const TestGovernanceWidget: React.FC = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [userVotingPower, setUserVotingPower] = useState<number>(0);
  const [participationRate, setParticipationRate] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Mock community and user data
  const communityId = 'test-community';
  const userAddress = '0x1234567890123456789012345678901234567890';

  useEffect(() => {
    loadGovernanceData();
  }, []);

  const loadGovernanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load proposals, voting power, and participation rate in parallel
      const [proposalsData, votingPower, participation] = await Promise.all([
        governanceService.getCommunityProposals(communityId),
        governanceService.getUserVotingPower(communityId, userAddress),
        governanceService.getCommunityParticipationRate(communityId)
      ]);

      setProposals(proposalsData);
      setUserVotingPower(votingPower);
      setParticipationRate(participation);
    } catch (err) {
      console.error('Error loading governance data:', err);
      setError('Failed to load governance data');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (proposalId: string, choice: VoteChoice) => {
    try {
      console.log(`Voting ${choice} on proposal ${proposalId}`);
      
      const result = await governanceService.voteOnProposal(proposalId, choice, userVotingPower);
      
      if (result.success) {
        console.log('Vote successful:', result.transactionHash);
        
        // Update the proposal to reflect the vote
        setProposals(prev => prev.map(proposal => 
          proposal.id === proposalId 
            ? { ...proposal, userVote: choice, canVote: false }
            : proposal
        ));
        
        // Show success message
        alert(`Vote cast successfully! Transaction: ${result.transactionHash}`);
      } else {
        console.error('Vote failed:', result.error);
        alert(`Vote failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error voting:', error);
      alert('An error occurred while voting');
    }
  };

  const handleViewProposal = (proposalId: string) => {
    console.log(`Viewing proposal details for: ${proposalId}`);
    alert(`Opening proposal details for: ${proposalId}`);
  };

  const handleRefresh = () => {
    loadGovernanceData();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Governance Widget Test Page
          </h1>
          <p className="text-gray-600 mb-4">
            This page demonstrates the GovernanceWidget component with mock data and functionality.
          </p>
          
          <div className="flex space-x-4 mb-6">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh Data
            </button>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Community: {communityId}</span>
              <span>User: {userAddress.slice(0, 10)}...</span>
              <span>Voting Power: {userVotingPower.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Community Posts Feed (Mock)
              </h2>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900">Mock Post {i}</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      This is a mock post to show the layout context for the governance widget.
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>2 hours ago</span>
                      <span>15 comments</span>
                      <span>42 upvotes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar with Governance Widget */}
          <div className="space-y-6">
            <GovernanceWidget
              activeProposals={proposals}
              userVotingPower={userVotingPower}
              participationRate={participationRate}
              onVote={handleVote}
              onViewProposal={handleViewProposal}
              loading={loading}
              error={error}
            />

            {/* Additional Mock Widgets */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">About Community</h3>
              <p className="text-sm text-gray-600 mb-3">
                This is a test community for demonstrating the governance widget functionality.
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <div>Created: Jan 2024</div>
                <div>Members: 1,234</div>
                <div>Online: 56</div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Community Stats</h3>
              <div className="text-xs text-gray-500 space-y-1">
                <div>Posts this week: 23</div>
                <div>Active discussions: 8</div>
                <div>Growth rate: +12%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Information */}
        <div className="mt-8 bg-gray-100 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Debug Information</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <div>Loading: {loading ? 'Yes' : 'No'}</div>
            <div>Error: {error || 'None'}</div>
            <div>Proposals loaded: {proposals.length}</div>
            <div>Active proposals: {proposals.filter(p => p.status === 'active').length}</div>
            <div>User voting power: {userVotingPower.toFixed(2)}</div>
            <div>Participation rate: {participationRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestGovernanceWidget;