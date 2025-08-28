import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWeb3 } from '@/context/Web3Context';

interface Community {
  id: string;
  name: string;
  members: number;
  treasuryBalance?: string;
  token?: string;
}

interface TrendingDAO {
  id: string;
  name: string;
  token: string;
  treasuryBalance?: string;
}

interface WalletStats {
  balance: string;
  token: string;
  change: string;
  reputationScore?: number;
  reputationTier?: string;
}

export default function Web3SocialSidebar() {
  const { address, isConnected, balance } = useWeb3();
  const [walletStats, setWalletStats] = useState<WalletStats>({
    balance: '0.00',
    token: 'ETH',
    change: '+0.0%',
    reputationScore: 0,
    reputationTier: 'Novice'
  });
  const [communities, setCommunities] = useState<Community[]>([]);
  const [trendingDAOs, setTrendingDAOs] = useState<TrendingDAO[]>([]);

  // Mock data
  useEffect(() => {
    // In a real implementation, this data would come from API calls
    setCommunities([
      { id: '1', name: 'ethereum-builders', members: 125000, treasuryBalance: '125.4K', token: 'ETH' },
      { id: '2', name: 'defi-traders', members: 89000, treasuryBalance: '89.2K', token: 'USDC' },
      { id: '3', name: 'nft-collectors', members: 67000, treasuryBalance: '45.7K', token: 'WETH' },
      { id: '4', name: 'dao-governance', members: 45000, treasuryBalance: '32.1K', token: 'GOV' },
      { id: '5', name: 'web3-developers', members: 38000, treasuryBalance: '28.9K', token: 'DEV' },
    ]);

    setTrendingDAOs([
      { id: '1', name: 'Ethereum Foundation', token: 'ETH', treasuryBalance: '1.2M' },
      { id: '2', name: 'Uniswap', token: 'UNI', treasuryBalance: '890K' },
      { id: '3', name: 'Aave', token: 'AAVE', treasuryBalance: '650K' },
      { id: '4', name: 'Compound', token: 'COMP', treasuryBalance: '420K' },
    ]);

    // Update wallet stats with real data when connected
    if (isConnected && address) {
      setWalletStats({
        balance: parseFloat(balance).toFixed(4),
        token: 'ETH',
        change: '+2.3%',
        reputationScore: 750,
        reputationTier: 'Expert'
      });
    }
  }, [address, isConnected, balance]);

  return (
    <div className="space-y-4">
      {/* User Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center mb-3">
          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
          <div className="ml-3">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {isConnected ? `0x${address?.substring(2, 6)}...${address?.substring(38)}` : 'Guest'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isConnected ? `u/${address?.substring(0, 8)}` : 'Connect Wallet'}
            </p>
          </div>
        </div>
        
        {isConnected ? (
          <>
            <div className="flex justify-between text-sm mb-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{walletStats.reputationScore}</p>
                <p className="text-gray-500 dark:text-gray-400">Reputation</p>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{walletStats.reputationTier}</p>
                <p className="text-gray-500 dark:text-gray-400">Tier</p>
              </div>
            </div>
            
            <div className="flex justify-between text-sm">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {walletStats.balance} {walletStats.token}
                </p>
                <p className="text-gray-500 dark:text-gray-400">Balance</p>
              </div>
              <div>
                <p className={`font-medium ${walletStats.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                  {walletStats.change}
                </p>
                <p className="text-gray-500 dark:text-gray-400">24h</p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-2">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
              Connect your wallet to see your stats
            </p>
            <button className="w-full bg-primary-600 hover:bg-primary-700 text-white py-1.5 px-3 rounded text-sm font-medium">
              Connect Wallet
            </button>
          </div>
        )}
      </div>

      {/* Communities List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <h3 className="font-medium text-gray-900 dark:text-white">Top Communities</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {communities.map((community, index) => (
            <div key={community.id} className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-gray-500 dark:text-gray-400 w-6 text-sm">{index + 1}</span>
                  <div className="ml-2">
                    <Link href={`/dao/${community.name}`} className="font-medium text-gray-900 hover:underline dark:text-white">
                      /dao/{community.name}
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {community.members.toLocaleString()} members
                    </p>
                  </div>
                </div>
                {community.treasuryBalance && (
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-900 dark:text-white">
                      {community.treasuryBalance} {community.token}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Treasury</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
          <button className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium">
            View All
          </button>
        </div>
      </div>

      {/* Trending DAOs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <h3 className="font-medium text-gray-900 dark:text-white">Trending DAOs</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {trendingDAOs.map((dao) => (
            <div key={dao.id} className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex justify-between items-center">
                <Link href={`/dao/${dao.name.toLowerCase()}`} className="font-medium text-gray-900 hover:underline dark:text-white">
                  {dao.name}
                </Link>
                <div className="text-right">
                  <span className="text-xs font-medium bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 mr-2">
                    {dao.token}
                  </span>
                  {dao.treasuryBalance && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {dao.treasuryBalance}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wallet Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="border-b border-gray-200 dark:border-gray-700 pb-3 mb-3">
          <h3 className="font-medium text-gray-900 dark:text-white">Wallet Quick Stats</h3>
        </div>
        {isConnected ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {walletStats.balance} {walletStats.token}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Portfolio Value</p>
              </div>
              <div className={`text-right ${walletStats.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                <p className="font-medium">{walletStats.change}</p>
                <p className="text-sm">24h change</p>
              </div>
            </div>
            <div className="mt-4 flex space-x-2">
              <button className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 px-3 rounded text-sm font-medium">
                Buy
              </button>
              <button className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-2 px-3 rounded text-sm font-medium">
                Swap
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-2">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
              Connect your wallet to see quick stats
            </p>
            <button className="w-full bg-primary-600 hover:bg-primary-700 text-white py-1.5 px-3 rounded text-sm font-medium">
              Connect Wallet
            </button>
          </div>
        )}
      </div>

      {/* Community Rules */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <h3 className="font-medium text-gray-900 dark:text-white">Community Rules</h3>
        </div>
        <div className="p-4 text-sm text-gray-600 dark:text-gray-300">
          <ul className="list-disc pl-5 space-y-2">
            <li>Be respectful and constructive</li>
            <li>No spam or self-promotion</li>
            <li>Stay on topic</li>
            <li>No price talk or FOMO posts</li>
            <li>Report violations when you see them</li>
          </ul>
        </div>
      </div>
    </div>
  );
}