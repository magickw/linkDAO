/**
 * EnhancedProductCard - Optimized product card with density modes
 * Supports comfortable and compact views with performance optimizations
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Eye, Star, Shield, CheckCircle, Clock } from 'lucide-react';
import { designTokens } from '@/design-system/tokens';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';

export type DensityMode = 'comfortable' | 'compact';

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    description?: string;
    images: string[];
    price: {
      amount: string;
      currency: string;
      usdEquivalent?: string;
    };
    seller: {
      id: string;
      name: string;
      avatar?: string;
      verified: boolean;
      rating?: number;
      reviewCount?: number;
      daoApproved?: boolean;
    };
    trust?: {
      verified?: boolean;
      escrowProtected?: boolean;
      onChainCertified?: boolean;
    };
    category?: string;
    stock?: number;
    location?: string;
    shipping?: {
      free?: boolean;
      deliverySpeed?: string;
    };
    condition?: 'new' | 'used' | 'refurbished';
    discount?: number;
    // Auction/Bidding fields
    listingType?: 'FIXED_PRICE' | 'AUCTION';
    endTime?: string;
    highestBid?: string;
  };
  density?: DensityMode;
  onProductClick?: (productId: string) => void;
  onSellerClick?: (sellerId: string) => void;
  onAddToCart?: (productId: string) => void;
  onToggleFavorite?: (productId: string) => void;
  onBidClick?: (productId: string) => void;
}

export const EnhancedProductCard: React.FC<ProductCardProps> = ({
  product,
  density = 'comfortable',
  onProductClick,
  onSellerClick,
  onAddToCart,
  onToggleFavorite,
  onBidClick,
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [imageError, setImageError] = useState(false);

  // Countdown timer for auctions
  React.useEffect(() => {
    if (product.listingType === 'AUCTION' && product.endTime) {
      const updateTimer = () => {
        const end = new Date(product.endTime!).getTime();
        const now = new Date().getTime();
        const distance = end - now;

        if (distance < 0) {
          setTimeRemaining('Ended');
          return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
          setTimeRemaining(`${days}d ${hours}h`);
        } else if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m`);
        } else {
          setTimeRemaining(`${minutes}m`);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [product.listingType, product.endTime]);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) return;
    onProductClick?.(product.id);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart?.(product.id);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorited(!isFavorited);
    onToggleFavorite?.(product.id);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onProductClick?.(product.id);
  };

  const handleSellerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSellerClick?.(product.seller.id);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorited(!isFavorited);
    onToggleFavorite?.(product.id);
  };

  if (density === 'comfortable') {
    return (
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <GlassPanel
          variant="secondary"
          className="overflow-hidden cursor-pointer h-full flex flex-col"
          onClick={handleCardClick}
        >
          {/* Image Container - 4:5 aspect ratio */}
          <div className="relative bg-gray-800/50 aspect-[4/5] overflow-hidden">
            {/* Skeleton loader */}
            {!isImageLoaded && (
              <div className="absolute inset-0 animate-pulse bg-gray-700/50" />
            )}

            {/* Product Image */}
            <img
              src={product.images && product.images.length > 0 ? product.images[0] : '/images/placeholders/product-placeholder.svg'}
              alt={product.title}
              className={`w-full h-full object-cover transition-all duration-300 ${
                isImageLoaded ? 'opacity-100' : 'opacity-0'
              } ${isHovered ? 'scale-105' : 'scale-100'}`}
              loading="lazy"
              onLoad={() => setIsImageLoaded(true)}
              srcSet={product.images && product.images.length > 0 ? `${product.images[0]}?w=400 400w, ${product.images[0]}?w=600 600w` : ''}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              onError={(e) => {
                e.currentTarget.src = '/images/placeholders/product-placeholder.svg';
              }}
            />

            {/* Discount Badge */}
            {product.discount && (
              <div className="absolute top-2 left-2">
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md">
                  -{product.discount}% OFF
                </span>
              </div>
            )}

            {/* Auction Badge */}
            {product.listingType === 'AUCTION' && (
              <div className="absolute top-2 left-2">
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-md">
                  🔨 AUCTION
                </span>
              </div>
            )}

            {/* Favorite Button */}
            <button
              onClick={handleFavoriteClick}
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={{
                background: designTokens.glassmorphism.primary.background,
                backdropFilter: designTokens.glassmorphism.primary.backdropFilter,
              }}
            >
              <Heart
                size={16}
                className={isFavorited ? 'fill-red-500 text-red-500' : 'text-white'}
              />
            </button>

            {/* Hover Actions Overlay */}
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2"
              >
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart size={16} />
                  Add
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCardClick}
                  className="border-white/30 text-white"
                >
                  <Eye size={16} />
                  View
                </Button>
              </motion.div>
            )}

            {/* Stock Warning */}
            {product.stock !== undefined && product.stock > 0 && product.stock < 5 && (
              <div className="absolute bottom-2 left-2">
                <span className="bg-orange-500 text-white text-xs font-medium px-2 py-1 rounded">
                  Only {product.stock} left
                </span>
              </div>
            )}
          </div>

          {/* Content - 12-16px spacing grid */}
          <div className="p-3 flex flex-col flex-1">
            {/* Seller Info */}
            <button
              onClick={handleSellerClick}
              className="flex items-center gap-2 mb-2 group"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {product.seller.name.charAt(0)}
              </div>
              <span className="text-xs text-white/70 group-hover:text-white/90 transition-colors truncate">
                {product.seller.name}
              </span>
              {product.seller.verified && <span className="text-xs">✅</span>}
              {product.seller.daoApproved && <span className="text-xs">🏛️</span>}
            </button>

            {/* Title - 1-2 lines */}
            <h3 className="text-sm font-semibold text-white line-clamp-2 mb-1 leading-tight">
              {product.title}
            </h3>

            {/* Rating */}
            {product.seller.rating && (
              <div className="flex items-center gap-1 mb-2">
                <Star size={12} className="fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-white/80">{product.seller.rating.toFixed(1)}</span>
                {product.seller.reviewCount && (
                  <span className="text-xs text-white/50">({product.seller.reviewCount})</span>
                )}
              </div>
            )}

            {/* Price or Bid Info */}
            <div className="mb-2">
              {product.listingType === 'AUCTION' ? (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-white/60">Current Bid:</span>
                    <span className="text-lg font-bold text-white">
                      {product.highestBid || product.price.amount} {product.price.currency}
                    </span>
                  </div>
                  {product.price.usdEquivalent && (
                    <span className="text-xs text-white/60">
                      ≈ ${product.price.usdEquivalent}
                    </span>
                  )}
                  {timeRemaining && (
                    <div className="text-xs text-orange-400 font-medium mt-1">
                      ⏰ {timeRemaining} remaining
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-white">
                      {product.price.amount} {product.price.currency}
                    </span>
                  </div>
                  {product.price.usdEquivalent && (
                    <span className="text-xs text-white/60">
                      ≈ ${product.price.usdEquivalent}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Trust Badges & Shipping */}
            <div className="flex flex-wrap gap-1 mb-2">
              {product.shipping?.free && (
                <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full border border-green-400/30">
                  Free Shipping
                </span>
              )}
              {product.shipping?.deliverySpeed && (
                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/30">
                  {product.shipping.deliverySpeed}
                </span>
              )}
            </div>

            {/* Action Button - at bottom */}
            {product.listingType === 'AUCTION' ? (
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onBidClick?.(product.id);
                }}
                className="w-full mt-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                🔨 Place Bid
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddToCart}
                className="w-full mt-auto"
              >
                <ShoppingCart size={14} className="mr-1" />
                Add to Cart
              </Button>
            )}
          </div>
        </GlassPanel>
      </motion.div>
    );
  }

  // Compact mode - smaller cards, text-dominant, 5-6 columns desktop
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <GlassPanel
        variant="secondary"
        className="overflow-hidden cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex gap-2 p-2">
        {/* Compact Image - 1:1 aspect ratio */}
        <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
          {!isImageLoaded && !imageError && (
            <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-600" />
          )}
          {imageError ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
              <ShoppingCart size={32} />
            </div>
          ) : (
            <img
              src={product.images[0]}
              alt={product.title}
              className={`w-full h-full object-cover transition-all ${
                isHovered ? 'scale-105' : 'scale-100'
              } ${
                isImageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              loading="lazy"
              onLoad={() => setIsImageLoaded(true)}
              onError={handleImageError}
            />
          )}
          
          {/* Badges */}
          {product.discount && (
            <div className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
              -{product.discount}%
            </div>
          )}
          
          {/* Favorite */}
          <button
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-colors shadow-sm"
            onClick={handleToggleFavorite}
          >
            <Heart
              size={12}
              className={isFavorited ? 'text-red-500 fill-red-500' : 'text-gray-700'}
            />
          </button>
        </div>

          {/* Compact Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            {/* Title & Seller */}
            <div>
              <h3 className="text-xs font-semibold text-white line-clamp-1 mb-0.5">
                {product.title}
              </h3>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-white/60 truncate">
                  {product.seller.name}
                </span>
                {product.seller.verified && <span className="text-[8px]">✅</span>}
              </div>
            </div>

            {/* Price & Action */}
            <div className="flex items-center justify-between gap-1">
              <div>
                <span className="text-sm font-bold text-white">
                  {product.price.amount} {product.price.currency}
                </span>
                {product.seller.rating && (
                  <div className="flex items-center gap-0.5">
                    <Star size={8} className="fill-yellow-400 text-yellow-400" />
                    <span className="text-[10px] text-white/70">
                      {product.seller.rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={handleAddToCart}
                className="w-6 h-6 rounded bg-blue-500 hover:bg-blue-600 flex items-center justify-center flex-shrink-0"
              >
                <ShoppingCart size={12} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
};
