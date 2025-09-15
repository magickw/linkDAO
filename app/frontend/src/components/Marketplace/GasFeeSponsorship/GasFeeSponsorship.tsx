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
      <GlassPanel variant=\"primary\" className=\"p-6\">
        <div className=\"text-center\">\n          <Wallet size={32} className=\"mx-auto text-gray-400 mb-2\" />\n          <p className=\"text-gray-600 dark:text-gray-400\">\n            {!isConnected ? 'Connect wallet to check gas sponsorship' : 'Loading gas estimates...'}\n          </p>\n        </div>\n      </GlassPanel>\n    );\n  }\n\n  return (\n    <div className=\"space-y-6\">\n      {/* Gas Fee Estimate */}\n      <GlassPanel variant=\"primary\" className=\"p-6\">\n        <div className=\"flex items-center justify-between mb-4\">\n          <h3 className=\"text-lg font-semibold text-gray-900 dark:text-white flex items-center\">\n            <Zap size={20} className=\"mr-2 text-yellow-500\" />\n            Gas Fee Estimate\n          </h3>\n          <Button\n            variant=\"outline\"\n            onClick={() => window.location.reload()}\n            className=\"p-2\"\n          >\n            <RefreshCw size={16} />\n          </Button>\n        </div>\n        \n        <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4\">\n          <div>\n            <p className=\"text-sm text-gray-600 dark:text-gray-400\">Gas Limit</p>\n            <p className=\"text-lg font-semibold text-gray-900 dark:text-white\">\n              {gasEstimate.gasLimit.toLocaleString()}\n            </p>\n          </div>\n          <div>\n            <p className=\"text-sm text-gray-600 dark:text-gray-400\">Gas Price</p>\n            <p className=\"text-lg font-semibold text-gray-900 dark:text-white\">\n              {parseFloat(formatEther(gasEstimate.gasPrice * BigInt(1000000000))).toFixed(2)} Gwei\n            </p>\n          </div>\n          <div>\n            <p className=\"text-sm text-gray-600 dark:text-gray-400\">Estimated Cost</p>\n            <p className=\"text-lg font-semibold text-gray-900 dark:text-white\">\n              {parseFloat(formatEther(gasEstimate.estimatedCost)).toFixed(6)} ETH\n            </p>\n          </div>\n          <div>\n            <p className=\"text-sm text-gray-600 dark:text-gray-400\">USD Value</p>\n            <p className=\"text-lg font-semibold text-gray-900 dark:text-white\">\n              ${gasEstimate.usdValue?.toFixed(2) || '0.00'}\n            </p>\n          </div>\n        </div>\n      </GlassPanel>\n\n      {/* Sponsorship Status */}\n      <AnimatePresence mode=\"wait\">\n        {sponsorshipStatus === 'none' && (\n          <motion.div\n            initial={{ opacity: 0, y: 20 }}\n            animate={{ opacity: 1, y: 0 }}\n            exit={{ opacity: 0, y: -20 }}\n          >\n            {eligibleTiers.length > 0 ? (\n              <GlassPanel variant=\"primary\" className=\"p-6\">\n                <h3 className=\"text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center\">\n                  <Gift size={20} className=\"mr-2 text-blue-500\" />\n                  Gas Fee Sponsorship Available\n                </h3>\n                \n                <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">\n                  {eligibleTiers.slice(0, 2).map((tier) => {\n                    const IconComponent = tier.icon;\n                    const colorClasses = {\n                      blue: 'border-blue-500/50 bg-blue-500/10 text-blue-400',\n                      green: 'border-green-500/50 bg-green-500/10 text-green-400',\n                      purple: 'border-purple-500/50 bg-purple-500/10 text-purple-400',\n                      gold: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'\n                    };\n                    \n                    return (\n                      <motion.div\n                        key={tier.id}\n                        className={`p-4 rounded-lg border ${colorClasses[tier.color as keyof typeof colorClasses]} cursor-pointer transition-all hover:scale-105`}\n                        onClick={() => applyForSponsorship(tier)}\n                        whileHover={{ scale: 1.02 }}\n                        whileTap={{ scale: 0.98 }}\n                      >\n                        <div className=\"flex items-center justify-between mb-2\">\n                          <div className=\"flex items-center space-x-2\">\n                            <IconComponent size={20} />\n                            <h4 className=\"font-medium\">{tier.name}</h4>\n                          </div>\n                          <span className=\"text-xl font-bold\">{tier.coveragePercentage}%</span>\n                        </div>\n                        \n                        <p className=\"text-sm opacity-80 mb-3\">{tier.description}</p>\n                        \n                        <div className=\"space-y-1 text-xs opacity-70\">\n                          <p>Daily Limit: {tier.maxSponsorshipPerDay} ETH</p>\n                          <p>Your Savings: ${((gasEstimate.usdValue || 0) * tier.coveragePercentage / 100).toFixed(2)}</p>\n                        </div>\n                        \n                        <div className=\"mt-3 pt-3 border-t border-current border-opacity-20\">\n                          <div className=\"flex items-center justify-between text-sm\">\n                            <span>You Pay:</span>\n                            <span className=\"font-semibold\">\n                              ${((gasEstimate.usdValue || 0) * (100 - tier.coveragePercentage) / 100).toFixed(2)}\n                            </span>\n                          </div>\n                        </div>\n                      </motion.div>\n                    );\n                  })}\n                </div>\n                \n                {bestTier && (\n                  <div className=\"mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg\">\n                    <div className=\"flex items-center space-x-2 text-green-400\">\n                      <CheckCircle size={16} />\n                      <span className=\"text-sm font-medium\">\n                        Recommended: {bestTier.name} - Save ${((gasEstimate.usdValue || 0) * bestTier.coveragePercentage / 100).toFixed(2)}\n                      </span>\n                    </div>\n                  </div>\n                )}\n              </GlassPanel>\n            ) : (\n              <GlassPanel variant=\"primary\" className=\"p-6\">\n                <div className=\"text-center\">\n                  <AlertTriangle size={32} className=\"mx-auto text-yellow-500 mb-2\" />\n                  <h3 className=\"text-lg font-semibold text-gray-900 dark:text-white mb-2\">\n                    No Sponsorship Available\n                  </h3>\n                  <p className=\"text-gray-600 dark:text-gray-400 mb-4\">\n                    Increase your reputation or transaction count to qualify for gas sponsorship.\n                  </p>\n                  \n                  <div className=\"text-left space-y-2 text-sm text-gray-600 dark:text-gray-400\">\n                    <p><strong>Requirements for sponsorship:</strong></p>\n                    <ul className=\"space-y-1 ml-4\">\n                      <li>\u2022 Minimum 5 successful transactions</li>\n                      <li>\u2022 Reputation score of 100+</li>\n                      <li>\u2022 DAO membership (for premium tiers)</li>\n                    </ul>\n                  </div>\n                </div>\n              </GlassPanel>\n            )}\n          </motion.div>\n        )}\n        \n        {sponsorshipStatus === 'checking' && (\n          <motion.div\n            initial={{ opacity: 0, y: 20 }}\n            animate={{ opacity: 1, y: 0 }}\n            exit={{ opacity: 0, y: -20 }}\n          >\n            <GlassPanel variant=\"primary\" className=\"p-6\">\n              <div className=\"text-center\">\n                <div className=\"animate-spin rounded-full h-12 w-12 border-4 border-blue-500/30 border-t-blue-500 mx-auto mb-4\" />\n                <h3 className=\"text-lg font-semibold text-gray-900 dark:text-white mb-2\">\n                  Checking Sponsorship Eligibility\n                </h3>\n                <p className=\"text-gray-600 dark:text-gray-400\">\n                  Verifying your account status and daily limits...\n                </p>\n              </div>\n            </GlassPanel>\n          </motion.div>\n        )}\n        \n        {sponsorshipStatus === 'approved' && selectedTier && (\n          <motion.div\n            initial={{ opacity: 0, y: 20 }}\n            animate={{ opacity: 1, y: 0 }}\n            exit={{ opacity: 0, y: -20 }}\n          >\n            <GlassPanel variant=\"primary\" className=\"p-6 border-2 border-green-500/50\">\n              <div className=\"text-center mb-4\">\n                <CheckCircle size={48} className=\"mx-auto text-green-500 mb-2\" />\n                <h3 className=\"text-lg font-semibold text-gray-900 dark:text-white\">\n                  Sponsorship Approved!\n                </h3>\n              </div>\n              \n              <div className=\"bg-green-500/10 p-4 rounded-lg mb-4\">\n                <div className=\"grid grid-cols-2 gap-4 text-sm\">\n                  <div>\n                    <p className=\"text-gray-600 dark:text-gray-400\">Tier</p>\n                    <p className=\"text-gray-900 dark:text-white font-medium\">{selectedTier.name}</p>\n                  </div>\n                  <div>\n                    <p className=\"text-gray-600 dark:text-gray-400\">Coverage</p>\n                    <p className=\"text-gray-900 dark:text-white font-medium\">{selectedTier.coveragePercentage}%</p>\n                  </div>\n                  <div>\n                    <p className=\"text-gray-600 dark:text-gray-400\">Original Cost</p>\n                    <p className=\"text-gray-900 dark:text-white font-medium\">\n                      ${gasEstimate.usdValue?.toFixed(2)}\n                    </p>\n                  </div>\n                  <div>\n                    <p className=\"text-gray-600 dark:text-gray-400\">You Pay</p>\n                    <p className=\"text-green-600 dark:text-green-400 font-bold\">\n                      ${((gasEstimate.usdValue || 0) * (100 - selectedTier.coveragePercentage) / 100).toFixed(2)}\n                    </p>\n                  </div>\n                </div>\n              </div>\n              \n              <div className=\"flex space-x-3\">\n                <Button\n                  variant=\"primary\"\n                  className=\"flex-1\"\n                  onClick={() => {\n                    // Proceed with sponsored transaction\n                    console.log('Proceeding with sponsored transaction');\n                  }}\n                >\n                  Proceed with Sponsorship\n                  <ArrowRight size={16} className=\"ml-2\" />\n                </Button>\n                <Button\n                  variant=\"outline\"\n                  onClick={resetSponsorship}\n                >\n                  Reset\n                </Button>\n              </div>\n            </GlassPanel>\n          </motion.div>\n        )}\n        \n        {sponsorshipStatus === 'rejected' && (\n          <motion.div\n            initial={{ opacity: 0, y: 20 }}\n            animate={{ opacity: 1, y: 0 }}\n            exit={{ opacity: 0, y: -20 }}\n          >\n            <GlassPanel variant=\"primary\" className=\"p-6 border-2 border-red-500/50\">\n              <div className=\"text-center\">\n                <AlertTriangle size={48} className=\"mx-auto text-red-500 mb-2\" />\n                <h3 className=\"text-lg font-semibold text-gray-900 dark:text-white mb-2\">\n                  Sponsorship Unavailable\n                </h3>\n                <p className=\"text-gray-600 dark:text-gray-400 mb-4\">\n                  You've reached your daily sponsorship limit or don't meet the requirements.\n                </p>\n                \n                <div className=\"bg-red-500/10 p-4 rounded-lg mb-4 text-left\">\n                  <p className=\"text-sm text-red-400 mb-2\"><strong>Daily Usage:</strong></p>\n                  <div className=\"w-full bg-red-500/20 rounded-full h-2\">\n                    <div \n                      className=\"bg-red-500 h-2 rounded-full transition-all\"\n                      style={{ width: '85%' }}\n                    />\n                  </div>\n                  <p className=\"text-xs text-red-400 mt-1\">\n                    {dailySponsorshipUsed} ETH / {bestTier?.maxSponsorshipPerDay || '0.05'} ETH used today\n                  </p>\n                </div>\n                \n                <Button\n                  variant=\"outline\"\n                  onClick={resetSponsorship}\n                  className=\"w-full\"\n                >\n                  Pay Full Gas Fee\n                </Button>\n              </div>\n            </GlassPanel>\n          </motion.div>\n        )}\n      </AnimatePresence>\n      \n      {/* Daily Usage Summary */}\n      <GlassPanel variant=\"secondary\" className=\"p-4\">\n        <div className=\"flex items-center justify-between text-sm\">\n          <div className=\"flex items-center space-x-2\">\n            <Clock size={16} className=\"text-gray-500\" />\n            <span className=\"text-gray-600 dark:text-gray-400\">Daily Sponsorship Usage</span>\n          </div>\n          <span className=\"text-gray-900 dark:text-white font-medium\">\n            {dailySponsorshipUsed} ETH / {bestTier?.maxSponsorshipPerDay || '0.05'} ETH\n          </span>\n        </div>\n      </GlassPanel>\n    </div>\n  );\n};\n\n// Gas Fee Sponsorship Manager Component\nexport const GasFeeSponsorshipManager: React.FC = () => {\n  const [sponsorshipStats, setSponsorshipStats] = useState({\n    totalSponsored: '2.45',\n    activeUsers: 1247,\n    dailyLimit: '10.0',\n    utilizationRate: 73\n  });\n  \n  return (\n    <div className=\"space-y-6\">\n      <GlassPanel variant=\"primary\" className=\"p-6\">\n        <h2 className=\"text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center\">\n          <Zap size={24} className=\"mr-3 text-yellow-500\" />\n          Gas Fee Sponsorship Dashboard\n        </h2>\n        \n        <div className=\"grid grid-cols-1 md:grid-cols-4 gap-6\">\n          <div className=\"text-center\">\n            <div className=\"text-2xl font-bold text-blue-500 mb-1\">\n              {sponsorshipStats.totalSponsored} ETH\n            </div>\n            <div className=\"text-sm text-gray-600 dark:text-gray-400\">\n              Total Sponsored Today\n            </div>\n          </div>\n          \n          <div className=\"text-center\">\n            <div className=\"text-2xl font-bold text-green-500 mb-1\">\n              {sponsorshipStats.activeUsers.toLocaleString()}\n            </div>\n            <div className=\"text-sm text-gray-600 dark:text-gray-400\">\n              Active Users\n            </div>\n          </div>\n          \n          <div className=\"text-center\">\n            <div className=\"text-2xl font-bold text-purple-500 mb-1\">\n              {sponsorshipStats.dailyLimit} ETH\n            </div>\n            <div className=\"text-sm text-gray-600 dark:text-gray-400\">\n              Daily Limit\n            </div>\n          </div>\n          \n          <div className=\"text-center\">\n            <div className=\"text-2xl font-bold text-orange-500 mb-1\">\n              {sponsorshipStats.utilizationRate}%\n            </div>\n            <div className=\"text-sm text-gray-600 dark:text-gray-400\">\n              Utilization Rate\n            </div>\n          </div>\n        </div>\n        \n        <div className=\"mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg\">\n          <div className=\"flex items-start space-x-3\">\n            <Info size={20} className=\"text-blue-400 mt-0.5\" />\n            <div className=\"text-sm text-blue-400\">\n              <p className=\"font-medium mb-1\">How Gas Fee Sponsorship Works</p>\n              <ul className=\"space-y-1 text-blue-300/80\">\n                <li>\u2022 DAO treasury funds gas fee sponsorship pool</li>\n                <li>\u2022 Users qualify based on reputation and activity</li>\n                <li>\u2022 Sponsorship reduces barriers to Web3 adoption</li>\n                <li>\u2022 Daily limits prevent abuse while encouraging usage</li>\n              </ul>\n            </div>\n          </div>\n        </div>\n      </GlassPanel>\n    </div>\n  );\n};", "original_text": "", "replace_all": false}]