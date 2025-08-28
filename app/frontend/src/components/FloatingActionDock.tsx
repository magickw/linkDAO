import React, { useState } from 'react';
import Link from 'next/link';
import { useWeb3 } from '@/context/Web3Context';

interface Dao {
  id: string;
  name: string;
  members: number;
  token?: string;
  tokenPrice?: string;
}

interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

export default function FloatingActionDock() {
  const { address, isConnected, balance } = useWeb3();
  const [activeTab, setActiveTab] = useState<'wallet' | 'daos' | 'notifications'>('wallet');
  const [isVisible, setIsVisible] = useState(true);

  // Mock data
  const trendingDaos: Dao[] = [
    { id: '1', name: 'Ethereum Builders', members: 125000, token: 'ETHB', tokenPrice: '$2.35' },
    { id: '2', name: 'DeFi Traders', members: 89000, token: 'DEFI', tokenPrice: '$1.85' },
    { id: '3', name: 'NFT Collectors', members: 67000, token: 'NFTC', tokenPrice: '$0.42' },
    { id: '4', name: 'DAO Governance', members: 45000, token: 'GOV', tokenPrice: '$3.75' },
  ];

  const notifications: Notification[] = [
    { id: '1', title: 'New Proposal', description: 'A new governance proposal has been posted in Ethereum Builders', timestamp: '2 hours ago', read: false },
    { id: '2', title: 'Tip Received', description: 'You received 10 USDC as a tip for your post', timestamp: '5 hours ago', read: true },
    { id: '3', title: 'DAO Update', description: 'DeFi Traders DAO treasury has grown by 15%', timestamp: '1 day ago', read: true },
  ];

  const unreadNotifications = notifications.filter(n => !n.read).length;

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Main Dock Button */}
      <button 
        onClick={() => setIsVisible(!isVisible)}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-primary-600 to-secondary-600 shadow-lg flex items-center justify-center text-white hover:from-primary-700 hover:to-secondary-700 transition-all duration-300"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Expanded Dock */}
      <div className="absolute bottom-20 right-0 w-80 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-white/30 dark:border-gray-700/50 overflow-hidden transition-all duration-300">
        {/* Dock Header */}
        <div className="flex border-b border-gray-200/50 dark:border-gray-700/50">
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 py-3 text-center text-sm font-medium ${
              activeTab === 'wallet'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Wallet
          </button>
          <button
            onClick={() => setActiveTab('daos')}
            className={`flex-1 py-3 text-center text-sm font-medium ${
              activeTab === 'daos'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            DAOs
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-3 text-center text-sm font-medium relative ${
              activeTab === 'notifications'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Notifications
            {unreadNotifications > 0 && (
              <span className="absolute top-2 right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                {unreadNotifications}
              </span>
            )}
          </button>
        </div>

        {/* Dock Content */}
        <div className="p-4 h-96 overflow-y-auto">
          {activeTab === 'wallet' && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Wallet Stats</h3>
              
              {isConnected ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">Total Balance</span>
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {parseFloat(balance).toFixed(4)} ETH
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">$2,450.75 USD</span>
                      <span className="text-green-500">+2.3%</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                      <div className="text-primary-600 dark:text-primary-400 mb-1">
                        <svg className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Buy</span>
                    </button>
                    <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                      <div className="text-primary-600 dark:text-primary-400 mb-1">
                        <svg className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Swap</span>
                    </button>
                    <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                      <div className="text-primary-600 dark:text-primary-400 mb-1">
                        <svg className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Bridge</span>
                    </button>
                    <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                      <div className="text-primary-600 dark:text-primary-400 mb-1">
                        <svg className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Send</span>
                    </button>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Quick Actions</h4>
                    <div className="space-y-2">
                      <button className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-colors">
                        <span className="text-sm text-gray-700 dark:text-gray-300">View Portfolio</span>
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <button className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-colors">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Transaction History</span>
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
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

          {activeTab === 'daos' && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Trending DAOs</h3>
              <div className="space-y-3">
                {trendingDaos.map((dao) => (
                  <Link 
                    key={dao.id} 
                    href={`/dao/${dao.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className="block p-3 rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{dao.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{dao.members.toLocaleString()} members</p>
                      </div>
                      {dao.token && (
                        <div className="text-right">
                          <p className="text-xs font-medium text-gray-900 dark:text-white">{dao.token}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{dao.tokenPrice}</p>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              
              <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50 mt-4">
                <button className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-colors">
                  <span className="text-sm text-gray-700 dark:text-gray-300">View All Communities</span>
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                {unreadNotifications > 0 && (
                  <button className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                    Mark all as read
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-3 rounded-lg ${
                      notification.read 
                        ? 'bg-gray-100/50 dark:bg-gray-700/30' 
                        : 'bg-primary-50/80 dark:bg-primary-900/20 border border-primary-200/50 dark:border-primary-800/50'
                    }`}
                  >
                    <div className="flex justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">{notification.title}</h4>
                      {!notification.read && (
                        <span className="inline-block w-2 h-2 rounded-full bg-primary-500"></span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{notification.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{notification.timestamp}</p>
                  </div>
                ))}
              </div>
              
              {notifications.length === 0 && (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No notifications</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    You're all caught up!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}