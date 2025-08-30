import React, { useState } from 'react';

interface NFT {
  id: string;
  name: string;
  image: string;
  collection: string;
  tokenId: string;
  contractAddress: string;
}

interface NFTPreviewProps {
  nfts: NFT[];
  className?: string;
}

export default function NFTPreview({ nfts, className = '' }: NFTPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [is3DView, setIs3DView] = useState(false);

  const nextNFT = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % nfts.length);
  };

  const prevNFT = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + nfts.length) % nfts.length);
  };

  const currentNFT = nfts[currentIndex];

  if (!nfts || nfts.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">NFT Collection</h3>
          <button 
            onClick={() => setIs3DView(!is3DView)}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            {is3DView ? '2D View' : '3D View'}
          </button>
        </div>
      </div>
      
      <div className="relative p-4">
        <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden relative">
          {is3DView ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="relative w-48 h-48">
                <div 
                  className="absolute inset-0 rounded-full border-4 border-primary-500 animate-spin-slow"
                  style={{ animationDuration: '8s' }}
                ></div>
                <div className="absolute inset-4 rounded-full border-2 border-secondary-500 animate-spin-slow"
                  style={{ animationDuration: '6s', animationDirection: 'reverse' }}
                ></div>
                <div className="absolute inset-8 rounded-full border border-accent-500 flex items-center justify-center">
                  <img 
                    src={currentNFT.image} 
                    alt={currentNFT.name} 
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                </div>
              </div>
            </div>
          ) : (
            <img 
              src={currentNFT.image} 
              alt={currentNFT.name} 
              className="w-full h-full object-contain"
            />
          )}
        </div>
        
        <div className="mt-4">
          <h4 className="font-medium text-gray-900 dark:text-white truncate">{currentNFT.name}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{currentNFT.collection}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            #{currentNFT.tokenId} • {currentNFT.contractAddress.substring(0, 6)}...{currentNFT.contractAddress.substring(38)}
          </p>
        </div>
        
        {nfts.length > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button 
              onClick={prevNFT}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Previous NFT"
            >
              <svg className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="flex space-x-1">
              {nfts.map((_, index) => (
                <div 
                  key={index}
                  className={`w-2 h-2 rounded-full ${index === currentIndex ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                ></div>
              ))}
            </div>
            
            <button 
              onClick={nextNFT}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Next NFT"
            >
              <svg className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}