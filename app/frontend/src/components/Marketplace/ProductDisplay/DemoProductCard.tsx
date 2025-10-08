/**
 * DemoProductCard - Product card component for marketplace demo
 * Compatible with MarketplaceListing interface and showcases enhanced features
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MarketplaceListing } from '../../../services/marketplaceService';

interface DemoProductCardProps {
  product: MarketplaceListing;
  onAddToCart?: (productId: string) => void;
  onBidNow?: (productId: string) => void;
  onFavorite?: (productId: string) => void;
  className?: string;
}

const DemoProductCard: React.FC<DemoProductCardProps> = ({
  product,
  onAddToCart,
  onBidNow,
  onFavorite,
  className = '',
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorited(!isFavorited);
    onFavorite?.(product.id);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart?.(product.id);
  };

  const handleBidNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBidNow?.(product.id);
  };

  const formatPrice = (price: string, symbol: string) => {
    const numPrice = parseFloat(price);
    if (symbol === 'ETH' && numPrice < 1) {
      return `${numPrice.toFixed(4)} ${symbol}`;
    }
    return `${symbol === 'USD' ? '$' : ''}${numPrice.toLocaleString()}${symbol !== 'USD' ? ` ${symbol}` : ''}`;
  };

  // Simplified seller badges since MarketplaceListing doesn't have enhancedData
  const getSellerBadges = (): string[] => {
    const badges: string[] = [];
    // We don't have verified or daoApproved info in MarketplaceListing
    return badges;
  };

  // Simplified trust score calculation
  const getTrustScore = () => {
    // MarketplaceListing doesn't have enhancedData.trust
    // Return a default score for demo purposes
    return 85;
  };

  const trustScore = getTrustScore();
  const isAuction = product.listingType === 'AUCTION';
  const timeLeft = isAuction && product.endTime 
    ? Math.max(0, new Date(product.endTime).getTime() - Date.now())
    : 0;

  const formatTimeLeft = (ms: number) => {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return 'Ending soon';
  };

  return (
    <motion.div
      className={`bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300 cursor-pointer group ${className}`}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden">
        {/* Loading skeleton */}
        {!isImageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gray-300/20 animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        )}

        {/* Main Image */}
        {!imageError ? (
          <div className="w-full h-full bg-gradient-to-br from-gray-400/20 to-gray-600/20 flex items-center justify-center">
            <span className="text-white/60 text-sm">Demo Image</span>
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-400/20 to-gray-600/20 flex items-center justify-center">
            <span className="text-white/60 text-sm">Image unavailable</span>
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.itemType === 'NFT' && (
            <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
              NFT
            </span>
          )}
          {isAuction && (
            <span className="px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full">
              AUCTION
            </span>
          )}
          {product.quantity && product.quantity < 5 && (
            <span className="px-2 py-1 bg-yellow-500/90 text-white text-xs font-bold rounded-full">
              {product.quantity} left
            </span>
          )}
        </div>

        {/* Favorite button */}
        <button
          onClick={handleFavorite}
          className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          {isFavorited ? '❤️' : '🤍'}
        </button>

        {/* Trust score indicator */}
        <div className="absolute bottom-3 left-3">
          <div className="flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full">
            <div className={`w-2 h-2 rounded-full ${
              trustScore >= 80 ? 'bg-green-400' : 
              trustScore >= 60 ? 'bg-yellow-400' : 'bg-red-400'
            }`}></div>
            <span className="text-white text-xs font-medium">{trustScore}%</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-white text-lg leading-tight line-clamp-2 group-hover:text-blue-300 transition-colors">
          {product.metadataURI || `${product.itemType} Listing`}
        </h3>

        {/* Seller info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-300 text-sm">
              {`${product.sellerWalletAddress.slice(0, 6)}...${product.sellerWalletAddress.slice(-4)}`}
            </span>
            <div className="flex gap-1">
              {getSellerBadges().map((badge, index) => (
                <span key={index} className="text-sm">{badge}</span>
              ))}
            </div>
          </div>
          {/* No rating info in MarketplaceListing */}
        </div>

        {/* Price */}
        <div className="space-y-1">
          <div className="text-xl font-bold text-white">
            {formatPrice(product.price, 'ETH')}
          </div>
          {/* No fiat price in MarketplaceListing */}
        </div>

        {/* Auction info */}
        {isAuction && (
          <div className="space-y-1">
            {product.highestBid && (
              <div className="text-sm text-gray-300">
                Highest bid: <span className="text-green-400 font-medium">
                  {formatPrice(product.highestBid, 'ETH')}
                </span>
              </div>
            )}
            {timeLeft > 0 && (
              <div className="text-sm text-orange-400">
                ⏰ {formatTimeLeft(timeLeft)} left
              </div>
            )}
          </div>
        )}

        {/* Trust indicators */}
        <div className="flex items-center gap-2 text-xs">
          {product.isEscrowed && (
            <span className="flex items-center gap-1 text-green-400">
              🔒 Escrow Protected
            </span>
          )}
          {/* No verified info in MarketplaceListing */}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          {isAuction ? (
            <button
              onClick={handleBidNow}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              Bid Now
            </button>
          ) : (
            <button
              onClick={handleAddToCart}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              Add to Cart
            </button>
          )}
          
          <button className="w-10 h-10 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg flex items-center justify-center transition-colors">
            <span className="text-white">👁</span>
          </button>
        </div>

        {/* Additional info */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
          <span>{product.quantity} available</span>
          {/* No views/favorites in MarketplaceListing */}
        </div>
      </div>
    </motion.div>
  );
};

export default DemoProductCard;