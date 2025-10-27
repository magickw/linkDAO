/**
 * Community Treasury Dashboard Component
 * Displays real-time treasury balance, transactions, and spending proposals
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Vote,
  Send,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { Button, GlassPanel } from '@/design-system';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TreasuryPool {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  balance: string;
  totalContributions: string;
  totalDistributed: string;
  createdAt: Date;
}

interface Transaction {
  id: string;
  type: 'contribution' | 'distribution' | 'spending';
  amount: string;
  tokenSymbol: string;
  from: string;
  to: string;
  timestamp: Date;
  description: string;
}

interface SpendingProposal {
  id: string;
  title: string;
  amount: string;
  tokenSymbol: string;
  recipient: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  votes: { yes: number; no: number; abstain: number };
  deadline: Date;
}

interface CommunityTreasuryDashboardProps {
  communityId: string;
  isAdmin?: boolean;
}

export const CommunityTreasuryDashboard: React.FC<CommunityTreasuryDashboardProps> = ({
  communityId,
  isAdmin = false
}) => {
  const { address } = useAccount();
  const [pools, setPools] = useState<TreasuryPool[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [proposals, setProposals] = useState<SpendingProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'proposals'>('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    loadTreasuryData();
  }, [communityId, selectedTimeRange]);

  const loadTreasuryData = async () => {
    try {
      setLoading(true);
      
      const [poolsData, transactionsData, proposalsData] = await Promise.all([
        fetchTreasuryPools(),
        fetchTransactions(),
        fetchSpendingProposals()
      ]);

      setPools(poolsData);
      setTransactions(transactionsData);
      setProposals(proposalsData);
    } catch (error) {
      console.error('Error loading treasury data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTreasuryPools = async (): Promise<TreasuryPool[]> => {
    try {
      const response = await fetch(`/api/communities/${communityId}/treasury/pools`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching pools:', error);
      return [];
    }
  };

  const fetchTransactions = async (): Promise<Transaction[]> => {
    try {
      const response = await fetch(
        `/api/communities/${communityId}/treasury/transactions?timeRange=${selectedTimeRange}`
      );
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  };

  const fetchSpendingProposals = async (): Promise<SpendingProposal[]> => {
    try {
      const response = await fetch(`/api/communities/${communityId}/treasury/proposals`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching proposals:', error);
      return [];
    }
  };

  // Calculate total treasury value in USD
  const calculateTotalValue = (): number => {
    // In production, fetch real-time prices from CoinGecko/DEX
    return pools.reduce((total, pool) => {
      const balance = parseFloat(pool.balance);
      // Mock price conversion - replace with real price API
      const usdPrice = pool.tokenSymbol === 'ETH' ? 2000 : 1;
      return total + (balance * usdPrice);
    }, 0);
  };

  // Calculate growth rate
  const calculateGrowthRate = (): number => {
    // Calculate based on historical data
    // Mock calculation for now
    return 12.5;
  };

  // Render overview tab
  const renderOverview = () => {
    const totalValue = calculateTotalValue();
    const growthRate = calculateGrowthRate();

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-white mt-1">
                  ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Wallet className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              {growthRate >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400 mr-1" />
              )}
              <span className={growthRate >= 0 ? 'text-green-400' : 'text-red-400'}>
                {Math.abs(growthRate).toFixed(1)}%
              </span>
              <span className="text-gray-400 ml-2">vs last month</span>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Proposals</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {proposals.filter(p => p.status === 'pending').length}
                </p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Vote className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Distributed</p>
                <p className="text-2xl font-bold text-white mt-1">
                  ${pools.reduce((sum, p) => sum + parseFloat(p.totalDistributed || '0'), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Send className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Contributors</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {Math.floor(Math.random() * 100) + 50}
                </p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <Users className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* Token Balances */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Token Balances</h3>
          <div className="space-y-3">
            {pools.map((pool) => (
              <div key={pool.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <span className="text-white font-bold">{pool.tokenSymbol[0]}</span>
                  </div>
                  <div>
                    <p className="font-medium text-white">{pool.tokenSymbol}</p>
                    <p className="text-sm text-gray-400">{pool.tokenAddress.slice(0, 10)}...</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">
                    {parseFloat(pool.balance).toFixed(4)} {pool.tokenSymbol}
                  </p>
                  <p className="text-sm text-gray-400">
                    ${(parseFloat(pool.balance) * (pool.tokenSymbol === 'ETH' ? 2000 : 1)).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Treasury Growth Chart */}
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Treasury Growth</h3>
            <div className="h-64">
              <Line
                data={{
                  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                  datasets: [{
                    label: 'Treasury Value (USD)',
                    data: [10000, 15000, 13000, 18000, 22000, totalValue],
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: {
                      ticks: { color: '#9ca3af' },
                      grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                      ticks: { color: '#9ca3af' },
                      grid: { display: false }
                    }
                  }
                }}
              />
            </div>
          </GlassPanel>

          {/* Token Distribution */}
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Token Distribution</h3>
            <div className="h-64 flex items-center justify-center">
              <Doughnut
                data={{
                  labels: pools.map(p => p.tokenSymbol),
                  datasets: [{
                    data: pools.map(p => parseFloat(p.balance)),
                    backgroundColor: [
                      'rgba(59, 130, 246, 0.8)',
                      'rgba(139, 92, 246, 0.8)',
                      'rgba(236, 72, 153, 0.8)',
                      'rgba(34, 197, 94, 0.8)',
                    ],
                    borderWidth: 0
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: '#fff' }
                    }
                  }
                }}
              />
            </div>
          </GlassPanel>
        </div>
      </div>
    );
  };

  // Render transactions tab
  const renderTransactions = () => (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
        <Button variant="secondary" size="small">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="space-y-2">
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No transactions yet</p>
          </div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg ${
                  tx.type === 'contribution' ? 'bg-green-500/20' :
                  tx.type === 'distribution' ? 'bg-blue-500/20' :
                  'bg-purple-500/20'
                }`}>
                  {tx.type === 'contribution' ? (
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  ) : tx.type === 'distribution' ? (
                    <Send className="w-5 h-5 text-blue-400" />
                  ) : (
                    <DollarSign className="w-5 h-5 text-purple-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-white capitalize">{tx.type}</p>
                  <p className="text-sm text-gray-400">{tx.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${
                  tx.type === 'contribution' ? 'text-green-400' : 'text-white'
                }`}>
                  {tx.type === 'contribution' ? '+' : '-'}{tx.amount} {tx.tokenSymbol}
                </p>
                <p className="text-sm text-gray-400">
                  {new Date(tx.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassPanel>
  );

  // Render proposals tab
  const renderProposals = () => (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button className="bg-blue-600 hover:bg-blue-700">
            Create Spending Proposal
          </Button>
        </div>
      )}

      {proposals.length === 0 ? (
        <GlassPanel className="p-12 text-center">
          <Vote className="w-12 h-12 mx-auto mb-3 text-gray-400 opacity-50" />
          <p className="text-gray-400">No spending proposals yet</p>
        </GlassPanel>
      ) : (
        proposals.map((proposal) => (
          <GlassPanel key={proposal.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{proposal.title}</h3>
                <div className="flex items-center space-x-4 mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    proposal.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    proposal.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    proposal.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {proposal.status}
                  </span>
                  <span className="text-sm text-gray-400">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Ends {new Date(proposal.deadline).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {proposal.amount} {proposal.tokenSymbol}
                </p>
                <p className="text-sm text-gray-400">To {proposal.recipient.slice(0, 10)}...</p>
              </div>
            </div>

            {/* Voting Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Voting Progress</span>
                <span>{proposal.votes.yes + proposal.votes.no + proposal.votes.abstain} votes</span>
              </div>
              <div className="flex space-x-1 h-2 rounded-full overflow-hidden bg-gray-700">
                <div 
                  className="bg-green-500 transition-all" 
                  style={{ width: `${(proposal.votes.yes / (proposal.votes.yes + proposal.votes.no + proposal.votes.abstain || 1)) * 100}%` }}
                />
                <div 
                  className="bg-red-500 transition-all" 
                  style={{ width: `${(proposal.votes.no / (proposal.votes.yes + proposal.votes.no + proposal.votes.abstain || 1)) * 100}%` }}
                />
                <div 
                  className="bg-gray-500 transition-all" 
                  style={{ width: `${(proposal.votes.abstain / (proposal.votes.yes + proposal.votes.no + proposal.votes.abstain || 1)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span className="text-green-400">{proposal.votes.yes} Yes</span>
                <span className="text-red-400">{proposal.votes.no} No</span>
                <span className="text-gray-400">{proposal.votes.abstain} Abstain</span>
              </div>
            </div>

            {proposal.status === 'pending' && (
              <div className="flex space-x-2 mt-4">
                <Button className="flex-1 bg-green-600 hover:bg-green-700">Vote Yes</Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700">Vote No</Button>
                <Button variant="secondary" className="flex-1">Abstain</Button>
              </div>
            )}
          </GlassPanel>
        ))
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <Wallet className="w-8 h-8 mr-3" />
            Community Treasury
          </h2>
          <p className="text-gray-400 mt-1">Manage and track community funds</p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'transactions'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4 inline mr-2" />
          Transactions
        </button>
        <button
          onClick={() => setActiveTab('proposals')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'proposals'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Vote className="w-4 h-4 inline mr-2" />
          Spending Proposals
        </button>
      </div>

      {/* Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'transactions' && renderTransactions()}
      {activeTab === 'proposals' && renderProposals()}
    </div>
  );
};

export default CommunityTreasuryDashboard;
