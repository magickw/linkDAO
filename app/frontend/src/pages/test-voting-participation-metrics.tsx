import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import GovernanceWidget from '../components/Community/GovernanceWidget';
import VotingParticipationMetrics from '../components/Community/VotingParticipationMetrics';
import { governanceService } from '../services/governanceService';
import { 
  Proposal, 
  ProposalStatus, 
  ProposalCategory, 
  VoteChoice,
  ParticipationMetrics 
} from '../types/governance';

const TestVotingParticipationMetricsPage: NextPage = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [participationMetrics, setParticipationMetrics] = useState<ParticipationMetrics | null>(null);
  const [userVotingPower, setUserVotingPower] = useState(250.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mockCommunityId = 'test-community-1';
  const mockUserAddress = '0x1234567890123456789012345678901234567890';

  useEffect(() => {
    loadTestData();
  }, []);

  const loadTestData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load proposals
      const proposalsData = await governanceService.getCommunityProposals(mockCommunityId);
      setProposals(proposalsData);

      // Load participation metrics
      const metricsData = await governanceService.getParticipationMetrics(mockCommunityId, mockUserAddress);
      setParticipationMetrics(metricsData);

      // Load user voting power
      const votingPower = await governanceService.getUserVotingPower(mockCommunityId, mockUserAddress);
      setUserVotingPower(votingPower);

    } catch (err) {
      setError('Failed to load test data');
      console.error('Error loading test data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (proposalId: string, choice: VoteChoice) => {
    try {
      const result = await governanceService.voteOnProposal(proposalId, choice, userVotingPower);
      if (result.success) {
        // Update the proposal with user's vote
        setProposals(prev => prev.map(p => 
          p.id === proposalId 
            ? { ...p, userVote: choice, canVote: false }
            : p
        ));
        
        // Reload participation metrics to reflect the new vote
        const updatedMetrics = await governanceService.getParticipationMetrics(mockCommunityId, mockUserAddress);
        setParticipationMetrics(updatedMetrics);
      } else {
        alert(`Voting failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error voting:', error);
      alert('Voting failed');
    }
  };

  const handleViewProposal = (proposalId: string) => {
    alert(`Viewing proposal: ${proposalId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Voting Participation Metrics Test
          </h1>
          <p className="text-gray-600">
            Testing enhanced governance widget with detailed participation metrics
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Governance Widget */}
          <div className="lg:col-span-2">
            <GovernanceWidget
              activeProposals={proposals}
              userVotingPower={userVotingPower}
              participationRate={participationMetrics?.currentParticipationRate || 75.5}
              participationMetrics={participationMetrics || undefined}
              onVote={handleVote}
              onViewProposal={handleViewProposal}
              loading={false}
              error={null}
            />
          </div>

          {/* Standalone Participation Metrics */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Participation Metrics
              </h3>
              
              <VotingParticipationMetrics
                communityId={mockCommunityId}
                userAddress={mockUserAddress}
                participationMetrics={participationMetrics || undefined}
                showHistoricalData={true}
              />
            </div>

            {/* Test Controls */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Test Controls</h3>
              
              <div className="space-y-3">
                <button
                  onClick={loadTestData}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Refresh Data
                </button>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Community ID: {mockCommunityId}</div>
                  <div>User Address: {mockUserAddress.slice(0, 10)}...</div>
                  <div>Voting Power: {userVotingPower.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Metrics Summary */}
            {participationMetrics && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Metrics Summary</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Rate:</span>
                    <span className="font-medium">{participationMetrics.currentParticipationRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Voters:</span>
                    <span className="font-medium">{participationMetrics.totalVoters.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Eligible:</span>
                    <span className="font-medium">{participationMetrics.eligibleVoters.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Your Weight:</span>
                    <span className="font-medium">{participationMetrics.userVotingWeightPercentage.toFixed(3)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trend:</span>
                    <span className={`font-medium capitalize ${
                      participationMetrics.participationTrend === 'increasing' ? 'text-green-600' :
                      participationMetrics.participationTrend === 'decreasing' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {participationMetrics.participationTrend}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Requirements Validation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-4">Requirements Validation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center text-green-700">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                18.1: Current participation rates displayed
              </div>
              <div className="flex items-center text-green-700">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                18.2: User voting weight shown
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-green-700">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                18.3: Percentage of eligible voters displayed
              </div>
              <div className="flex items-center text-green-700">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                18.4: Historical participation data implemented
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestVotingParticipationMetricsPage;