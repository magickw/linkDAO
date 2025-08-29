import React, { useState } from 'react';

interface Proposal {
  id: string;
  title: string;
  status: 'active' | 'passed' | 'failed' | 'pending';
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  endTime: Date;
  proposer: string;
}

interface DAOGovernanceEmbedProps {
  daoName: string;
  daoToken: string;
  className?: string;
}

export default function DAOGovernanceEmbed({ daoName, daoToken, className = '' }: DAOGovernanceEmbedProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'recent'>('active');

  // Mock data for demonstration
  React.useEffect(() => {
    // In a real implementation, this would fetch from DAO governance contracts
    // For now, we'll generate mock data
    
    const mockProposals: Proposal[] = [
      {
        id: '1',
        title: 'Increase Treasury Allocation to DeFi Strategies',
        status: 'active',
        votesFor: 1250000,
        votesAgainst: 450000,
        totalVotes: 1700000,
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        proposer: '0x1234...5678'
      },
      {
        id: '2',
        title: 'Partnership with Layer 2 Scaling Solution',
        status: 'active',
        votesFor: 980000,
        votesAgainst: 720000,
        totalVotes: 1700000,
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        proposer: '0x2345...6789'
      },
      {
        id: '3',
        title: 'Update Governance Parameters',
        status: 'passed',
        votesFor: 1500000,
        votesAgainst: 200000,
        totalVotes: 1700000,
        endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        proposer: '0x3456...7890'
      },
      {
        id: '4',
        title: 'Community Treasury Distribution',
        status: 'failed',
        votesFor: 650000,
        votesAgainst: 1050000,
        totalVotes: 1700000,
        endTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        proposer: '0x4567...8901'
      }
    ];
    
    setProposals(mockProposals);
  }, [daoName]);

  const formatTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const diffMs = endTime.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Ended';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} left`;
    }
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} left`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
      case 'passed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const filteredProposals = activeTab === 'active' 
    ? proposals.filter(p => p.status === 'active') 
    : proposals.filter(p => p.status === 'passed' || p.status === 'failed');

  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{daoName} Governance</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">DAO Token: {daoToken}</p>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1 text-xs rounded-full ${
                activeTab === 'active'
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`px-3 py-1 text-xs rounded-full ${
                activeTab === 'recent'
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              Recent
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {filteredProposals.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No proposals</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {activeTab === 'active' 
                ? 'There are currently no active proposals.' 
                : 'There are no recent proposals.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProposals.map((proposal) => {
              const votePercentage = proposal.totalVotes > 0 
                ? (proposal.votesFor / proposal.totalVotes) * 100 
                : 0;
              
              return (
                <div key={proposal.id} className="border border-gray-200/50 dark:border-gray-700/50 rounded-lg p-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-white">{proposal.title}</h4>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(proposal.status)}`}>
                      {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
                      <span>{proposal.votesFor.toLocaleString()} For</span>
                      <span>{proposal.votesAgainst.toLocaleString()} Against</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-primary-500 h-2 rounded-full" 
                        style={{ width: `${votePercentage}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Proposed by {proposal.proposer}</span>
                    {proposal.status === 'active' && (
                      <span>{formatTimeRemaining(proposal.endTime)}</span>
                    )}
                  </div>
                  
                  {proposal.status === 'active' && (
                    <div className="mt-3 flex space-x-2">
                      <button className="flex-1 py-2 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors">
                        Vote For
                      </button>
                      <button className="flex-1 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                        Vote Against
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
          <button className="w-full py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
            View All Proposals
          </button>
        </div>
      </div>
    </div>
  );
}