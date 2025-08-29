import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';

interface Web3SocialPostCardLegacyProps {
  post: any; // In a real implementation, this would be typed as Post
  profile: any; // In a real implementation, this would be typed as UserProfile
  className?: string;
  onVote?: (postId: string, voteType: 'up' | 'down', amount: number) => Promise<void>;
  onTip?: (postId: string, amount: number, token: string) => Promise<void>;
}

export default function Web3SocialPostCardLegacy({ post, profile, className = '', onVote, onTip }: Web3SocialPostCardLegacyProps) {
  const { address, isConnected, balance } = useWeb3();
  const { addToast } = useToast();
  const [votes, setVotes] = useState(post.voteCount || 24); // Mock vote count
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [community] = useState('ethereum-builders'); // Mock community
  const [tipAmount, setTipAmount] = useState(0);
  const [showTipInput, setShowTipInput] = useState(false);
  const [postType, setPostType] = useState('standard'); // standard, proposal, defi, nft, analysis

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

  const handleUpvote = async () => {
    if (!isConnected) {
      addToast('Please connect your wallet to vote', 'error');
      return;
    }
    
    try {
      // In a real implementation, this would call the backend API
      if (onVote) {
        await onVote(post.id, 'up', 0.01); // 0.01 $LNK for upvote
      }
      
      if (userVote === 'up') {
        setVotes(votes - 1);
        setUserVote(null);
      } else if (userVote === 'down') {
        setVotes(votes + 2);
        setUserVote('up');
      } else {
        setVotes(votes + 1);
        setUserVote('up');
      }
      addToast('Upvoted successfully!', 'success');
    } catch (error) {
      console.error('Error upvoting:', error);
      addToast('Failed to upvote. Please try again.', 'error');
    }
  };

  const handleDownvote = async () => {
    if (!isConnected) {
      addToast('Please connect your wallet to vote', 'error');
      return;
    }
    
    try {
      // In a real implementation, this would call the backend API
      if (onVote) {
        await onVote(post.id, 'down', 0.005); // 0.005 $LNK for downvote
      }
      
      if (userVote === 'down') {
        setVotes(votes + 1);
        setUserVote(null);
      } else if (userVote === 'up') {
        setVotes(votes - 2);
        setUserVote('down');
      } else {
        setVotes(votes - 1);
        setUserVote('down');
      }
      addToast('Downvoted successfully!', 'success');
    } catch (error) {
      console.error('Error downvoting:', error);
      addToast('Failed to downvote. Please try again.', 'error');
    }
  };

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
        await onTip(post.id, tipAmount, 'USDC'); // Default to USDC for tipping
      }
      addToast(`Successfully tipped ${tipAmount} USDC!`, 'success');
      setTipAmount(0);
      setShowTipInput(false);
    } catch (error) {
      console.error('Error tipping:', error);
      addToast('Failed to send tip. Please try again.', 'error');
    }
  };

  // Determine post type based on tags or content
  useEffect(() => {
    if (post.tags && post.tags.length > 0) {
      if (post.tags.includes('proposal') || post.tags.includes('governance')) {
        setPostType('proposal');
      } else if (post.tags.includes('defi') || post.tags.includes('strategy')) {
        setPostType('defi');
      } else if (post.tags.includes('nft') || post.tags.includes('art')) {
        setPostType('nft');
      } else if (post.tags.includes('analysis') || post.tags.includes('chart')) {
        setPostType('analysis');
      }
    }
  }, [post.tags]);

  // Render post content based on type
  const renderPostContent = () => {
    switch (postType) {
      case 'proposal':
        return (
          <div className="border-l-4 border-primary-500 pl-4 py-2 bg-primary-50 dark:bg-primary-900/20 rounded-r">
            <div className="flex items-center mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                Governance Proposal
              </span>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Linked to smart contract</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {post.contentCid}
            </h3>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <span>Proposal ID: {post.onchainRef?.substring(0, 10)}...</span>
              <span className="mx-2">•</span>
              <span>Status: Active</span>
            </div>
          </div>
        );
      case 'defi':
        return (
          <div className="border-l-4 border-secondary-500 pl-4 py-2 bg-secondary-50 dark:bg-secondary-900/20 rounded-r">
            <div className="flex items-center mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200">
                DeFi Strategy
              </span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {post.contentCid}
            </h3>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <span>PnL: +12.4%</span>
              <span className="mx-2">•</span>
              <span>TVL: $1.2M</span>
            </div>
          </div>
        );
      case 'nft':
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {post.contentCid}
            </h3>
            {post.mediaCids && post.mediaCids.length > 0 && (
              <div className="mb-3">
                <img 
                  src={post.mediaCids[0]} 
                  alt="NFT Preview" 
                  className="max-h-60 rounded-lg object-cover border-2 border-accent-500"
                />
                <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <span>NFT Collection</span>
                  <span className="mx-2">•</span>
                  <span>ERC-721</span>
                </div>
              </div>
            )}
          </div>
        );
      case 'analysis':
        return (
          <div className="border-l-4 border-accent-500 pl-4 py-2 bg-accent-50 dark:bg-accent-900/20 rounded-r">
            <div className="flex items-center mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-200">
                Analysis
              </span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {post.contentCid}
            </h3>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <span>Charts & Data Included</span>
              <span className="mx-2">•</span>
              <span>3 visualizations</span>
            </div>
          </div>
        );
      default:
        return (
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {post.contentCid}
          </h3>
        );
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg ${className}`}>
      {/* Vote arrows */}
      <div className="flex flex-col items-center justify-start py-2 px-2 bg-gray-50 dark:bg-gray-700 rounded-l-lg">
        <button 
          onClick={handleUpvote}
          className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${userVote === 'up' ? 'text-orange-500' : 'text-gray-400'}`}
          aria-label="Upvote"
        >
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
        <span className="font-medium text-gray-900 dark:text-white my-1">{votes}</span>
        <button 
          onClick={handleDownvote}
          className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${userVote === 'down' ? 'text-blue-500' : 'text-gray-400'}`}
          aria-label="Downvote"
        >
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      {/* Post content */}
      <div className="flex-1 p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
          <Link href={`/dao/${community}`} className="font-medium text-gray-700 hover:underline dark:text-gray-300">
            /dao/{community}
          </Link>
          <span className="mx-1">•</span>
          <Link href={`/profile/${post.author}`} className="font-medium hover:underline">
            {profile.handle}
          </Link>
          <span className="mx-1">•</span>
          <span>{timestamp}</span>
        </div>
        
        {renderPostContent()}
        
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {post.tags.map((tag: string, index: number) => (
              <span key={index} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                #{tag}
              </span>
            ))}
          </div>
        )}
        
        <div className="flex space-x-4 text-gray-500 dark:text-gray-400 text-sm">
          <button className="flex items-center hover:text-gray-700 dark:hover:text-gray-300">
            <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>8 Comments</span>
          </button>
          <button className="flex items-center hover:text-gray-700 dark:hover:text-gray-300">
            <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>Share</span>
          </button>
          <button className="flex items-center hover:text-gray-700 dark:hover:text-gray-300">
            <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span>Save</span>
          </button>
          <button 
            onClick={() => setShowTipInput(!showTipInput)}
            className="flex items-center hover:text-gray-700 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Tip</span>
          </button>
        </div>
        
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
    </div>
  );
}