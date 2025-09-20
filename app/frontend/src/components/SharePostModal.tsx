import React, { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';

interface ShareOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  action: (url: string, title: string, text: string) => void;
}

interface SharePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    id: string;
    title?: string;
    contentCid: string;
    author: string;
    dao?: string;
    communityId?: string;
  };
  postType: 'feed' | 'community' | 'enhanced';
  onShare?: (postId: string, shareType: string, message?: string) => Promise<void>;
}

export default function SharePostModal({
  isOpen,
  onClose,
  post,
  postType,
  onShare
}: SharePostModalProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();

  const [shareMessage, setShareMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Generate post URL
  const getPostUrl = () => {
    const baseUrl = window.location.origin;
    if (postType === 'community') {
      return `${baseUrl}/dao/${post.communityId}/post/${post.id}`;
    }
    return `${baseUrl}/post/${post.id}`;
  };

  // Generate share text
  const getShareText = () => {
    const content = post.title || post.contentCid;
    const truncatedContent = content.length > 100 
      ? content.substring(0, 100) + '...' 
      : content;
    
    return `Check out this post by ${post.author}: "${truncatedContent}"`;
  };

  // Share options
  const shareOptions: ShareOption[] = [
    {
      id: 'timeline',
      name: 'Share to Timeline',
      icon: '📝',
      color: 'bg-blue-500',
      action: async () => {
        if (!isConnected) {
          addToast('Please connect your wallet to share to timeline', 'error');
          return;
        }
        await handleInternalShare('timeline');
      }
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: '🐦',
      color: 'bg-blue-400',
      action: (url, title, text) => {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        window.open(twitterUrl, '_blank');
      }
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: '✈️',
      color: 'bg-blue-500',
      action: (url, title, text) => {
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        window.open(telegramUrl, '_blank');
      }
    },
    {
      id: 'discord',
      name: 'Discord',
      icon: '🎮',
      color: 'bg-indigo-500',
      action: (url, title, text) => {
        // Copy to clipboard for Discord
        navigator.clipboard.writeText(`${text}\n${url}`);
        addToast('Link copied to clipboard! Paste it in Discord.', 'success');
      }
    },
    {
      id: 'reddit',
      name: 'Reddit',
      icon: '🤖',
      color: 'bg-orange-500',
      action: (url, title, text) => {
        const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
        window.open(redditUrl, '_blank');
      }
    },
    {
      id: 'copy',
      name: 'Copy Link',
      icon: '📋',
      color: 'bg-gray-500',
      action: (url) => {
        navigator.clipboard.writeText(url);
        addToast('Link copied to clipboard!', 'success');
      }
    }
  ];

  // Handle internal sharing (to timeline)
  const handleInternalShare = async (shareType: string) => {
    try {
      setIsSharing(true);
      
      if (onShare) {
        await onShare(post.id, shareType, shareMessage.trim() || undefined);
      }
      
      addToast('Post shared successfully!', 'success');
      onClose();
    } catch (error) {
      console.error('Error sharing post:', error);
      addToast('Failed to share post. Please try again.', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  // Handle external sharing
  const handleExternalShare = (option: ShareOption) => {
    const url = getPostUrl();
    const title = post.title || 'Web3 Social Post';
    const text = getShareText();
    
    option.action(url, title, text);
    
    // Track the share
    if (onShare) {
      onShare(post.id, option.id).catch(console.error);
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Share Post
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Post Preview */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-start space-x-3">
            <div className="bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">
                {post.author.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <span className="font-medium text-gray-900 dark:text-white">
                  {post.author.slice(0, 6)}...{post.author.slice(-4)}
                </span>
                {post.dao && (
                  <>
                    <span>•</span>
                    <span>/dao/{post.dao}</span>
                  </>
                )}
              </div>
              <div className="text-gray-900 dark:text-white text-sm">
                {post.title && (
                  <div className="font-medium mb-1">{post.title}</div>
                )}
                <div className="line-clamp-3">
                  {post.contentCid.length > 150 
                    ? post.contentCid.substring(0, 150) + '...' 
                    : post.contentCid}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Share Message (for timeline sharing) */}
        {selectedOption === 'timeline' && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add a message (optional)
            </label>
            <textarea
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="What do you think about this post?"
              maxLength={280}
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {shareMessage.length}/280 characters
            </div>
          </div>
        )}

        {/* Share Options */}
        <div className="p-4 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {shareOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  if (option.id === 'timeline') {
                    setSelectedOption('timeline');
                  } else {
                    handleExternalShare(option);
                  }
                }}
                disabled={isSharing}
                className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className={`w-10 h-10 ${option.color} rounded-full flex items-center justify-center text-white text-lg`}>
                  {option.icon}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {option.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Share Actions */}
        {selectedOption === 'timeline' && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex space-x-3">
              <button
                onClick={() => handleInternalShare('timeline')}
                disabled={isSharing}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSharing ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sharing...
                  </div>
                ) : (
                  'Share to Timeline'
                )}
              </button>
              <button
                onClick={() => setSelectedOption(null)}
                disabled={isSharing}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-200 font-medium"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}