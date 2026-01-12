import React, { useState, useEffect, useCallback } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ArrowRight,
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
  Plus,
  BookOpen,
  HelpCircle,
  ChevronDown
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

  // Load governance overview data
  const loadGovernanceData = useCallback(async () => {
    if (!isConnected || !address) return;
    
    try {
      setIsLoading(true);
      
      // Fetch overview metrics only (lighter data)
      const [votingPower, participation] = await Promise.all([
        governanceService.getUserVotingPower('general', address),
        governanceService.getCommunityParticipationRate('general')
      ]);
      
      // Get proposal counts instead of full proposal data
      const activeCount = await getActiveProposalCount();
      const totalCount = await getTotalProposalCount();
      
      setUserVotingPower(votingPower);
      setParticipationRate(participation);
      setTotalProposals(totalCount);
      
      // Don't load full proposals here - keep it lightweight
      setProposals([]);
      
    } catch (error) {
      console.error('Error loading governance overview:', error);
      addToast('Failed to load governance overview', 'error');
      
      // Fallback values
      setUserVotingPower(0);
      setParticipationRate(0);
      setTotalProposals(0);
      setProposals([]);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, addToast]);

  useEffect(() => {
    loadGovernanceData();
  }, [loadGovernanceData]);

  // Helper functions for lightweight data fetching
  const getActiveProposalCount = async (): Promise<number> => {
    try {
      const proposals = await governanceService.getAllActiveProposals();
      return proposals.length;
    } catch (error) {
      console.error('Error getting active proposal count:', error);
      return 0;
    }
  };

  // Fetch recent governance activity
  const getRecentActivity = async () => {
    try {
      // TODO: Implement real API call to get recent governance events
      // This should fetch recent proposals, votes, and governance actions
      // const response = await fetch(`${ENV_CONFIG.BACKEND_URL}/api/governance/activity/recent`);
      // return await response.json();
      
      // Return empty array until backend endpoint is ready
      return [];
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  };

  // Fetch top voters/community insights
  const getCommunityInsights = async () => {
    try {
      // TODO: Implement real API call to get community voting statistics
      // This should fetch top voters, participation rates, and trends
      // const response = await fetch(`${ENV_CONFIG.BACKEND_URL}/api/governance/insights`);
      // return await response.json();
      
      // Return empty data until backend endpoint is ready
      return {
        topVoters: [],
        participationTrends: [],
        successRates: null
      };
    } catch (error) {
      console.error('Error fetching community insights:', error);
      return {
        topVoters: [],
        participationTrends: [],
        successRates: null
      };
    }
  };

  const getTotalProposalCount = async (): Promise<number> => {
    try {
      // TODO: Implement real API call to get total proposal count
      // This should call a dedicated endpoint like:
      // const response = await fetch(`${ENV_CONFIG.BACKEND_URL}/api/governance/proposals/count`);
      // const data = await response.json();
      // return data.totalCount;
      
      // For now, return 0 until backend endpoint is implemented
      return 0;
    } catch (error) {
      console.error('Error getting total proposal count:', error);
      return 0;
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
              {([
                { key: 'active', label: 'Overview' },
                { key: 'past', label: 'Resources' },
                { key: 'delegation', label: 'Insights' }
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'active' | 'past' | 'delegation')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Governance Overview Tab */}
          {activeTab === 'active' && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Governance Overview</h2>
                <p className="text-gray-600 dark:text-gray-400">Your gateway to decentralized decision-making</p>
              </div>
              
              {/* Quick Actions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Link 
                  href="/governance?tab=active" 
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all hover:border-blue-300 dark:hover:border-blue-500 group"
                >
                  <div className="flex items-center mb-3">
                    <Vote className="w-8 h-8 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Active Proposals</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Participate in current governance decisions</p>
                </Link>
                
                <Link 
                  href="/governance?tab=ended" 
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all hover:border-green-300 dark:hover:border-green-500 group"
                >
                  <div className="flex items-center mb-3">
                    <History className="w-8 h-8 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Past Decisions</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Review historical governance outcomes</p>
                </Link>
                
                <Link 
                  href="/governance?tab=create" 
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all hover:border-purple-300 dark:hover:border-purple-500 group"
                >
                  <div className="flex items-center mb-3">
                    <Plus className="w-8 h-8 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Create Proposal</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Submit your ideas for community voting</p>
                </Link>
                
                <Link 
                  href="/governance?tab=delegation" 
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all hover:border-yellow-300 dark:hover:border-yellow-500 group"
                >
                  <div className="flex items-center mb-3">
                    <UserCheck className="w-8 h-8 text-yellow-600 dark:text-yellow-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Delegation</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Assign your voting power to trusted members</p>
                </Link>
              </div>
              
              {/* Governance Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center mb-3">
                    <Vote className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Active Proposals</h3>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{proposals.filter(p => p.status === ProposalStatus.ACTIVE).length}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Current voting opportunities</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                  <div className="flex items-center mb-3">
                    <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Participation Rate</h3>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{participationRate.toFixed(1)}%</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Community engagement level</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center mb-3">
                    <History className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Total Proposals</h3>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{totalProposals}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Governance history</p>
                </div>
              </div>
              
              {/* Recent Activity - Will fetch real data */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Governance Activity</h3>
                  <Link 
                    href="/governance" 
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center"
                  >
                    View All
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg animate-pulse">
                        <div className="flex-shrink-0 w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full mr-3"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                        </div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">No recent activity to display</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Check back later for governance updates</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Governance Resources Tab */}
          {activeTab === 'past' && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Governance Resources</h2>
                <p className="text-gray-600 dark:text-gray-400">Everything you need to participate effectively</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Governance Guide */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center mb-4">
                    <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Getting Started Guide</h3>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                      <p className="text-gray-700 dark:text-gray-300">Understand how governance works</p>
                    </div>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                      <p className="text-gray-700 dark:text-gray-300">Learn about voting power and delegation</p>
                    </div>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                      <p className="text-gray-700 dark:text-gray-300">Discover proposal creation best practices</p>
                    </div>
                  </div>
                  
                  <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                    Read Guide
                  </button>
                </div>
                
                {/* FAQ Section */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center mb-4">
                    <HelpCircle className="w-6 h-6 text-green-600 dark:text-green-400 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Frequently Asked Questions</h3>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                    <details className="group">
                      <summary className="font-medium text-gray-900 dark:text-white cursor-pointer flex items-center justify-between">
                        How do I get voting power?
                        <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                      </summary>
                      <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
                        Voting power is typically earned by holding LDAO tokens. The more tokens you hold, the more voting power you have.
                      </p>
                    </details>
                    
                    <details className="group">
                      <summary className="font-medium text-gray-900 dark:text-white cursor-pointer flex items-center justify-between">
                        What happens if I don't vote?
                        <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                      </summary>
                      <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
                        You can delegate your voting power to someone you trust, or your tokens won't count toward the vote outcome.
                      </p>
                    </details>
                  </div>
                  
                  <button className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                    View All FAQs
                  </button>
                </div>
              </div>
              
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

          {/* Community Insights Tab */}
          {activeTab === 'delegation' && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Community Insights</h2>
                <p className="text-gray-600 dark:text-gray-400">Understanding our governance ecosystem</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Voters */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center mb-4">
                    <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Most Active Voters</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {isLoading ? (
                      <>
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg animate-pulse">
                            <div className="flex items-center">
                              <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 mr-3"></div>
                              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24"></div>
                            </div>
                            <div className="text-right">
                              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-12 mb-1"></div>
                              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-8"></div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <Users className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-600 dark:text-gray-400 text-sm">Voter data not available</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Voting Trends */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Voting Trends</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Participation Rate</span>
                        <span className="font-medium text-gray-900 dark:text-white">{participationRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full" 
                          style={{ width: `${participationRate}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Proposal Success Rate</span>
                        <span className="font-medium text-gray-900 dark:text-white">--</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gray-400 h-2 rounded-full" 
                          style={{ width: '0%' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center mb-4">
                    <Award className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Stats</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalProposals}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Proposals</div>
                    </div>
                    
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">--</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Avg Voting Period</div>
                    </div>
                    
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">--</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Quorum Achievement</div>
                    </div>
                  </div>
                </div>
              </div>
              
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
              
              {/* Top Delegates - Will fetch real data */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Community Delegates</h3>
                </div>
                
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center animate-pulse">
                        <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mx-auto mb-3"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mx-auto mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mx-auto mb-3"></div>
                        <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-2/3 mx-auto"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">Delegate data not available</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Real-time delegate rankings coming soon</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default GovernanceDashboard;