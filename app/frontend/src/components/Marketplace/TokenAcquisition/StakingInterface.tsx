/**
 * Staking Interface - Allows users to stake LDAO tokens and view rewards
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ldaoTokenService } from '@/services/web3/ldaoTokenService';
import { tokenService } from '@/services/web3/tokenService';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { 
  TrendingUp, 
  Lock, 
  Calendar, 
  Zap,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { TokenInfo } from '@/types/web3Community';

interface StakingTier {
  id: number;
  lockPeriod: number; // in seconds
  rewardRate: number; // in basis points (e.g., 500 = 5%)
  minStakeAmount: string;
  isActive: boolean;
}

type LocalTokenInfo = TokenInfo & {
  priceUSD: number;
  priceChange24h: number;
};

const StakingInterface: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [tokenInfo, setTokenInfo] = useState<LocalTokenInfo | null>(null);
  const [userBalance, setUserBalance] = useState<string>('0');
  const [userStakedAmount, setUserStakedAmount] = useState<string>('0');
  const [stakingTiers, setStakingTiers] = useState<StakingTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [isConnected, address]);

  const loadData = async () => {
    if (!isConnected || !address) return;

    try {
      // Load token info
      const info = await tokenService.getTokenInfo('LDAO');
      if (info) {
        const localInfo: LocalTokenInfo = {
          ...info,
          priceUSD: info.priceUSD || 0.5,
          priceChange24h: info.priceChange24h || 0
        };
        setTokenInfo(localInfo);
      }

      // Load user balance
      const balance = await tokenService.getUserTokenBalance(address, 'LDAO');
      setUserBalance(balance.toFixed(2));

      // Load user staked amount
      const staked = await ldaoTokenService.getUserStakedAmount(address);
      setUserStakedAmount(staked);

      // Load staking tiers
      const tiers = await ldaoTokenService.getStakingTiers();
      if (tiers) {
        setStakingTiers(tiers);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleStakeAmountChange = (value: string) => {
    // Only allow numeric values and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setStakeAmount(value);
    }
  };

  const handleMaxAmount = () => {
    setStakeAmount(userBalance);
  };

  const calculateReward = (amount: string, tier: StakingTier): string => {
    if (!amount || !tier) return '0';
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return '0';
    
    // Calculate annual reward
    const annualReward = (amountNum * tier.rewardRate) / 10000;
    
    // Calculate lock period in years
    const lockPeriodYears = tier.lockPeriod / (365 * 24 * 60 * 60);
    
    // Calculate total reward for lock period
    const totalReward = annualReward * lockPeriodYears;
    
    return totalReward.toFixed(2);
  };

  const formatLockPeriod = (seconds: number): string => {
    const days = seconds / (24 * 60 * 60);
    if (days >= 365) {
      return `${(days / 365).toFixed(1)} years`;
    } else if (days >= 30) {
      return `${(days / 30).toFixed(1)} months`;
    } else {
      return `${days} days`;
    }
  };

  const handleStake = async () => {
    if (!isConnected || !address || !selectedTier || !stakeAmount) {
      setErrorMessage('Please connect your wallet, select a tier, and enter an amount');
      return;
    }

    const amountNum = parseFloat(stakeAmount);
    const selectedTierData = stakingTiers.find(t => t.id === selectedTier);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }

    if (!selectedTierData) {
      setErrorMessage('Please select a staking tier');
      return;
    }

    if (amountNum < parseFloat(selectedTierData.minStakeAmount)) {
      setErrorMessage(`Minimum stake amount is ${selectedTierData.minStakeAmount} LDAO`);
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    setTransactionStatus('idle');

    try {
      const result = await ldaoTokenService.stakeTokens(stakeAmount, selectedTier);
      
      if (result.success) {
        setTransactionStatus('success');
        // Refresh data
        await loadData();
        // Reset form
        setStakeAmount('');
        setSelectedTier(null);
        // Clear success message after delay
        setTimeout(() => {
          setTransactionStatus('idle');
        }, 3000);
      } else {
        setTransactionStatus('error');
        setErrorMessage(result.error || 'Staking failed');
      }
    } catch (error) {
      setTransactionStatus('error');
      setErrorMessage('An unexpected error occurred');
      console.error('Staking error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isConnected) {
    return (
      <GlassPanel variant="secondary" className="p-6 text-center">
        <Lock className="mx-auto text-white/50 mb-4" size={48} />
        <h3 className="text-xl font-bold text-white mb-2">Connect Wallet to Stake</h3>
        <p className="text-white/70 mb-4">
          Connect your wallet to view staking options and stake your LDAO tokens.
        </p>
        <Button variant="primary">Connect Wallet</Button>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-6">
      {/* Staking Overview */}
      <GlassPanel variant="secondary" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
            <TrendingUp className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Staking Dashboard</h2>
            <p className="text-white/70">Earn rewards by staking your LDAO tokens</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-sm text-white/70 mb-1">Available Balance</div>
            <div className="text-xl font-bold text-white">{userBalance} LDAO</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-sm text-white/70 mb-1">Currently Staked</div>
            <div className="text-xl font-bold text-white">{userStakedAmount} LDAO</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-sm text-white/70 mb-1">Total Value</div>
            <div className="text-xl font-bold text-white">
              ${((parseFloat(userBalance) + parseFloat(userStakedAmount)) * (tokenInfo?.priceUSD || 0.5)).toFixed(2)}
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Staking Tiers */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Staking Tiers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stakingTiers.map((tier) => (
            <GlassPanel 
              key={tier.id}
              variant="secondary" 
              className={`p-4 cursor-pointer transition-all ${
                selectedTier === tier.id 
                  ? 'ring-2 ring-purple-500 bg-purple-500/10' 
                  : 'hover:bg-white/10'
              }`}
              onClick={() => setSelectedTier(tier.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-white">
                  {formatLockPeriod(tier.lockPeriod)}
                </div>
                {selectedTier === tier.id && (
                  <CheckCircle className="text-purple-400" size={20} />
                )}
              </div>
              
              <div className="text-2xl font-bold text-green-400 mb-2">
                {tier.rewardRate / 100}% APR
              </div>
              
              <div className="text-sm text-white/70 mb-3">
                Minimum: {tier.minStakeAmount} LDAO
              </div>
              
              <div className="text-sm text-white/60">
                {tier.isActive ? 'Active' : 'Inactive'}
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>

      {/* Stake Form */}
      {selectedTier && (
        <GlassPanel variant="secondary" className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">Stake LDAO Tokens</h3>
          
          <div className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Amount to Stake
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={stakeAmount}
                  onChange={(e) => handleStakeAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleMaxAmount}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded"
                >
                  MAX
                </button>
              </div>
              <div className="mt-1 text-sm text-white/60">
                Available: {userBalance} LDAO
              </div>
            </div>

            {/* Reward Preview */}
            {stakeAmount && selectedTier && (
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-white/70">Estimated Reward</div>
                    <div className="text-lg font-bold text-green-400">
                      +{calculateReward(stakeAmount, stakingTiers.find(t => t.id === selectedTier)!)} LDAO
                    </div>
                  </div>
                  <Zap className="text-yellow-400" size={24} />
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-red-500/20 rounded-lg text-red-300">
                <AlertCircle size={16} />
                <span className="text-sm">{errorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {transactionStatus === 'success' && (
              <div className="flex items-center gap-2 p-3 bg-green-500/20 rounded-lg text-green-300">
                <CheckCircle size={16} />
                <span className="text-sm">Staking successful! Your tokens are now locked.</span>
              </div>
            )}

            {/* Action Button */}
            <Button
              variant="primary"
              onClick={handleStake}
              disabled={isProcessing || !isConnected}
              className="w-full flex items-center justify-center gap-2 py-3"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Lock size={18} />
                  Stake LDAO Tokens
                </>
              )}
            </Button>
          </div>
        </GlassPanel>
      )}

      {/* Staking Information */}
      <GlassPanel variant="secondary" className="p-6">
        <h3 className="text-xl font-bold text-white mb-4">How Staking Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Lock size={16} className="text-purple-400" />
            </div>
            <div>
              <div className="font-medium text-white mb-1">Lock Period</div>
              <div className="text-sm text-white/70">
                Tokens are locked for the selected period. Longer periods offer higher rewards.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={16} className="text-green-400" />
            </div>
            <div>
              <div className="font-medium text-white mb-1">Earn Rewards</div>
              <div className="text-sm text-white/70">
                Receive LDAO rewards based on your stake amount and lock period.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Calendar size={16} className="text-blue-400" />
            </div>
            <div>
              <div className="font-medium text-white mb-1">Unlock Date</div>
              <div className="text-sm text-white/70">
                Your tokens and rewards will be available after the lock period ends.
              </div>
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};

export default StakingInterface;