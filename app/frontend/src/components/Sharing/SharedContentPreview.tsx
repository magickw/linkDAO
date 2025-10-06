/**
 * SharedContentPreview Component
 * Displays shared content previews in messages
 * Implements requirements 4.2, 4.5 from the interconnected social platform spec
 */

import React from 'react';
import { ContentPreview } from '../../types/contentPreview';
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
      case 'proposal':
        const proposalData = preview.data as any; // Type assertion to access id
        return `/governance/proposals/${proposalData.id}`;
      case 'nft':
        const nftData = preview.data as any; // Type assertion to access properties
        return `/nft/${nftData.contractAddress}/${nftData.tokenId}`;
      case 'link':
        return preview.url;
      case 'token':
        const tokenData = preview.data as any; // Type assertion to access properties
        return `/tokens/${tokenData.contractAddress}`;
      default:
        return null;
    }
  };

  const getTypeIcon = () => {
    switch (preview.type) {
      case 'proposal':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case 'nft':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'link':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
      case 'token':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
      case 'proposal':
        return 'Proposal';
      case 'nft':
        return 'NFT';
      case 'link':
        return 'Link';
      case 'token':
        return 'Token';
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

  // Extract data based on type
  const getTitle = () => {
    switch (preview.type) {
      case 'proposal':
        const proposalData = preview.data as any;
        return proposalData.title;
      case 'nft':
        const nftData = preview.data as any;
        return nftData.name;
      case 'link':
        const linkData = preview.data as any;
        return linkData.title;
      case 'token':
        const tokenData = preview.data as any;
        return tokenData.name;
      default:
        return '';
    }
  };

  const getDescription = () => {
    switch (preview.type) {
      case 'proposal':
        const proposalData = preview.data as any;
        return proposalData.description;
      case 'nft':
        const nftData = preview.data as any;
        return nftData.description;
      case 'link':
        const linkData = preview.data as any;
        return linkData.description;
      case 'token':
        const tokenData = preview.data as any;
        return `Token symbol: ${tokenData.symbol}`;
      default:
        return '';
    }
  };

  const getImageUrl = () => {
    switch (preview.type) {
      case 'proposal':
        return undefined;
      case 'nft':
        const nftData = preview.data as any;
        return nftData.image;
      case 'link':
        const linkData = preview.data as any;
        return linkData.image;
      case 'token':
        const tokenData = preview.data as any;
        return tokenData.logo;
      default:
        return undefined;
    }
  };

  const title = getTitle();
  const description = getDescription();
  const imageUrl = getImageUrl();

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
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex space-x-3">
          {/* Image */}
          {imageUrl && (
            <div className="flex-shrink-0">
              <img
                src={imageUrl}
                alt={title}
                className="w-16 h-16 rounded-lg object-cover"
              />
            </div>
          )}

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
              {title}
            </h3>
            
            {description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                {description}
              </p>
            )}

            {/* Metadata */}
            <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
              {preview.metadata.authorName && (
                <span>by {preview.metadata.authorName}</span>
              )}
              
              {preview.metadata.createdAt && (
                <span>{formatDate(preview.metadata.createdAt)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

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