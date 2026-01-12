import React, { useState } from 'react';
import {
  StakingIndicator,
  StakingTierBadge,
  StakingTooltip,
  StakingProgressBar,
  BoostButton,
  StakingAmountInput,
  RealTimeStakingUpdates,
  MultiStakerDisplay,
  UserStakingStatus,
  StakingAnalytics
} from './index';
import { StakingInfo } from '@/types/tokenActivity';
import { TokenInfo } from '@/types/web3Community';

/**
 * Demo component showcasing the complete token staking visualization system
 * This demonstrates all the staking components working together
 */
export const StakingSystemDemo: React.FC = () => {
  // Mock data for demonstration
  const [stakingInfo, setStakingInfo] = useState<StakingInfo>({
    totalStaked: 1250.75,
    stakerCount: 23,
    stakingTier: 'gold',
    userStake: 45.5,
    potentialRewards: 12.3,
    nextRewardDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    stakingHistory: [
      {
        id: '1',
        type: 'stake',
        amount: 25.0,
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        userAddress: '0x1234567890123456789012345678901234567890',
        relatedPostId: 'post-123'
      },
      {
        id: '2',
        type: 'reward',
        amount: 2.5,
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        userAddress: '0x1234567890123456789012345678901234567890',
        relatedPostId: 'post-123'
      }
    ]
  });

  const mockToken: TokenInfo = {
    address: '0x1234567890123456789012345678901234567890',
    symbol: 'LNK',
    decimals: 18,
    name: 'LinkDAO Token',
    logoUrl: 'https://placehold.co/32x32/3B82F6/FFFFFF?text=LNK',
    priceUSD: 1.25,
    priceChange24h: 5.67
  };

  const userAddress = '0x1234567890123456789012345678901234567890';
  const userBalance = 150.0;

  // Handler functions
  const handleBoost = async (postId: string, amount: number) => {
    console.log(`Boosting post ${postId} with ${amount} tokens`);

    // Simulate staking transaction
    setStakingInfo(prev => ({
      ...prev,
      totalStaked: prev.totalStaked + amount,
      userStake: (prev.userStake || 0) + amount,
      stakerCount: prev.userStake ? prev.stakerCount : prev.stakerCount + 1,
      stakingTier: prev.totalStaked + amount >= 1000 ? 'gold' :
        prev.totalStaked + amount >= 100 ? 'silver' :
          prev.totalStaked + amount >= 10 ? 'bronze' : 'none'
    }));
  };

  const handleAmountChange = (amount: number) => {
    console.log(`Amount changed to: ${amount}`);
  };

  const handleGasFeeEstimate = async (amount: number): Promise<number> => {
    // Simulate gas fee calculation
    return amount * 0.001 * mockToken.priceUSD!; // 0.1% of transaction value
  };

  const handleStakingUpdate = (updatedInfo: StakingInfo) => {
    setStakingInfo(updatedInfo);
  };

  const handleUnstake = async (amount: number) => {
    console.log(`Unstaking ${amount} tokens`);

    setStakingInfo(prev => ({
      ...prev,
      totalStaked: Math.max(0, prev.totalStaked - amount),
      userStake: Math.max(0, (prev.userStake || 0) - amount),
      stakerCount: (prev.userStake || 0) - amount <= 0 ? prev.stakerCount - 1 : prev.stakerCount
    }));
  };

  const handleClaimRewards = async () => {
    console.log('Claiming rewards');
    // Simulate reward claiming
  };

  const handleStakerClick = (address: string) => {
    console.log(`Clicked on staker: ${address}`);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Token Staking Visualization System
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Complete demonstration of Web3-native staking components with visual indicators,
          real-time updates, and comprehensive analytics.
        </p>
      </div>

      {/* Basic Indicators Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Basic Staking Indicators
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
            <h3 className="font-medium mb-3">Staking Indicator</h3>
            <StakingIndicator
              stakingInfo={stakingInfo}
              token={mockToken}
              size="md"
              showTooltip={true}
            />
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
            <h3 className="font-medium mb-3">Tier Badge</h3>
            <div className="flex items-center space-x-4">
              <StakingTierBadge
                stakingInfo={stakingInfo}
                showLabel={true}
                size="lg"
              />
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
            <h3 className="font-medium mb-3">Progress Bar</h3>
            <StakingProgressBar
              stakingInfo={stakingInfo}
              showLabels={true}
              height="md"
              animated={true}
            />
          </div>
        </div>
      </section>

      {/* Interactive Components Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Interactive Staking Components
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
            <h3 className="font-medium mb-3">Boost Button</h3>
            <BoostButton
              postId="demo-post"
              currentStake={stakingInfo.userStake}
              userBalance={userBalance}
              token={mockToken}
              onBoost={handleBoost}
              size="md"
              variant="primary"
            />
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
            <h3 className="font-medium mb-3">Amount Input</h3>
            <StakingAmountInput
              token={mockToken}
              userBalance={userBalance}
              currentStake={stakingInfo.userStake}
              onAmountChange={handleAmountChange}
              onGasFeeEstimate={handleGasFeeEstimate}
            />
          </div>
        </div>
      </section>

      {/* Real-time Updates Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Real-time Updates & Multi-staker Support
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
            <RealTimeStakingUpdates
              communityIds={["demo-community"]}
              showAnimations={true}
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
            <MultiStakerDisplay
              stakingInfo={stakingInfo}
              token={mockToken}
              maxDisplayStakers={5}
              showPercentages={true}
              showAvatars={true}
              onStakerClick={handleStakerClick}
            />
          </div>
        </div>
      </section>

      {/* User Status Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          User Staking Status & Analytics
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
            <UserStakingStatus
              stakingInfo={stakingInfo}
              userAddress={userAddress}
              token={mockToken}
              showRewards={true}
              showHistory={true}
              onUnstake={handleUnstake}
              onClaimRewards={handleClaimRewards}
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
            <StakingAnalytics
              stakingInfo={stakingInfo}
              userAddress={userAddress}
              token={mockToken}
              timeRange="7d"
            />
          </div>
        </div>
      </section>

      {/* Tooltip Demo Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Tooltip Integration
        </h2>

        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Hover over the elements below to see detailed staking information:
          </p>

          <div className="flex items-center space-x-6">
            <StakingTooltip
              stakingInfo={stakingInfo}
              token={mockToken}
              position="top"
              showMechanics={true}
            >
              <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg cursor-help">
                Hover for staking info
              </div>
            </StakingTooltip>

            <StakingTooltip
              stakingInfo={stakingInfo}
              token={mockToken}
              position="bottom"
              showMechanics={false}
            >
              <div className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg cursor-help">
                Hover for quick stats
              </div>
            </StakingTooltip>
          </div>
        </div>
      </section>

      {/* Integration Example */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Complete Integration Example
        </h2>

        <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <StakingTierBadge stakingInfo={stakingInfo} size="md" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Sample Post with Staking
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This demonstrates how staking components integrate with post content
                </p>
              </div>
            </div>

            <StakingIndicator
              stakingInfo={stakingInfo}
              token={mockToken}
              size="sm"
            />
          </div>

          <div className="mb-4">
            <StakingProgressBar
              stakingInfo={stakingInfo}
              showLabels={true}
              height="sm"
              animated={true}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {stakingInfo.stakerCount} stakers • {stakingInfo.totalStaked.toFixed(2)} {mockToken.symbol} staked
            </div>

            <BoostButton
              postId="demo-post"
              currentStake={stakingInfo.userStake}
              userBalance={userBalance}
              token={mockToken}
              onBoost={handleBoost}
              size="sm"
              variant="outline"
            />
          </div>
        </div>
      </section>

      {/* Implementation Notes */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Implementation Notes
        </h2>

        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border">
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <p><strong>✅ Completed Features:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Prominent staking indicators with token icons and amounts</li>
              <li>Color coding system (gold/silver/bronze tiers)</li>
              <li>Hover tooltips explaining staking mechanics</li>
              <li>"Boost" buttons for staking tokens to increase post visibility</li>
              <li>Staking amount input interfaces with gas fee estimation</li>
              <li>Real-time staking updates with smooth animations</li>
              <li>Multi-staker support showing total staked amount and staker count</li>
              <li>User personal staking status and potential rewards</li>
              <li>Staking history and analytics for users</li>
            </ul>

            <p className="mt-4"><strong>🔧 Integration Requirements:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Import staking CSS animations: <code>@import './styles/staking-animations.css'</code></li>
              <li>Connect to Web3 wallet context for user interactions</li>
              <li>Integrate with backend APIs for real staking data</li>
              <li>Add WebSocket connections for real-time updates</li>
              <li>Configure gas fee estimation service</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StakingSystemDemo;