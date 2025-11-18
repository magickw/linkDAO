import React, { useState } from 'react';
import { StakingInfo, StakingEvent } from '@/types/tokenActivity';
import { TokenInfo } from '@/types/web3Community';

interface StakingAnalyticsProps {
  stakingInfo: StakingInfo;
  userAddress?: string;
  token?: TokenInfo;
  timeRange?: '24h' | '7d' | '30d' | '90d';
  className?: string;
}

interface AnalyticsData {
  totalVolume: number;
  averageStake: number;
  stakingVelocity: number; // stakes per hour
  topStakerPercentage: number;
  rewardDistribution: number;
  stakingTrend: 'up' | 'down' | 'stable';
  projectedAPY: number;
}

interface ChartDataPoint {
  timestamp: Date;
  totalStaked: number;
  stakerCount: number;
  averageStake: number;
}

export const StakingAnalytics: React.FC<StakingAnalyticsProps> = ({
  stakingInfo,
  userAddress,
  token,
  timeRange = '7d',
  className = ''
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'volume' | 'stakers' | 'rewards'>('volume');

  // Generate mock analytics data
  const generateAnalyticsData = (): AnalyticsData => {
    const totalVolume = stakingInfo.totalStaked * (1 + Math.random() * 0.5); // 100-150% of current stake
    const averageStake = stakingInfo.totalStaked / stakingInfo.stakerCount;
    const stakingVelocity = Math.random() * 5 + 1; // 1-6 stakes per hour
    const topStakerPercentage = 30 + Math.random() * 20; // 30-50%
    const rewardDistribution = stakingInfo.totalStaked * 0.12; // 12% APY
    const stakingTrend = Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'stable' : 'down';
    const projectedAPY = 8 + Math.random() * 12; // 8-20% APY

    return {
      totalVolume,
      averageStake,
      stakingVelocity,
      topStakerPercentage,
      rewardDistribution,
      stakingTrend,
      projectedAPY
    };
  };

  // Generate mock chart data
  const generateChartData = (): ChartDataPoint[] => {
    const points: ChartDataPoint[] = [];
    const now = new Date();
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const intervals = timeRange === '24h' ? 24 : days;

    for (let i = intervals; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * (timeRange === '24h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000)));
      const progress = (intervals - i) / intervals;
      
      // Simulate growth over time with some volatility
      const baseGrowth = progress * stakingInfo.totalStaked;
      const volatility = (Math.random() - 0.5) * stakingInfo.totalStaked * 0.1;
      const totalStaked = Math.max(0, baseGrowth + volatility);
      
      const stakerCount = Math.max(1, Math.floor(progress * stakingInfo.stakerCount + (Math.random() - 0.5) * 5));
      const averageStake = totalStaked / stakerCount;

      points.push({
        timestamp,
        totalStaked,
        stakerCount,
        averageStake
      });
    }

    return points;
  };

  const analytics = generateAnalyticsData();
  const chartData = generateChartData();

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toFixed(2);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return { icon: '📈', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' };
      case 'down':
        return { icon: '📉', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' };
      default:
        return { icon: '📊', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' };
    }
  };

  const trendInfo = getTrendIcon(analytics.stakingTrend);

  const timeRangeOptions = [
    { value: '24h', label: '24H' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' }
  ];

  const metricOptions = [
    { value: 'volume', label: 'Volume', icon: '💰' },
    { value: 'stakers', label: 'Stakers', icon: '👥' },
    { value: 'rewards', label: 'Rewards', icon: '🎁' }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Staking Analytics
        </h3>
        
        <div className="flex items-center space-x-2">
          {/* Time range selector */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {timeRangeOptions.map((option) => (
              <button
                key={option.value}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  timeRange === option.value
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Volume</div>
            <span className={`text-lg ${trendInfo.color}`}>{trendInfo.icon}</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {formatAmount(analytics.totalVolume)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {token?.symbol || 'tokens'}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Stake</div>
            <span className="text-lg">📊</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {formatAmount(analytics.averageStake)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            per staker
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">Velocity</div>
            <span className="text-lg">⚡</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {analytics.stakingVelocity.toFixed(1)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            stakes/hour
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">Projected APY</div>
            <span className="text-lg">🎯</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {analytics.projectedAPY.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            annual yield
          </div>
        </div>
      </div>

      {/* Chart section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            Staking Trends
          </h4>
          
          {/* Metric selector */}
          <div className="flex space-x-1">
            {metricOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedMetric(option.value as any)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  selectedMetric === option.value
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span className="mr-1">{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Simple chart visualization */}
        <div className="space-y-2">
          {(() => {
            // Calculate maxValue once outside the loop for efficiency
            const maxValue = Math.max(...chartData.map(p => 
              selectedMetric === 'volume' ? p.totalStaked :
              selectedMetric === 'stakers' ? p.stakerCount :
              p.averageStake
            ));
            
            return chartData.slice(-10).map((point, index) => {
              const value = selectedMetric === 'volume' ? point.totalStaked :
                           selectedMetric === 'stakers' ? point.stakerCount :
                           point.averageStake;
              
              const percentage = (value / maxValue) * 100;
              
              return (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-16 text-xs text-gray-500 dark:text-gray-400">
                    {point.timestamp.toLocaleDateString()}
                  </div>
                  
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  
                  <div className="w-20 text-xs text-gray-600 dark:text-gray-400 text-right">
                    {selectedMetric === 'stakers' ? value.toFixed(0) : formatAmount(value)}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Distribution analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
          Staking Distribution
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Concentration metrics */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Top Staker Share</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {analytics.topStakerPercentage.toFixed(1)}%
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Gini Coefficient</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                0.{Math.floor(Math.random() * 40 + 30)} {/* 0.30-0.70 */}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Median Stake</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatAmount(analytics.averageStake * 0.6)} {token?.symbol || ''}
              </span>
            </div>
          </div>

          {/* Reward projections */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Rewards Pool</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatAmount(analytics.rewardDistribution)} {token?.symbol || ''}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Daily Rewards</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatAmount(analytics.rewardDistribution / 365)} {token?.symbol || ''}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Your Share</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {stakingInfo.userStake ? 
                  ((stakingInfo.userStake / stakingInfo.totalStaked) * 100).toFixed(2) + '%' : 
                  '0%'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance insights */}
      <div className={`p-4 rounded-lg border ${trendInfo.bg} ${trendInfo.color.replace('text-', 'border-')}`}>
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{trendInfo.icon}</span>
          <div>
            <div className="font-semibold">
              Staking is trending {analytics.stakingTrend}
            </div>
            <div className="text-sm opacity-75">
              {analytics.stakingTrend === 'up' && 'Increased activity and growing stake amounts'}
              {analytics.stakingTrend === 'down' && 'Decreased activity, consider boosting rewards'}
              {analytics.stakingTrend === 'stable' && 'Steady staking activity with consistent growth'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StakingAnalytics;