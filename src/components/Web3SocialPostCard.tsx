import React, { useState } from 'react';
import Link from 'next/link';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import NFTPreview from '@/components/NFTPreview';
import DeFiChartEmbed from '@/components/DeFiChartEmbed';
import WalletSnapshotEmbed from '@/components/WalletSnapshotEmbed';
import DAOGovernanceEmbed from '@/components/DAOGovernanceEmbed';
import GestureHandler from '@/components/GestureHandler';
import QuickActionsMenu from '@/components/QuickActionsMenu';
import PostInteractionBar from '@/components/PostInteractionBar';

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
  profile: any;
  className?: string;
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  onTip?: (postId: string, amount: string, token: string) => Promise<void>;
  onExpand?: () => void;
}

export default function Web3SocialPostCard({
  post,
  profile,
  className = '',
  onReaction,
  onTip,
  onExpand
}: Web3SocialPostCardProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
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

  const timestamp = post.createdAt instanceof Date ?
    formatTimestamp(post.createdAt) :
    'Unknown time';

  // Handle reaction (staking tokens)
  const handleReaction = async (reactionType: string, amount: number) => {
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
      return <DeFiChartEmbed tokenSymbol="ETH" tokenName="Ethereum" className="mt-4" />;
    }

    if (post.tags?.includes('wallet') && post.onchainRef) {
      return <WalletSnapshotEmbed walletAddress={post.onchainRef} className="mt-4" />;
    }

    if (post.tags?.includes('governance') || post.tags?.includes('dao')) {
      // Mock DAO data - in a real app this would come from post metadata
      return <DAOGovernanceEmbed daoName="Ethereum Builders" daoToken="ETHB" className="mt-4" />;
    }

    return null;
  };

  // Truncate content for preview
  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  // Function to determine if a contributor is high-value
  const isHighValueContributor = (stakedAmount: number) => {
    return stakedAmount > 10; // High-value if staked more than 10 tokens
  };

  return (
    <>
      <GestureHandler
        onDoubleTap={handleDoubleTap}
        onLongPress={handleLongPress}
        className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/10 dark:hover:shadow-primary-400/10 transform hover:-translate-y-1 ${className}`}
      >
        {/* Card header with user info and DAO tag */}
        <div className="p-5 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="bg-gradient-to-br from-primary-400 to-secondary-500 border-2 border-white dark:border-gray-800 rounded-xl w-12 h-12 flex items-center justify-center shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105">
                  <span className="text-white font-bold text-base">{profile.handle.charAt(0).toUpperCase()}</span>
                </div>
                {profile.reputationTier && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-sm animate-pulse">
                    <span className="text-xs">🏆</span>
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <Link href={`/profile/${post.author}`} className="font-bold text-gray-900 dark:text-white hover:underline text-base transition-colors duration-200">
                    {profile.handle}
                  </Link>
                  {profile.verified && (
                    <span className="text-blue-500 animate-pulse" title="Verified Contributor">
                      ✓
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>{timestamp}</span>
                  <span className="hidden sm:inline">•</span>
                  <Link href={`/dao/${post.dao}`} className="font-medium hover:underline transition-colors duration-200">
                    /dao/{post.dao}
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-200 animate-pulse">
                {post.reputationScore} REP
              </span>
            </div>
          </div>
        </div>

        {/* Post content */}
        <div className="p-5">
          <div className="mb-5">
            <div className="flex items-center mb-3">
              <div className={`w-3 h-3 rounded-full mr-3 ${getCategoryColor()} animate-pulse`}></div>
              <div className="flex items-center">
                <span className="text-lg mr-2">{getCategoryIcon()}</span>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight transition-colors duration-200 hover:text-primary-600 dark:hover:text-primary-400">
                  {post.title}
                </h2>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed mb-4 transition-colors duration-200 hover:text-gray-900 dark:hover:text-gray-200">
              {expanded ? post.contentCid : truncateContent(post.contentCid)}
            </p>
            {!expanded && post.contentCid.length > 200 && (
              <button
                onClick={toggleExpand}
                className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-semibold mt-1 transition-all duration-200 hover:text-primary-800 dark:hover:text-primary-300 transform hover:scale-105"
              >
                Read more
              </button>
            )}
          </div>

          {/* Media or embeds */}
          {post.mediaCids && post.mediaCids.length > 0 && (
            <div className="mb-5 rounded-xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg">
              <img
                src={post.mediaCids[0]}
                alt="Post media"
                className="w-full h-72 object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
          )}

          {/* Rich embeds for expanded view */}
          {expanded && renderEmbed()}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {post.tags.map((tag: string, index: number) => (
                <span
                  key={index}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getCategoryGradient()} text-white shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md`}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Analytics Section - Progressive Disclosure */}
          {expanded && (
            <div className="mb-5 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200/50 dark:border-gray-600/50 transition-all duration-300 hover:shadow-md">
              <button
                onClick={toggleAnalytics}
                className="flex items-center justify-between w-full text-left transition-colors duration-200 hover:text-primary-600 dark:hover:text-primary-400"
              >
                <span className="font-semibold text-gray-900 dark:text-white">Post Analytics</span>
                <svg
                  className={`h-5 w-5 text-gray-500 dark:text-gray-400 transform transition-transform duration-300 ${showAnalytics ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAnalytics && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-700 p-3 rounded-lg text-center shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{post.stakedValue || 0}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tokens Staked</p>
                    </div>
                    <div className="bg-white dark:bg-gray-700 p-3 rounded-lg text-center shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{post.commentCount || 0}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Comments</p>
                    </div>
                    <div className="bg-white dark:bg-gray-700 p-3 rounded-lg text-center shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">12</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Shares</p>
                    </div>
                    <div className="bg-white dark:bg-gray-700 p-3 rounded-lg text-center shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">8</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Saves</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Top Contributors</h4>
                    <div className="space-y-3">
                      {reactions.filter(r => r.userStaked > 0).slice(0, 3).map((reaction, index) => (
                        <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-600/50 rounded-lg transition-all duration-200 hover:scale-[1.02]">
                          <div className="flex items-center">
                            <span className="text-lg mr-3 animate-bounce">{reaction.emoji}</span>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{reaction.label}</div>
                              {isHighValueContributor(reaction.userStaked) && (
                                <span className="text-xs bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-full px-2 py-0.5 mt-1 inline-block animate-pulse" title="High-value contributor">
                                  VIP
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {reaction.userStaked} $LNK
                            </div>
                            <div className="text-xs text-yellow-600 dark:text-yellow-400">
                              {reaction.rewardsEarned.toFixed(1)}★ earned
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Enhanced Post Interactions */}
          <PostInteractionBar
            post={{
              id: post.id,
              title: post.title,
              contentCid: post.contentCid,
              author: post.author,
              dao: post.dao,
              commentCount: post.commentCount,
              stakedValue: post.stakedValue
            }}
            postType="feed"
            onComment={toggleExpand}
            onReaction={onReaction}
            onTip={onTip}
            onShare={async (postId, shareType, message) => {
              // Handle sharing
              console.log('Sharing post:', postId, shareType, message);
              addToast(`Post shared via ${shareType}!`, 'success');
            }}
          />
        </div>
      </GestureHandler>

      {/* Quick Actions Menu */}
      <QuickActionsMenu
        isOpen={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        onAction={handleQuickAction}
        postId={post.id}
      />
    </>
  );
}
