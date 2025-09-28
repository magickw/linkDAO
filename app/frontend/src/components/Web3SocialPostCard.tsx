import React, { useState } from 'react';
import Link from 'next/link';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import { useProfile } from '@/hooks/useProfile'; // Add this import
import NFTPreview from '@/components/Marketplace/NFT/NFTPreview';
// import DeFiChartEmbed from '@/components/DeFiChartEmbed';
// import WalletSnapshotEmbed from '@/components/WalletSnapshotEmbed';
// import DAOGovernanceEmbed from '@/components/DAOGovernanceEmbed';
import GestureHandler from '@/components/GestureHandler';
// import QuickActionsMenu from '@/components/QuickActionsMenu';
import PostInteractionBar from '@/components/PostInteractionBar';
import OptimizedImage from '@/components/OptimizedImage';
import EnhancedCommentSystem from '@/components/EnhancedCommentSystem';

interface Reaction {
  type: 'hot' | 'diamond' | 'bullish' | 'governance' | 'art';
  emoji: string;
  label: string;
  totalStaked: number;
  userStaked: number;
  contributors: string[];
  rewardsEarned: number; // Add rewards earned field
}

interface Web3SocialPostCardProps {
  post: any;
  className?: string;
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  onTip?: (postId: string, amount: string, token: string) => Promise<void>;
  onExpand?: () => void;
}

export default function Web3SocialPostCard({
  post,
  className = '',
  onReaction,
  onTip,
  onExpand
}: Web3SocialPostCardProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const { data: authorProfile, isLoading: isProfileLoading } = useProfile(post?.author); // Fetch author's profile
  const [expanded, setExpanded] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [showTipInput, setShowTipInput] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([
    { type: 'hot', emoji: '🔥', label: 'Hot Take', totalStaked: 120, userStaked: 0, contributors: [], rewardsEarned: 24.5 },
    { type: 'diamond', emoji: '💎', label: 'Diamond Hands', totalStaked: 85, userStaked: 0, contributors: [], rewardsEarned: 17.2 },
    { type: 'bullish', emoji: '🚀', label: 'Bullish', totalStaked: 210, userStaked: 0, contributors: [], rewardsEarned: 42.8 },
    { type: 'governance', emoji: '⚖️', label: 'Governance', totalStaked: 95, userStaked: 0, contributors: [], rewardsEarned: 19.0 },
    { type: 'art', emoji: '🎨', label: 'Art Appreciation', totalStaked: 42, userStaked: 0, contributors: [], rewardsEarned: 8.4 }
  ]);

  // Format the timestamp
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  const timestamp = post?.createdAt ? (
    post.createdAt instanceof Date ?
      formatTimestamp(post.createdAt) :
      formatTimestamp(new Date(post.createdAt))
  ) : 'Unknown time';

  // Handle reaction (staking tokens)
  const handleReaction = async (reactionType: string, amount: number = 1) => {
    if (!isConnected) {
      addToast('Please connect your wallet to react', 'error');
      return;
    }

    try {
      // In a real implementation, this would call the backend API
      if (onReaction) {
        await onReaction(post.id, reactionType, amount);
      }

      // Update local state
      setReactions(prev => prev.map(reaction => {
        if (reaction.type === reactionType) {
          // Calculate rewards (10% of staked amount goes to author as reward)
          const reward = amount * 0.1;
          return {
            ...reaction,
            totalStaked: reaction.totalStaked + amount,
            userStaked: reaction.userStaked + amount,
            rewardsEarned: reaction.rewardsEarned + reward,
            contributors: [...reaction.contributors, address!.substring(0, 6) + '...' + address!.substring(38)]
          };
        }
        return reaction;
      }));

      addToast(`Successfully staked ${amount} $LNK on ${reactionType} reaction!`, 'success');
    } catch (error) {
      console.error('Error reacting:', error);
      addToast('Failed to react. Please try again.', 'error');
    }
  };

  // Handle double tap reaction (🔥 hot take)
  const handleDoubleTap = async () => {
    await handleReaction('hot', 1);
  };

  // Handle long press for quick actions
  const handleLongPress = () => {
    setShowQuickActions(true);
  };

  // Handle quick action
  const handleQuickAction = async (action: string) => {
    switch (action) {
      case 'hot':
      case 'diamond':
      case 'bullish':
      case 'governance':
      case 'art':
        await handleReaction(action, 1);
        break;
      case 'tip':
        if (!isConnected) {
          addToast('Please connect your wallet to tip', 'error');
          return;
        }
        // In a real implementation, this would open a tip modal
        addToast('Quick tip functionality would be implemented here', 'info');
        break;
      case 'share':
        // In a real implementation, this would share the post
        addToast('Share functionality would be implemented here', 'info');
        break;
      case 'save':
        // In a real implementation, this would save the post
        addToast('Save functionality would be implemented here', 'info');
        break;
      default:
        addToast(`Action ${action} not implemented`, 'info');
    }
  };

  // Handle tipping
  const handleTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      addToast('Please connect your wallet to tip', 'error');
      return;
    }

    if (tipAmount <= 0) {
      addToast('Please enter a valid tip amount', 'error');
      return;
    }

    try {
      // In a real implementation, this would call the backend API
      if (onTip) {
        await onTip(post.id, tipAmount.toString(), 'USDC');
      }
      addToast(`Successfully tipped ${tipAmount} USDC!`, 'success');
      setTipAmount(0);
      setShowTipInput(false);
    } catch (error) {
      console.error('Error tipping:', error);
      addToast('Failed to send tip. Please try again.', 'error');
    }
  };

  // Toggle expanded view
  const toggleExpand = () => {
    if (onExpand) {
      onExpand();
    }
    setExpanded(!expanded);
  };

  // Toggle analytics view
  const toggleAnalytics = () => {
    setShowAnalytics(!showAnalytics);
  };

  // Get category gradient based on post tags
  const getCategoryGradient = () => {
    if (post.tags && post.tags.length > 0) {
      if (post.tags.includes('defi') || post.tags.includes('yield') || post.tags.includes('trade')) {
        return 'from-green-400/30 via-emerald-500/20 to-teal-600/30';
      } else if (post.tags.includes('nft') || post.tags.includes('art') || post.tags.includes('collection')) {
        return 'from-purple-400/30 via-fuchsia-500/20 to-pink-600/30';
      } else if (post.tags.includes('governance') || post.tags.includes('proposal') || post.tags.includes('dao')) {
        return 'from-blue-400/30 via-indigo-500/20 to-violet-600/30';
      } else if (post.tags.includes('social') || post.tags.includes('community') || post.tags.includes('discussion')) {
        return 'from-orange-400/30 via-amber-500/20 to-yellow-600/30';
      } else if (post.tags.includes('wallet') || post.tags.includes('transaction') || post.tags.includes('bridge')) {
        return 'from-cyan-400/30 via-sky-500/20 to-blue-600/30';
      } else if (post.tags.includes('security') || post.tags.includes('audit') || post.tags.includes('exploit')) {
        return 'from-red-400/30 via-rose-500/20 to-pink-600/30';
      }
    }
    return 'from-gray-400/20 to-slate-600/20';
  };

  // Get category color for post type indicator
  const getCategoryColor = () => {
    if (post.tags && post.tags.length > 0) {
      if (post.tags.includes('defi') || post.tags.includes('yield') || post.tags.includes('trade')) {
        return 'bg-gradient-to-r from-green-500 to-emerald-600';
      } else if (post.tags.includes('nft') || post.tags.includes('art') || post.tags.includes('collection')) {
        return 'bg-gradient-to-r from-purple-500 to-fuchsia-600';
      } else if (post.tags.includes('governance') || post.tags.includes('proposal') || post.tags.includes('dao')) {
        return 'bg-gradient-to-r from-blue-500 to-indigo-600';
      } else if (post.tags.includes('social') || post.tags.includes('community') || post.tags.includes('discussion')) {
        return 'bg-gradient-to-r from-orange-500 to-amber-600';
      } else if (post.tags.includes('wallet') || post.tags.includes('transaction') || post.tags.includes('bridge')) {
        return 'bg-gradient-to-r from-cyan-500 to-sky-600';
      } else if (post.tags.includes('security') || post.tags.includes('audit') || post.tags.includes('exploit')) {
        return 'bg-gradient-to-r from-red-500 to-rose-600';
      }
    }
    return 'bg-gradient-to-r from-gray-500 to-slate-600';
  };

  // Get category icon based on post type
  const getCategoryIcon = () => {
    if (post.tags && post.tags.length > 0) {
      if (post.tags.includes('defi') || post.tags.includes('yield') || post.tags.includes('trade')) {
        return '💰';
      } else if (post.tags.includes('nft') || post.tags.includes('art') || post.tags.includes('collection')) {
        return '🖼️';
      } else if (post.tags.includes('governance') || post.tags.includes('proposal') || post.tags.includes('dao')) {
        return '🏛️';
      } else if (post.tags.includes('social') || post.tags.includes('community') || post.tags.includes('discussion')) {
        return '👥';
      } else if (post.tags.includes('wallet') || post.tags.includes('transaction') || post.tags.includes('bridge')) {
        return '💳';
      } else if (post.tags.includes('security') || post.tags.includes('audit') || post.tags.includes('exploit')) {
        return '🔒';
      }
    }
    return '📝';
  };

  // Determine if post has embeds
  const hasEmbeds = () => {
    return post.tags?.some((tag: string) =>
      ['nft', 'defi', 'wallet', 'governance', 'dao'].includes(tag)
    ) || post.onchainRef;
  };

  // Render appropriate embed based on post type
  const renderEmbed = () => {
    if (!expanded) return null;

    if (post.tags?.includes('nft')) {
      // Mock NFT data - in a real app this would come from post metadata
      const mockNFTs = [
        {
          id: '1',
          name: 'Crypto Punk #1234',
          image: 'https://placehold.co/300',
          collection: 'Crypto Punks',
          tokenId: '1234',
          contractAddress: '0x1234567890123456789012345678901234567890'
        }
      ];
      return <NFTPreview nfts={mockNFTs} className="mt-4" />;
    }

    if (post.tags?.includes('defi')) {
      // Mock DeFi data - in a real app this would come from post metadata
      return <div className="mt-4 p-4 bg-blue-500/20 rounded-lg text-center text-white">DeFi Chart Embed (Coming Soon)</div>;
    }

    if (post.tags?.includes('wallet') && post.onchainRef) {
      return <div className="mt-4 p-4 bg-green-500/20 rounded-lg text-center text-white">Wallet Snapshot (Coming Soon)</div>;
    }

    if (post.tags?.includes('governance') || post.tags?.includes('dao')) {
      // Mock DAO data - in a real app this would come from post metadata
      return <div className="mt-4 p-4 bg-purple-500/20 rounded-lg text-center text-white">DAO Governance Embed (Coming Soon)</div>;
    }

    return null;
  };

  // Truncate content for preview
  const truncateContent = (content: string | undefined | null, maxLength: number = 200) => {
    if (!content || typeof content !== 'string') return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  // Function to determine if a contributor is high-value
  const isHighValueContributor = (stakedAmount: number) => {
    return stakedAmount > 10; // High-value if staked more than 10 tokens
  };

  // Use author's profile data or fallback values
  const authorHandle = authorProfile?.handle || authorProfile?.ens || `${post?.author?.substring(0, 6)}...${post?.author?.substring(38)}`;
  const authorAvatar = authorProfile?.avatarCid || 'https://placehold.co/40';
  const isVerified = authorProfile?.ens ? true : false;

  // If post is not available, don't render anything
  if (!post) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg ${className}`}>
      {/* Post Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Author Avatar */}
          <div className="relative">
            <img 
              src={authorAvatar} 
              alt={authorHandle} 
              className="w-10 h-10 rounded-full object-cover"
              onError={(e) => {
                // Fallback image if avatar fails to load
                const target = e.target as HTMLImageElement;
                target.src = 'https://placehold.co/40';
              }}
            />
            {isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          
          {/* Author Info */}
          <div>
            <div className="flex items-center space-x-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">{authorHandle}</h3>
              {isVerified && (
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{timestamp}</p>
          </div>
        </div>
        
        {/* Post Options */}
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
          {post.contentCid}
        </p>
      </div>

      {/* Media Previews */}
      {post.mediaCids && post.mediaCids.length > 0 && (
        <div className="px-4 pb-3">
          <div className="grid grid-cols-2 gap-2">
            {post.mediaCids.slice(0, 4).map((media: string, index: number) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                <OptimizedImage 
                  src={media} 
                  alt={`Post media ${index + 1}`} 
                  className="w-full h-full object-cover"
                />
                {post.mediaCids.length > 4 && index === 3 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">+{post.mediaCids.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Post Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag: string, index: number) => (
              <span 
                key={index} 
                className="px-2 py-1 text-xs bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Post Actions */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <PostInteractionBar 
          post={{
            id: post.id,
            contentCid: post.contentCid,
            author: post.author,
            commentCount: post.commentCount || 0,
            stakedValue: 0
          }}
          postType="feed"
          onReaction={async (postId: string, reactionType: string, amount?: number) => {
            await handleReaction(reactionType, amount);
          }}
          onTip={async (postId: string, amount: string, token: string) => {
            if (onTip) {
              await onTip(postId, amount, token);
            }
          }}
          onShare={async (postId: string, shareType: string, message?: string) => {
            console.log('Share clicked', postId, shareType, message);
          }}
        />
      </div>

      {/* Tip Input */}
      {showTipInput && (
        <div className="px-4 pb-4">
          <form onSubmit={handleTip} className="flex space-x-2">
            <input
              type="number"
              value={tipAmount}
              onChange={(e) => setTipAmount(Number(e.target.value))}
              placeholder="Amount"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              min="0"
              step="0.1"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              Tip
            </button>
            <button
              type="button"
              onClick={() => setShowTipInput(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Comments Section */}
      <div className="px-4 pb-4">
        <EnhancedCommentSystem 
          postId={post.id}
          initialComments={post.comments || []}
          postType="feed"
        />
      </div>
    </div>
  );
}
