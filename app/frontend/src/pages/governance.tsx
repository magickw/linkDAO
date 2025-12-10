import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { useAccount } from 'wagmi';
import { useToast } from '@/context/ToastContext';
import { governanceService } from '@/services/governanceService';
import { aiGovernanceService, AIProposalAnalysis } from '@/services/aiGovernanceService';
import { Proposal } from '@/types/governance';
import { GovernanceErrorBoundary } from '@/components/ErrorHandling/GovernanceErrorBoundary';
import {
  useProposalCount,
  useAllProposals as useContractProposals,
  useVotingPower,
  useCreateProposal as useCreateProposalContract
} from '@/hooks/useGovernanceContract';
import { ProposalCardSkeleton } from '@/components/LoadingSkeletons/GovernanceSkeleton';
import DelegationPanel from '@/components/Governance/DelegationPanel';
import SEOHead from '@/components/SEO/SEOHead';
import { ProposalCreator } from '@/components/EnhancedPostComposer/ProposalCreator';
import { ProposalData } from '@/types/enhancedPost';
import { CharityProposalForm, CharityProposalData } from '@/components/Governance/CharityProposalForm';
import { CharityProposalCard, CharityProposal } from '@/components/Governance/CharityProposalCard';
import { EnhancedProposalCard } from '@/components/Governance/EnhancedProposalCard';
import { ethers } from 'ethers';



function GovernanceContent() {
  const { address, isConnected } = useAccount();
  const { addToast } = useToast();
  const { proposalCount, isLoading: isCountLoading, refetch: refetchProposalCount } = useProposalCount();
  const { proposalIds, isLoading: isProposalsLoading } = useContractProposals();
  const { votingPower, isLoading: isVotingPowerLoading } = useVotingPower(address);
  const { createProposal: createContractProposal, isLoading: isCreatingProposal, isSuccess: isProposalCreated } = useCreateProposalContract();

  const [activeTab, setActiveTab] = useState<'active' | 'ended' | 'create' | 'delegation' | 'charity'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [proposalAnalyses, setProposalAnalyses] = useState<Record<string, AIProposalAnalysis>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isProposing, setIsProposing] = useState(false);
  const [proposalData, setProposalData] = useState<ProposalData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [charityProposals, setCharityProposals] = useState<CharityProposal[]>([]);
  const [charityView, setCharityView] = useState<'list' | 'create'>('list');
  const [isSubmittingCharity, setIsSubmittingCharity] = useState(false);

  // Load proposals from contract
  const loadProposals = useCallback(async () => {
    try {
      // Use contract proposals directly
      const contractProposals: Proposal[] = [];
      if (proposalIds && proposalIds.length > 0) {
        for (const proposalId of proposalIds) {
          try {
            const proposal = await governanceService.getProposal(proposalId.toString());
            if (proposal) {
              contractProposals.push(proposal);
            }
          } catch (error) {
            console.error(`Failed to load proposal ${proposalId}:`, error);
          }
        }
      }
      setProposals(contractProposals);

      // Get AI analysis for each proposal
      const analyses: Record<string, AIProposalAnalysis> = {};
      for (const proposal of contractProposals) {
        try {
          const analysis = await aiGovernanceService.analyzeProposal(proposal);
          analyses[proposal.id] = analysis;
        } catch (error) {
          console.error(`Failed to analyze proposal ${proposal.id}:`, error);
        }
      }
      setProposalAnalyses(analyses);
    } catch (error) {
      console.error('Failed to load proposals:', error);
      addToast('Failed to load governance proposals', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, addToast, proposalIds, isProposalsLoading]);

  useEffect(() => {
    if (isConnected && !isProposalsLoading) {
      loadProposals();
    } else {
      setIsLoading(false);
    }
  }, [isConnected, isProposalsLoading, loadProposals]);

  // Handle proposal creation
  const handleCreateProposal = async () => {
    if (!proposalData || !address) {
      addToast('Please fill in all proposal fields', 'error');
      return;
    }

    if (!proposalData.title || !proposalData.description) {
      addToast('Title and description are required', 'error');
      return;
    }

    try {
      setIsSubmitting(true);

      // Create proposal directly via smart contract
      await createContractProposal(
        proposalData.description,
        0, // category: governance = 0
        '0x' // execution data
      );

      addToast('Proposal transaction submitted!', 'success');

      // Reset form
      setProposalData(null);

      // Switch to active tab to see the new proposal
      setActiveTab('active');
    } catch (error) {
      console.error('Error creating proposal:', error);
      addToast(error instanceof Error ? error.message : 'Failed to create proposal', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Refresh proposals when contract state changes
  useEffect(() => {
    if (isProposalCreated) {
      loadProposals();
    }
  }, [isProposalCreated, loadProposals]);

  // Handle charity proposal creation
  const handleCreateCharityProposal = async (charityData: CharityProposalData) => {
    if (!address) {
      addToast('Please connect your wallet', 'error');
      return;
    }

    try {
      setIsSubmittingCharity(true);

      // For now, create a mock charity proposal
      // In production, this would call the CharityGovernance smart contract
      const mockProposal: CharityProposal = {
        id: `charity-${Date.now()}`,
        title: charityData.title,
        description: charityData.description,
        charityName: charityData.charityName,
        charityRecipient: charityData.charityAddress,
        donationAmount: ethers.parseUnits(charityData.donationAmount, 18).toString(),
        charityDescription: charityData.charityDescription,
        proofOfVerification: charityData.proofOfVerification,
        impactMetrics: charityData.impactMetrics,
        isVerifiedCharity: false,
        forVotes: '0',
        againstVotes: '0',
        abstainVotes: '0',
        status: 'active',
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        proposer: address
      };

      setCharityProposals(prev => [mockProposal, ...prev]);
      addToast('Charity proposal created successfully!', 'success');
      setCharityView('list');

    } catch (error) {
      console.error('Error creating charity proposal:', error);
      addToast(error instanceof Error ? error.message : 'Failed to create charity proposal', 'error');
    } finally {
      setIsSubmittingCharity(false);
    }
  };

  // Filter proposals based on active tab and search
  const filteredProposals = proposals.filter(proposal => {
    const matchesTab = activeTab === 'active'
      ? proposal.status === 'active'
      : activeTab === 'ended'
        ? ['passed', 'rejected'].includes(proposal.status)
        : true;

    const matchesSearch = searchTerm === '' ||
      proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.description.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  if (!isConnected) {
    return (
      <Layout title="Governance - LinkDAO" fullWidth={true}>
        <SEOHead
          title="Governance - LinkDAO"
          description="Participate in decentralized governance and shape the future of the platform. Create proposals, vote on decisions, and earn rewards through DAO participation."
          keywords="Web3, governance, DAO, voting, proposals, decentralized, blockchain, cryptocurrency"
          url="https://linkdao.io/governance"
          type="website"
        />
        <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Connect to Governance
            </h1>
            <p className="text-gray-600 dark:text-gray-300">Please connect your wallet to participate in governance.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Governance - LinkDAO" fullWidth={true}>
      <SEOHead
        title="Governance - LinkDAO"
        description="Participate in decentralized governance and shape the future of the platform. Create proposals, vote on decisions, and earn rewards through DAO participation."
        keywords="Web3, governance, DAO, voting, proposals, decentralized, blockchain, cryptocurrency"
        url="https://linkdao.io/governance"
        type="website"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          'name': 'Governance - LinkDAO',
          'description': 'Participate in decentralized governance and shape the future of the platform. Create proposals, vote on decisions, and earn rewards through DAO participation.',
          'url': 'https://linkdao.io/governance',
          'publisher': {
            '@type': 'Organization',
            'name': 'LinkDAO',
            'logo': {
              '@type': 'ImageObject',
              'url': 'https://linkdao.io/logo.png'
            }
          }
        }}
      />
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Governance</h1>
            {address && (
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {isVotingPowerLoading ? (
                  <span>Loading voting power...</span>
                ) : (
                  <span>Your Voting Power: {votingPower || '0'}</span>
                )}
              </div>
            )}
          </div>

          {(isLoading || isCountLoading || isProposalsLoading) && (
            <div className="mb-6">
              <ProposalCardSkeleton />
              <ProposalCardSkeleton />
              <ProposalCardSkeleton />
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8">
              {(['active', 'ended', 'create', 'delegation', 'charity'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search proposals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Content based on active tab */}
          {activeTab === 'delegation' && (
            <DelegationPanel
              communityId="governance"
              userVotingPower={Number(votingPower) || 0}
            />
          )}

          {activeTab === 'create' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-6">Create Proposal</h2>

              <ProposalCreator
                proposal={proposalData || undefined}
                onProposalChange={setProposalData}
                disabled={isSubmitting}
                className="mb-6"
              />

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setProposalData(null);
                    setActiveTab('active');
                  }}
                  disabled={isSubmitting}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProposal}
                  disabled={isSubmitting || isCreatingProposal || !proposalData?.title || !proposalData?.description}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {(isSubmitting || isCreatingProposal) ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Proposal'
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'charity' && (
            <div className="space-y-6">
              {charityView === 'list' ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold">Charity Proposals</h2>
                    <button
                      onClick={() => setCharityView('create')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Create Charity Proposal
                    </button>
                  </div>
                  {charityProposals.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400">No charity proposals yet.</p>
                  ) : (
                    charityProposals.map((proposal) => (
                      <CharityProposalCard key={proposal.id} proposal={proposal} />
                    ))
                  )}
                </>
              ) : (
                <CharityProposalForm
                  onSubmit={handleCreateCharityProposal}
                  isSubmitting={isSubmittingCharity}
                  onCancel={() => setCharityView('list')}
                />
              )}
            </div>
          )}

          {(activeTab === 'active' || activeTab === 'ended') && (
            <div className="space-y-4">
              {filteredProposals.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-dashed">
                  <div className="mx-auto h-12 w-12 text-gray-400 mb-3">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">No proposals found</h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    {searchTerm ? 'Try adjusting your search terms.' : `There are no ${activeTab} proposals at the moment.`}
                  </p>
                  {activeTab === 'active' && (
                    <button
                      onClick={() => setActiveTab('create')}
                      className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                    >
                      Create Proposal
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredProposals.map((proposal) => {
                    const analysis = proposalAnalyses[proposal.id];
                    // Mock user vote for demonstration - in real app, fetch from contract/backend
                    // const userVote = userVotes[proposal.id]; 

                    return (
                      <EnhancedProposalCard
                        key={proposal.id}
                        proposal={proposal}
                        analysis={analysis}
                        // userVote={userVote}
                        onClick={() => {
                          // Navigate to proposal details or expand
                          // router.push(`/governance/proposal/${proposal.id}`);
                          console.log('Clicked proposal:', proposal.id);
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default function Governance() {
  return (
    <GovernanceErrorBoundary>
      <GovernanceContent />
    </GovernanceErrorBoundary>
  );
}