import React, { useState, useEffect, useCallback } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users, 
  TrendingUp,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Search,
  Filter,
  BarChart3,
  UserCheck,
  History,
  Vote,
  Zap,
  AlertCircle,
  Trophy,
  Target,
  Award,
  PieChart,
  Globe,
  Shield,
  Plus
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { Proposal, ProposalStatus, VoteChoice } from '@/types/governance';
import { governanceService } from '@/services/governanceService';
import { useToast } from '@/context/ToastContext';



const GovernanceDashboard: NextPage = () => {
  const { address, isConnected } = useAccount();
  const { addToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'active' | 'past' | 'delegation'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userVotingPower, setUserVotingPower] = useState(0);
  const [participationRate, setParticipationRate] = useState(0);
  const [totalProposals, setTotalProposals] = useState(0);

  // Load governance data
  const loadGovernanceData = useCallback(async () => {
    if (!isConnected || !address) return;
    
    try {
      setIsLoading(true);
      
      // Fetch real data from governance service
      const [activeProposals, votingPower, participation] = await Promise.all([
        governanceService.getAllActiveProposals(),
        governanceService.getUserVotingPower('general', address),
        governanceService.getCommunityParticipationRate('general')
      ]);
      
      setProposals(activeProposals);
      setUserVotingPower(votingPower);
      setParticipationRate(participation);
      setTotalProposals(activeProposals.length);
      
    } catch (error) {
      console.error('Error loading governance data:', error);
      addToast('Failed to load governance data', 'error');
      
      // Fallback to empty state
      setProposals([]);
      setUserVotingPower(0);
      setParticipationRate(0);
      setTotalProposals(0);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, addToast]);

  useEffect(() => {
    loadGovernanceData();
  }, [loadGovernanceData]);

  // Handle voting on proposals
  const handleVote = async (proposalId: string, support: boolean) => {
    if (!address) return;
    
    try {
      const result = await governanceService.voteOnProposal(proposalId, support);
      if (result.success) {
        addToast('Vote submitted successfully!', 'success');
        // Reload data to show updated vote counts
        loadGovernanceData();
      } else {
        addToast(result.error || 'Failed to submit vote', 'error');
      }
    } catch (error) {
      console.error('Error voting:', error);
      addToast('Failed to submit vote', 'error');
    }
  };

  // Filter proposals based on active tab and search
  const filteredProposals = proposals.filter(proposal => {
    const matchesTab = activeTab === 'active' 
      ? proposal.status === ProposalStatus.ACTIVE
      : activeTab === 'past'
        ? [ProposalStatus.PASSED, ProposalStatus.FAILED, ProposalStatus.EXECUTED, ProposalStatus.SUCCEEDED].some(status => 
            proposal.status === status
          )
        : true;
    
    const matchesSearch = searchQuery === '' ||
      proposal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proposal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (proposal.proposer && proposal.proposer.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesTab && matchesSearch;
  });

  // Calculate time remaining for active proposals
  const getTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''} left`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} left`;
    return 'Ending soon';
  };

  // Format large numbers
  const formatNumber = (num: string | number) => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(n)) return '0';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  // Get status badge
  const getStatusBadge = (status: ProposalStatus) => {
    switch (status) {
      case ProposalStatus.ACTIVE:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Clock className="w-3 h-3 mr-1" />
          Active
        </span>;
      case ProposalStatus.PASSED:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Passed
        </span>;
      case ProposalStatus.FAILED:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </span>;
      case ProposalStatus.EXECUTED:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <Award className="w-3 h-3 mr-1" />
          Executed
        </span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {status}
        </span>;
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Connect to Governance</h1>
          <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to view governance dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Governance Dashboard - LinkDAO</title>
        <meta name="description" content="Participate in decentralized governance, vote on proposals, and shape the future of LinkDAO" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center mb-6">
              <Link href="/governance" className="flex items-center text-blue-100 hover:text-white mr-6">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Governance
              </Link>
              <h1 className="text-3xl font-bold">Governance Dashboard</h1>
            </div>
            
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex items-center">
                  <Vote className="w-8 h-8 text-blue-300 mr-3" />
                  <div>
                    <p className="text-blue-100 text-sm">Your Voting Power</p>
                    <p className="text-2xl font-bold">{formatNumber(userVotingPower)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-green-300 mr-3" />
                  <div>
                    <p className="text-blue-100 text-sm">Participation Rate</p>
                    <p className="text-2xl font-bold">{participationRate}%</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex items-center">
                  <BarChart3 className="w-8 h-8 text-purple-300 mr-3" />
                  <div>
                    <p className="text-blue-100 text-sm">Active Proposals</p>
                    <p className="text-2xl font-bold">
                      {proposals.filter(p => p.status === ProposalStatus.ACTIVE).length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex items-center">
                  <History className="w-8 h-8 text-yellow-300 mr-3" />
                  <div>
                    <p className="text-blue-100 text-sm">Total Proposals</p>
                    <p className="text-2xl font-bold">{totalProposals}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Controls */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search proposals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            
            {/* Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(['active', 'past', 'delegation'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                    activeTab === tab
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Active Proposals Tab */}
          {activeTab === 'active' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Active Proposals</h2>
                <Link 
                  href="/governance?tab=create" 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Proposal
                </Link>
              </div>
              
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 animate-pulse">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : filteredProposals.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-dashed">
                  <Vote className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No active proposals</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'Try adjusting your search terms.' : 'There are currently no active proposals.'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {filteredProposals.map((proposal) => (
                    <div key={proposal.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow">
                      <div className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getStatusBadge(proposal.status)}
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                Proposed by {proposal.proposerENS || `${proposal.proposer.substring(0, 6)}...${proposal.proposer.substring(38)}`}
                              </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                              {proposal.title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                              {proposal.description}
                            </p>
                            
                            {/* Tags */}
                            {proposal.tags && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {proposal.tags.map((tag) => (
                                  <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* Time Remaining */}
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 lg:ml-6">
                            <Clock className="w-4 h-4 mr-1" />
                            {getTimeRemaining(proposal.endTime)}
                          </div>
                        </div>
                        
                        {/* Voting Progress */}
                        <div className="mb-6">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-600 dark:text-gray-400">Voting Progress</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {proposal.participationRate.toFixed(1)}% participation
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            {/* Progress bars */}
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-green-600 dark:text-green-400 font-medium">For</span>
                                  <span className="text-gray-600 dark:text-gray-400">{formatNumber(proposal.forVotes)}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div 
                                    className="bg-green-500 h-2 rounded-full" 
                                    style={{ 
                                      width: `${(parseInt(proposal.forVotes) / (parseInt(proposal.forVotes) + parseInt(proposal.againstVotes) + parseInt(proposal.abstainVotes || '0'))) * 100}%` 
                                    }}
                                  ></div>
                                </div>
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-red-600 dark:text-red-400 font-medium">Against</span>
                                  <span className="text-gray-600 dark:text-gray-400">{formatNumber(proposal.againstVotes)}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div 
                                    className="bg-red-500 h-2 rounded-full" 
                                    style={{ 
                                      width: `${(parseInt(proposal.againstVotes) / (parseInt(proposal.forVotes) + parseInt(proposal.againstVotes) + parseInt(proposal.abstainVotes || '0'))) * 100}%` 
                                    }}
                                  ></div>
                                </div>
                              </div>
                              
                              {proposal.abstainVotes && parseInt(proposal.abstainVotes) > 0 && (
                                <div className="flex-1">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-600 dark:text-gray-400 font-medium">Abstain</span>
                                    <span className="text-gray-600 dark:text-gray-400">{formatNumber(proposal.abstainVotes)}</span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                      className="bg-gray-500 h-2 rounded-full" 
                                      style={{ 
                                        width: `${(parseInt(proposal.abstainVotes) / (parseInt(proposal.forVotes) + parseInt(proposal.againstVotes) + parseInt(proposal.abstainVotes))) * 100}%` 
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Quorum indicator */}
                            <div className="flex items-center justify-between text-xs mt-2">
                              <span className="text-gray-500 dark:text-gray-400">
                                Quorum: {formatNumber(proposal.quorum)}
                              </span>
                              <div className={`flex items-center ${parseInt(proposal.forVotes) >= parseInt(proposal.quorum) ? 'text-green-600' : 'text-yellow-600'}`}>
                                {parseInt(proposal.forVotes) >= parseInt(proposal.quorum) ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Quorum Reached
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Quorum Needed
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3">
                          {proposal.status === ProposalStatus.ACTIVE && proposal.canVote && (
                            <>
                              <button 
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center transition-colors"
                                onClick={() => handleVote(proposal.id, true)}
                              >
                                <ThumbsUp className="w-4 h-4 mr-2" />
                                Vote For
                              </button>
                              <button 
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center transition-colors"
                                onClick={() => handleVote(proposal.id, false)}
                              >
                                <ThumbsDown className="w-4 h-4 mr-2" />
                                Vote Against
                              </button>
                            </>
                          )}
                          
                          <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium flex items-center transition-colors">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Details
                          </button>
                          
                          {proposal.discussionUrl && (
                            <button className="px-4 py-2 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg font-medium flex items-center transition-colors">
                              <Globe className="w-4 h-4 mr-2" />
                              Discuss
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Past Proposals Tab */}
          {activeTab === 'past' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Past Proposals</h2>
              
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredProposals.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-dashed">
                  <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No past proposals</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'Try adjusting your search terms.' : 'There are no past proposals in this category.'}
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Proposal
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Votes
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Result
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredProposals.map((proposal) => (
                          <tr key={proposal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {proposal.title}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {proposal.proposerENS || proposal.proposer.substring(0, 8)}...
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(proposal.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              <div className="flex items-center space-x-4">
                                <span className="flex items-center text-green-600">
                                  <ThumbsUp className="w-4 h-4 mr-1" />
                                  {formatNumber(proposal.forVotes)}
                                </span>
                                <span className="flex items-center text-red-600">
                                  <ThumbsDown className="w-4 h-4 mr-1" />
                                  {formatNumber(proposal.againstVotes)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {parseInt(proposal.forVotes) > parseInt(proposal.againstVotes) ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approved
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Rejected
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {proposal.endTime.toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Delegation Tab */}
          {activeTab === 'delegation' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Delegation</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Delegate Your Votes */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center mb-4">
                    <UserCheck className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delegate Your Votes</h3>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Delegate your voting power to a trusted community member who can vote on your behalf when you're unable to participate.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Delegate To Address
                      </label>
                      <input
                        type="text"
                        placeholder="0x... wallet address or ENS name"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">Important</h4>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            You can revoke your delegation at any time. Your delegate cannot transfer your voting power to someone else.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                      Delegate Votes
                    </button>
                  </div>
                </div>
                
                {/* Delegation Stats */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center mb-4">
                    <PieChart className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Delegation</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-700 dark:text-gray-300">Currently Delegated</span>
                      <span className="font-medium text-gray-900 dark:text-white">No active delegation</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-700 dark:text-gray-300">Delegated Power</span>
                      <span className="font-medium text-gray-900 dark:text-white">0 LDAO</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-700 dark:text-gray-300">Delegated From Others</span>
                      <span className="font-medium text-gray-900 dark:text-white">0 LDAO</span>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors">
                        View Delegation History
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Top Delegates */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Community Delegates</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { rank: 1, name: 'vitalik.dao.eth', votes: '250K', reputation: 98 },
                    { rank: 2, name: 'maker.dao.eth', votes: '180K', reputation: 95 },
                    { rank: 3, name: 'compound.dao.eth', votes: '150K', reputation: 92 }
                  ].map((delegate) => (
                    <div key={delegate.rank} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Trophy className={`w-5 h-5 mr-1 ${
                          delegate.rank === 1 ? 'text-yellow-500' : 
                          delegate.rank === 2 ? 'text-gray-400' : 'text-amber-700'
                        }`} />
                        <span className="font-bold text-lg">#{delegate.rank}</span>
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white mb-1">{delegate.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{formatNumber(delegate.votes)} votes</div>
                      <div className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        <Target className="w-3 h-3 mr-1" />
                        {delegate.reputation}% reputation
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default GovernanceDashboard;