/**
 * Token Acquisition Section - Provides users with ways to acquire LDAO tokens
 * COMPACT VERSION - Highlighting Dashboard
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { tokenService } from '@/services/web3/tokenService';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { ShoppingCart, TrendingUp, Zap, ExternalLink, ArrowRight } from 'lucide-react';
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
      // Only fetch token info if wallet is connected
      if (!isConnected) {
        setLoading(false);
        return;
      }

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
  }, [isConnected]);

  const handleBuyTokens = () => {
    setIsPurchaseModalOpen(true);
  };

  const handleStakeTokens = () => {
    if (!isConnected) {
      // toast.error('Please connect your wallet first');
      return;
    }
    router.push('/dao/staking');
  };

  if (loading) {
    return (
      <GlassPanel variant="secondary" className="p-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-sm text-white/80">Loading...</span>
        </div>
      </GlassPanel>
    );
  }

  // If not relevant (e.g. no info and not loading), you might want to hide it or show default
  // For now displaying default state if null

  return (
    <GlassPanel variant="secondary" className="px-5 py-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-indigo-500/20 bg-indigo-900/10 backdrop-blur-md">
      <PurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
      />

      {/* Left: Token Info Compact */}
      <div className="flex items-center gap-4">
        {tokenInfo?.logoUrl ? (
          <img
            src={tokenInfo.logoUrl}
            alt={tokenInfo.name}
            className="w-10 h-10 rounded-full shadow-lg shadow-indigo-500/20"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap className="text-white" size={20} />
          </div>
        )}

        <div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-bold text-white tracking-tight">{tokenInfo?.symbol || 'LDAO'}</h3>
            <span className="text-white/90 font-medium">
              ${tokenInfo?.priceUSD?.toFixed(2) || '0.50'}
            </span>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${(tokenInfo?.priceChange24h || 5.2) >= 0
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-red-500/20 text-red-300'
              }`}>
              {(tokenInfo?.priceChange24h || 5.2) >= 0 ? '+' : ''}{tokenInfo?.priceChange24h || 5.2}%
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/60 mt-0.5">
            <span className="hidden sm:inline">Governance & Utility Token</span>
            <a href="/support/guides/ldao-complete-guide" className="hover:text-white transition-colors flex items-center gap-1">
              Learn more <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        {/* Secondary Actions (Smaller/Phantom) */}
        <div className="flex items-center gap-2 mr-2">
          <button
            onClick={handleBuyTokens}
            className="text-white/70 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 text-sm font-medium transition-all flex items-center gap-1.5"
          >
            <ShoppingCart size={14} />
            Buy
          </button>

          <button
            onClick={handleStakeTokens}
            className="text-white/70 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 text-sm font-medium transition-all flex items-center gap-1.5"
          >
            <TrendingUp size={14} />
            Stake
          </button>
        </div>

        {/* Primary Action: Dashboard */}
        <Button
          variant="primary"
          onClick={() => router.push('/ldao-dashboard')}
          className="flex-1 md:flex-none shadow-lg shadow-indigo-500/25 border-indigo-400/30 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold py-2 px-6"
        >
          <span className="flex items-center gap-2">
            LDAO Dashboard
            <ArrowRight size={16} />
          </span>
        </Button>
      </div>
    </GlassPanel>
  );
};

export default TokenAcquisitionSection;