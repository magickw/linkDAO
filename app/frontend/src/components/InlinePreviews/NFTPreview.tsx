import React, { useState } from 'react';
import { NFTPreviewData } from './InlinePreviewRenderer';

interface NFTPreviewProps {
  data: NFTPreviewData;
  className?: string;
}

export default function NFTPreview({ data, className = '' }: NFTPreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

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

  return (
    <div className={`bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-700/50 overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-white/50 dark:bg-gray-800/50 border-b border-purple-200 dark:border-purple-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">NFT</span>
          </div>
          {data.rarity && (
            <span className={`text-xs font-semibold px-2 py-1 rounded-full bg-white/70 dark:bg-gray-800/70 ${getRarityColor(data.rarity)}`}>
              {getRarityLabel(data.rarity)}
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
                    src={data.image}
                    alt={data.name}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                  />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* NFT Details */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
              {data.name}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
              {data.collection}
            </p>
            
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                #{data.tokenId}
              </div>
              {data.price && (
                <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                  {formatPrice(data.price)}
                </div>
              )}
            </div>

            {/* Contract Address */}
            <div className="mt-2">
              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                {data.contractAddress.substring(0, 6)}...{data.contractAddress.substring(38)}
              </span>
            </div>
          </div>
        </div>

        {/* Description (if available and short) */}
        {data.description && data.description.length < 100 && (
          <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700/50">
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {data.description}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}