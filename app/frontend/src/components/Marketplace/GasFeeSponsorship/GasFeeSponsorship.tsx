/**
 * GasFeeSponsorship - Gas fee sponsorship system for seamless Web3 transactions
 * Features: Fee estimation, sponsorship management, DAO treasury integration
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Shield, Coins, TrendingUp, Users, Clock, CheckCircle, 
  AlertTriangle, Info, Gift, Wallet, ArrowRight, RefreshCw
} from 'lucide-react';
import { useAccount, useBalance, useGasPrice } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { Button } from '../../../design-system/components/Button';

interface GasFeeEstimate {
  transactionType: string;
  gasLimit: bigint;
  gasPrice: bigint;
  estimatedCost: bigint;
  usdValue?: number;
}

interface SponsorshipTier {
  id: string;
  name: string;
  description: string;
  coveragePercentage: number;
  requirements: {
    minReputation?: number;
    minTransactions?: number;
    daoMember?: boolean;
    stakingAmount?: string;
  };
  maxSponsorshipPerDay: string;
  icon: React.ComponentType<any>;
  color: string;
}

interface GasFeeSponsorshipProps {
  transactionType: 'marketplace_purchase' | 'escrow_create' | 'dispute_resolve' | 'generic';
  estimatedGasLimit?: bigint;
  onSponsorshipApplied?: (sponsorship: any) => void;
  userReputation?: number;
  userTransactionCount?: number;
  isDaoMember?: boolean;
}

export const GasFeeSponsorship: React.FC<GasFeeSponsorshipProps> = ({
  transactionType,
  estimatedGasLimit,
  onSponsorshipApplied,
  userReputation = 0,
  userTransactionCount = 0,
  isDaoMember = false
}) => {
  const [gasEstimate, setGasEstimate] = useState<GasFeeEstimate | null>(null);
  const [selectedTier, setSelectedTier] = useState<SponsorshipTier | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sponsorshipStatus, setSponsorshipStatus] = useState<'none' | 'checking' | 'approved' | 'rejected'>('none');
  const [dailySponsorshipUsed, setDailySponsorshipUsed] = useState('0');
  
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { data: gasPrice } = useGasPrice();

  // Sponsorship tiers configuration
  const sponsorshipTiers: SponsorshipTier[] = [
    {
      id: 'newcomer',
      name: 'Newcomer Support',
      description: 'Gas fee support for new users getting started',
      coveragePercentage: 50,
      requirements: {
        // No requirements for newcomers
      },
      maxSponsorshipPerDay: '0.01',
      icon: Users,
      color: 'blue'
    },
    {
      id: 'community',
      name: 'Community Member',
      description: 'Enhanced support for active community members',
      coveragePercentage: 75,
      requirements: {
        minReputation: 100,
        minTransactions: 5
      },
      maxSponsorshipPerDay: '0.05',
      icon: Shield,
      color: 'green'
    },
    {
      id: 'dao_member',
      name: 'DAO Member',
      description: 'Premium gas sponsorship for DAO governance participants',
      coveragePercentage: 90,
      requirements: {
        daoMember: true,
        minReputation: 250
      },
      maxSponsorshipPerDay: '0.1',
      icon: Coins,
      color: 'purple'
    },
    {
      id: 'high_volume',
      name: 'High Volume Trader',
      description: 'Full gas sponsorship for frequent marketplace users',
      coveragePercentage: 100,
      requirements: {
        minTransactions: 50,
        minReputation: 500
      },
      maxSponsorshipPerDay: '0.2',
      icon: TrendingUp,
      color: 'gold'
    }
  ];

  // Estimate gas fees based on transaction type
  useEffect(() => {
    if (gasPrice) {
      const gasLimitMap = {
        marketplace_purchase: BigInt(150000),
        escrow_create: BigInt(200000),
        dispute_resolve: BigInt(100000),
        generic: BigInt(21000)
      };

      const gasLimit = estimatedGasLimit || gasLimitMap[transactionType];
      const estimatedCost = gasLimit * gasPrice;

      setGasEstimate({
        transactionType,
        gasLimit,
        gasPrice,
        estimatedCost,
        usdValue: parseFloat(formatEther(estimatedCost)) * 2500 // Mock ETH price
      });
    }
  }, [gasPrice, transactionType, estimatedGasLimit]);

  // Check eligibility for sponsorship tiers
  const checkEligibility = (tier: SponsorshipTier): boolean => {
    const { requirements } = tier;
    
    if (requirements.minReputation && userReputation < requirements.minReputation) return false;
    if (requirements.minTransactions && userTransactionCount < requirements.minTransactions) return false;
    if (requirements.daoMember && !isDaoMember) return false;
    
    return true;
  };

  // Get eligible tiers sorted by coverage percentage
  const eligibleTiers = sponsorshipTiers
    .filter(tier => checkEligibility(tier))
    .sort((a, b) => b.coveragePercentage - a.coveragePercentage);

  // Get the best available tier
  const bestTier = eligibleTiers[0];

  // Apply for sponsorship
  const applyForSponsorship = async (tier: SponsorshipTier) => {
    if (!gasEstimate) return;

    setIsLoading(true);
    setSponsorshipStatus('checking');

    try {
      // Simulate API call to sponsorship service
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check daily limit
      const dailyUsed = parseFloat(dailySponsorshipUsed);
      const maxDaily = parseFloat(tier.maxSponsorshipPerDay);
      const currentTransactionCost = parseFloat(formatEther(gasEstimate.estimatedCost));
      const sponsoredAmount = currentTransactionCost * (tier.coveragePercentage / 100);

      if (dailyUsed + sponsoredAmount > maxDaily) {
        setSponsorshipStatus('rejected');
        return;
      }

      // Approve sponsorship
      setSponsorshipStatus('approved');
      setSelectedTier(tier);
      setDailySponsorshipUsed((dailyUsed + sponsoredAmount).toString());

      // Notify parent component
      if (onSponsorshipApplied) {
        onSponsorshipApplied({
          tier,
          originalCost: gasEstimate.estimatedCost,
          sponsoredAmount: parseEther(sponsoredAmount.toString()),
          userPayAmount: parseEther((currentTransactionCost - sponsoredAmount).toString())
        });
      }

    } catch (error) {
      setSponsorshipStatus('rejected');
      console.error('Sponsorship application failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset sponsorship
  const resetSponsorship = () => {
    setSponsorshipStatus('none');
    setSelectedTier(null);
  };

  if (!isConnected || !gasEstimate) {
    return (
      <GlassPanel variant="primary" className="p-6">
        <div className="text-center">
          <Wallet size={32} className="mx-auto text-gray-400 mb-2" />
          <p className="text-gray-600 dark:text-gray-400">
            {!isConnected ? 'Connect wallet to check gas sponsorship' : 'Loading gas estimates...'}
          </p>
        </div>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gas Fee Estimate */}
      <GlassPanel variant="primary" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Zap size={20} className="mr-2 text-yellow-500" />
            Gas Fee Estimate
          </h3>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="p-2"
          >
            <RefreshCw size={16} />
          </Button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Gas Limit</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {gasEstimate.gasLimit.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Gas Price</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {parseFloat(formatEther(gasEstimate.gasPrice * BigInt(1000000000))).toFixed(2)} Gwei
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Cost</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {parseFloat(formatEther(gasEstimate.estimatedCost)).toFixed(6)} ETH
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">USD Value</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              ${gasEstimate.usdValue?.toFixed(2) || '0.00'}
            </p>
          </div>
        </div>
      </GlassPanel>

      {/* Sponsorship Status */}
      <AnimatePresence mode="wait">
        {sponsorshipStatus === 'none' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {eligibleTiers.length > 0 ? (
              <GlassPanel variant="primary" className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Gift size={20} className="mr-2 text-blue-500" />
                  Gas Fee Sponsorship Available
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {eligibleTiers.slice(0, 2).map((tier) => {
                    const IconComponent = tier.icon;
                    const colorClasses = {
                      blue: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
                      green: 'border-green-500/50 bg-green-500/10 text-green-400',
                      purple: 'border-purple-500/50 bg-purple-500/10 text-purple-400',
                      gold: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
                    };
                    
                    return (
                      <motion.div
                        key={tier.id}
                        className={`p-4 rounded-lg border ${colorClasses[tier.color as keyof typeof colorClasses]} cursor-pointer transition-all hover:scale-105`}
                        onClick={() => applyForSponsorship(tier)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <IconComponent size={20} />
                            <h4 className="font-medium">{tier.name}</h4>
                          </div>
                          <span className="text-xl font-bold">{tier.coveragePercentage}%</span>
                        </div>
                        
                        <p className="text-sm opacity-80 mb-3">{tier.description}</p>
                        
                        <div className="space-y-1 text-xs opacity-70">
                          <p>Daily Limit: {tier.maxSponsorshipPerDay} ETH</p>
                          <p>Your Savings: ${((gasEstimate.usdValue || 0) * tier.coveragePercentage / 100).toFixed(2)}</p>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                          <div className="flex items-center justify-between text-sm">
                            <span>You Pay:</span>
                            <span className="font-semibold">
                              ${((gasEstimate.usdValue || 0) * (100 - tier.coveragePercentage) / 100).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                
                {bestTier && (
                  <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center space-x-2 text-green-400">
                      <CheckCircle size={16} />
                      <span className="text-sm font-medium">
                        Recommended: {bestTier.name} - Save ${((gasEstimate.usdValue || 0) * bestTier.coveragePercentage / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </GlassPanel>
            ) : (
              <GlassPanel variant="primary" className="p-6">
                <div className="text-center">
                  <AlertTriangle size={32} className="mx-auto text-yellow-500 mb-2" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No Sponsorship Available
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Increase your reputation or transaction count to qualify for gas sponsorship.
                  </p>
                  
                  <div className="text-left space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p><strong>Requirements for sponsorship:</strong></p>
                    <ul className="space-y-1 ml-4">
                      <li>\u2022 Minimum 5 successful transactions</li>
                      <li>\u2022 Reputation score of 100+</li>
                      <li>\u2022 DAO membership (for premium tiers)</li>
                    </ul>
                  </div>
                </div>
              </GlassPanel>
            )}
          </motion.div>
        )}
        
        {sponsorshipStatus === 'checking' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <GlassPanel variant="primary" className="p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500/30 border-t-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Checking Sponsorship Eligibility
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Verifying your account status and daily limits...
                </p>
              </div>
            </GlassPanel>
          </motion.div>
        )}
        
        {sponsorshipStatus === 'approved' && selectedTier && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <GlassPanel variant="primary" className="p-6 border-2 border-green-500/50">
              <div className="text-center mb-4">
                <CheckCircle size={48} className="mx-auto text-green-500 mb-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Sponsorship Approved!
                </h3>
              </div>
              
              <div className="bg-green-500/10 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Tier</p>
                    <p className="text-gray-900 dark:text-white font-medium">{selectedTier.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Coverage</p>
                    <p className="text-gray-900 dark:text-white font-medium">{selectedTier.coveragePercentage}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Original Cost</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      ${gasEstimate.usdValue?.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">You Pay</p>
                    <p className="text-green-600 dark:text-green-400 font-bold">
                      ${((gasEstimate.usdValue || 0) * (100 - selectedTier.coveragePercentage) / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    // Proceed with sponsored transaction
                    console.log('Proceeding with sponsored transaction');
                  }}
                >
                  Proceed with Sponsorship
                  <ArrowRight size={16} className="ml-2" />
                </Button>
                <Button
                  variant="outline"
                  onClick={resetSponsorship}
                >
                  Reset
                </Button>
              </div>
            </GlassPanel>
          </motion.div>
        )}
        
        {sponsorshipStatus === 'rejected' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <GlassPanel variant="primary" className="p-6 border-2 border-red-500/50">
              <div className="text-center">
                <AlertTriangle size={48} className="mx-auto text-red-500 mb-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Sponsorship Unavailable
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  You've reached your daily sponsorship limit or don't meet the requirements.
                </p>
                
                <div className="bg-red-500/10 p-4 rounded-lg mb-4 text-left">
                  <p className="text-sm text-red-400 mb-2"><strong>Daily Usage:</strong></p>
                  <div className="w-full bg-red-500/20 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{ width: '85%' }}
                    />
                  </div>
                  <p className="text-xs text-red-400 mt-1">
                    {dailySponsorshipUsed} ETH / {bestTier?.maxSponsorshipPerDay || '0.05'} ETH used today
                  </p>
                </div>
                
                <Button
                  variant="outline"
                  onClick={resetSponsorship}
                  className="w-full"
                >
                  Pay Full Gas Fee
                </Button>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Daily Usage Summary */}
      <GlassPanel variant="secondary" className="p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Clock size={16} className="text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">Daily Sponsorship Usage</span>
          </div>
          <span className="text-gray-900 dark:text-white font-medium">
            {dailySponsorshipUsed} ETH / {bestTier?.maxSponsorshipPerDay || '0.05'} ETH
          </span>
        </div>
      </GlassPanel>
    </div>
  );
};

// Gas Fee Sponsorship Manager Component
export const GasFeeSponsorshipManager: React.FC = () => {
  const [sponsorshipStats, setSponsorshipStats] = useState({
    totalSponsored: '2.45',
    activeUsers: 1247,
    dailyLimit: '10.0',
    utilizationRate: 73
  });
  
  return (
    <div className="space-y-6">
      <GlassPanel variant="primary" className="p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <Zap size={24} className="mr-3 text-yellow-500" />
          Gas Fee Sponsorship Dashboard
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500 mb-1">
              {sponsorshipStats.totalSponsored} ETH
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Sponsored Today
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500 mb-1">
              {sponsorshipStats.activeUsers.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Active Users
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-500 mb-1">
              {sponsorshipStats.dailyLimit} ETH
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Daily Limit
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500 mb-1">
              {sponsorshipStats.utilizationRate}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Utilization Rate
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <Info size={20} className="text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-400">
              <p className="font-medium mb-1">How Gas Fee Sponsorship Works</p>
              <ul className="space-y-1 text-blue-300/80">
                <li>\u2022 DAO treasury funds gas fee sponsorship pool</li>
                <li>\u2022 Users qualify based on reputation and activity</li>
                <li>\u2022 Sponsorship reduces barriers to Web3 adoption</li>
                <li>\u2022 Daily limits prevent abuse while encouraging usage</li>
              </ul>
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};