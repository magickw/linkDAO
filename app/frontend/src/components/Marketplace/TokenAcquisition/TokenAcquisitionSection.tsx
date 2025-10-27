/**
 * Token Acquisition Section - Provides users with ways to acquire LDAO tokens
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { tokenService } from '@/services/web3/tokenService';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { ShoppingCart, TrendingUp, Users, Zap } from 'lucide-react';
import { useRouter } from 'next/router';
import { TokenInfo } from '@/types/web3Community';
import PurchaseModal from './PurchaseModal';

type LocalTokenInfo = TokenInfo & {
  priceUSD: number;
  priceChange24h: number;
};

const TokenAcquisitionSection: React.FC = () => {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [tokenInfo, setTokenInfo] = useState<LocalTokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  useEffect(() => {
    const fetchTokenInfo = async () => {
      try {
        setLoading(true);
        const info = await tokenService.getTokenInfo('LDAO');
        if (info) {
          // Convert to our local type with required fields
          const localInfo: LocalTokenInfo = {
            ...info,
            priceUSD: info.priceUSD || 0.5,
            priceChange24h: info.priceChange24h || 0
          };
          setTokenInfo(localInfo);
        }
      } catch (error) {
        console.error('Failed to fetch token info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenInfo();
  }, []);

  const handleBuyTokens = () => {
    setIsPurchaseModalOpen(true);
  };

  const handleStakeTokens = () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    // Redirect to staking page
    router.push('/dao/staking');
  };

  const handleLearnMore = () => {
    // Redirect to token information page
    router.push('/support/guides/ldao-complete-guide');
  };

  if (loading) {
    return (
      <GlassPanel variant="secondary" className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-white">Loading token information...</span>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel variant="secondary" className="p-6">
      <PurchaseModal 
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
      />
      <div className="flex flex-col md:flex-row gap-6 items-center">
        {/* Token Info */}
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
            {tokenInfo?.logoUrl ? (
              <img 
                src={tokenInfo.logoUrl} 
                alt={tokenInfo.name} 
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                <Zap className="text-white" size={24} />
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-white">{tokenInfo?.name || 'LinkDAO Token'}</h3>
              <p className="text-white/70">{tokenInfo?.symbol || 'LDAO'}</p>
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-2xl font-bold text-white">
              ${tokenInfo?.priceUSD?.toFixed(2) || '0.50'} <span className="text-sm font-normal text-white/70">USD</span>
            </p>
            <p className="text-sm text-green-400 mt-1">+5.2% (24h)</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Button 
            variant="primary" 
            onClick={handleBuyTokens}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <ShoppingCart size={18} />
            Buy LDAO
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleStakeTokens}
            className="flex-1 flex items-center justify-center gap-2 border-white/30 text-white hover:bg-white/10"
          >
            <TrendingUp size={18} />
            Stake
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={handleLearnMore}
            className="flex-1 flex items-center justify-center gap-2 text-white/80 hover:text-white hover:bg-white/5"
          >
            <Users size={18} />
            Learn More
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={() => router.push('/ldao-dashboard')}
            className="flex-1 flex items-center justify-center gap-2 text-white/80 hover:text-white hover:bg-white/5"
          >
            <Zap size={18} />
            Dashboard
          </Button>
        </div>
      </div>

      {/* Token Benefits */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <h4 className="font-semibold text-white mb-3">Token Benefits</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="font-medium text-white">Governance</div>
            <div className="text-sm text-white/70">Vote on proposals</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="font-medium text-white">Staking Rewards</div>
            <div className="text-sm text-white/70">Earn up to 18% APR</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="font-medium text-white">Premium Access</div>
            <div className="text-sm text-white/70">Exclusive features</div>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
};

export default TokenAcquisitionSection;