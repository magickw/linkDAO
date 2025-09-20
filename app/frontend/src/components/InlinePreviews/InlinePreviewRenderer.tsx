import React from 'react';
import NFTPreview from './NFTPreview';
import LinkPreview from './LinkPreview';
import ProposalPreview from './ProposalPreview';
import TokenPreview from './TokenPreview';

export interface ContentPreview {
  type: 'nft' | 'link' | 'proposal' | 'token';
  data: NFTPreviewData | LinkPreviewData | ProposalPreviewData | TokenPreviewData;
  thumbnail?: string;
  metadata?: Record<string, any>;
}

export interface NFTPreviewData {
  contractAddress: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  collection: string;
  owner: string;
  price?: {
    amount: number;
    token: string;
  };
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
  status: 'draft' | 'active' | 'passed' | 'failed' | 'executed';
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

interface InlinePreviewRendererProps {
  previews: ContentPreview[];
  className?: string;
  maxPreviews?: number;
  showAll?: boolean;
}

export default function InlinePreviewRenderer({
  previews,
  className = '',
  maxPreviews = 3,
  showAll = false
}: InlinePreviewRendererProps) {
  if (!previews || previews.length === 0) {
    return null;
  }

  const displayPreviews = showAll ? previews : previews.slice(0, maxPreviews);
  const hasMore = previews.length > maxPreviews && !showAll;

  const renderPreview = (preview: ContentPreview, index: number) => {
    switch (preview.type) {
      case 'nft':
        return (
          <NFTPreview
            key={`nft-${index}`}
            data={preview.data as NFTPreviewData}
            className="mb-4"
          />
        );
      case 'link':
        return (
          <LinkPreview
            key={`link-${index}`}
            data={preview.data as LinkPreviewData}
            className="mb-4"
          />
        );
      case 'proposal':
        return (
          <ProposalPreview
            key={`proposal-${index}`}
            data={preview.data as ProposalPreviewData}
            className="mb-4"
          />
        );
      case 'token':
        return (
          <TokenPreview
            key={`token-${index}`}
            data={preview.data as TokenPreviewData}
            className="mb-4"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`inline-preview-container ${className}`}>
      {displayPreviews.map((preview, index) => renderPreview(preview, index))}
      
      {hasMore && (
        <div className="text-center py-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            +{previews.length - maxPreviews} more preview{previews.length - maxPreviews > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}