import React, { useState } from 'react';
import { NFTPreviewData } from './InlinePreviewRenderer';
import { NFTPreview as NFTPreviewType } from '../../types/contentPreview';

interface NFTPreviewProps {
  data: NFTPreviewData | NFTPreviewType;
  className?: string;
  compact?: boolean;
  onClick?: () => void;
}

export default function NFTPreview({ data, className = '', compact = false, onClick }: NFTPreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Handle both legacy and new data formats
  const nftData = {
    contractAddress: data.contractAddress,
    tokenId: data.tokenId,
    name: data.name,
    description: data.description,
    image: data.image,
    collection: data.collection,
    owner: data.owner,
    price: data.price
      ? {
          amount: parseFloat(data.price.amount),
          token: data.price.symbol,
        }
      : undefined,
    rarity: data.rarity,
  };

  const formatPrice = (price?: { amount: number; token: string }) => {
    if (!price) return null;
    return `${price.amount} ${price.token}`;
  };

  const getRarityColor = (rarity?: number) => {
    if (!rarity) return 'text-gray-500';
    if (rarity >= 90) return 'text-purple-500'; // Legendary
    if (rarity >= 70) return 'text-blue-500';   // Rare
    if (rarity >= 50) return 'text-green-500';  // Uncommon
    return 'text-gray-500'; // Common
  };

  const getRarityLabel = (rarity?: number) => {
    if (!rarity) return 'Common';
    if (rarity >= 90) return 'Legendary';
    if (rarity >= 70) return 'Rare';
    if (rarity >= 50) return 'Uncommon';
    return 'Common';
  };

  if (compact) {
    return (
      <div 
        className={`nft-preview-compact flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer ${className}`}
        onClick={onClick}
      >
        <div className="w-12 h-12 flex-shrink-0">
          <img
            src={nftData.image}
            alt={nftData.name}
            className="w-full h-full object-cover rounded"
            onError={(e) => {
              e.currentTarget.src = '/images/nft-placeholder.png';
            }}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 dark:text-white truncate">
              {nftData.name}
            </h4>
            {nftData.rarity && (
              <span className={`px-1.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 rounded ${getRarityColor(nftData.rarity)}`}>
                {getRarityLabel(nftData.rarity)}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {nftData.collection} #{nftData.tokenId}
          </p>
        </div>
        
        {nftData.price && (
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {formatPrice(nftData.price)}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-700/50 overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${className}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-white/50 dark:bg-gray-800/50 border-b border-purple-200 dark:border-purple-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">NFT</span>
            {'network' in data && (
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {data.network}
              </span>
            )}
          </div>
          {nftData.rarity && (
            <span className={`text-xs font-semibold px-2 py-1 rounded-full bg-white/70 dark:bg-gray-800/70 ${getRarityColor(nftData.rarity)}`}>
              {getRarityLabel(nftData.rarity)}
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex space-x-4">
          {/* NFT Image */}
          <div className="flex-shrink-0">
            <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
              {!imageError ? (
                <>
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <img
                    src={nftData.image}
                    alt={nftData.name}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                  />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              
              {/* Enhanced data overlays */}
              {'network' in data && data.floorPrice && (
                <div className="absolute bottom-1 left-1">
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-black/70 text-white rounded">
                    Floor: {data.floorPrice.amount} {data.floorPrice.symbol}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* NFT Details */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
              {nftData.name}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
              {nftData.collection}
            </p>
            
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                #{nftData.tokenId}
              </div>
              {nftData.price && (
                <div className="text-right">
                  <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                    {formatPrice(nftData.price)}
                  </div>
                  {'network' in data && data.lastSale && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Last: {data.lastSale.amount} {data.lastSale.symbol}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Contract Address */}
            <div className="mt-2">
              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                {nftData.contractAddress.substring(0, 6)}...{nftData.contractAddress.substring(38)}
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced traits display for new format */}
        {'network' in data && data.traits && data.traits.length > 0 && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-1">
              {data.traits.slice(0, 3).map((trait, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded"
                >
                  {trait.trait_type}: {trait.value}
                </span>
              ))}
              {data.traits.length > 3 && (
                <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                  +{data.traits.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Description (if available and short) */}
        {nftData.description && nftData.description.length < 100 && (
          <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700/50">
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {nftData.description}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 mt-3">
          <button className="flex-1 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors duration-200">
            View Details
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}