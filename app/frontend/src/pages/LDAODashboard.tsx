import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ldaoApi } from '../services/ldaoApi';
import {
  TrendingUp,
  Award,
  Zap,
  Wallet,
  RefreshCw,
  ChevronRight,
  Info,
  Shield,
  ShoppingBag,
  Activity,
  CheckCircle
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface LDAOStakingInfo {
  totalStaked: string;
  stakingTier: number;
  votingPower: string;
  rewardsEarned: string;
  rewardsClaimed: string;
  nextRewardPayout: string;
  discountPercentage: number;
  stakingBenefits: {
    name: string;
    value: string;
    description: string;
  }[];
}

interface LDAOMarketplaceBenefits {
  currentTier: string;
  tierBenefits: string[];
  transactionVolume: string;
  rewardsEarned: string;
  discountPercentage: number;
  feeReductionPercentage: number;
  ldaoPaymentDiscount: number;
  marketplaceStats: {
    totalTransactions: number;
    totalVolume: number;
    totalRewardsEarned: number;
    averageTransactionValue: number;
  };
}

interface LDAOAcquisitionOptions {
  purchaseWithETH: {
    exchangeRate: string;
    minimumPurchase: string;
    maximumPurchase: string;
  };
  earnThroughActivity: {
    currentBalance: string;
    earnableTokens: string;
    availableTasks: {
      name: string;
      potentialReward: string;
      completionRate: string;
    }[];
  };
  stakingRewards: {
    currentAPR: string;
    estimatedAnnualEarnings: string;
    claimableRewards: string;
  };
}

interface LDAORecentActivity {
  id: string;
  type: 'staking' | 'marketplace' | 'rewards' | 'discount';
  description: string;
  amount: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

interface LDAODashboardData {
  stakingInfo: LDAOStakingInfo;
  marketplaceBenefits: LDAOMarketplaceBenefits;
  acquisitionOptions: LDAOAcquisitionOptions;
  recentActivity: LDAORecentActivity[];
  nextMilestone: {
    name: string;
    description: string;
    progress: number;
    reward: string;
  } | null;
}

const LDAODashboard: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [dashboardData, setDashboardData] = useState<LDAODashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await ldaoApi.getDashboardData();
      setDashboardData(data);
      setError(null);

      if (isRefresh) {
        addToast('Dashboard updated successfully', 'success');
      }
    } catch (err) {
      console.error('Error fetching LDAO dashboard data:', err);
      setError('Failed to load dashboard data');
      addToast('Failed to update dashboard', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStake = () => {
    addToast('Staking feature coming soon! You will be able to stake LDAO tokens to earn rewards.', 'info');
  };

  const handleBuy = () => {
    addToast('LDAO purchase gateway coming soon!', 'info');
  };

  const handleEarn = () => {
    setActiveTab('activity');
    addToast('Complete tasks to earn LDAO tokens!', 'success');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading LDAO benefits dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg border border-red-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Dashboard</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">{error}</p>
          <button
            onClick={() => fetchDashboardData(false)}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-md hover:shadow-lg"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600">Your LDAO dashboard is currently empty.</p>
        </div>
      </div>
    );
  }

  const { stakingInfo, marketplaceBenefits, acquisitionOptions, recentActivity, nextMilestone } = dashboardData;

  const getTierInfo = (tier: number) => {
    const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
    const colors = [
      'text-amber-700 bg-amber-100 border-amber-200',
      'text-slate-600 bg-slate-100 border-slate-200',
      'text-yellow-700 bg-yellow-100 border-yellow-200',
      'text-indigo-600 bg-indigo-100 border-indigo-200'
    ];
    const gradients = [
      'from-amber-50 to-amber-100',
      'from-slate-50 to-slate-100',
      'from-yellow-50 to-yellow-100',
      'from-indigo-50 to-indigo-100'
    ];
    return {
      name: tiers[tier] || 'Bronze',
      badgeClass: colors[tier] || colors[0],
      gradient: gradients[tier] || gradients[0]
    };
  };

  const tierInfo = getTierInfo(stakingInfo.stakingTier);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Activity },
    { key: 'staking', label: 'Staking', icon: Wallet },
    { key: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
    { key: 'activity', label: 'Activity', icon: TrendingUp }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Award className="w-8 h-8 text-blue-600" />
            LDAO Benefits Dashboard
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Manage your tokens, track rewards, and unlock exclusive benefits</p>
        </div>
        <button
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 
            bg-white hover:bg-gray-50 transition shadow-sm
            ${refreshing ? 'opacity-70 cursor-not-allowed' : ''}
          `}
        >
          <RefreshCw className={`w-4 h-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-gray-700 font-medium">Refresh Data</span>
        </button>
      </div>

      {/* Next Milestone Card */}
      {nextMilestone && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-1 text-white">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-yellow-300" />
                  <span className="font-semibold text-blue-100 uppercase tracking-wider text-sm">Next Milestone</span>
                </div>
                <h3 className="text-2xl font-bold mb-2">{nextMilestone.name}</h3>
                <p className="text-blue-100 text-lg mb-4">{nextMilestone.description}</p>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Progress</span>
                    <span>{nextMilestone.progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                      style={{ width: `${nextMilestone.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-4 min-w-[200px] backdrop-blur-md border border-white/20">
                <p className="text-sm text-blue-200 mb-1">Reward</p>
                <p className="font-bold text-lg text-white">{nextMilestone.reward}</p>
                <button className="mt-3 w-full py-2 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition text-sm flex items-center justify-center gap-1">
                  View Details <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 overflow-x-auto">
        <nav className="flex space-x-1 min-w-max">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200
                  ${activeTab === tab.key
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${activeTab === tab.key ? 'text-blue-600' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Staking Info Card */}
            <div className={`rounded-2xl shadow-md border border-gray-100 overflow-hidden bg-gradient-to-br ${tierInfo.gradient}`}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-gray-600" />
                    Staking
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${tierInfo.badgeClass}`}>
                    {tierInfo.name}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="bg-white/60 rounded-xl p-4 backdrop-blur-sm">
                    <p className="text-sm text-gray-600 mb-1">Total Staked</p>
                    <p className="text-2xl font-bold text-gray-900">{stakingInfo.totalStaked} <span className="text-sm font-normal text-gray-500">LDAO</span></p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/60 rounded-xl p-3 backdrop-blur-sm">
                      <p className="text-xs text-gray-600 mb-1">Voting Power</p>
                      <p className="font-semibold text-gray-900">{stakingInfo.votingPower}</p>
                    </div>
                    <div className="bg-white/60 rounded-xl p-3 backdrop-blur-sm">
                      <p className="text-xs text-gray-600 mb-1">Rewards</p>
                      <p className="font-semibold text-green-600">+{stakingInfo.rewardsEarned}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStake}
                  className="mt-6 w-full py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 duration-200"
                >
                  Stake Tokens
                </button>
              </div>
            </div>

            {/* Marketplace Benefits Card */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-500"></div>

              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 relative z-10">
                <ShoppingBag className="w-5 h-5 text-green-600" />
                Marketplace Benefits
              </h3>

              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                  <span className="text-gray-700 font-medium">Fee Reduction</span>
                  <span className="text-green-700 font-bold">-{marketplaceBenefits.feeReductionPercentage}%</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <span className="text-gray-700 font-medium">Payment Discount</span>
                  <span className="text-blue-700 font-bold">-{marketplaceBenefits.discountPercentage}%</span>
                </div>

                <div className="pt-2">
                  <p className="text-sm text-gray-500 mb-2">Lifetime Rewards</p>
                  <p className="text-2xl font-bold text-gray-900">{marketplaceBenefits.rewardsEarned} <span className="text-sm font-normal text-gray-500">LDAO</span></p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('marketplace')}
                className="mt-6 w-full py-3 border-2 border-green-600 text-green-700 font-bold rounded-xl hover:bg-green-50 transition relative z-10"
              >
                View Marketplace
              </button>
            </div>

            {/* Token Acquisition Card */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Acquire Tokens
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-gray-500">Current Balance</p>
                    <p className="text-2xl font-bold text-gray-900">{acquisitionOptions.earnThroughActivity.currentBalance}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">APY</p>
                    <p className="text-xl font-bold text-green-600">{acquisitionOptions.stakingRewards.currentAPR}</p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Available to Earn</span>
                    <span className="font-medium text-blue-600">{acquisitionOptions.earnThroughActivity.earnableTokens} LDAO</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full w-3/4"></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleBuy}
                  className="py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  Buy LDAO
                </button>
                <button
                  onClick={handleEarn}
                  className="py-2.5 px-4 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  Earn Free
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'staking' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Staking Benefits</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stakingInfo.stakingBenefits.map((benefit, index) => (
                    <div key={index} className="p-5 border border-gray-100 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md transition duration-200">
                      <h4 className="font-bold text-gray-900 mb-2">{benefit.name}</h4>
                      <p className="text-2xl font-bold text-blue-600 mb-2">{benefit.value}</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{benefit.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className={`rounded-2xl shadow-md border border-gray-100 p-6 bg-gradient-to-b ${tierInfo.gradient}`}>
                <div className="text-center mb-6">
                  <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide border mb-3 ${tierInfo.badgeClass}`}>
                    {tierInfo.name} Tier
                  </div>
                  <p className="text-gray-600 text-sm">Current Staking Status</p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Voting Power</span>
                    <span className="font-bold text-gray-900">{stakingInfo.votingPower}</span>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Rewards Earned</span>
                    <span className="font-bold text-green-600">+{stakingInfo.rewardsEarned}</span>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Next Payout</span>
                    <span className="font-medium text-gray-900">{new Date(stakingInfo.nextRewardPayout).toLocaleDateString()}</span>
                  </div>
                </div>

                <button
                  onClick={handleStake}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg"
                >
                  Upgrade Tier
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'marketplace' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Marketplace Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl text-center hover:bg-blue-50 transition duration-200">
                    <p className="text-3xl font-bold text-gray-900 mb-1">{marketplaceBenefits.marketplaceStats.totalTransactions}</p>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Transactions</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl text-center hover:bg-blue-50 transition duration-200">
                    <p className="text-3xl font-bold text-gray-900 mb-1">{marketplaceBenefits.marketplaceStats.totalVolume}</p>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Volume</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl text-center hover:bg-green-50 transition duration-200">
                    <p className="text-3xl font-bold text-green-600 mb-1">{marketplaceBenefits.marketplaceStats.totalRewardsEarned}</p>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rewards</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl text-center hover:bg-blue-50 transition duration-200">
                    <p className="text-3xl font-bold text-gray-900 mb-1">{marketplaceBenefits.marketplaceStats.averageTransactionValue}</p>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Value</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Active Tier Benefits</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {marketplaceBenefits.tierBenefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg bg-gray-50">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <span className="font-medium text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 sticky top-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                    <span className="text-gray-700 font-medium">Discount</span>
                    <span className="text-green-700 font-bold">-{marketplaceBenefits.discountPercentage}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <span className="text-gray-700 font-medium">Fee Reduction</span>
                    <span className="text-blue-700 font-bold">-{marketplaceBenefits.feeReductionPercentage}%</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <button className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition shadow-md flex items-center justify-center gap-2">
                    <ShoppingBag className="w-5 h-5" />
                    Shop Now
                  </button>
                  <button className="w-full py-3 bg-white border-2 border-blue-600 text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition flex items-center justify-center gap-2">
                    <Zap className="w-5 h-5" />
                    Sell Item
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
              <button className="text-blue-600 font-medium hover:text-blue-800 text-sm">View All History</button>
            </div>

            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition group">
                    <div className="flex items-start gap-4 mb-3 sm:mb-0">
                      <div className={`
                        p-3 rounded-full 
                        ${activity.type === 'staking' ? 'bg-purple-100 text-purple-600' : ''}
                        ${activity.type === 'marketplace' ? 'bg-blue-100 text-blue-600' : ''}
                        ${activity.type === 'rewards' ? 'bg-green-100 text-green-600' : ''}
                        ${activity.type === 'discount' ? 'bg-yellow-100 text-yellow-600' : ''}
                      `}>
                        {activity.type === 'staking' && <Wallet className="w-5 h-5" />}
                        {activity.type === 'marketplace' && <ShoppingBag className="w-5 h-5" />}
                        {activity.type === 'rewards' && <Award className="w-5 h-5" />}
                        {activity.type === 'discount' && <Zap className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{activity.description}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(activity.timestamp).toLocaleDateString()} • <span className="capitalize">{activity.type}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-row sm:flex-col items-center sm:items-end w-full sm:w-auto justify-between sm:justify-start">
                      <span className={`
                        px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide mb-1
                        ${activity.status === 'completed' ? 'bg-green-100 text-green-700' : ''}
                        ${activity.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                        ${activity.status === 'failed' ? 'bg-red-100 text-red-700' : ''}
                      `}>
                        {activity.status}
                      </span>
                      <p className="font-bold text-gray-900">{activity.amount} LDAO</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                  <Activity className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No recent activity found</p>
                <p className="text-gray-400 text-sm mt-1">Transactions will appear here once you start using LDAO tokens</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LDAODashboard;
