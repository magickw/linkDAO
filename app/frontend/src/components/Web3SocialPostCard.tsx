import React, { useState } from 'react';
import Link from 'next/link';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import NFTPreview from '@/components/NFTPreview';
import DeFiChartEmbed from '@/components/DeFiChartEmbed';
import WalletSnapshotEmbed from '@/components/WalletSnapshotEmbed';
import DAOGovernanceEmbed from '@/components/DAOGovernanceEmbed';
import GestureHandler from '@/components/GestureHandler';

interface Reaction {
  type: 'hot' | 'diamond' | 'bullish' | 'governance' | 'art';
  emoji: string;
  label: string;
  totalStaked: number;
  userStaked: number;
  contributors: string[];
}

interface Web3SocialPostCardProps {
  post: any;
  profile: any;
  className?: string;
  onReaction?: (postId: string, reactionType: string, amount: number) => Promise<void>;
  onTip?: (postId: string, amount: number, token: string) => Promise<void>;
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
  const [reactions, setReactions] = useState<Reaction[]>([
    { type: 'hot', emoji: '🔥', label: 'Hot Take', totalStaked: 120, userStaked: 0, contributors: [] },
    { type: 'diamond', emoji: '💎', label: 'Diamond Hands', totalStaked: 85, userStaked: 0, contributors: [] },
    { type: 'bullish', emoji: '🚀', label: 'Bullish', totalStaked: 210, userStaked: 0, contributors: [] },
    { type: 'governance', emoji: '⚖️', label: 'Governance', totalStaked: 95, userStaked: 0, contributors: [] },
    { type: 'art', emoji: '🎨', label: 'Art Appreciation', totalStaked: 42, userStaked: 0, contributors: [] }
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
          return {
            ...reaction,
            totalStaked: reaction.totalStaked + amount,
            userStaked: reaction.userStaked + amount,
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
    // In a real implementation, this would open a quick actions menu
    addToast('Long press detected - quick actions would appear here', 'info');
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
        await onTip(post.id, tipAmount, 'USDC');
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

  // Get category gradient based on post tags
  const getCategoryGradient = () => {
    if (post.tags && post.tags.length > 0) {
      if (post.tags.includes('defi') || post.tags.includes('yield') || post.tags.includes('trade')) {
        return 'from-green-400/20 to-emerald-600/20';
      } else if (post.tags.includes('nft') || post.tags.includes('art') || post.tags.includes('collection')) {
        return 'from-purple-400/20 to-pink-600/20';
      } else if (post.tags.includes('governance') || post.tags.includes('proposal') || post.tags.includes('dao')) {
        return 'from-blue-400/20 to-indigo-600/20';
      } else if (post.tags.includes('social') || post.tags.includes('community') || post.tags.includes('discussion')) {
        return 'from-orange-400/20 to-amber-600/20';
      }
    }
    return 'from-gray-400/20 to-slate-600/20';
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
          image: 'https://via.placeholder.com/300',
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

  return (
    <GestureHandler 
      onDoubleTap={handleDoubleTap}
      onLongPress={handleLongPress}
      className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden transition-all duration-300 hover:shadow-xl ${className}`}
    >
      {/* Card header with user info and DAO tag */}
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10 md:w-12 md:h-12" />
              {profile.reputationTier && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                  <span className="text-xs">🏆</span>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <Link href={`/profile/${post.author}`} className="font-semibold text-gray-900 dark:text-white hover:underline text-sm md:text-base">
                  {profile.handle}
                </Link>
                {profile.verified && (
                  <span className="text-blue-500" title="Verified Contributor">
                    ✓
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{timestamp}</span>
                <span className="hidden sm:inline">•</span>
                <Link href={`/dao/${post.dao}`} className="font-medium hover:underline">
                  /dao/{post.dao}
                </Link>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-200">
              {post.reputationScore} REP
            </span>
          </div>
        </div>
      </div>
      
      {/* Post content */}
      <div className="p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 md:text-xl">
            {post.title}
          </h3>
          <p className="text-gray-700 dark:text-gray-300 text-sm md:text-base">
            {post.contentCid}
          </p>
        </div>
        
        {/* Media or embeds */}
        {post.mediaCids && post.mediaCids.length > 0 && (
          <div className="mb-4 rounded-xl overflow-hidden">
            <img 
              src={post.mediaCids[0]} 
              alt="Post media" 
              className="w-full h-64 object-cover"
            />
          </div>
        )}
        
        {/* Rich embeds for expanded view */}
        {expanded && renderEmbed()}
        
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag: string, index: number) => (
              <span 
                key={index} 
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${getCategoryGradient()} text-gray-800 dark:text-gray-200`}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        
        {/* Reactions */}
        <div className="flex flex-wrap gap-2 mb-4">
          {reactions.map((reaction) => (
            <button
              key={reaction.type}
              onClick={() => handleReaction(reaction.type, 1)}
              className={`flex items-center space-x-1 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 md:px-4 md:py-2 ${
                reaction.userStaked > 0 
                  ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-md' 
                  : 'bg-gray-100/80 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-600/50'
              }`}
            >
              <span className="text-base md:text-lg">{reaction.emoji}</span>
              <span>{reaction.totalStaked}</span>
              {reaction.userStaked > 0 && (
                <span className="text-xs">(+{reaction.userStaked})</span>
              )}
            </button>
          ))}
        </div>
        
        {/* Action footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200/50 dark:border-gray-700/50 flex-wrap gap-2">
          <div className="flex items-center space-x-3 md:space-x-4">
            <button 
              onClick={toggleExpand}
              className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium py-1"
            >
              <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="hidden sm:inline">{post.commentCount || 0} Comments</span>
              <span className="sm:hidden">{post.commentCount || 0}</span>
            </button>
            
            <button className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium py-1">
              <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span className="hidden sm:inline">Share</span>
            </button>
            
            <button 
              onClick={() => setShowTipInput(!showTipInput)}
              className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium py-1"
            >
              <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">Tip</span>
            </button>
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {post.stakedValue ? `${post.stakedValue} $LNK staked` : '0 $LNK staked'}
          </div>
        </div>
        
        {/* Tip input */}
        {showTipInput && (
          <form onSubmit={handleTip} className="mt-3 flex items-center">
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={tipAmount || ''}
              onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
              placeholder="Amount"
              className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-l dark:bg-gray-700 dark:text-white"
            />
            <span className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 border-y border-gray-300 dark:border-gray-600">USDC</span>
            <button 
              type="submit"
              className="px-3 py-1 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-r"
            >
              Send
            </button>
            <button 
              type="button"
              onClick={() => setShowTipInput(false)}
              className="ml-2 px-2 py-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </GestureHandler>
  );
}