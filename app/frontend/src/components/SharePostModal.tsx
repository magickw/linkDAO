import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useWeb3 } from '@/context/Web3Context';
import { ToastContext } from '@/context/ToastContext';
import { getDisplayName, getDefaultAvatar } from '@/utils/userDisplay';

// Custom hook to safely access toast context with fallback for portal components
const useToastOrFallback = () => {
  const context = useContext(ToastContext);

  if (context) {
    return context;
  }

  // Fallback implementation when no provider is present (e.g. for portal components)
  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', options?: any) => {
    console.log(`[Toast fallback] ${type.toUpperCase()}: ${message}`);
  };

  return { addToast };
};

interface ShareOption {
  id: string;
  name: string;
  icon: React.ReactNode;
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
    communityName?: string;
    authorProfile?: {
      avatarCid?: string;
      handle?: string;
    };
  };
  postType: 'feed' | 'community' | 'enhanced';
  onShare?: (postId: string, shareType: string, message?: string) => Promise<void>;
}

interface SharePostModalWithToastProps extends SharePostModalProps {
  addToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info', options?: any) => void;
}

export default function SharePostModal({
  isOpen,
  onClose,
  post,
  postType,
  onShare,
  addToast: providedAddToast,
}: SharePostModalWithToastProps) {
  const { address, isConnected } = useWeb3();

  const { addToast: contextAddToast } = useToastOrFallback();

  const addToast = providedAddToast || contextAddToast;

  const [shareMessage, setShareMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Generate share URL
  const getPostUrl = () => {
    const baseUrl = window.location.origin;

    // Check if post has shareId (new format)
    const hasShareId = (post as any).shareId && (post as any).shareId !== '';

    if (hasShareId) {
      // Use short share URL
      if (postType === 'community' || post.communityId) {
        return `${baseUrl}/cp/${(post as any).shareId}`;
      }
      return `${baseUrl}/p/${(post as any).shareId}`;
    }

    // Fallback to old format for posts without shareId
    if ((postType === 'community' || post.communityId) && post.communityId) {
      // Ensure we use the community slug if available, otherwise ID
      const communitySlug = (post as any).communitySlug || post.communityId;
      return `${baseUrl}/communities/${communitySlug}/posts/${post.id}`;
    }

    // Use new status URL pattern for non-community posts
    const handle = post.authorProfile?.handle || (post.author ? post.author.slice(0, 8) : 'unknown');
    return `${baseUrl}/${handle}/statuses/${post.id}`;
  };

  // Generate share text
  const getShareText = () => {
    // Use actual content if available, otherwise fallback to title
    const content = (post as any).content || post.title || 'Check out this interesting post';
    const truncatedContent = content.length > 100
      ? content.substring(0, 100) + '...'
      : content;

    // Use author's handle if available, otherwise fallback to wallet address
    const authorName = post.authorProfile?.handle || getDisplayName(post);

    return `Check out this post by ${authorName}: "${truncatedContent}"`;
  };

  // Share options
  const shareOptions: ShareOption[] = [
    {
      id: 'twitter',
      name: 'Twitter',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      color: 'bg-black',
      action: (url, title, text) => {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        window.open(twitterUrl, '_blank');
      }
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
      color: 'bg-blue-500',
      action: (url, title, text) => {
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        window.open(telegramUrl, '_blank');
      }
    },
    {
      id: 'discord',
      name: 'Discord',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      ),
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
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      ),
      color: 'bg-orange-500',
      action: (url, title, text) => {
        const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
        window.open(redditUrl, '_blank');
      }
    },
    {
      id: 'copy',
      name: 'Copy Link',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      ),
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

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
      onClick={(e) => {
        // Close modal when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 id="share-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
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
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              {post.authorProfile?.avatarCid ? (
                <img
                  src={`https://ipfs.io/ipfs/${post.authorProfile.avatarCid}`}
                  alt={post.authorProfile.handle || post.author}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to gradient on error
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextSibling) {
                      (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div
                className="bg-gradient-to-br from-primary-400 to-secondary-500 w-full h-full flex items-center justify-center"
                style={{ display: post.authorProfile?.avatarCid ? 'none' : 'flex' }}
              >
                <span className="text-white font-bold text-sm">
                  {getDefaultAvatar(getDisplayName(post))}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <span className="font-medium text-gray-900 dark:text-white">
                  {getDisplayName(post)}
                </span>
                {post.communityName && (
                  <>
                    <span>•</span>
                    <span>{post.communityName}</span>
                  </>
                )}
              </div>
              <div className="text-gray-900 dark:text-white text-sm">
                {post.title && (
                  <div className="font-medium mb-1">{post.title}</div>
                )}
                <div className="line-clamp-3">
                  {(post as any).content
                    ? ((post as any).content.length > 150
                      ? (post as any).content.substring(0, 150) + '...'
                      : (post as any).content)
                    : 'No content preview available'}
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

  // Use portal to render modal at document root level
  // Since this is rendered via portal, it's no longer in the ToastProvider context,
  // so we need to ensure the parent component provides the toast context
  return typeof window !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
}