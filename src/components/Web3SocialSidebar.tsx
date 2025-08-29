import React, { useState } from 'react';
import Link from 'next/link';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import DeFiSynergyDashboard from '@/components/DeFiSynergyDashboard';

interface DAO {
  id: string;
  name: string;
  members: number;
  treasuryValue: number;
}

export default function Web3SocialSidebar({ className = '' }: { className?: string }) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'trending' | 'wallet' | 'defi'>('trending');

  // Mock DAO data
  const trendingDAOs: DAO[] = [
    { id: '1', name: 'Ethereum Builders', members: 12400, treasuryValue: 2500000 },
    { id: '2', name: 'DeFi Traders', members: 8900, treasuryValue: 1800000 },
    { id: '3', name: 'NFT Collectors', members: 15600, treasuryValue: 3200000 },
    { id: '4', name: 'DAO Governance', members: 7800, treasuryValue: 1500000 },
    { id: '5', name: 'Web3 Developers', members: 5400, treasuryValue: 950000 },
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Wallet & Reputation Card */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
        <div className="border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex">
            <button
              onClick={() => setActiveTab('trending')}
              className={`flex-1 py-3 px-4 text-sm font-medium ${
                activeTab === 'trending'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Trending
            </button>
            <button
              onClick={() => setActiveTab('wallet')}
              className={`flex-1 py-3 px-4 text-sm font-medium ${
                activeTab === 'wallet'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Wallet
            </button>
            <button
              onClick={() => setActiveTab('defi')}
              className={`flex-1 py-3 px-4 text-sm font-medium ${
                activeTab === 'defi'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              DeFi
            </button>
          </div>
        </div>
        
        <div className="p-4">
          {activeTab === 'trending' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Trending DAOs</h3>
              <div className="space-y-3">
                {trendingDAOs.map((dao) => (
                  <Link 
                    key={dao.id} 
                    href={`/dao/${dao.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600/50 rounded-lg transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{dao.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatNumber(dao.members)} members</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(dao.treasuryValue)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Treasury</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'wallet' && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Wallet Stats</h3>
              
              {isConnected ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">Total Balance</span>
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        2.45 ETH
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">$4,165.00 USD</span>
                      <span className="text-green-500">+2.3%</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                      <div className="text-2xl mb-1">📤</div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Send</span>
                    </button>
                    <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                      <div className="text-2xl mb-1">📥</div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Receive</span>
                    </button>
                    <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                      <div className="text-2xl mb-1">🔄</div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Swap</span>
                    </button>
                    <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                      <div className="text-2xl mb-1">📈</div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Bridge</span>
                    </button>
                  </div>
                  
                  <div className="pt-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Recent Activity</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-2">
                            <span className="text-green-600 dark:text-green-400">+</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Received</p>
                            <p className="text-gray-500 dark:text-gray-400 text-xs">From: 0x1234...5678</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900 dark:text-white">+0.5 ETH</p>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">2 hours ago</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="mx-auto bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Connect your wallet to view stats</p>
                  <button className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg text-sm font-medium">
                    Connect Wallet
                  </button>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'defi' && (
            <DeFiSynergyDashboard />
          )}
        </div>
      </div>
      
      {/* Community Highlights */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
        <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h3 className="font-semibold text-gray-900 dark:text-white">Community Highlights</h3>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-6 w-6 rounded-md bg-primary-500 text-white">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Token-Native Reactions</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Stake tokens to react to posts and earn rewards
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-6 w-6 rounded-md bg-primary-500 text-white">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Governance Integration</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Participate in DAO governance directly from posts
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-6 w-6 rounded-md bg-primary-500 text-white">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">DeFi Analytics</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Embed live DeFi data and charts in your posts
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}