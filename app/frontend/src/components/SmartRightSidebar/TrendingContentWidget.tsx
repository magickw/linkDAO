import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface TrendingItem {
  id: string;
  type: 'post' | 'hashtag' | 'user' | 'community' | 'token' | 'nft';
  title: string;
  subtitle?: string;
  engagement: number;
  growth: number;
  thumbnail?: string;
  url: string;
  metadata?: Record<string, any>;
}

interface TrendingContentWidgetProps {
  context: 'feed' | 'community';
  communityId?: string;
  className?: string;
}

export default function TrendingContentWidget({ 
  context, 
  communityId,
  className = '' 
}: TrendingContentWidgetProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'posts' | 'hashtags' | 'users' | 'tokens'>('all');
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock trending data - in real app, this would come from API
  useEffect(() => {
    const mockTrendingData: TrendingItem[] = [
      {
        id: '1',
        type: 'hashtag',
        title: '#DeFiSummer',
        subtitle: '2.4K posts',
        engagement: 2400,
        growth: 25,
        url: '/hashtags/defisummer'
      },
      {
        id: '2',
        type: 'post',
        title: 'New Ethereum Upgrade Proposal',
        subtitle: 'by @vitalik.eth',
        engagement: 1850,
        growth: 18,
        url: '/posts/eth-upgrade-proposal',
        thumbnail: 'https://placehold.co/40'
      },
      {
        id: '3',
        type: 'user',
        title: '@defi_whale',
        subtitle: '15.2K followers',
        engagement: 1520,
        growth: 12,
        url: '/users/defi_whale',
        thumbnail: 'https://placehold.co/40'
      },
      {
        id: '4',
        type: 'token',
        title: 'LINK',
        subtitle: 'Chainlink Token',
        engagement: 3200,
        growth: 8,
        url: '/tokens/link',
        metadata: { price: 14.52, change: 8.2 }
      },
      {
        id: '5',
        type: 'community',
        title: 'Ethereum Builders',
        subtitle: '12.4K members',
        engagement: 890,
        growth: 15,
        url: '/dao/ethereum-builders',
        thumbnail: 'https://placehold.co/40'
      },
      {
        id: '6',
        type: 'nft',
        title: 'CryptoPunks Floor',
        subtitle: '45.2 ETH',
        engagement: 650,
        growth: -5,
        url: '/nfts/cryptopunks',
        thumbnail: 'https://placehold.co/40'
      },
      {
        id: '7',
        type: 'hashtag',
        title: '#Web3Gaming',
        subtitle: '1.8K posts',
        engagement: 1800,
        growth: 22,
        url: '/hashtags/web3gaming'
      },
      {
        id: '8',
        type: 'post',
        title: 'DAO Governance Best Practices',
        subtitle: 'by @dao_expert',
        engagement: 1200,
        growth: 14,
        url: '/posts/dao-governance',
        thumbnail: 'https://placehold.co/40'
      }
    ];

    // Simulate loading
    setTimeout(() => {
      setTrendingItems(mockTrendingData);
      setIsLoading(false);
    }, 1000);
  }, [context, communityId]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'post': return '📝';
      case 'hashtag': return '#️⃣';
      case 'user': return '👤';
      case 'community': return '🏛️';
      case 'token': return '🪙';
      case 'nft': return '🖼️';
      default: return '🔥';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'post': return 'text-blue-600 dark:text-blue-400';
      case 'hashtag': return 'text-purple-600 dark:text-purple-400';
      case 'user': return 'text-green-600 dark:text-green-400';
      case 'community': return 'text-yellow-600 dark:text-yellow-400';
      case 'token': return 'text-orange-600 dark:text-orange-400';
      case 'nft': return 'text-pink-600 dark:text-pink-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const filteredItems = activeFilter === 'all' 
    ? trendingItems 
    : trendingItems.filter(item => {
        if (activeFilter === 'posts') return item.type === 'post';
        if (activeFilter === 'hashtags') return item.type === 'hashtag';
        if (activeFilter === 'users') return item.type === 'user';
        if (activeFilter === 'tokens') return item.type === 'token';
        return true;
      });

  const filters = [
    { id: 'all', label: 'All', icon: '🔥' },
    { id: 'posts', label: 'Posts', icon: '📝' },
    { id: 'hashtags', label: 'Tags', icon: '#️⃣' },
    { id: 'users', label: 'Users', icon: '👤' },
    { id: 'tokens', label: 'Tokens', icon: '🪙' }
  ];

  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
            <svg className="h-5 w-5 mr-2 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {context === 'community' ? 'Community Trending' : 'Trending Now'}
          </h3>
          <button className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
            Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as any)}
              className={`flex-1 px-2 py-1 text-xs rounded-md transition-colors ${
                activeFilter === filter.id
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className="mr-1">{filter.icon}</span>
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                  <div className="w-8 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🔍</div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No trending {activeFilter === 'all' ? 'content' : activeFilter} found
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.slice(0, 8).map((item, index) => {
              const isPositive = item.growth >= 0;
              
              return (
                <Link
                  key={item.id}
                  href={item.url}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 group hover:scale-[1.02]"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-6 text-center">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {index + 1}
                      </span>
                    </div>

                    {/* Icon/Thumbnail */}
                    <div className="flex-shrink-0">
                      {item.thumbnail ? (
                        <img 
                          src={item.thumbnail} 
                          alt={item.title}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center text-white text-sm">
                          {getTypeIcon(item.type)}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors ${getTypeColor(item.type)}`}>
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {item.subtitle}
                        </p>
                      )}
                      {item.metadata?.price && (
                        <p className="text-xs text-gray-900 dark:text-white font-medium">
                          ${item.metadata.price}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex-shrink-0 text-right ml-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatNumber(item.engagement)}
                      </span>
                      <span className={`text-xs flex items-center ${
                        isPositive ? 'text-green-500' : 'text-red-500'
                      }`}>
                        <svg 
                          className={`w-3 h-3 mr-1 ${isPositive ? '' : 'rotate-180'}`} 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        {Math.abs(item.growth)}%
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* View More */}
        {!isLoading && filteredItems.length > 8 && (
          <Link
            href={`/trending?filter=${activeFilter}&context=${context}`}
            className="block mt-4 text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
          >
            View All Trending {activeFilter === 'all' ? 'Content' : activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} →
          </Link>
        )}

        {/* Context Info */}
        <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              {context === 'community' ? 'Community trends' : 'Global trends'}
            </span>
            <span>Updated 2m ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}