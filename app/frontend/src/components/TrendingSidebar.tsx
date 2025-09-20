/**
 * Enhanced Trending Sidebar Component
 * Implements comprehensive UX improvements for LinkDAO's right sidebar
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Hash,
  Users,
  Eye,
  MessageCircle,
  Heart,
  ExternalLink,
  Sparkles,
  Clock,
  Award,
  Zap,
  ChevronRight,
  Search,
  Filter,
  Bell,
  Bookmark,
  Share2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Globe,
  Wallet,
  Send,
  Repeat,
  Plus,
  Star,
  Target,
  BarChart3
} from 'lucide-react';
import { GlassPanel } from '@/design-system';

interface TrendingItem {
  id: string;
  type: 'hashtag' | 'user' | 'post' | 'token' | 'community';
  title: string;
  subtitle?: string;
  count: number;
  growth: number;
  avatar?: string;
  verified?: boolean;
  trending?: boolean;
  category?: string;
}

interface WalletAsset {
  symbol: string;
  name: string;
  balance: string;
  value: string;
  change24h: number;
  icon: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  action: () => void;
}

interface RecentTransaction {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'stake';
  amount: string;
  token: string;
  timestamp: Date;
  status: 'completed' | 'pending' | 'failed';
}

interface TrendingSidebarProps {
  className?: string;
  onCreatePost?: () => void;
  onOpenWallet?: () => void;
  userWalletAddress?: string;
}

export default function TrendingSidebar({
  className = '',
  onCreatePost,
  onOpenWallet,
  userWalletAddress
}: TrendingSidebarProps) {
  const [activeTab, setActiveTab] = useState<'trending' | 'wallet' | 'activity'>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllTrending, setShowAllTrending] = useState(false);

  // Mock data - replace with real API calls
  const trendingData: TrendingItem[] = [
    {
      id: '1',
      type: 'hashtag',
      title: '#DeFiSummer',
      subtitle: 'Decentralized Finance',
      count: 12500,
      growth: 24.5,
      trending: true,
      category: 'Finance'
    },
    {
      id: '2',
      type: 'hashtag',
      title: '#Web3Gaming',
      subtitle: 'Gaming & NFTs',
      count: 8900,
      growth: 18.2,
      trending: true,
      category: 'Gaming'
    },
    {
      id: '3',
      type: 'user',
      title: 'vitalik.eth',
      subtitle: 'Ethereum Founder',
      count: 45600,
      growth: 12.1,
      avatar: 'https://placehold.co/40',
      verified: true,
      category: 'Influencer'
    },
    {
      id: '4',
      type: 'community',
      title: 'DeFi Protocols',
      subtitle: '15.2K members',
      count: 15200,
      growth: 8.7,
      avatar: 'https://placehold.co/40',
      category: 'Community'
    },
    {
      id: '5',
      type: 'token',
      title: 'LDAO',
      subtitle: 'LinkDAO Token',
      count: 2450000,
      growth: 15.8,
      category: 'Token'
    }
  ];

  const walletAssets: WalletAsset[] = [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      balance: '2.5847',
      value: '$4,892.65',
      change24h: 2.34,
      icon: '🔷'
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      balance: '1,250.00',
      value: '$1,250.00',
      change24h: 0.01,
      icon: '💵'
    },
    {
      symbol: 'LDAO',
      name: 'LinkDAO Token',
      balance: '15,000',
      value: '$750.00',
      change24h: 12.5,
      icon: '🔗'
    }
  ];

  const quickActions: QuickAction[] = [
    {
      id: 'send',
      label: 'Send',
      icon: <Send className="w-4 h-4" />,
      color: 'bg-blue-500',
      action: () => console.log('Send tokens')
    },
    {
      id: 'receive',
      label: 'Receive',
      icon: <Wallet className="w-4 h-4" />,
      color: 'bg-green-500',
      action: () => console.log('Receive tokens')
    },
    {
      id: 'swap',
      label: 'Swap',
      icon: <Repeat className="w-4 h-4" />,
      color: 'bg-purple-500',
      action: () => console.log('Swap tokens')
    },
    {
      id: 'stake',
      label: 'Stake',
      icon: <Target className="w-4 h-4" />,
      color: 'bg-orange-500',
      action: () => console.log('Stake tokens')
    }
  ];

  const recentTransactions: RecentTransaction[] = [
    {
      id: '1',
      type: 'receive',
      amount: '0.5',
      token: 'ETH',
      timestamp: new Date(Date.now() - 3600000),
      status: 'completed'
    },
    {
      id: '2',
      type: 'swap',
      amount: '100',
      token: 'USDC → LDAO',
      timestamp: new Date(Date.now() - 7200000),
      status: 'completed'
    },
    {
      id: '3',
      type: 'send',
      amount: '25',
      token: 'LDAO',
      timestamp: new Date(Date.now() - 10800000),
      status: 'pending'
    }
  ];

  const filteredTrending = trendingData.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.subtitle && item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const displayedTrending = showAllTrending ? filteredTrending : filteredTrending.slice(0, 5);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'send': return <Send className="w-4 h-4 text-red-500" />;
      case 'receive': return <ArrowDownRight className="w-4 h-4 text-green-500" />;
      case 'swap': return <Repeat className="w-4 h-4 text-purple-500" />;
      case 'stake': return <Target className="w-4 h-4 text-orange-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'pending': return 'text-yellow-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-white/50 dark:bg-gray-800/50 rounded-xl p-1 backdrop-blur-sm">
        {(['trending', 'wallet', 'activity'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {tab === 'trending' && <TrendingUp className="w-4 h-4 inline mr-1" />}
            {tab === 'wallet' && <Wallet className="w-4 h-4 inline mr-1" />}
            {tab === 'activity' && <Activity className="w-4 h-4 inline mr-1" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Trending Tab */}
        {activeTab === 'trending' && (
          <motion.div
            key="trending"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search trending..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm backdrop-blur-sm"
              />
            </div>

            {/* Trending Content */}
            <GlassPanel className="p-0 overflow-hidden">
              <div className="p-4 border-b border-gray-100/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-orange-500" />
                    Trending Now
                  </h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Live</span>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-100/50 dark:divide-gray-700/50">
                {displayedTrending.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        {item.avatar ? (
                          <div className="relative">
                            <img
                              src={item.avatar}
                              alt={item.title}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            {item.verified && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900 dark:to-secondary-900 rounded-full flex items-center justify-center">
                            {item.type === 'hashtag' && <Hash className="w-4 h-4 text-primary-600 dark:text-primary-400" />}
                            {item.type === 'community' && <Users className="w-4 h-4 text-primary-600 dark:text-primary-400" />}
                            {item.type === 'token' && <DollarSign className="w-4 h-4 text-primary-600 dark:text-primary-400" />}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                              {item.title}
                            </h4>
                            {item.trending && (
                              <div className="flex items-center space-x-1 text-orange-500">
                                <Sparkles className="w-3 h-3" />
                                <span className="text-xs font-medium">Hot</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{formatNumber(item.count)} posts</span>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                              <ArrowUpRight className="w-3 h-3 text-green-500" />
                              <span className="text-green-500">+{item.growth}%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    </div>

                    {item.category && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                          {item.category}
                        </span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {filteredTrending.length > 5 && (
                <div className="p-4 border-t border-gray-100/50 dark:border-gray-700/50">
                  <button
                    onClick={() => setShowAllTrending(!showAllTrending)}
                    className="w-full text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
                  >
                    {showAllTrending ? 'Show Less' : `Show ${filteredTrending.length - 5} More`}
                  </button>
                </div>
              )}
            </GlassPanel>

            {/* Suggested Communities */}
            <GlassPanel className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-500" />
                Suggested Communities
              </h3>
              <div className="space-y-3">
                {['DeFi Innovators', 'NFT Creators', 'Web3 Builders'].map((community, index) => (
                  <div key={community} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{community}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{Math.floor(Math.random() * 10000)} members</p>
                      </div>
                    </div>
                    <button className="px-3 py-1 bg-primary-100 hover:bg-primary-200 dark:bg-primary-900 dark:hover:bg-primary-800 text-primary-700 dark:text-primary-300 text-xs font-medium rounded-full transition-colors">
                      Join
                    </button>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </motion.div>
        )}

        {/* Wallet Tab */}
        {activeTab === 'wallet' && (
          <motion.div
            key="wallet"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Wallet Overview */}
            <GlassPanel className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                  <Wallet className="w-5 h-5 mr-2 text-green-500" />
                  Portfolio
                </h3>
                <button
                  onClick={onOpenWallet}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
                >
                  View Full
                </button>
              </div>

              <div className="mb-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  $6,892.65
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                  <span className="text-green-500 font-medium">+$234.12 (3.5%)</span>
                  <span className="text-gray-500 dark:text-gray-400">24h</span>
                </div>
              </div>

              <div className="space-y-3">
                {walletAssets.map((asset) => (
                  <div key={asset.symbol} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-lg">{asset.icon}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {asset.balance} {asset.symbol}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{asset.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{asset.value}</p>
                      <div className="flex items-center space-x-1">
                        {asset.change24h >= 0 ? (
                          <ArrowUpRight className="w-3 h-3 text-green-500" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 text-red-500" />
                        )}
                        <span className={`text-xs font-medium ${
                          asset.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {asset.change24h >= 0 ? '+' : ''}{asset.change24h}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>

            {/* Quick Actions */}
            <GlassPanel className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={action.action}
                    className="flex flex-col items-center space-y-2 p-3 bg-gray-50/80 dark:bg-gray-800/80 rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-colors group"
                  >
                    <div className={`w-10 h-10 ${action.color} rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                      {action.icon}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </GlassPanel>
          </motion.div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Recent Transactions */}
            <GlassPanel className="p-0 overflow-hidden">
              <div className="p-4 border-b border-gray-100/50 dark:border-gray-700/50">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-purple-500" />
                  Recent Activity
                </h3>
              </div>

              <div className="divide-y divide-gray-100/50 dark:divide-gray-700/50">
                {recentTransactions.map((tx, index) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getTransactionIcon(tx.type)}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                            {tx.type} {tx.amount} {tx.token}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {tx.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-medium capitalize ${getStatusColor(tx.status)}`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="p-4 border-t border-gray-100/50 dark:border-gray-700/50">
                <button className="w-full text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors">
                  View All Transactions
                </button>
              </div>
            </GlassPanel>

            {/* Notifications */}
            <GlassPanel className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-blue-500" />
                Notifications
              </h3>
              <div className="space-y-3">
                {[
                  { type: 'like', message: 'Alex liked your post', time: '2m ago' },
                  { type: 'comment', message: 'New comment on your post', time: '5m ago' },
                  { type: 'follow', message: 'Sarah started following you', time: '1h ago' }
                ].map((notification, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50/80 dark:bg-gray-800/80 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">{notification.message}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{notification.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Post Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <button
          onClick={onCreatePost}
          className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Create Post</span>
        </button>
      </motion.div>
    </div>
  );
}