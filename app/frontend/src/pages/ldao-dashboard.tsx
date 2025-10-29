/**
 * LDAO Token Dashboard - Comprehensive dashboard for LDAO token management
 */

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '@/components/Layout';
import PurchaseModal from '@/components/Marketplace/TokenAcquisition/PurchaseModal';
import StakingInterface from '@/components/Marketplace/TokenAcquisition/StakingInterface';
import ReferralSystem from '@/components/Marketplace/TokenAcquisition/ReferralSystem';
import TransactionHistory from '@/components/Marketplace/TokenAcquisition/TransactionHistory';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { 
  Wallet, 
  TrendingUp, 
  Share2, 
  History,
  Zap,
  BarChart3,
  ArrowLeft
} from 'lucide-react';

const LDAODashboard: React.FC = () => {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'staking' | 'referral' | 'history'>('overview');
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const handleBackToMarketplace = () => {
    router.push('/marketplace');
  };

  const handlePurchaseSuccess = () => {
    // Refresh dashboard data if needed
    console.log('Purchase successful, refreshing dashboard');
  };

  return (
    <Layout title="LDAO Token Dashboard - LinkDAO" fullWidth={true}>
      <Head>
        <title>LDAO Token Dashboard - LinkDAO</title>
        <meta name="description" content="Manage your LDAO tokens - buy, stake, refer friends, and view transaction history." />
      </Head>

      <PurchaseModal 
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        onPurchaseSuccess={handlePurchaseSuccess}
      />

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <button
                onClick={handleBackToMarketplace}
                className="flex items-center gap-2 text-white/80 hover:text-white mb-2"
              >
                <ArrowLeft size={16} />
                Back to Marketplace
              </button>
              <h1 className="text-3xl font-bold text-white">LDAO Token Dashboard</h1>
              <p className="text-white/70">Manage your LDAO tokens and maximize your rewards</p>
            </div>
            
            <Button
              variant="primary"
              onClick={() => setIsPurchaseModalOpen(true)}
              className="flex items-center gap-2 py-3 px-6"
            >
              <Wallet size={18} />
              Buy LDAO Tokens
            </Button>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                  <Wallet className="text-white" size={20} />
                </div>
                <div>
                  <div className="text-white/70 text-sm">Balance</div>
                  <div className="text-xl font-bold text-white">0 LDAO</div>
                </div>
              </div>
              <div className="text-sm text-white/50">Connect wallet to view</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center">
                  <TrendingUp className="text-white" size={20} />
                </div>
                <div>
                  <div className="text-white/70 text-sm">Staked</div>
                  <div className="text-xl font-bold text-white">0 LDAO</div>
                </div>
              </div>
              <div className="text-sm text-white/50">No active stakes</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center">
                  <Share2 className="text-white" size={20} />
                </div>
                <div>
                  <div className="text-white/70 text-sm">Referrals</div>
                  <div className="text-xl font-bold text-white">0</div>
                </div>
              </div>
              <div className="text-sm text-white/50">Start referring</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500 to-orange-600 flex items-center justify-center">
                  <BarChart3 className="text-white" size={20} />
                </div>
                <div>
                  <div className="text-white/70 text-sm">Total Value</div>
                  <div className="text-xl font-bold text-white">$0.00</div>
                </div>
              </div>
              <div className="text-sm text-white/50">No holdings</div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 py-3 px-4 rounded-lg transition-colors ${
                activeTab === 'overview'
                  ? 'bg-purple-500/20 text-white border border-purple-500'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <Zap size={18} />
              Overview
            </button>
            
            <button
              onClick={() => setActiveTab('staking')}
              className={`flex items-center gap-2 py-3 px-4 rounded-lg transition-colors ${
                activeTab === 'staking'
                  ? 'bg-purple-500/20 text-white border border-purple-500'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <TrendingUp size={18} />
              Staking
            </button>
            
            <button
              onClick={() => setActiveTab('referral')}
              className={`flex items-center gap-2 py-3 px-4 rounded-lg transition-colors ${
                activeTab === 'referral'
                  ? 'bg-purple-500/20 text-white border border-purple-500'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <Share2 size={18} />
              Referral Program
            </button>
            
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 py-3 px-4 rounded-lg transition-colors ${
                activeTab === 'history'
                  ? 'bg-purple-500/20 text-white border border-purple-500'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <History size={18} />
              Transaction History
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                  <h2 className="text-2xl font-bold text-white mb-4">Welcome to Your LDAO Dashboard</h2>
                  <p className="text-white/70 mb-6">
                    This dashboard allows you to manage all aspects of your LDAO token holdings. 
                    Buy more tokens, stake them for rewards, refer friends to earn bonuses, 
                    and track all your transactions in one place.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <h3 className="font-bold text-white mb-2">Token Balance</h3>
                      <p className="text-white/70 text-sm">
                        Your available LDAO tokens that you can use for transactions, staking, or governance.
                      </p>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-4">
                      <h3 className="font-bold text-white mb-2">Staking Rewards</h3>
                      <p className="text-white/70 text-sm">
                        Earn passive income by staking your LDAO tokens with attractive APR rates.
                      </p>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-4">
                      <h3 className="font-bold text-white mb-2">Referral Earnings</h3>
                      <p className="text-white/70 text-sm">
                        Invite friends to LinkDAO and earn LDAO tokens for each successful referral.
                      </p>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-4">
                      <h3 className="font-bold text-white mb-2">Transaction History</h3>
                      <p className="text-white/70 text-sm">
                        Keep track of all your LDAO token transactions including transfers, stakes, and rewards.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <StakingInterface />
                  <ReferralSystem />
                </div>
              </div>
            )}
            
            {activeTab === 'staking' && <StakingInterface />}
            
            {activeTab === 'referral' && <ReferralSystem />}
            
            {activeTab === 'history' && <TransactionHistory />}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LDAODashboard;