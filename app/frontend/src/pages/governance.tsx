import React, { useState } from 'react';
import Layout from '@/components/Layout';
// Temporarily disable generated hooks to fix runtime error
// import { useReadGovernanceProposalCount, useWriteGovernancePropose, useWriteGovernanceCastVote } from '@/generated';
import { useAccount } from 'wagmi';

export default function Governance() {
  const { address, isConnected } = useAccount();
  
  // Temporarily use mock data to fix runtime error
  const proposalCount = 0;
  const isProposing = false;
  const isProposed = false;
  const isVoting = false;
  const isVoted = false;
  
  const propose = () => {
    console.log('Propose function called - governance contracts not yet configured');
  };
  
  const castVote = () => {
    console.log('Cast vote function called - governance contracts not yet configured');
  };
  
  const [activeTab, setActiveTab] = useState<'active' | 'ended' | 'create'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [proposals, setProposals] = useState([
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

  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    category: 'General'
  });

  const handleCreateProposal = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProposal.title || !newProposal.description) {
      alert('Please fill in all fields');
      return;
    }
    
    // Create proposal on-chain (governance contracts not yet configured)
    console.log('Creating proposal:', newProposal);
    alert('Proposal creation functionality will be available once governance contracts are deployed.');
  };

  const handleVote = (proposalId: number, vote: boolean) => {
    // Cast vote on-chain (governance contracts not yet configured)
    console.log('Voting on proposal:', proposalId, 'vote:', vote);
    alert('Voting functionality will be available once governance contracts are deployed.');
  };

  // Filter proposals based on active tab and search term
  const filteredProposals = proposals.filter(proposal => {
    const matchesTab = activeTab === 'active' 
      ? proposal.status === 'Active' 
      : activeTab === 'ended' 
        ? proposal.status === 'Ended' 
        : true;
    
    const matchesSearch = proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.category.toLowerCase().includes(searchTerm.toLowerCase());
    
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Governance</h1>
          
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
            </nav>
          </div>
          
          {activeTab !== 'create' && (
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
                
                {isProposed && (
                  <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-md dark:bg-green-900 dark:text-green-200">
                    Proposal created successfully!
                  </div>
                )}
              </form>
            </div>
          )}
          
          {(activeTab === 'active' || activeTab === 'ended') && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {activeTab === 'active' ? 'Active Proposals' : 'Ended Proposals'}
                </h2>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Total Proposals: {proposalCount?.toString() || '0'}
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
                  {filteredProposals.map((proposal) => (
                    <div key={proposal.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{proposal.title}</h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {proposal.category}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              proposal.status === 'Active' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {proposal.status}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 mb-4">{proposal.description}</p>
                          
                          {/* AI Analysis Summary */}
                          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-start">
                              <svg className="h-5 w-5 text-primary-500 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Analysis Summary</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{proposal.aiAnalysis}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center space-x-4">
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Yes Votes</p>
                                <p className="text-lg font-semibold text-green-600 dark:text-green-400">{proposal.votes.yes}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">No Votes</p>
                                <p className="text-lg font-semibold text-red-600 dark:text-red-400">{proposal.votes.no}</p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-sm text-gray-500 dark:text-gray-400">Voting Ends</p>
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">{proposal.endTime}</p>
                            </div>
                          </div>
                          
                          {proposal.status === 'Active' && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                              <button 
                                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 dark:focus:ring-offset-gray-800"
                                onClick={() => handleVote(proposal.id, true)}
                                disabled={isVoting}
                              >
                                {isVoting ? 'Voting...' : 'Vote Yes'}
                              </button>
                              <button 
                                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 dark:focus:ring-offset-gray-800"
                                onClick={() => handleVote(proposal.id, false)}
                                disabled={isVoting}
                              >
                                {isVoting ? 'Voting...' : 'Vote No'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}