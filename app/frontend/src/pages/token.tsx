/**
 * Token Information Page - Comprehensive information about LDAO token
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { tokenService } from '@/services/web3/tokenService';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import {
  Zap,
  TrendingUp,
  Users,
  Shield,
  Award,
  Globe,
  BarChart3,
  Lock,
  ShoppingCart,
  ArrowRight
} from 'lucide-react';
import { TokenInfo } from '@/types/web3Community';
import LDAOPurchaseModal from '@/components/LDAOAcquisition/LDAOPurchaseModal';

type LocalTokenInfo = TokenInfo & {
  priceUSD: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
};

const TokenPage: React.FC = () => {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const [tokenInfo, setTokenInfo] = useState<LocalTokenInfo | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  useEffect(() => {
    const fetchTokenInfo = async () => {
      try {
        const info = await tokenService.getTokenInfo('LDAO');
        if (info) {
          // Convert to our local type with required fields
          const localInfo: LocalTokenInfo = {
            ...info,
            priceUSD: info.priceUSD || 0.5,
            priceChange24h: info.priceChange24h || 0,
            volume24h: info.volume24h || 1250000, // Mock volume if missing
            marketCap: info.marketCap || 225000000, // Mock mcap if missing
            liquidity: info.liquidity || 4500000 // Mock liquidity if missing
          };
          setTokenInfo(localInfo);
        }
      } catch (error) {
        console.error('Failed to fetch token info:', error);
      }
    };

    fetchTokenInfo();
  }, []);

  const handleBuyTokens = () => {
    // Deep link to Uniswap for buying LDAO
    const uniswapUrl = `https://app.uniswap.org/#/swap?outputCurrency=${tokenInfo?.address || '0x...'}&chain=mainnet`;
    window.open(uniswapUrl, '_blank');
  };

  const handleSellTokens = () => {
    // Deep link to Uniswap for selling LDAO
    const uniswapUrl = `https://app.uniswap.org/#/swap?inputCurrency=${tokenInfo?.address || '0x...'}&chain=mainnet`;
    window.open(uniswapUrl, '_blank');
  };

  const handleStakeTokens = () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    // Redirect to staking page
    router.push('/dao/staking');
  };

  const handleViewOnEtherscan = () => {
    if (tokenInfo?.address) {
      window.open(`https://etherscan.io/token/${tokenInfo.address}`, '_blank');
    } else {
      alert('Token address not available');
    }
  };

  return (
    <Layout title="LDAO Token - LinkDAO" fullWidth={true}>
      <Head>
        <title>LDAO Token - LinkDAO</title>
        <meta name="description" content="Discover the LDAO token - the governance and utility token of LinkDAO. Buy, stake, and earn rewards." />
      </Head>

      <LDAOPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        userAddress={address}
      />

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              LinkDAO Token <span className="text-blue-400">(LDAO)</span>
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              The governance and utility token that powers the LinkDAO ecosystem.
              Participate in governance, earn staking rewards, and unlock premium features.
            </p>
          </div>

          {/* Token Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2">
              <GlassPanel variant="secondary" className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0">
                    {tokenInfo?.logoUrl ? (
                      <img
                        src={tokenInfo.logoUrl}
                        alt={tokenInfo.name}
                        className="w-24 h-24 rounded-full"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                        <Zap className="text-white" size={48} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      <h2 className="text-3xl font-bold text-white">{tokenInfo?.name || 'LinkDAO Token'}</h2>
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
                        {tokenInfo?.symbol || 'LDAO'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <div className="text-2xl font-bold text-white">
                          ${tokenInfo?.priceUSD?.toFixed(2) || '0.50'}
                        </div>
                        <div className="text-xs text-white/70">Price</div>
                      </div>
                      <div>
                        <div className={`text-2xl font-bold ${tokenInfo?.priceChange24h && tokenInfo.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {tokenInfo?.priceChange24h ? `${tokenInfo.priceChange24h >= 0 ? '+' : ''}${tokenInfo.priceChange24h.toFixed(2)}%` : '+5.2%'}
                        </div>
                        <div className="text-xs text-white/70">24h Change</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">
                          ${(tokenInfo?.volume24h ? (tokenInfo.volume24h / 1000000).toFixed(1) + 'M' : '1.2M')}
                        </div>
                        <div className="text-xs text-white/70">24h Volume</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">
                          ${(tokenInfo?.liquidity ? (tokenInfo.liquidity / 1000000).toFixed(1) + 'M' : '4.5M')}
                        </div>
                        <div className="text-xs text-white/70">Liquidity</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="primary"
                        onClick={handleBuyTokens}
                        className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 border-none"
                      >
                        <ShoppingCart size={18} />
                        Buy on Uniswap
                      </Button>

                      <Button
                        variant="outline"
                        onClick={handleSellTokens}
                        className="flex items-center gap-2 border-white/30 text-white hover:bg-white/10"
                      >
                        <TrendingUp size={18} className="rotate-180" />
                        Sell
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => router.push('/ldao-dashboard')}
                        className="flex items-center gap-2 border-white/30 text-white hover:bg-white/10"
                      >
                        <Zap size={18} />
                        Dashboard
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={handleViewOnEtherscan}
                        className="flex items-center gap-2 text-white/80 hover:text-white hover:bg-white/5"
                      >
                        <Globe size={18} />
                        Etherscan
                      </Button>
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </div>

            <div className="space-y-6">
              <GlassPanel variant="secondary" className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">Token Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-white/70">Total Supply</span>
                    <span className="text-white font-medium">1,000,000,000 LDAO</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Circulating Supply</span>
                    <span className="text-white font-medium">450,000,000 LDAO</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Market Cap</span>
                    <span className="text-white font-medium">
                      ${(tokenInfo?.marketCap ? (tokenInfo.marketCap / 1000000).toFixed(1) + 'M' : '225.0M')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Staking APR</span>
                    <span className="text-green-400 font-medium">Up to 18%</span>
                  </div>
                </div>
              </GlassPanel>

              <GlassPanel variant="secondary" className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/support/guides/ldao-complete-guide')}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <span className="text-white">Token Guide</span>
                    <ArrowRight size={16} className="text-white/50" />
                  </button>
                  <button
                    onClick={() => router.push('/dao/staking')}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <span className="text-white">Staking Calculator</span>
                    <ArrowRight size={16} className="text-white/50" />
                  </button>
                  <button
                    onClick={() => router.push('/dao')}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <span className="text-white">Governance</span>
                    <ArrowRight size={16} className="text-white/50" />
                  </button>
                </div>
              </GlassPanel>
            </div>
          </div>

          {/* Token Utilities */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">Token Utilities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <GlassPanel variant="secondary" className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="text-blue-400" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Governance</h3>
                <p className="text-white/70">
                  Participate in DAO governance and vote on key proposals that shape the future of LinkDAO.
                </p>
              </GlassPanel>

              <GlassPanel variant="secondary" className="p-6 text-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="text-green-400" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Staking Rewards</h3>
                <p className="text-white/70">
                  Stake your LDAO tokens and earn rewards with APRs up to 18% based on lock-up periods.
                </p>
              </GlassPanel>

              <GlassPanel variant="secondary" className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="text-purple-400" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Premium Access</h3>
                <p className="text-white/70">
                  Unlock premium features and exclusive content within the LinkDAO ecosystem with 1,000+ LDAO.
                </p>
              </GlassPanel>

              <GlassPanel variant="secondary" className="p-6 text-center">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="text-yellow-400" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Security</h3>
                <p className="text-white/70">
                  Contribute to network security and earn rewards for validating transactions and maintaining the ecosystem.
                </p>
              </GlassPanel>
            </div>
          </div>

          {/* Staking Tiers */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">Staking Tiers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <GlassPanel variant="secondary" className="p-6 text-center">
                <div className="text-2xl font-bold text-white mb-2">30 Days</div>
                <div className="text-3xl font-bold text-green-400 mb-2">5% APR</div>
                <div className="text-white/70 mb-4">Minimum 100 LDAO</div>
                <Button
                  variant="outline"
                  onClick={handleStakeTokens}
                  className="w-full border-white/30 text-white hover:bg-white/10"
                >
                  Stake Now
                </Button>
              </GlassPanel>

              <GlassPanel variant="secondary" className="p-6 text-center">
                <div className="text-2xl font-bold text-white mb-2">90 Days</div>
                <div className="text-3xl font-bold text-green-400 mb-2">8% APR</div>
                <div className="text-white/70 mb-4">Minimum 500 LDAO</div>
                <Button
                  variant="outline"
                  onClick={handleStakeTokens}
                  className="w-full border-white/30 text-white hover:bg-white/10"
                >
                  Stake Now
                </Button>
              </GlassPanel>

              <GlassPanel variant="secondary" className="p-6 text-center">
                <div className="text-2xl font-bold text-white mb-2">180 Days</div>
                <div className="text-3xl font-bold text-green-400 mb-2">12% APR</div>
                <div className="text-white/70 mb-4">Minimum 1,000 LDAO</div>
                <Button
                  variant="outline"
                  onClick={handleStakeTokens}
                  className="w-full border-white/30 text-white hover:bg-white/10"
                >
                  Stake Now
                </Button>
              </GlassPanel>

              <GlassPanel variant="secondary" className="p-6 text-center">
                <div className="text-2xl font-bold text-white mb-2">365 Days</div>
                <div className="text-3xl font-bold text-green-400 mb-2">18% APR</div>
                <div className="text-white/70 mb-4">Minimum 5,000 LDAO</div>
                <Button
                  variant="outline"
                  onClick={handleStakeTokens}
                  className="w-full border-white/30 text-white hover:bg-white/10"
                >
                  Stake Now
                </Button>
              </GlassPanel>
            </div>
          </div>

          {/* How to Get LDAO */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">How to Get LDAO Tokens</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GlassPanel variant="secondary" className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <BarChart3 className="text-blue-400" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Buy on Exchange</h3>
                </div>
                <p className="text-white/70 mb-4">
                  Purchase LDAO tokens on supported decentralized exchanges (DEXs) using ETH or other cryptocurrencies.
                </p>
                <Button
                  variant="ghost"
                  onClick={handleBuyTokens}
                  className="text-blue-400 hover:text-blue-300 p-0"
                >
                  View Exchanges →
                </Button>
              </GlassPanel>

              <GlassPanel variant="secondary" className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Lock className="text-green-400" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Staking Rewards</h3>
                </div>
                <p className="text-white/70 mb-4">
                  Stake your existing LDAO tokens to earn additional rewards with attractive APRs.
                </p>
                <Button
                  variant="ghost"
                  onClick={handleStakeTokens}
                  className="text-green-400 hover:text-green-300 p-0"
                >
                  Start Staking →
                </Button>
              </GlassPanel>

              <GlassPanel variant="secondary" className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Award className="text-purple-400" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Governance Participation</h3>
                </div>
                <p className="text-white/70 mb-4">
                  Participate in DAO governance and community activities to earn LDAO token rewards.
                </p>
                <Button
                  variant="ghost"
                  onClick={() => router.push('/dao')}
                  className="text-purple-400 hover:text-purple-300 p-0"
                >
                  Join Governance →
                </Button>
              </GlassPanel>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TokenPage;