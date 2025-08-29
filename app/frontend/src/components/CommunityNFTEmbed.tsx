import React, { useState, useEffect } from 'react';
import { communityWeb3Service } from '@/services/communityWeb3Service';

interface CommunityNFTEmbedProps {
  contractAddress: string;
  tokenId: string;
  className?: string;
}

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  contractAddress: string;
  tokenId: string;
  owner: string;
  floorPrice?: string;
}

export default function CommunityNFTEmbed({
  contractAddress,
  tokenId,
  className = ''
}: CommunityNFTEmbedProps) {
  const [nftData, setNftData] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    loadNFTData();
  }, [contractAddress, tokenId]);

  const loadNFTData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const metadata = await communityWeb3Service.getNFTMetadata(contractAddress, tokenId);
      setNftData(metadata);
    } catch (err) {
      console.error('Error loading NFT data:', err);
      setError('Failed to load NFT data');
    } finally {
      setLoading(false);
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setError('Failed to load NFT image');
  };

  const openOnOpenSea = () => {
    if (nftData) {
      const url = `https://opensea.io/assets/ethereum/${nftData.contractAddress}/${nftData.tokenId}`;
      window.open(url, '_blank');
    }
  };

  const copyContractAddress = () => {
    if (nftData) {
      navigator.clipboard.writeText(nftData.contractAddress);
      // You could add a toast notification here
    }
  };

  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-700 p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="flex space-x-4">
            <div className="w-24 h-24 bg-purple-200 dark:bg-purple-700 rounded-lg"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-purple-200 dark:bg-purple-700 rounded w-3/4"></div>
              <div className="h-3 bg-purple-200 dark:bg-purple-700 rounded w-1/2"></div>
              <div className="h-3 bg-purple-200 dark:bg-purple-700 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !nftData) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700 p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">{error || 'Failed to load NFT'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-700 overflow-hidden hover:shadow-lg transition-shadow duration-300 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-purple-200 dark:border-purple-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">NFT</span>
            </div>
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Digital Collectible
            </span>
          </div>
          
          <button
            onClick={openOnOpenSea}
            className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors duration-200"
            title="View on OpenSea"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex space-x-4">
          {/* NFT Image */}
          <div className="relative w-24 h-24 flex-shrink-0">
            {!imageLoaded && (
              <div className="absolute inset-0 bg-purple-200 dark:bg-purple-700 rounded-lg animate-pulse"></div>
            )}
            <img
              src={nftData.image}
              alt={nftData.name}
              className={`w-full h-full object-cover rounded-lg border-2 border-purple-300 dark:border-purple-600 transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            
            {/* Rarity Badge */}
            {nftData.attributes.find(attr => attr.trait_type === 'Rarity') && (
              <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full border border-white">
                {nftData.attributes.find(attr => attr.trait_type === 'Rarity')?.value}
              </div>
            )}
          </div>

          {/* NFT Details */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
              {nftData.name}
            </h4>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {nftData.description}
            </p>

            {/* Contract Info */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Token ID:</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">#{nftData.tokenId}</span>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Owner:</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {nftData.owner.slice(0, 6)}...{nftData.owner.slice(-4)}
                </span>
              </div>

              {nftData.floorPrice && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Floor Price:</span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    {nftData.floorPrice}
                  </span>
                </div>
              )}
            </div>

            {/* Attributes */}
            {nftData.attributes.length > 0 && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-1">
                  {nftData.attributes.slice(0, 3).map((attr, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                    >
                      {attr.trait_type}: {attr.value}
                    </span>
                  ))}
                  {nftData.attributes.length > 3 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                      +{nftData.attributes.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex space-x-2">
          <button
            onClick={openOnOpenSea}
            className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
          >
            View on OpenSea
          </button>
          
          <button
            onClick={copyContractAddress}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 text-sm font-medium"
            title="Copy contract address"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}