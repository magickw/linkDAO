import React, { useState, useEffect } from 'react';
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
  useVotingPower
} from '@/hooks/useGovernanceContract';
import { ProposalCardSkeleton } from '@/components/LoadingSkeletons/GovernanceSkeleton';
import DelegationPanel from '@/components/Governance/DelegationPanel';

function GovernanceContent() {
  const { address, isConnected } = useAccount();
  const { addToast } = useToast();
  const { proposalCount, isLoading: isCountLoading } = useProposalCount();
  const { proposalIds, isLoading: isProposalsLoading } = useContractProposals();
  const { votingPower, isLoading: isVotingPowerLoading } = useVotingPower(address);
  
  const [activeTab, setActiveTab] = useState<'active' | 'ended' | 'create' | 'delegation' | 'charity'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [proposalAnalyses, setProposalAnalyses] = useState<Record<string, AIProposalAnalysis>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isProposing, setIsProposing] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  
  const [oldProposals] = useState([
    {
      id: 1,
      title: "Increase Community Fund Allocation",
      description: "Proposal to increase the community fund allocation from 10% to 15% of treasury funds for expanded community initiatives.",
      status: "Active",
      category: "Treasury",
      votes: { yes: 1245, no: 321 },
      endTime: "2023-08-01",
      aiAnalysis: "This proposal has strong community support and aligns with our mission to expand community initiatives. Financial impact is moderate."
    },
    {
      id: 2,
      title: "New Partnership with DeFi Project",
      description: "Proposal to establish a strategic partnership with a leading DeFi project to integrate their services into our platform.",
      status: "Ended",
      category: "Partnership",
      votes: { yes: 2156, no: 432 },
      endTime: "2023-07-20",
      aiAnalysis: "Partnership could bring significant value to users but requires careful due diligence on the partner project."
    },
    {
      id: 3,
      title: "Platform Fee Structure Update",
      description: "Proposal to adjust the platform fee structure to better support long-term sustainability while maintaining accessibility.",
      status: "Active",
      category: "Platform",
      votes: { yes: 876, no: 234 },
      endTime: "2023-08-05",
      aiAnalysis: "Fee structure changes should balance sustainability with user experience. Proposed changes appear reasonable."
    },
    {
      id: 4,
      title: "New Governance Framework",
      description: "Proposal to implement a new governance framework with quadratic voting and enhanced delegation mechanisms.",
      status: "Active",
      category: "Governance",
      votes: { yes: 542, no: 123 },
      endTime: "2023-08-10",
      aiAnalysis: "Governance improvements are critical for long-term success. Quadratic voting could enhance fairness but may increase complexity."
    }
  ]);

  // Fetch proposals on mount
  useEffect(() => {
    fetchProposals();
  }, [proposalIds]);

  const fetchProposals = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use 'general' as default community ID, or get from context/URL
      const fetchedProposals = await governanceService.getCommunityProposals('general');
      
      if (fetchedProposals.length === 0) {
        // If no proposals from contract/backend, use mock data for demo
        setProposals(oldProposals.map(p => ({
          id: p.id.toString(),
          title: p.title,
          description: p.description,
          proposer: '0x' + Math.random().toString(16).substr(2, 40),
          type: 'general' as const,
          status: p.status === 'Active' ? 'active' as const : 'succeeded' as const,
          forVotes: p.votes.yes.toString(),
          againstVotes: p.votes.no.toString(),
          quorum: '1000',
          startTime: new Date(Date.now() - 7 * 86400000),
          endTime: new Date(p.endTime),
          category: p.category.toLowerCase(),
          participationRate: 75
        })));
      } else {
        setProposals(fetchedProposals);
      }
    } catch (err) {
      console.error('Error fetching proposals:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch proposals');
      addToast('Failed to load proposals. Showing demo data.', 'warning');
      
      // Fallback to demo data
      setProposals(oldProposals.map(p => ({
        id: p.id.toString(),
        title: p.title,
        description: p.description,
        proposer: '0x' + Math.random().toString(16).substr(2, 40),
        type: 'general' as const,
        status: p.status === 'Active' ? 'active' as const : 'succeeded' as const,
        forVotes: p.votes.yes.toString(),
        againstVotes: p.votes.no.toString(),
        quorum: '1000',
        startTime: new Date(Date.now() - 7 * 86400000),
        endTime: new Date(p.endTime),
        category: p.category.toLowerCase(),
        participationRate: 75
      })));
    } finally {
      setIsLoading(false);
    }
  };

  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    category: 'General'
  });

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProposal.title || !newProposal.description) {
      addToast('Please fill in all fields', 'error');
      return;
    }
    
    if (!address) {
      addToast('Please connect your wallet', 'error');
      return;
    }
    
    try {
      setIsProposing(true);
      addToast('Creating proposal...', 'info');
      
      const result = await governanceService.createProposal({
        title: newProposal.title,
        description: newProposal.description,
        daoId: 'general',
        proposerId: address,
        category: newProposal.category
      });
      
      if (result) {
        addToast('Proposal created successfully!', 'success');
        setNewProposal({ title: '', description: '', category: 'General' });
        setActiveTab('active');
        fetchProposals(); // Refresh proposals
      } else {
        addToast('Failed to create proposal. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Error creating proposal:', err);
      addToast('Error creating proposal: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setIsProposing(false);
    }
  };

  const handleVote = async (proposalId: string, vote: boolean) => {
    if (!address) {
      addToast('Please connect your wallet to vote', 'error');
      return;
    }
    
    try {
      setIsVoting(true);
      addToast('Submitting vote...', 'info');
      
      const result = await governanceService.voteOnProposal(proposalId, vote);
      
      if (result.success) {
        addToast(
          `Vote cast successfully! ${result.transactionHash ? 'TX: ' + result.transactionHash.substring(0, 10) + '...' : ''}`,
          'success'
        );
        fetchProposals(); // Refresh proposals to show updated votes
      } else {
        addToast('Failed to cast vote: ' + (result.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      console.error('Error voting:', err);
      addToast('Error casting vote: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setIsVoting(false);
    }
  };

  const handleAnalyzeProposal = async (proposal: Proposal) => {
    try {
      setIsAnalyzing(prev => ({ ...prev, [proposal.id]: true }));
      
      const analysis = await aiGovernanceService.analyzeProposal(proposal);
      
      if (analysis) {
        setProposalAnalyses(prev => ({
          ...prev,
          [proposal.id]: analysis
        }));
        addToast('Proposal analysis completed!', 'success');
      }
    } catch (error) {
      console.error('Error analyzing proposal:', error);
      addToast('Failed to analyze proposal: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setIsAnalyzing(prev => ({ ...prev, [proposal.id]: false }));
    }
  };

  // Filter proposals based on active tab and search term
  const filteredProposals = proposals.filter(proposal => {
    const matchesTab = activeTab === 'active' 
      ? proposal.status === 'active'
      : activeTab === 'ended' 
        ? proposal.status !== 'active'
        : true;
    
    const matchesSearch = proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (proposal.category?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  if (!isConnected) {
    return (
      <Layout title="Governance - LinkDAO" fullWidth={true}>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Governance</h1>
            <p className="text-gray-600 dark:text-gray-300">Please connect your wallet to participate in governance.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Governance - LinkDAO" fullWidth={true}>
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-4xl mx-auto">
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
          
          {error && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                ⚠️ {error} - Showing demo data.
              </p>
            </div>
          )}
          
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('active')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'active'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Active Proposals
              </button>
              <button
                onClick={() => setActiveTab('ended')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'ended'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Ended Proposals
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'create'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Create Proposal
              </button>
              <button
                onClick={() => setActiveTab('delegation')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'delegation'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Delegation
              </button>
              <button
                onClick={() => setActiveTab('charity')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'charity'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Charity Governance
              </button>
            </nav>
          </div>
          
          {activeTab !== 'create' && activeTab !== 'delegation' && (
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search proposals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'delegation' && address && (
            <div className="mb-8">
              <DelegationPanel 
                communityId="general" 
                userVotingPower={votingPower ? parseFloat(votingPower) : 0}
                onDelegationChange={fetchProposals}
              />
            </div>
          )}
          
          {activeTab === 'charity' && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Charity Governance</h2>
                <button 
                  onClick={() => window.location.href = '/charity-dashboard'}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Go to Charity Dashboard
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Charity Proposals</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">View and participate in charity-related proposals</p>
                  <button 
                    onClick={() => window.location.href = '/charity-dashboard#proposals'}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
                  >
                    View Proposals →
                  </button>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Verified Charities</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">Explore verified charitable organizations</p>
                  <button 
                    onClick={() => window.location.href = '/charity-dashboard#charities'}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
                  >
                    View Charities →
                  </button>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Donation Records</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">Track donation history and impact</p>
                  <button 
                    onClick={() => window.location.href = '/charity-dashboard#donations'}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
                  >
                    View Donations →
                  </button>
                </div>
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Recent Charity Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-white">Local Food Bank Support</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Proposal to donate 10,000 LDAO tokens</p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-sm">
                      Executed
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-white">Community Education Fund</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Proposal to allocate funds for local schools</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm">
                      Active
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-white">Environmental Conservation</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Proposal to support reforestation project</p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full text-sm">
                      Pending
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'create' && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Create New Proposal</h2>
              
              <form onSubmit={handleCreateProposal}>
                <div className="mb-4">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Proposal Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={newProposal.title}
                    onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter proposal title"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    id="category"
                    value={newProposal.category}
                    onChange={(e) => setNewProposal({...newProposal, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="General">General</option>
                    <option value="Treasury">Treasury</option>
                    <option value="Platform">Platform</option>
                    <option value="Governance">Governance</option>
                    <option value="Partnership">Partnership</option>
                  </select>
                </div>
                
                <div className="mb-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={6}
                    value={newProposal.description}
                    onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Describe your proposal in detail..."
                  />
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isProposing}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 dark:focus:ring-offset-gray-800"
                  >
                  {isProposing ? 'Creating...' : 'Create Proposal'}
                </button>
              </div>
              </form>
            </div>
          )}
          
          {!isLoading && (activeTab === 'active' || activeTab === 'ended') && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {activeTab === 'active' ? 'Active Proposals' : 'Ended Proposals'}
                </h2>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Total Proposals: {proposals.length}
                </div>
              </div>
              
              {filteredProposals.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No proposals found</h3>
                  <p className="mt-1 text-gray-500 dark:text-gray-400">
                    {searchTerm 
                      ? 'No proposals match your search criteria.' 
                      : activeTab === 'active' 
                        ? 'There are currently no active proposals.' 
                        : 'There are no ended proposals yet.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredProposals.map((proposal) => {
                    const isActive = proposal.status === 'active';
                    const forVotes = parseFloat(proposal.forVotes || '0');
                    const againstVotes = parseFloat(proposal.againstVotes || '0');
                    
                    return (
                      <div key={proposal.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{proposal.title}</h3>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                {proposal.category || 'General'}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                isActive
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {isActive ? 'Active' : 'Ended'}
                              </span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">{proposal.description}</p>
                            
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                              <div className="flex items-center space-x-4">
                                <div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">For Votes</p>
                                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                                    {forVotes.toFixed(2)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">Against Votes</p>
                                  <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                                    {againstVotes.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Voting Ends</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {proposal.endTime instanceof Date 
                                    ? proposal.endTime.toLocaleDateString() 
                                    : proposal.endTime}
                                </p>
                              </div>
                            </div>
                            
                            {isActive && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                                <button 
                                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                                  onClick={() => handleVote(proposal.id, true)}
                                  disabled={isVoting}
                                >
                                  {isVoting ? 'Voting...' : 'Vote For'}
                                </button>
                                <button 
                                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                                  onClick={() => handleVote(proposal.id, false)}
                                  disabled={isVoting}
                                >
                                  {isVoting ? 'Voting...' : 'Vote Against'}
                                </button>
                                <button
                                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center"
                                  onClick={() => handleAnalyzeProposal(proposal)}
                                  disabled={isAnalyzing[proposal.id]}
                                >
                                  {isAnalyzing[proposal.id] ? (
                                    <>
                                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Analyzing...
                                    </>
                                  ) : (
                                    'AI Analysis'
                                  )}
                                </button>
                              </div>
                            )}
                            
                            {isActive && proposalAnalyses[proposal.id] && (
                              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium text-blue-800 dark:text-blue-200">AI Analysis</h4>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    proposalAnalyses[proposal.id].recommendation === 'APPROVE' 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                      : proposalAnalyses[proposal.id].recommendation === 'NEEDS_IMPROVEMENT'
                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  }`}>
                                    {proposalAnalyses[proposal.id].recommendation}
                                  </span>
                                </div>
                                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                                  {proposalAnalyses[proposal.id].analysis}
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                  <div className="text-center">
                                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                      {proposalAnalyses[proposal.id].feasibility}
                                    </div>
                                    <div className="text-xs text-blue-500 dark:text-blue-400">Feasibility</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                      {proposalAnalyses[proposal.id].communityImpact}
                                    </div>
                                    <div className="text-xs text-blue-500 dark:text-blue-400">Community</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                      {proposalAnalyses[proposal.id].financialImpact}
                                    </div>
                                    <div className="text-xs text-blue-500 dark:text-blue-400">Financial</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                      {proposalAnalyses[proposal.id].technicalQuality}
                                    </div>
                                    <div className="text-xs text-blue-500 dark:text-blue-400">Technical</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                      {proposalAnalyses[proposal.id].alignment}
                                    </div>
                                    <div className="text-xs text-blue-500 dark:text-blue-400">Alignment</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
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
