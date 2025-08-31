import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { useMarketplace } from '@/hooks/useMarketplace';

// Define types for activity data
type Activity = {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  txHash?: string;
  metadata?: {
    price?: string;
    buyer?: string;
    offerFrom?: string;
    comment?: string;
    itemId?: string;
  };
};

interface ActivityFeedProps {
  address: string;
}

const getActivityIcon = (type: string) => {
  const icons: Record<string, string> = {
    sale: '💰',
    listing: '📝',
    purchase: '🛒',
    offer: '🤝',
    transfer: '🔄',
    bid: '🏷️',
    like: '❤️',
    comment: '💬',
    follow: '👤',
    claim: '🏆',
  };
  return icons[type] || '🔔';
};

const getActivityColor = (type: string) => {
  const colors: Record<string, string> = {
    sale: 'bg-green-500/10 text-green-400',
    listing: 'bg-blue-500/10 text-blue-400',
    purchase: 'bg-purple-500/10 text-purple-400',
    offer: 'bg-yellow-500/10 text-yellow-400',
    transfer: 'bg-indigo-500/10 text-indigo-400',
    bid: 'bg-pink-500/10 text-pink-400',
    like: 'bg-red-500/10 text-red-400',
    comment: 'bg-cyan-500/10 text-cyan-400',
    follow: 'bg-orange-500/10 text-orange-400',
    claim: 'bg-teal-500/10 text-teal-400',
  };
  return colors[type] || 'bg-gray-500/10 text-gray-400';
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ address }) => {
  const { getSellerActivity } = useMarketplace();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['sellerActivity', address],
    queryFn: () => getSellerActivity(address),
    enabled: !!address,
    refetchInterval: 30000, // 30 seconds
  });

  // Mock data (replace with real data from your API)
  const mockActivities = [
    {
      id: '1',
      type: 'sale',
      title: 'New Sale',
      description: 'Your item "Vintage Camera" was purchased by 0x1a2b...3c4d for 0.5 ETH',
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      txHash: '0x123...456',
      metadata: {
        itemId: '123',
        price: '500000000000000000', // 0.5 ETH in wei
        buyer: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
      },
    },
    {
      id: '2',
      type: 'offer',
      title: 'New Offer Received',
      description: 'New offer of 0.3 ETH for your item "Rare Collectible"',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      txHash: '0x789...012',
      metadata: {
        itemId: '456',
        offerAmount: '300000000000000000', // 0.3 ETH in wei
        offerFrom: '0x9a8b7c6d5e4f3g2h1i0j9k8l7m6n5o4p3q2r1s0t',
      },
    },
    {
      id: '3',
      type: 'like',
      title: 'Item Liked',
      description: 'Your item "Digital Art #42" was liked by 3 new users',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      metadata: {
        itemId: '789',
        likeCount: 3,
      },
    },
    {
      id: '4',
      type: 'comment',
      title: 'New Comment',
      description: 'New comment on your item "Handmade Necklace"',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
      metadata: {
        itemId: '101',
        comment: 'This is amazing! Do you have more colors?',
        commenter: '0x5a4b3c2d1e0f9g8h7i6j5k4l3m2n1o0p9q8r7s6t',
      },
    },
    {
      id: '5',
      type: 'follow',
      title: 'New Follower',
      description: 'You have a new follower',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      metadata: {
        follower: '0x9z8y7x6w5v4u3t2s1r0q9p8o7n6m5l4k3j2i1h0g',
      },
    },
  ];

  const displayActivities: Activity[] = (Array.isArray(activities) ? activities : []).length > 0 ? (activities as Activity[]) : mockActivities;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white/5 h-20 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const formatTransactionHash = (hash: string) => {
    if (!hash) return '';
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  };

  const formatEtherValue = (value: string) => {
    try {
      return formatEther(BigInt(value));
    } catch (e) {
      return '0';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
        <div className="text-sm text-white/60">
          Last updated {formatDistanceToNow(new Date())} ago
        </div>
      </div>

      <div className="space-y-4">
        {displayActivities.map((activity: Activity) => (
          <div 
            key={activity.id} 
            className="bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-colors"
          >
            <div className="p-4">
              <div className="flex items-start">
                <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center text-xl ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-white">
                      {activity.title}
                    </h3>
                    <p className="text-xs text-white/50">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-white/80">
                    {activity.description}
                  </p>
                  
                  {/* Metadata */}
                  {activity.metadata && (
                    <div className="mt-2 text-xs text-white/60 space-y-1">
                      {activity.metadata.price && (
                        <div className="flex items-center">
                          <span className="font-medium mr-2">Amount:</span>
                          <span className="text-white/80">{formatEtherValue(activity.metadata.price)} ETH</span>
                        </div>
                      )}
                      
                      {activity.metadata.buyer && (
                        <div className="flex items-center">
                          <span className="font-medium mr-2">Buyer:</span>
                          <span className="text-white/80">{formatTransactionHash(activity.metadata.buyer)}</span>
                        </div>
                      )}
                      
                      {activity.metadata.offerFrom && (
                        <div className="flex items-center">
                          <span className="font-medium mr-2">From:</span>
                          <span className="text-white/80">{formatTransactionHash(activity.metadata.offerFrom)}</span>
                        </div>
                      )}
                      
                      {activity.metadata.comment && (
                        <div className="mt-2 p-2 bg-white/5 rounded-lg">
                          <p className="text-white/80 italic">"{activity.metadata.comment}"</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="mt-3 flex space-x-2">
                    {activity.txHash && (
                      <a 
                        href={`https://etherscan.io/tx/${activity.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
                      >
                        View on Etherscan
                      </a>
                    )}
                    
                    {activity.metadata?.itemId && (
                      <a 
                        href={`/items/${activity.metadata.itemId}`}
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        View Item
                      </a>
                    )}
                    
                    {activity.type === 'offer' && (
                      <>
                        <button className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 transition-colors">
                          Accept Offer
                        </button>
                        <button className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 transition-colors">
                          Decline
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {displayActivities.length > 0 && (
        <div className="mt-6 text-center">
          <button className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">
            View All Activity
          </button>
        </div>
      )}
    </div>
  );
};
