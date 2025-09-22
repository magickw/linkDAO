/**
 * NFTPreviewCard Component
 * 
 * Displays NFT thumbnails with collection information, floor prices, rarity indicators,
 * and market data integration. Includes click-to-expand functionality and loading states.
 * 
 * Requirements: 2.2, 5.4
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import { NFTPreview } from '../../../../types/communityEnhancements';

interface NFTPreviewCardProps {
  nft: NFTPreview;
  onExpand?: (nft: NFTPreview) => void;
  isLoading?: boolean;
  showMarketData?: boolean;
  compact?: boolean;
  className?: string;
}

interface RarityConfig {
  label: string;
  color: string;
  backgroundColor: string;
  icon: string;
}

const RARITY_CONFIG: Record<string, RarityConfig> = {
  common: {
    label: 'Common',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    icon: '⚪'
  },
  uncommon: {
    label: 'Uncommon',
    color: '#10B981',
    backgroundColor: '#ECFDF5',
    icon: '🟢'
  },
  rare: {
    label: 'Rare',
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    icon: '🔵'
  },
  epic: {
    label: 'Epic',
    color: '#8B5CF6',
    backgroundColor: '#F5F3FF',
    icon: '🟣'
  },
  legendary: {
    label: 'Legendary',
    color: '#F59E0B',
    backgroundColor: '#FFFBEB',
    icon: '🟡'
  },
  mythic: {
    label: 'Mythic',
    color: '#EF4444',
    backgroundColor: '#FEF2F2',
    icon: '🔴'
  }
};

const NFTPreviewCard: React.FC<NFTPreviewCardProps> = memo(({
  nft,
  onExpand,
  isLoading = false,
  showMarketData = true,
  compact = false,
  className = ''
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Handle image load events
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(true);
  }, []);

  // Handle expand click
  const handleExpandClick = useCallback(() => {
    if (onExpand && !isLoading) {
      onExpand(nft);
    }
  }, [onExpand, nft, isLoading]);

  // Get rarity configuration
  const rarityConfig = useMemo(() => {
    if (!nft.rarity) return null;
    return RARITY_CONFIG[nft.rarity.toLowerCase()] || RARITY_CONFIG.common;
  }, [nft.rarity]);

  // Format price display
  const formatPrice = useCallback((price: number) => {
    if (price >= 1000) {
      return `${(price / 1000).toFixed(1)}K`;
    }
    return price.toFixed(2);
  }, []);

  // Format volume display
  const formatVolume = useCallback((volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toFixed(2);
  }, []);

  const cardClasses = useMemo(() => {
    const baseClasses = [
      'ce-nft-preview-card',
      'bg-white dark:bg-gray-800',
      'border border-gray-200 dark:border-gray-700',
      'rounded-lg overflow-hidden',
      'transition-all duration-200 ease-in-out',
      'hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600',
      'group'
    ];

    if (compact) {
      baseClasses.push('max-w-xs');
    } else {
      baseClasses.push('max-w-sm');
    }

    if (onExpand && !isLoading) {
      baseClasses.push('cursor-pointer', 'hover:transform', 'hover:scale-105');
    }

    if (isLoading) {
      baseClasses.push('opacity-75', 'cursor-wait');
    }

    if (className) {
      baseClasses.push(className);
    }

    return baseClasses.join(' ');
  }, [compact, onExpand, isLoading, className]);

  return (
    <div 
      className={cardClasses}
      onClick={handleExpandClick}
      role={onExpand ? 'button' : 'img'}
      tabIndex={onExpand ? 0 : -1}
      onKeyDown={(e) => {
        if (onExpand && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleExpandClick();
        }
      }}
      aria-label={`NFT: ${nft.collection} #${nft.tokenId}${nft.rarity ? `, ${nft.rarity} rarity` : ''}${nft.floorPrice ? `, floor price ${nft.floorPrice} ETH` : ''}`}
    >
      {/* Image Container */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-700">
        {/* Loading skeleton */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 ce-skeleton animate-pulse" />
        )}

        {/* NFT Image */}
        {!imageError ? (
          <img
            src={nft.image}
            alt={`${nft.collection} #${nft.tokenId}`}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              <p className="text-sm">Image unavailable</p>
            </div>
          </div>
        )}

        {/* Rarity Badge */}
        {rarityConfig && (
          <div 
            className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
            style={{
              color: rarityConfig.color,
              backgroundColor: rarityConfig.backgroundColor
            }}
          >
            <span aria-hidden="true">{rarityConfig.icon}</span>
            <span>{rarityConfig.label}</span>
          </div>
        )}

        {/* Expand Indicator */}
        {onExpand && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg">
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`p-3 ${compact ? 'space-y-1' : 'space-y-2'}`}>
        {/* Collection and Token ID */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {nft.collection}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
            #{nft.tokenId}
          </span>
        </div>

        {/* Price Information */}
        {nft.floorPrice && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Floor Price
            </span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatPrice(nft.floorPrice)} ETH
              </span>
              <span className="text-xs text-gray-500" aria-hidden="true">
                Ξ
              </span>
            </div>
          </div>
        )}

        {/* Market Data */}
        {showMarketData && nft.marketData && !compact && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            {nft.marketData.lastSale && (
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Last Sale</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatPrice(nft.marketData.lastSale)} ETH
                </p>
              </div>
            )}
            {nft.marketData.volume24h && (
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">24h Volume</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatVolume(nft.marketData.volume24h)} ETH
                </p>
              </div>
            )}
          </div>
        )}

        {/* Compact Market Data */}
        {showMarketData && nft.marketData && compact && (
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            {nft.marketData.lastSale && (
              <span>Last: {formatPrice(nft.marketData.lastSale)} ETH</span>
            )}
            {nft.marketData.volume24h && (
              <span>Vol: {formatVolume(nft.marketData.volume24h)} ETH</span>
            )}
          </div>
        )}
      </div>

      {/* Screen reader information */}
      <div className="sr-only">
        NFT from {nft.collection}, token ID {nft.tokenId}
        {nft.rarity && `, rarity: ${nft.rarity}`}
        {nft.floorPrice && `, floor price: ${nft.floorPrice} ETH`}
        {nft.marketData?.lastSale && `, last sale: ${nft.marketData.lastSale} ETH`}
        {nft.marketData?.volume24h && `, 24 hour volume: ${nft.marketData.volume24h} ETH`}
        {onExpand && ', click to expand for more details'}
      </div>
    </div>
  );
});

NFTPreviewCard.displayName = 'NFTPreviewCard';

export default NFTPreviewCard;