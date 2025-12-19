import React, { useState, useMemo, useEffect } from 'react';
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
import PostModal from '@/components/PostModal';
import { CommunityPostService } from '@/services/communityPostService';
import { ldaoTokenService } from '@/services/web3/ldaoTokenService';
import { tokenReactionService } from '@/services/tokenReactionService';
import { communityWeb3Service } from '@/services/communityWeb3Service';
import { generateAvatarPlaceholder, generateSVGPlaceholder } from '../utils/placeholderService';

interface Reaction {
  type: string; // Can be emoji or string type
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
  
  // Use embedded author data from post if available, otherwise use useProfile hook with caching
  const authorProfile = useMemo(() => {
    return post?.author && typeof post.author === 'object' ? post.author : null;
  }, [post?.author]);
  
  const { profile: fetchedProfile, isLoading: isProfileLoading } = useProfile(
    authorProfile ? undefined : (post?.author?.address || post?.author)
  );
  
  // Use either embedded profile or fetched profile
  const profileData = useMemo(() => {
    return authorProfile || fetchedProfile;
  }, [authorProfile, fetchedProfile]);
  
  const isProfileLoadingFinal = useMemo(() => {
    return !authorProfile && isProfileLoading;
  }, [authorProfile, isProfileLoading]);
  
  const [expanded, setExpanded] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [showTipInput, setShowTipInput] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [reactionsFetched, setReactionsFetched] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Add refresh trigger state
  
  // Function to fetch real reaction data from backend
  const fetchReactions = async () => {
    try {
      const summaries = await tokenReactionService.getReactionSummaries(post.id);
      
      // Convert summaries to our Reaction format
      const convertedReactions = summaries.map(summary => ({
        type: summary.type,  // The emoji itself
        emoji: summary.type,
        label: summary.type, // Use emoji as label for now
        totalStaked: summary.totalAmount,
        userStaked: summary.userAmount,
        contributors: summary.topContributors.map(c => c.walletAddress).slice(0, 5),
        rewardsEarned: 0, // Placeholder
      }));
      
      // Add any missing reaction types that don't have reactions yet
      const existingTypes = new Set(convertedReactions.map(r => r.type));
      const allReactionTypes = ['🔥', '💎', '🚀']; // Add all possible reaction types
      
      allReactionTypes.forEach(type => {
        if (!existingTypes.has(type)) {
          convertedReactions.push({
            type,
            emoji: type,
            label: type,
            totalStaked: 0,
            userStaked: 0,
            contributors: [],
            rewardsEarned: 0,
          });
        }
      });
      
      setReactions(convertedReactions);
      setReactionsFetched(true);
    } catch (error) {
      console.error('Failed to fetch reactions:', error);
      // Fallback to empty reactions if fetch fails
      setReactions([]);
      setReactionsFetched(true);
    }
  };
  
  // Fetch reactions when component mounts or refresh trigger changes
  useEffect(() => {
    if (post.id) {
      fetchReactions();
    }
  }, [post.id, refreshTrigger]); // Add refreshTrigger to dependency array

  // Format the timestamp
  const timestamp = useMemo(() => {
    if (!post?.createdAt) return 'Unknown time';
    
    const date = post.createdAt instanceof Date ? 
      post.createdAt : 
      new Date(post.createdAt);
      
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
  }, [post?.createdAt]);

  // Use embedded author data or fallback values
  const authorData = useMemo(() => {
    return profileData || post?.author;
  }, [profileData, post?.author]);
  
  const authorHandle = useMemo(() => {
    return authorData?.username || authorData?.displayName || (authorData?.address ? `${authorData.address.substring(0, 6)}...${authorData.address.substring(38)}` : 'Unknown');
  }, [authorData]);
  
  const authorAvatar = useMemo(() => {
    return authorData?.avatar || generateAvatarPlaceholder(authorData?.handle || 'User', 40);
  }, [authorData]);
  
  const isVerified = useMemo(() => {
    return authorData?.username ? true : false;
  }, [authorData]);

  // If post is not available, don't render anything
  if (!post) {
    return null;
  }

  // Update comment count when component mounts
  useEffect(() => {
    const updateCommentCount = async () => {
      try {
        const count = await CommunityPostService.getPostCommentCount(post.id);
        setCommentCount(count);
      } catch (error) {
        console.error('Error updating comment count:', error);
        // Fallback to the original count if API call fails
        setCommentCount(post.commentCount || 0);
      }
    };

    updateCommentCount();
  }, [post.id, post.commentCount]);

  // Handle reaction (staking tokens)
  const handleReaction = async (reactionType: string, amount: number = 1) => {
    if (!isConnected) {
      addToast('Please connect your wallet to react', 'error');
      return;
    }

    try {
      // Use real LDAO staking functionality
      const stakeResult = await ldaoTokenService.stakeTokens(amount.toString(), 1); // Use tier 1 (30 days)
      
      if (!stakeResult.success) {
        addToast(stakeResult.error || 'Failed to stake LDAO tokens', 'error');
        return;
      }

      // Optimistically update local state to provide immediate feedback
      setReactions(prev => {
        const updated = prev.map(reaction => {
          if (reaction.emoji === reactionType) {
            return {
              ...reaction,
              totalStaked: reaction.totalStaked + amount,
              userStaked: reaction.userStaked + amount,
              contributors: address ? [...new Set([...reaction.contributors, address.substring(0, 6) + '...' + address.substring(38)])] : reaction.contributors
            };
          }
          return reaction;
        });

        // If the reaction type doesn't exist yet, add it
        if (!updated.some(r => r.emoji === reactionType)) {
          updated.push({
            type: reactionType,
            emoji: reactionType,
            label: reactionType,
            totalStaked: amount,
            userStaked: amount,
            contributors: address ? [address.substring(0, 6) + '...' + address.substring(38)] : [],
            rewardsEarned: 0,
          });
        }

        return updated;
      });

      // Call the onReaction callback if provided (this triggers EnhancedReactionSystem's logic)
      if (onReaction) {
        await onReaction(post.id, reactionType, amount);
      }

      // Wait a moment for the backend to process the reaction, then refresh
      // This ensures the component is updated with accurate data from the server
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
        addToast(`Successfully staked ${amount} $LDAO on ${reactionType} reaction!`, 'success');
      }, 500); // Increased delay to allow backend processing

    } catch (error) {
      console.error('Error reacting:', error);
      // If the operation fails, revert the optimistic update by refetching
      try {
        await fetchReactions();
      } catch (refreshError) {
        console.error('Failed to revert reaction after error:', refreshError);
      }
      
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
      // Prevent self-tipping
      if (address?.toLowerCase() === post.author?.toLowerCase()) {
        addToast('You cannot tip yourself', 'error');
        return;
      }

      // Use real blockchain tipping functionality
      const txHash = await communityWeb3Service.tipCommunityPost({
        postId: post.id,
        recipientAddress: post.author,
        amount: tipAmount.toString(),
        token: 'LDAO',
        message: ''
      });

      // Call the onTip callback if provided
      if (onTip) {
        await onTip(post.id, tipAmount.toString(), 'LDAO');
      } else {
        // Only show success message if there's no parent handler
        addToast(`Successfully tipped ${tipAmount} LDAO! Transaction: ${txHash.substring(0, 10)}...`, 'success');
      }
      setTipAmount(0);
      setShowTipInput(false);
    } catch (error: any) {
      console.error('Error tipping:', error);
      // Only show error message here
      addToast(`Failed to send tip: ${error.message || 'Please try again.'}`, 'error');
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
          image: generateSVGPlaceholder(300, 300, 'NFT'),
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

  // Get post type styling based on tags
  const getPostTypeStyles = () => {
    if (post.tags && post.tags.length > 0) {
      if (post.tags.includes('governance') || post.tags.includes('proposal') || post.tags.includes('dao')) {
        return {
          borderColor: 'border-l-purple-500',
          bgGradient: 'from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20',
          iconBg: 'bg-purple-100 dark:bg-purple-900/50',
          iconColor: 'text-purple-600 dark:text-purple-400',
          icon: '🏛️',
          label: 'Governance'
        };
      } else if (post.tags.includes('social') || post.tags.includes('community') || post.tags.includes('discussion')) {
        return {
          borderColor: 'border-l-blue-500',
          bgGradient: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
          iconBg: 'bg-blue-100 dark:bg-blue-900/50',
          iconColor: 'text-blue-600 dark:text-blue-400',
          icon: '💬',
          label: 'Discussion'
        };
      } else if (post.tags.includes('nft') || post.tags.includes('art') || post.tags.includes('collection')) {
        return {
          borderColor: 'border-l-orange-500',
          bgGradient: 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20',
          iconBg: 'bg-orange-100 dark:bg-orange-900/50',
          iconColor: 'text-orange-600 dark:text-orange-400',
          icon: '🎨',
          label: 'Showcase'
        };
      }
    }
    return {
      borderColor: 'border-l-gray-500',
      bgGradient: 'from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20',
      iconBg: 'bg-gray-100 dark:bg-gray-900/50',
      iconColor: 'text-gray-600 dark:text-gray-400',
      icon: '📝',
      label: 'Post'
    };
  };

  const postTypeStyles = getPostTypeStyles();

  // Enhanced engagement scoring calculation combining votes, comments, and stakes
  const engagementMetrics = useMemo(() => {
    const totalStaked = reactions.reduce((sum, r) => sum + r.totalStaked, 0);
    const totalReactions = reactions.reduce((sum, r) => sum + r.contributors.length, 0);
    const viewCount = post.viewCount || 1; // Avoid division by zero
    
    // Weighted scoring system
    const stakeWeight = totalStaked * 2; // Stakes have high weight
    const reactionWeight = totalReactions * 3; // Reactions show engagement
    const commentWeight = commentCount * 5; // Comments are highly valuable
    const viewWeight = viewCount * 0.1; // Views provide baseline
    
    const rawScore = stakeWeight + reactionWeight + commentWeight + viewWeight;
    const engagementScore = Math.min(Math.round(rawScore / 10), 100);
    
    // Calculate engagement rate (interactions per view)
    const totalInteractions = totalReactions + commentCount + (totalStaked > 0 ? 1 : 0);
    const engagementRate = ((totalInteractions / viewCount) * 100).toFixed(1);
    
    return {
      score: engagementScore,
      rate: parseFloat(engagementRate),
      totalStaked,
      totalReactions,
      commentCount,
      viewCount,
      isHighEngagement: engagementScore > 70,
      isTrending: engagementScore > 80
    };
  }, [reactions, commentCount, post.viewCount]);

  // Real-time engagement update effect
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdateTime(Date.now());
    }, 30000); // Update every 30 seconds for real-time feel
    
    return () => clearInterval(interval);
  }, []);

  const engagementScore = engagementMetrics.score;

  return (
    <>
      <GestureHandler
        onDoubleTap={handleDoubleTap}
        onLongPress={handleLongPress}
        onTap={() => setShowPostModal(true)}
        className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-lg border-l-4 ${postTypeStyles.borderColor} transition-all duration-300 hover:shadow-xl cursor-pointer ${className}`}
      >
        {/* Background gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${postTypeStyles.bgGradient} opacity-30 rounded-xl`} />
        
        {/* Content container */}
        <div className="relative z-10">
        {/* Post Header with enhanced visual hierarchy */}
        <div className="p-4 flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            {/* Post type indicator */}
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${postTypeStyles.iconBg} ${postTypeStyles.iconColor} text-sm font-medium`}>
              {postTypeStyles.icon}
            </div>
            
            {/* Author Avatar with enhanced styling */}
            <div className="relative">
              <img 
                src={authorAvatar} 
                alt={authorHandle} 
                className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-gray-700 shadow-sm"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = generateAvatarPlaceholder('User', 40);
                }}
              />
              {isVerified && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            
            {/* Enhanced Author Info with inline reputation and status */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">{authorHandle}</h3>
                
                {/* Inline reputation score with visual indicator */}
                {authorData?.reputation && (
                  <div className="flex items-center space-x-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      {authorData.reputation}
                    </span>
                  </div>
                )}
                
                {/* Enhanced Status badges with visual prominence */}
                <div className="flex items-center space-x-1">
                  {post.tags?.includes('featured') && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-sm">
                      ⭐ Featured
                    </span>
                  )}
                  {post.tags?.includes('pinned') && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm">
                      📌 Pinned
                    </span>
                  )}
                  {engagementScore > 80 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-sm animate-pulse">
                      🔥 Trending in {post.communityId || 'Community'}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <time>{timestamp}</time>
                
                {/* Author verification status */}
                {isVerified && (
                  <>
                    <span>•</span>
                    <span className="text-green-600 dark:text-green-400 font-medium flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Verified</span>
                    </span>
                  </>
                )}
                
                <span>•</span>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${postTypeStyles.iconBg} ${postTypeStyles.iconColor}`}>
                  {postTypeStyles.label}
                </span>
                
                {/* Author role indicator */}
                {authorData?.role && (
                  <>
                    <span>•</span>
                    <span className="text-purple-600 dark:text-purple-400 font-medium capitalize">
                      {authorData.role}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Post Options */}
          <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>

        </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
          {post.content || post.contentCid}
        </p>
      </div>

      {/* Enhanced Media Previews with Thumbnails */}
      {post.mediaCids && post.mediaCids.length > 0 && (
        <div className="px-4 pb-3">
          <div className="grid grid-cols-2 gap-2">
            {post.mediaCids.slice(0, 4).map((media: string, index: number) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer">
                <OptimizedImage 
                  src={media} 
                  alt={`Post media ${index + 1}`} 
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                {/* Thumbnail overlay with play button for videos */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                  {media.includes('video') && (
                    <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <svg className="w-6 h-6 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                {post.mediaCids.length > 4 && index === 3 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">+{post.mediaCids.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Community Logo and Thumbnail Integration */}
      {post.communityId && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700/50 dark:to-blue-900/20 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-3">
              {/* Enhanced community logo with gradient */}
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white text-sm font-bold">
                  {(post.communityId || 'C').charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {post.communityId || 'Community Name'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {Math.floor(Math.random() * 10000)} members
                </div>
              </div>
            </div>
            
            {/* Trending indicator for high-engagement posts */}
            {engagementScore > 70 && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 dark:bg-red-900/50 rounded-full">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-red-700 dark:text-red-300">
                  Trending
                </span>
              </div>
            )}
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

      {/* Enhanced Engagement Metrics Bar with Real-time Updates */}
      <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700/50 dark:to-blue-900/20 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4 text-sm">
            {/* View count with prominence and growth indicator */}
            <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="font-medium">{engagementMetrics.viewCount.toLocaleString()}</span>
              <span className="text-xs text-green-500">views</span>
            </div>
            
            {/* Comment count with prominence */}
            <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="font-medium">{commentCount}</span>
              <span className="text-xs text-blue-500">comments</span>
            </div>
            
            {/* Total staked amount with visual emphasis */}
            <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
              <span className="text-yellow-500">💎</span>
              <span className="font-medium">{engagementMetrics.totalStaked}</span>
              <span className="text-xs text-purple-500">staked</span>
            </div>
          </div>
          
          {/* Real-time engagement score with animation */}
          <div className="flex items-center space-x-2">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {engagementMetrics.rate}% rate
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              engagementMetrics.isTrending 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' 
                : engagementMetrics.isHighEngagement
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {engagementScore}% engaged
            </div>
          </div>
        </div>
        
        {/* Enhanced visual progress bar for engagement with gradient */}
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-700 ease-out ${
              engagementMetrics.isTrending
                ? 'bg-gradient-to-r from-red-400 via-pink-500 to-red-600 animate-pulse'
                : engagementMetrics.isHighEngagement
                ? 'bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-600'
                : 'bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600'
            }`}
            style={{ width: `${engagementScore}%` }}
          >
            <div className="h-full bg-white/20 animate-pulse"></div>
          </div>
        </div>
        
        {/* Real-time engagement metric breakdown */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {reactionsFetched ? (
              reactions.slice(0, 3).map((reaction, index) => (
                <div key={reaction.type} className="flex items-center space-x-1 text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-sm">
                  <span className="text-sm">{reaction.emoji}</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{reaction.totalStaked}</span>
                  <span className="text-gray-500 dark:text-gray-400">({reaction.contributors.length})</span>
                </div>
              ))
            ) : (
              // Show loading placeholders while fetching
              <div className="flex space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-1 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full shadow-sm animate-pulse">
                    <span className="text-sm">...</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Real-time update indicator */}
          <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live</span>
          </div>
        </div>
        
        {/* Engagement milestone indicators */}
        {engagementMetrics.isTrending && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center space-x-2 text-sm text-red-700 dark:text-red-300">
              <span className="animate-bounce">🔥</span>
              <span className="font-medium">This post is trending! High engagement detected.</span>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Post Actions */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <PostInteractionBar 
          post={{
            id: post.id,
            contentCid: post.contentCid,
            content: post.content, // add actual content
            shareId: post.shareId, // add shareId
            author: post.author,
            commentCount: commentCount,
            stakedValue: reactions.reduce((sum, r) => sum + r.totalStaked, 0),
            authorProfile: post.authorProfile // add author info
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
          onCommentCountChange={(count) => setCommentCount(count)}
        />
      </div>
    </GestureHandler>

    {/* Post Modal for full post view */}
    <PostModal
      post={post}
      isOpen={showPostModal}
      onClose={() => setShowPostModal(false)}
      onReaction={onReaction}
      onTip={onTip}
      onShare={async (postId: string, shareType: string, message?: string) => {
        console.log('Share clicked', postId, shareType, message);
      }}
    />
    </>
  );
}
