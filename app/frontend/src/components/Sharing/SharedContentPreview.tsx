/**
 * SharedContentPreview Component
 * Displays shared content previews in messages
 * Implements requirements 4.2, 4.5 from the interconnected social platform spec
 */

import React from 'react';
import { ContentPreview } from '../../services/contentSharingService';
import { useRouter } from 'next/router';

interface SharedContentPreviewProps {
  preview: ContentPreview;
  className?: string;
  onClick?: () => void;
}

export const SharedContentPreview: React.FC<SharedContentPreviewProps> = ({
  preview,
  className = '',
  onClick
}) => {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Navigate to the content
      const url = getContentUrl(preview);
      if (url) {
        router.push(url);
      }
    }
  };

  const getContentUrl = (preview: ContentPreview): string | null => {
    switch (preview.type) {
      case 'post':
        return `/posts/${preview.id}`;
      case 'community':
        return `/communities/${preview.id}`;
      case 'user_profile':
        return `/profile/${preview.metadata.authorAddress}`;
      case 'nft':
        return `/nft/${preview.id}`;
      case 'governance_proposal':
        return `/governance/proposals/${preview.id}`;
      default:
        return null;
    }
  };

  const getTypeIcon = () => {
    switch (preview.type) {
      case 'post':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        );
      case 'community':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'nft':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'governance_proposal':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
    }
  };

  const getTypeLabel = () => {
    switch (preview.type) {
      case 'post':
        return 'Post';
      case 'community':
        return 'Community';
      case 'user_profile':
        return 'Profile';
      case 'nft':
        return 'NFT';
      case 'governance_proposal':
        return 'Proposal';
      default:
        return 'Content';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <div
      className={`
        shared-content-preview
        border border-gray-200 dark:border-gray-700 
        rounded-lg overflow-hidden 
        hover:border-blue-300 dark:hover:border-blue-600
        transition-colors duration-200
        cursor-pointer
        bg-white dark:bg-gray-800
        ${className}
      `}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <div className="text-gray-500 dark:text-gray-400">
          {getTypeIcon()}
        </div>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">
          {getTypeLabel()}
        </span>
        {preview.metadata.communityName && (
          <>
            <span className="text-gray-400 dark:text-gray-500">•</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {preview.metadata.communityName}
            </span>
          </>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex space-x-3">
          {/* Image */}
          {preview.imageUrl && (
            <div className="flex-shrink-0">
              <img
                src={preview.imageUrl}
                alt={preview.title}
                className="w-16 h-16 rounded-lg object-cover"
              />
            </div>
          )}

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
              {preview.title}
            </h3>
            
            {preview.description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                {preview.description}
              </p>
            )}

            {/* Metadata */}
            <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
              {preview.metadata.authorName && (
                <span>by {preview.metadata.authorName}</span>
              )}
              
              <span>{formatDate(preview.metadata.createdAt)}</span>

              {/* Engagement Stats */}
              {preview.metadata.engagement && (
                <div className="flex items-center space-x-2">
                  {preview.metadata.engagement.likes > 0 && (
                    <span className="flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                      </svg>
                      <span>{preview.metadata.engagement.likes}</span>
                    </span>
                  )}
                  
                  {preview.metadata.engagement.comments > 0 && (
                    <span className="flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>{preview.metadata.engagement.comments}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer for special content types */}
      {preview.type === 'community' && (
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Community</span>
            <span>Click to join</span>
          </div>
        </div>
      )}

      {preview.type === 'governance_proposal' && (
        <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400">
            <span>Governance Proposal</span>
            <span>Click to vote</span>
          </div>
        </div>
      )}

      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default SharedContentPreview;