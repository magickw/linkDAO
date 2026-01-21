/**
 * SimpleProductCard - Uniform sizing, minimal details, product-first design
 * Inspired by Amazon/eBay - image + short description is enough
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Eye, Shield, CheckCircle, Clock } from 'lucide-react';

export type DensityMode = 'comfortable' | 'compact';

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    images: string[];
    price: {
      amount: string;
      currency: string;
      usdEquivalent?: string;
    };
    seller: {
      id: string;
      name: string;
      verified: boolean;
      daoApproved?: boolean;
    };
    trust?: {
      escrowProtected?: boolean;
    };
    inventory?: number;
    discount?: number;
    listingType?: 'FIXED_PRICE' | 'AUCTION';
    endTime?: string;
    highestBid?: string;
  };
  density?: DensityMode;
  onProductClick?: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
  onToggleFavorite?: (productId: string) => void;
  onBidClick?: (productId: string) => void;
}

export const SimpleProductCard: React.FC<ProductCardProps> = ({
  product,
  density = 'comfortable',
  onProductClick,
  onAddToCart,
  onToggleFavorite,
  onBidClick,
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');

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
      const interval = setInterval(updateTimer, 60000);
      return () => clearInterval(interval);
    }
  }, [product.listingType, product.endTime]);

  const handleCardClick = (e: React.MouseEvent) => {
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

  if (density === 'comfortable') {
    return (
      <motion.div
        className="group relative h-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-lg transition-shadow cursor-pointer overflow-hidden h-full flex flex-col"
          onClick={handleCardClick}
        >
          {/* Image - Fixed 1:1 aspect ratio */}
          <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
            {!isImageLoaded && !imageError && (
              <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-600" />
            )}
            {imageError ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
                <ShoppingCart size={48} />
              </div>
            ) : (
              <img
                src={product.images && product.images.length > 0 ? product.images[0] : '/images/placeholders/product-placeholder.svg'}
                alt={product.title}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
                  isHovered ? 'scale-105' : 'scale-100'
                } ${
                  isImageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
                onLoad={() => setIsImageLoaded(true)}
                onError={() => {
                  setImageError(true);
                  e.currentTarget.src = '/images/placeholders/product-placeholder.svg';
                }}
              />
            )}

            {/* Hover Overlay */}
            {isHovered && (
              <motion.div
                className="absolute inset-0 bg-black/50 flex items-center justify-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
              >
                <button
                  className="w-10 h-10 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition-colors shadow-lg"
                  onClick={handleQuickView}
                  title="Quick view"
                >
                  <Eye size={18} className="text-gray-900" />
                </button>
                <button
                  className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors shadow-lg"
                  onClick={handleAddToCart}
                  title="Add to cart"
                >
                  <ShoppingCart size={18} className="text-white" />
                </button>
              </motion.div>
            )}

            {/* Top Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {product.discount && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                  -{product.discount}%
                </span>
              )}
              {product.listingType === 'AUCTION' && (
                <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                  <Clock size={12} />
                  AUCTION
                </span>
              )}
            </div>

            {/* Favorite Button */}
            <button
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-colors shadow-sm"
              onClick={handleToggleFavorite}
            >
              <Heart
                size={16}
                className={isFavorited ? 'text-red-500 fill-red-500' : 'text-gray-700'}
              />
            </button>
          </div>

          {/* Content - Minimal */}
          <div className="p-3 flex-1 flex flex-col">
            {/* Trust Badges */}
            <div className="flex items-center gap-1.5 mb-2">
              {product.trust?.escrowProtected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium" title="Escrow protected">
                  <Shield size={10} />
                </span>
              )}
              {product.seller.daoApproved && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 text-xs font-medium" title="DAO approved">
                  <CheckCircle size={10} />
                </span>
              )}
              {product.seller.verified && (
                <span className="text-blue-500 text-xs" title="Verified seller">✓</span>
              )}
            </div>

            {/* Title - 2 lines max */}
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight mb-2 flex-1">
              {product.title}
            </h3>

            {/* Price */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {parseFloat(product.price.amount).toFixed(4)}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {product.price.currency}
                </span>
              </div>
              {product.price.usdEquivalent && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ≈ ${parseFloat(product.price.usdEquivalent).toFixed(2)}
                </span>
              )}
            </div>

            {/* Inventory & Auction Info */}
            {product.inventory !== undefined && product.inventory < 5 && product.inventory > 0 && (
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-1">
                Only {product.inventory} left
              </p>
            )}
            {product.listingType === 'AUCTION' && timeRemaining && (
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1 flex items-center gap-1">
                <Clock size={12} />
                {timeRemaining}
              </p>
            )}

            {/* Seller Name */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 truncate">
              by {product.seller.name}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Compact mode
  return (
    <motion.div
      className="group relative h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden h-full flex flex-col"
        onClick={handleCardClick}
      >
        {/* Image - 1:1 aspect ratio */}
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
              src={product.images && product.images.length > 0 ? product.images[0] : '/images/placeholders/product-placeholder.svg'}
              alt={product.title}
              className={`w-full h-full object-cover transition-all ${
                isHovered ? 'scale-105' : 'scale-100'
              } ${
                isImageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              loading="lazy"
              onLoad={() => setIsImageLoaded(true)}
              onError={() => {
                setImageError(true);
                e.currentTarget.src = '/images/placeholders/product-placeholder.svg';
              }}
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
            className="absolute top-1 right-1 w-11 h-11 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-colors shadow-sm"
            onClick={handleToggleFavorite}
          >
            <Heart
              size={12}
              className={isFavorited ? 'text-red-500 fill-red-500' : 'text-gray-700'}
            />
          </button>
        </div>

        {/* Compact Content */}
        <div className="p-2 flex-1 flex flex-col">
          {/* Trust badges */}
          <div className="flex items-center gap-1 mb-1">
            {product.trust?.escrowProtected && (
              <Shield size={10} className="text-emerald-600 dark:text-emerald-400" />
            )}
            {product.seller.daoApproved && (
              <CheckCircle size={10} className="text-cyan-600 dark:text-cyan-400" />
            )}
          </div>

          {/* Title */}
          <h3 className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1 flex-1">
            {product.title}
          </h3>

          {/* Price */}
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {parseFloat(product.price.amount).toFixed(3)}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {product.price.currency}
            </span>
          </div>

          {/* Seller */}
          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {product.seller.name}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
