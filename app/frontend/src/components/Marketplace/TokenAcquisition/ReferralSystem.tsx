/**
 * Referral System - Allows users to generate and share referral links for token rewards
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { referralService, ReferralReward } from '@/services/referralService';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { 
  Share2, 
  Users, 
  Gift, 
  Trophy,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';

interface ReferralInfo {
  referrer: string;
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  totalRewards: number;
  pendingRewards: number;
}

// Remove duplicate interface definition and use the imported one

interface LeaderboardEntry {
  user: string;
  referrals: number;
  rewards: number;
}

interface ReferralServiceInterface {
  getReferralInfo: (address: string) => Promise<ReferralInfo | null>;
  getReferralRewards: (address: string) => Promise<ReferralReward[]>;
  getReferralLeaderboard: (limit: number) => Promise<LeaderboardEntry[]>;
  generateReferralCode: (address: string) => Promise<{ success: boolean; referralCode?: string; referralLink?: string; error?: string }>;
  claimRewards: (address: string) => Promise<{ success: boolean; error?: string }>;
}

const ReferralSystem: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [isConnected, address]);

  const loadData = async () => {
    if (!isConnected || !address) return;

    try {
      // Load referral info
      const info = await referralService.getReferralInfo(address);
      if (info) {
        setReferralInfo(info);
      }

      // Load rewards
      const userRewards = await referralService.getReferralRewards(address);
      setRewards(userRewards);

      // Load leaderboard
      const leaderboardData = await referralService.getReferralLeaderboard(10);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Failed to load referral data:', error);
    }
  };

  const handleGenerateReferralLink = async () => {
    if (!isConnected || !address) {
      setErrorMessage('Please connect your wallet first');
      return;
    }

    setIsGenerating(true);
    setErrorMessage('');

    try {
      // Generate a referral code for the connected address
      const result = await referralService.generateReferralCode(address);
      
      if (result.success && result.referralCode && result.referralLink) {
        const info: ReferralInfo = {
          referrer: address,
          referralCode: result.referralCode,
          referralLink: result.referralLink,
          totalReferrals: referralInfo?.totalReferrals || 0,
          totalRewards: referralInfo?.totalRewards || 0,
          pendingRewards: referralInfo?.pendingRewards || 0
        };
        setReferralInfo(info);
      } else {
        setErrorMessage(result.error || 'Failed to generate referral link');
      }
    } catch (error) {
      setErrorMessage('An unexpected error occurred');
      console.error('Referral link generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!referralInfo?.referralLink) return;
    
    navigator.clipboard.writeText(referralInfo.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaimRewards = async () => {
    if (!isConnected || !address) {
      setErrorMessage('Please connect your wallet first');
      return;
    }

    setIsClaiming(true);
    setErrorMessage('');
    setTransactionStatus('idle');

    try {
      const result = await referralService.claimRewards(address);
      
      if (result.success) {
        setTransactionStatus('success');
        // Refresh data
        await loadData();
        // Clear success message after delay
        setTimeout(() => {
          setTransactionStatus('idle');
        }, 3000);
      } else {
        setTransactionStatus('error');
        setErrorMessage(result.error || 'Failed to claim rewards');
      }
    } catch (error) {
      setTransactionStatus('error');
      setErrorMessage('An unexpected error occurred');
      console.error('Reward claim error:', error);
    } finally {
      setIsClaiming(false);
    }
  };

  const formatAddress = (addr: string): string => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  if (!isConnected) {
    return (
      <GlassPanel variant="secondary" className="p-6 text-center">
        <Users className="mx-auto text-white/50 mb-4" size={48} />
        <h3 className="text-xl font-bold text-white mb-2">Connect Wallet for Referrals</h3>
        <p className="text-white/70 mb-4">
          Connect your wallet to generate referral links and earn LDAO token rewards.
        </p>
        <Button variant="primary">Connect Wallet</Button>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-6">
      {/* Referral Header */}
      <GlassPanel variant="secondary" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
            <Share2 className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Referral Program</h2>
            <p className="text-white/70">Earn LDAO tokens by inviting friends to LinkDAO</p>
          </div>
        </div>

        {/* Referral Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-sm text-white/70 mb-1">Total Referrals</div>
            <div className="text-xl font-bold text-white">{referralInfo?.totalReferrals || 0}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-sm text-white/70 mb-1">Pending Rewards</div>
            <div className="text-xl font-bold text-yellow-400">{referralInfo?.pendingRewards || 0} LDAO</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-sm text-white/70 mb-1">Total Earned</div>
            <div className="text-xl font-bold text-green-400">{referralInfo?.totalRewards || 0} LDAO</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-sm text-white/70 mb-1">Reward per Referral</div>
            <div className="text-xl font-bold text-blue-400">10 LDAO</div>
          </div>
        </div>
      </GlassPanel>

      {/* Referral Link Generation */}
      <GlassPanel variant="secondary" className="p-6">
        <h3 className="text-xl font-bold text-white mb-4">Your Referral Link</h3>
        
        {referralInfo?.referralLink ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={referralInfo.referralLink}
                readOnly
                className="flex-1 bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none"
              />
              <Button
                variant="primary"
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 py-3 px-4"
              >
                {copied ? (
                  <>
                    <Check size={18} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                className="flex items-center gap-2 border-white/30 text-white hover:bg-white/10"
              >
                <Share2 size={18} />
                Share on Twitter
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 border-white/30 text-white hover:bg-white/10"
              >
                <Share2 size={18} />
                Share on Discord
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Gift className="mx-auto text-white/50 mb-4" size={48} />
            <p className="text-white/70 mb-4">
              Generate your unique referral link to start earning LDAO tokens
            </p>
            <Button
              variant="primary"
              onClick={handleGenerateReferralLink}
              disabled={isGenerating}
              className="flex items-center justify-center gap-2 py-3 px-6 mx-auto"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Share2 size={18} />
                  Generate Referral Link
                </>
              )}
            </Button>
          </div>
        )}
      </GlassPanel>

      {/* Claim Rewards */}
      {referralInfo && referralInfo.pendingRewards > 0 && (
        <GlassPanel variant="secondary" className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white">Claim Your Rewards</h3>
              <p className="text-white/70">
                You have {referralInfo.pendingRewards} LDAO tokens ready to claim
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {errorMessage && (
                <div className="flex items-center gap-2 text-red-300">
                  <AlertCircle size={16} />
                  <span className="text-sm">{errorMessage}</span>
                </div>
              )}
              
              {transactionStatus === 'success' && (
                <div className="flex items-center gap-2 text-green-300">
                  <Check size={16} />
                  <span className="text-sm">Rewards claimed successfully!</span>
                </div>
              )}
              
              <Button
                variant="primary"
                onClick={handleClaimRewards}
                disabled={isClaiming}
                className="flex items-center justify-center gap-2 py-3 px-6"
              >
                {isClaiming ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Claiming...
                  </>
                ) : (
                  <>
                    <Gift size={18} />
                    Claim {referralInfo.pendingRewards} LDAO
                  </>
                )}
              </Button>
            </div>
          </div>
        </GlassPanel>
      )}

      {/* Recent Rewards */}
      {rewards.length > 0 && (
        <GlassPanel variant="secondary" className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">Recent Referral Rewards</h3>
          
          <div className="space-y-3">
            {rewards.map((reward) => (
              <div 
                key={reward.id} 
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
                    <Gift className="text-white" size={16} />
                  </div>
                  <div>
                    <div className="font-medium text-white">
                      {formatAddress(reward.referredUser)}
                    </div>
                    <div className="text-sm text-white/70">
                      {new Date(reward.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-bold text-white">+{reward.amount} LDAO</div>
                    <div className="text-sm capitalize text-white/70">{reward.status}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {/* Leaderboard - Only show if there's real data from backend */}
      {leaderboard.length > 0 && (
        <GlassPanel variant="secondary" className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="text-yellow-400" size={24} />
            <h3 className="text-xl font-bold text-white">Referral Leaderboard</h3>
          </div>

          <div className="space-y-3">
            {leaderboard.map((entry, index) => (
              <div
                key={`${entry.user}-${index}`}
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-gray-400 text-black' :
                    index === 2 ? 'bg-amber-800 text-white' :
                    'bg-white/10 text-white'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-white">
                      {formatAddress(entry.user)}
                    </div>
                    <div className="text-sm text-white/70">
                      {entry.referrals} referral{entry.referrals !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-green-400">{entry.rewards} LDAO</div>
                  <div className="text-sm text-white/70">earned</div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {/* How It Works */}
      <GlassPanel variant="secondary" className="p-6">
        <h3 className="text-xl font-bold text-white mb-4">How the Referral Program Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Share2 size={16} className="text-purple-400" />
            </div>
            <div>
              <div className="font-medium text-white mb-1">Share Your Link</div>
              <div className="text-sm text-white/70">
                Generate your unique referral link and share it with friends.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Users size={16} className="text-green-400" />
            </div>
            <div>
              <div className="font-medium text-white mb-1">Friends Join</div>
              <div className="text-sm text-white/70">
                When friends sign up using your link, they get started with LinkDAO.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <Gift size={16} className="text-yellow-400" />
            </div>
            <div>
              <div className="font-medium text-white mb-1">Earn Rewards</div>
              <div className="text-sm text-white/70">
                You earn 10 LDAO tokens for each successful referral, paid instantly.
              </div>
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};

export default ReferralSystem;