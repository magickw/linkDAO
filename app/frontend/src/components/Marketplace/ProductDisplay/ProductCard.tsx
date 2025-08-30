/**
 * ProductCard Component - Glassmorphic product card with lazy-loaded images
 * Displays product information with trust indicators and dual pricing
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DualPricing } from '../../../design-system/components/DualPricing';
import { TrustIndicators } from '../../../design-system/components/TrustIndicators';
import { LoadingSkeleton } from '../../../design-system/components/LoadingSkeleton';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { Button } from '../../../design-system/components/Button';
import { designTokens } from '../../../design-system/tokens';

interface Product {
  id: string;
  title: string;
  description: string;
  images: string[];
  price: {
    crypto: string;
    cryptoSymbol: string;
    fiat: string;
    fiatSymbol: string;
  };
  seller: {
    id: string;
    name: string;
    avatar: string;
    verified: boolean;
    reputation: number;
    daoApproved: boolean;
  };
  trust: {
    verified: boolean;
    escrowProtected: boolean;
    onChainCertified: boolean;
  };
  category: string;
  isNFT?: boolean;
  inventory?: number;
}

interface ProductCardProps {
  product: Product;
  variant?: 'grid' | 'list';
  showTrustIndicators?: boolean;
  onProductClick?: (productId: string) => void;
  onSellerClick?: (sellerId: string) => void;
  onAddToCart?: (productId: string) => void;
  onAddToWishlist?: (productId: string) => void;
  className?: string;
}

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({ 
  src, 
  alt, 
  className = '',
  onLoad 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0">
          <LoadingSkeleton variant="image" height="100%" />
        </div>
      )}
      
      {error ? (
        <div 
          className="w-full h-full flex items-center justify-center text-white/60"
          style={{
            background: designTokens.glassmorphism.secondary.background,
            backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
          }}
        >
          <span>Image not available</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loading ? 'opacity-0' : 'opacity-100'
          }`}
          loading="lazy"
        />
      )}
    </div>
  );
};

const SellerBadge: React.FC<{ seller: Product['seller']; onClick?: () => void }> = ({ 
  seller, 
  onClick 
}) => (
  <motion.div
    className="flex items-center gap-2 cursor-pointer"
    onClick={onClick}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="w-6 h-6 rounded-full overflow-hidden">
      <OptimizedImage
        src={seller.avatar}
        alt={seller.name}
        className="w-full h-full"
      />
    </div>
    <div className="flex items-center gap-1">
      <span className="text-sm font-medium text-white/90">{seller.name}</span>
      {seller.verified && <span className="text-xs">✅</span>}
      {seller.daoApproved && (
        <div 
          className="px-1 py-0.5 rounded text-xs font-medium"
          style={{
            background: designTokens.colors.trust.dao + '20',
            color: designTokens.colors.trust.dao,
            border: `1px solid ${designTokens.colors.trust.dao}40`,
          }}
        >
          DAO
        </div>
      )}
    </div>
  </motion.div>
);

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  variant = 'grid',
  showTrustIndicators = true,
  onProductClick,
  onSellerClick,
  onAddToCart,
  onAddToWishlist,
  className = '',
}) => {
  const [isWishlisted, setIsWishlisted] = useState(false);

  const handleProductClick = () => {
    onProductClick?.(product.id);
  };

  const handleSellerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSellerClick?.(product.seller.id);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart?.(product.id);
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
    onAddToWishlist?.(product.id);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
    hover: {
      y: -8,
      transition: { duration: 0.2, ease: 'easeOut' },
    },
  };

  const nftGlowStyle = product.isNFT ? {
    boxShadow: designTokens.nftShadows.standard.boxShadow,
    border: designTokens.nftShadows.standard.border,
  } : {};

  const daoGlowStyle = product.seller.daoApproved ? {
    boxShadow: designTokens.nftShadows.dao.boxShadow,
    border: designTokens.nftShadows.dao.border,
  } : {};

  const glowStyle = product.seller.daoApproved ? daoGlowStyle : nftGlowStyle;

  if (variant === 'list') {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        className={`cursor-pointer ${className}`}
        onClick={handleProductClick}
      >
        <GlassPanel 
          variant="secondary" 
          className="p-4"
          nftShadow={product.seller.daoApproved ? 'dao' : (product.isNFT ? 'standard' : undefined)}
        >
          <div className="flex gap-4">
            {/* Image */}
            <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
              <OptimizedImage
                src={product.images[0]}
                alt={product.title}
                className="w-full h-full"
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <SellerBadge 
                  seller={product.seller} 
                  onClick={() => onSellerClick?.(product.seller.id)}
                />
                {showTrustIndicators && (
                  <TrustIndicators
                    {...product.trust}
                    daoApproved={product.seller.daoApproved}
                    layout="compact"
                    size="small"
                  />
                )}
              </div>

              <h3 className="font-semibold text-lg text-white mb-1 truncate">
                {product.title}
              </h3>

              <p className="text-white/70 text-sm mb-3 line-clamp-2">
                {product.description}
              </p>

              <div className="flex items-center justify-between">
                <DualPricing
                  cryptoPrice={product.price.crypto}
                  cryptoSymbol={product.price.cryptoSymbol}
                  fiatPrice={product.price.fiat}
                  fiatSymbol={product.price.fiatSymbol}
                  size="small"
                  layout="horizontal"
                />

                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="small"
                    onClick={handleAddToCart}
                  >
                    Add to Cart
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={handleWishlistToggle}
                  >
                    {isWishlisted ? '❤️' : '🤍'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>
      </motion.div>
    );
  }

  // Grid variant (default)
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className={`cursor-pointer ${className}`}
      onClick={handleProductClick}
    >
      <GlassPanel 
        variant="secondary" 
        className="overflow-hidden"
        nftShadow={product.seller.daoApproved ? 'dao' : (product.isNFT ? 'standard' : undefined)}
      >
        {/* Image */}
        <div className="relative h-48 w-full">
          <OptimizedImage
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full"
          />
          
          {/* Wishlist button overlay */}
          <motion.button
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: designTokens.glassmorphism.primary.background,
              backdropFilter: designTokens.glassmorphism.primary.backdropFilter,
              border: designTokens.glassmorphism.primary.border,
            }}
            onClick={handleWishlistToggle}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isWishlisted ? '❤️' : '🤍'}
          </motion.button>

          {/* NFT badge */}
          {product.isNFT && (
            <div 
              className="absolute top-3 left-3 px-2 py-1 rounded text-xs font-medium"
              style={{
                background: designTokens.gradients.nftRainbow,
                color: 'white',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              NFT
            </div>
          )}

          {/* Low stock indicator */}
          {product.inventory !== undefined && product.inventory < 5 && (
            <div 
              className="absolute bottom-3 left-3 px-2 py-1 rounded text-xs font-medium"
              style={{
                background: designTokens.colors.status.warning + 'dd',
                color: 'white',
              }}
            >
              Only {product.inventory} left
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Seller and Trust Indicators */}
          <div className="flex items-center justify-between mb-3">
            <SellerBadge 
              seller={product.seller} 
              onClick={() => onSellerClick?.(product.seller.id)}
            />
            {showTrustIndicators && (
              <TrustIndicators
                {...product.trust}
                daoApproved={product.seller.daoApproved}
                layout="compact"
                size="small"
              />
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-lg text-white mb-2 line-clamp-2">
            {product.title}
          </h3>

          {/* Description */}
          <p className="text-white/70 text-sm mb-4 line-clamp-2">
            {product.description}
          </p>

          {/* Pricing */}
          <div className="mb-4">
            <DualPricing
              cryptoPrice={product.price.crypto}
              cryptoSymbol={product.price.cryptoSymbol}
              fiatPrice={product.price.fiat}
              fiatSymbol={product.price.fiatSymbol}
              size="medium"
              layout="vertical"
              realTimeConversion
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="small"
              onClick={handleAddToCart}
              className="flex-1"
            >
              Buy Now
            </Button>
            <Button
              variant="outline"
              size="small"
              onClick={handleAddToCart}
              className="flex-1"
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
};

export default ProductCard;