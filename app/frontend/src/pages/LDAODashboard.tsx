import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ldaoApi } from '../services/ldaoApi';

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
  const [dashboardData, setDashboardData] = useState<LDAODashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await ldaoApi.getDashboardData();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching LDAO dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
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
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data</h3>
          <p className="text-gray-600">No dashboard data available.</p>
        </div>
      </div>
    );
  }

  const { stakingInfo, marketplaceBenefits, acquisitionOptions, recentActivity, nextMilestone } = dashboardData;

  const getTierInfo = (tier: number) => {
    const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
    const colors = ['text-yellow-600', 'text-gray-500', 'text-yellow-500', 'text-blue-500'];
    return { name: tiers[tier] || 'Bronze', color: colors[tier] || 'text-yellow-600' };
  };

  const tierInfo = getTierInfo(stakingInfo.stakingTier);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'staking', label: 'Staking' },
    { key: 'marketplace', label: 'Marketplace' },
    { key: 'activity', label: 'Activity' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">LDAO Benefits Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your LDAO tokens and track your benefits</p>
      </div>

      {/* Next Milestone Card */}
      {nextMilestone && (
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-md border-2 border-blue-500 p-6">
            <h3 className="text-xl font-semibold text-blue-600 mb-2">
              Next Milestone: {nextMilestone.name}
            </h3>
            <p className="text-gray-700 mb-4">{nextMilestone.description}</p>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Progress: {nextMilestone.progress.toFixed(1)}%</span>
              <span className="text-green-600 font-semibold">Reward: {nextMilestone.reward}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${nextMilestone.progress}%` }}
              />
            </div>
            <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition text-sm">
              View Details
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition
                  ${activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Staking Info Card */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Staking Information</h3>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Tier:</span>
                <span className={`font-semibold ${tierInfo.color}`}>{tierInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Staked:</span>
                <span className="text-gray-900">{stakingInfo.totalStaked} LDAO</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Voting Power:</span>
                <span className="text-gray-900">{stakingInfo.votingPower}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rewards Earned:</span>
                <span className="text-gray-900">{stakingInfo.rewardsEarned} LDAO</span>
              </div>
            </div>
            <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Stake LDAO Tokens
            </button>
          </div>

          {/* Marketplace Benefits Card */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Marketplace Benefits</h3>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Current Tier:</span>
                <span className="font-semibold text-gray-900">{marketplaceBenefits.currentTier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">LDAO Payment Discount:</span>
                <span className="text-green-600">-{marketplaceBenefits.discountPercentage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fee Reduction:</span>
                <span className="text-green-600">-{marketplaceBenefits.feeReductionPercentage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rewards Earned:</span>
                <span className="text-gray-900">{marketplaceBenefits.rewardsEarned} LDAO</span>
              </div>
            </div>
            <button className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
              Browse Marketplace
            </button>
          </div>

          {/* Token Acquisition Card */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Acquire LDAO Tokens</h3>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Current Balance:</span>
                <span className="text-gray-900">{acquisitionOptions.earnThroughActivity.currentBalance} LDAO</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Earnable Tokens:</span>
                <span className="text-blue-600">{acquisitionOptions.earnThroughActivity.earnableTokens} LDAO</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current APR:</span>
                <span className="text-green-600">{acquisitionOptions.stakingRewards.currentAPR}</span>
              </div>
            </div>
            <div className="space-y-2">
              <button className="w-full py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition">
                Buy with ETH
              </button>
              <button className="w-full py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition">
                Earn Tokens
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'staking' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Staking Benefits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stakingInfo.stakingBenefits.map((benefit, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-1">{benefit.name}</h4>
                    <p className="text-green-600 text-lg mb-1">{benefit.value}</p>
                    <p className="text-sm text-gray-600">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tier Progress</h3>
              <div className="text-center mb-4">
                <h2 className={`text-2xl font-bold mb-0 ${tierInfo.color}`}>{tierInfo.name}</h2>
                <p className="text-gray-600 text-sm">LDAO Staking Tier</p>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Voting Power</p>
                  <p className="text-xl font-semibold text-gray-900">{stakingInfo.votingPower}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Rewards Earned</p>
                  <p className="text-xl font-semibold text-gray-900">{stakingInfo.rewardsEarned} LDAO</p>
                </div>
              </div>
              <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Increase Stake
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'marketplace' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Marketplace Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-900">{marketplaceBenefits.marketplaceStats.totalTransactions}</p>
                  <p className="text-sm text-gray-600 mt-1">Total Transactions</p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-900">{marketplaceBenefits.marketplaceStats.totalVolume}</p>
                  <p className="text-sm text-gray-600 mt-1">Total Volume</p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-900">{marketplaceBenefits.marketplaceStats.totalRewardsEarned}</p>
                  <p className="text-sm text-gray-600 mt-1">Rewards Earned</p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-900">{marketplaceBenefits.marketplaceStats.averageTransactionValue}</p>
                  <p className="text-sm text-gray-600 mt-1">Avg Value</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tier Benefits</h3>
              <ul className="space-y-2">
                {marketplaceBenefits.tierBenefits.map((benefit, index) => (
                  <li key={index} className="flex justify-between items-center p-3 border-b border-gray-100">
                    <span className="text-gray-700">{benefit}</span>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Active</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Marketplace Actions</h3>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Discount:</span>
                  <span className="text-green-600 font-semibold">-{marketplaceBenefits.discountPercentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fee Reduction:</span>
                  <span className="text-green-600 font-semibold">-{marketplaceBenefits.feeReductionPercentage}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <button className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                  Shop with LDAO Discount
                </button>
                <button className="w-full py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition">
                  Sell with Fee Reduction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex justify-between items-start p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{activity.description}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(activity.timestamp).toLocaleDateString()} • {activity.type}
                    </p>
                  </div>
                  <div className="flex flex-col items-end ml-4">
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${activity.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                      ${activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${activity.status === 'failed' ? 'bg-red-100 text-red-800' : ''}
                    `}>
                      {activity.status}
                    </span>
                    <p className="text-sm text-gray-900 mt-1">{activity.amount} LDAO</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No recent activity</p>
          )}
        </div>
      )}
    </div>
  );
};

export default LDAODashboard;
