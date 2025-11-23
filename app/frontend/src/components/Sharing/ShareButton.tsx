/**
 * ShareButton Component
 * Reusable share button for posts, communities, and other content
 * Implements requirements 4.2, 4.5, 4.6 from the interconnected social platform spec
 */

import React, { useState } from 'react';
import { ShareModal } from './ShareModal';
import { ShareableContent } from '../../services/contentSharingService';
import { contentSharingService } from '../../services/contentSharingService';

interface ShareButtonProps {
  content: ShareableContent;
  variant?: 'icon' | 'button' | 'text';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
  onShareComplete?: (shareType: string, target: string) => void;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  content,
  variant = 'icon',
  size = 'medium',
  className = '',
  showLabel = false,
  onShareComplete
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shareCount, setShareCount] = useState<number | null>(null);

  // Load share count on mount
  React.useEffect(() => {
    loadShareCount();
  }, [content.id, content.type]);

  const loadShareCount = async () => {
    try {
      const analytics = await contentSharingService.getSharingAnalytics(content.id, content.type);
      setShareCount(analytics.totalShares);
    } catch (error) {
      console.error('Error loading share count:', error);
    }
  };

  const handleShareComplete = (shareType: string, target: string) => {
    // Update share count
    if (shareCount !== null) {
      setShareCount(shareCount + 1);
    }
    
    onShareComplete?.(shareType, target);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-4 h-4';
      case 'large':
        return 'w-6 h-6';
      default:
        return 'w-5 h-5';
    }
  };

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center space-x-2 transition-colors duration-200';
    
    switch (variant) {
      case 'button':
        return `${baseClasses} px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300`;
      case 'text':
        return `${baseClasses} text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400`;
      default:
        return `${baseClasses} p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400`;
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`${getButtonClasses()} ${className}`}
        title="Share content"
        aria-label="Share content"
      >
        <svg
          className={getSizeClasses()}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
          />
        </svg>
        
        {(showLabel || variant === 'button' || variant === 'text') && (
          <span className={`${size === 'small' ? 'text-xs' : 'text-sm'} font-medium`}>
            Share
            {shareCount !== null && shareCount > 0 && (
              <span className="ml-1 text-gray-500 dark:text-gray-400">
                ({shareCount})
              </span>
            )}
          </span>
        )}
      </button>

      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        content={content}
        onShareComplete={handleShareComplete}
      />
    </>
  );
};

export default ShareButton;