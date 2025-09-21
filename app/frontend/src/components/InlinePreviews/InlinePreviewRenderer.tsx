import React, { useState, useEffect } from 'react';
import NFTPreview from './NFTPreview';
import LinkPreview from './LinkPreview';
import ProposalPreview from './ProposalPreview';
import TokenPreview from './TokenPreview';
import { ContentPreview, TokenAmount, ProposalStatus } from '../../types/contentPreview';
import contentPreviewService from '../../services/contentPreviewService';

// Legacy interfaces for backward compatibility
export interface NFTPreviewData {
  contractAddress: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  collection: string;
  owner: string;
  price?: TokenAmount;
  rarity?: number;
}

export interface LinkPreviewData {
  url: string;
  title: string;
  description: string;
  image: string;
  siteName: string;
  type: 'article' | 'video' | 'product' | 'website';
  metadata: Record<string, any>;
}

export interface ProposalPreviewData {
  id: string;
  title: string;
  description: string;
  status: ProposalStatus;
  votingEnds: Date;
  yesVotes: number;
  noVotes: number;
  quorum: number;
  proposer: string;
}

export interface TokenPreviewData {
  symbol: string;
  name: string;
  amount: number;
  usdValue: number;
  change24h: number;
  logo: string;
  contractAddress: string;
}

// Legacy ContentPreview interface for backward compatibility
export interface LegacyContentPreview {
  type: 'nft' | 'link' | 'proposal' | 'token';
  data: NFTPreviewData | LinkPreviewData | ProposalPreviewData | TokenPreviewData;
  thumbnail?: string;
  metadata?: Record<string, any>;
}

interface InlinePreviewRendererProps {
  // Support both new and legacy preview formats
  previews?: LegacyContentPreview[];
  urls?: string[];
  enhancedPreviews?: ContentPreview[];
  className?: string;
  maxPreviews?: number;
  showAll?: boolean;
  enableSecurity?: boolean;
  compact?: boolean;
}

export default function InlinePreviewRenderer({
  previews,
  urls,
  enhancedPreviews,
  className = '',
  maxPreviews = 3,
  showAll = false,
  enableSecurity = true,
  compact = false
}: InlinePreviewRendererProps) {
  const [generatedPreviews, setGeneratedPreviews] = useState<ContentPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Generate previews from URLs if provided
  useEffect(() => {
    if (urls && urls.length > 0) {
      generatePreviewsFromUrls();
    }
  }, [urls]);

  const generatePreviewsFromUrls = async () => {
    if (!urls) return;
    
    setLoading(true);
    const newPreviews: ContentPreview[] = [];
    const newErrors: Record<string, string> = {};

    for (const url of urls) {
      try {
        const preview = await contentPreviewService.generatePreview(url, {
          enableSandbox: enableSecurity,
          cacheEnabled: true
        });
        newPreviews.push(preview);
      } catch (error) {
        newErrors[url] = error instanceof Error ? error.message : 'Failed to generate preview';
      }
    }

    setGeneratedPreviews(newPreviews);
    setErrors(newErrors);
    setLoading(false);
  };

  // Determine which previews to display
  const getDisplayPreviews = (): (LegacyContentPreview | ContentPreview)[] => {
    if (enhancedPreviews) return enhancedPreviews;
    if (generatedPreviews.length > 0) return generatedPreviews;
    if (previews) return previews;
    return [];
  };

  const displayPreviews = getDisplayPreviews();
  const finalPreviews = showAll ? displayPreviews : displayPreviews.slice(0, maxPreviews);
  const hasMore = displayPreviews.length > maxPreviews && !showAll;

  if (loading) {
    return (
      <div className={`inline-preview-container ${className}`}>
        <div className="preview-loading space-y-4">
          {Array.from({ length: Math.min(urls?.length || 1, maxPreviews) }).map((_, index) => (
            <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-lg animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-300 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (displayPreviews.length === 0 && Object.keys(errors).length === 0) {
    return null;
  }

  const renderSecurityWarning = (preview: ContentPreview) => {
    if (preview.securityStatus === 'safe') return null;
    
    return (
      <div className={`security-warning mb-2 ${preview.securityStatus === 'blocked' ? 'blocked' : 'warning'}`}>
        <div className="flex items-center gap-2 p-2 rounded-md bg-yellow-50 border border-yellow-200">
          <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-yellow-800">
            {preview.securityStatus === 'blocked' ? 'Content blocked for security' : 'Security warning'}
          </span>
        </div>
      </div>
    );
  };

  const renderPreview = (preview: LegacyContentPreview | ContentPreview, index: number) => {
    // Handle enhanced ContentPreview
    if ('securityStatus' in preview) {
      const enhancedPreview = preview as ContentPreview;
      
      if (enhancedPreview.securityStatus === 'blocked') {
        return (
          <div key={`blocked-${index}`} className="blocked-content p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
            <div className="flex items-center gap-2 text-red-700">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Content Blocked</span>
            </div>
            <p className="text-sm text-red-600 mt-1">This content has been blocked for security reasons.</p>
          </div>
        );
      }

      return (
        <div key={`enhanced-${index}`} className="mb-4">
          {renderSecurityWarning(enhancedPreview)}
          {renderLegacyPreview(enhancedPreview, index)}
        </div>
      );
    }

    // Handle legacy ContentPreview
    return renderLegacyPreview(preview as LegacyContentPreview, index);
  };

  const renderLegacyPreview = (preview: LegacyContentPreview | ContentPreview, index: number) => {
    switch (preview.type) {
      case 'nft':
        return (
          <NFTPreview
            key={`nft-${index}`}
            data={preview.data as NFTPreviewData}
            className={compact ? 'compact' : 'mb-4'}
          />
        );
      case 'link':
        return (
          <LinkPreview
            key={`link-${index}`}
            data={preview.data as LinkPreviewData}
            className={compact ? 'compact' : 'mb-4'}
          />
        );
      case 'proposal':
        return (
          <ProposalPreview
            key={`proposal-${index}`}
            data={preview.data as ProposalPreviewData}
            className={compact ? 'compact' : 'mb-4'}
          />
        );
      case 'token':
        return (
          <TokenPreview
            key={`token-${index}`}
            data={preview.data as TokenPreviewData}
            className={compact ? 'compact' : 'mb-4'}
          />
        );
      default:
        return null;
    }
  };

  const renderErrors = () => {
    if (Object.keys(errors).length === 0) return null;

    return (
      <div className="preview-errors space-y-2 mb-4">
        {Object.entries(errors).map(([url, error]) => (
          <div key={url} className="preview-error p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-sm">Preview failed</span>
            </div>
            <p className="text-sm text-red-600 mt-1">{error}</p>
            <p className="text-xs text-red-500 mt-1 truncate">{url}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`inline-preview-container ${className}`}>
      {renderErrors()}
      {finalPreviews.map((preview, index) => renderPreview(preview, index))}
      
      {hasMore && (
        <div className="text-center py-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            +{displayPreviews.length - maxPreviews} more preview{displayPreviews.length - maxPreviews > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}