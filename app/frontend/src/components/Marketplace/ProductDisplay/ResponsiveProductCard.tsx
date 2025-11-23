/**
 * ResponsiveProductCard Component - Product card that adapts to different screen sizes
 * Provides optimized layouts for mobile, tablet, and desktop views
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DualPricing } from '../../../design-system/components/DualPricing';
import { TrustIndicators } from '../../../design-system/components/TrustIndicators';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { Button } from '../../../design-system/components/Button';
import { designTokens } from '../../../design-system/tokens';
import { useResponsive } from '../../../design-system/components/ResponsiveContainer';
import { 
  AnimatedProductBadge, 
  AnimatedSellerBadge, 
  AnimatedEngagementMetrics, 
  AnimatedTrustIndicator,
  productCardAnimations
} from '../../../components/VisualPolish/MarketplaceAnimations';
import { 
  Heart, ShoppingCart, Eye, 
  Star, CheckCircle, Shield, Vote,
  Truck, Award, Wrench
} from 'lucide-react';

interface Product {
  id: string;
  title: string;
  description: string;
  images: string[];
  price: {
    amount: string;
    currency: string;
    usdEquivalent?: string;
    eurEquivalent?: string;
    gbpEquivalent?: string;
    lastUpdated?: Date;
  };
  seller: {
    id: string;
    name: string;
    avatar: string;
    verified: boolean;
    reputation: number;
    daoApproved: boolean;
    tier?: 'basic' | 'premium' | 'enterprise';
    onlineStatus?: 'online' | 'offline' | 'away';
    // Enhanced reputation metrics
    reputationMetrics?: {
      overallScore: number;
      moderationScore: number;
      reportingScore: number;
      juryScore: number;
      violationCount: number;
      helpfulReportsCount: number;
      falseReportsCount: number;
      successfulAppealsCount: number;
      juryDecisionsCount: number;
      juryAccuracyRate: number;
      reputationTier: string;
      lastViolationAt?: Date;
    };
  };
  trust: {
    verified: boolean;
    escrowProtected: boolean;
    onChainCertified: boolean;
  };
  category: string;
  isNFT?: boolean;
  inventory?: number;
  views?: number;
  favorites?: number;
  condition?: 'new' | 'used' | 'refurbished';
  brand?: string;
  hasWarranty?: boolean;
  shipping?: {
    freeShipping?: boolean;
    handlingTime?: number;
    shipsFrom?: {
      country?: string;
      state?: string;
      city?: string;
    };
  };
  discount?: {
    percentage?: number;
    active?: boolean;
  };
  isFeatured?: boolean;
  isPublished?: boolean;
  createdAt?: Date;
  // Enhanced metadata
  metadata?: {
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    materials?: string[];
    certifications?: string[];
    qualityScore?: number;
    publishedAt?: Date;
    lastIndexed?: Date;
    // Price conversion data
    fiatEquivalents?: Record<string, string>;
    priceLastUpdated?: Date;
  };
}

interface ResponsiveProductCardProps {
  product: Product;
  onProductClick?: (productId: string) => void;
  onSellerClick?: (sellerId: string) => void;
  onAddToCart?: (productId: string) => void;
  onAddToWishlist?: (productId: string) => void;
  onQuickView?: (productId: string) => void;
  className?: string;
}

const OptimizedImage: React.FC<{ 
  src: string; 
  alt: string; 
  className?: string;
}> = ({ src, alt, className = '' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {loading && (
        <div 
          className="absolute inset-0 bg-white/10 animate-pulse rounded-lg"
          style={{
            background: designTokens.glassmorphism.secondary.background,
            backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
          }}
        />
      )}
      
      {error ? (
        <div 
          className="w-full h-full flex items-center justify-center text-white/60 rounded-lg"
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
          className={`w-full h-full object-cover transition-opacity duration-300 rounded-lg ${
            loading ? 'opacity-0' : 'opacity-100'
          }`}
        />
      )}
    </div>
  );
};

const SellerBadge: React.FC<{ 
  seller: Product['seller']; 
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}> = ({ 
  seller, 
  onClick,
  size = 'md'
}) => {
  // Format reputation score for display
  const formatReputationScore = (score: number) => {
    if (score >= 10000) return `${(score / 1000).toFixed(1)}k`;
    if (score >= 1000) return `${(score / 1000).toFixed(1)}k`;
    return score.toString();
  };

  // Get reputation tier color
  const getReputationTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'platinum': return '#E5E4E2';
      case 'gold': return '#FFD700';
      case 'silver': return '#C0C0C0';
      case 'bronze': return '#CD7F32';
      default: return '#808080';
    }
  };

  const sizeClasses = {
    sm: { avatar: 'w-6 h-6', text: 'text-xs', badge: 'text-[10px]' },
    md: { avatar: 'w-8 h-8', text: 'text-sm', badge: 'text-xs' },
    lg: { avatar: 'w-10 h-10', text: 'text-base', badge: 'text-sm' },
  };

  const classes = sizeClasses[size];

  return (
    <motion.div
      className="flex items-center gap-2 cursor-pointer group"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className={`${classes.avatar} rounded-full overflow-hidden`}>
        <OptimizedImage
          src={seller.avatar}
          alt={seller.name}
          className="w-full h-full"
        />
      </div>
      <div>
        <div className="flex items-center gap-1">
          <span className={`font-medium text-white group-hover:text-white/80 transition-colors ${classes.text}`}>
            {seller.name}
          </span>
          {seller.verified && <CheckCircle size={12} className="text-green-400" />}
          {seller.daoApproved && (
            <AnimatedProductBadge variant="info" size="sm">
              DAO
            </AnimatedProductBadge>
          )}
          {/* Reputation Score Badge */}
          {seller.reputationMetrics && (
            <AnimatedProductBadge variant="warning" size="sm">
              ⭐ {formatReputationScore(seller.reputationMetrics.overallScore)}
            </AnimatedProductBadge>
          )}
        </div>
        <div className={`flex items-center gap-1 ${classes.text} text-white/60`}>
          <Star size={12} />
          <span>{seller.reputation}</span>
        </div>
      </div>
    </motion.div>
  );
};

export const ResponsiveProductCard: React.FC<ResponsiveProductCardProps> = ({
  product,
  onProductClick,
  onSellerClick,
  onAddToCart,
  onAddToWishlist,
  onQuickView,
  className = '',
}) => {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const handleProductClick = () => {
    onProductClick?.(product.id);
  };

  const handleSellerClick = () => {
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

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickView?.(product.id);
  };

  // Format shipping information
  const shippingInfo = [];
  if (product.shipping?.freeShipping) {
    shippingInfo.push('Free shipping');
  }
  if (product.shipping?.handlingTime !== undefined) {
    if (product.shipping.handlingTime <= 1) {
      shippingInfo.push('Same day shipping');
    } else if (product.shipping.handlingTime <= 2) {
      shippingInfo.push('1-2 day shipping');
    } else {
      shippingInfo.push(`${product.shipping.handlingTime} day shipping`);
    }
  }

  // Format price data for dual pricing component
  const priceData = {
    crypto: product.price.amount,
    cryptoSymbol: product.price.currency,
    fiat: product.price.usdEquivalent || '0',
    fiatSymbol: 'USD'
  };

  // Card layout based on screen size
  if (isMobile) {
    // Mobile layout - compact card
    return (
      <motion.div
        className={`cursor-pointer ${className}`}
        onClick={handleProductClick}
        {...productCardAnimations.hover}
        {...productCardAnimations.tap}
      >
        <GlassPanel 
          variant="secondary" 
          className="overflow-hidden"
          nftShadow={product.seller.daoApproved ? 'dao' : (product.isNFT ? 'standard' : undefined)}
        >
          <div className="flex gap-3 p-3">
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
              {/* Title */}
              <h3 className="font-semibold text-white mb-1 line-clamp-2">
                {product.title}
              </h3>

              {/* Seller */}
              <div className="mb-2">
                <SellerBadge 
                  seller={product.seller} 
                  onClick={handleSellerClick}
                  size="sm"
                />
              </div>

              {/* Pricing */}
              <div className="mb-2">
                <DualPricing
                  cryptoPrice={priceData.crypto}
                  cryptoSymbol={priceData.cryptoSymbol}
                  fiatPrice={priceData.fiat}
                  fiatSymbol={priceData.fiatSymbol}
                  size="sm"
                  layout="horizontal"
                />
              </div>

              {/* Trust indicators */}
              <div className="mb-2">
                <div className="flex gap-1">
                  {product.trust.verified && (
                    <AnimatedTrustIndicator type="verified" label="" />
                  )}
                  {product.trust.escrowProtected && (
                    <AnimatedTrustIndicator type="escrow" label="" />
                  )}
                  {product.trust.onChainCertified && (
                    <AnimatedTrustIndicator type="onchain" label="" />
                  )}
                  {product.seller.daoApproved && (
                    <AnimatedTrustIndicator type="dao" label="" />
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddToCart}
                  className="flex-1"
                  disabled={product.inventory === 0}
                >
                  {product.inventory === 0 ? 'Out' : 'Buy'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleWishlistToggle}
                >
                  {isWishlisted ? <Heart size={16} fill="currentColor" /> : <Heart size={16} />}
                </Button>
              </div>
            </div>
          </div>
        </GlassPanel>
      </motion.div>
    );
  }

  if (isTablet) {
    // Tablet layout - medium card
    return (
      <motion.div
        className={`cursor-pointer ${className}`}
        onClick={handleProductClick}
        {...productCardAnimations.hover}
        {...productCardAnimations.tap}
      >
        <GlassPanel 
          variant="secondary" 
          className="overflow-hidden"
          nftShadow={product.seller.daoApproved ? 'dao' : (product.isNFT ? 'standard' : undefined)}
        >
          <div className="relative h-48 w-full">
            <OptimizedImage
              src={product.images[0]}
              alt={product.title}
              className="w-full h-full"
            />
            
            {/* Wishlist button overlay */}
            <motion.button
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: designTokens.glassmorphism.primary.background,
                backdropFilter: designTokens.glassmorphism.primary.backdropFilter,
                border: designTokens.glassmorphism.primary.border,
              }}
              onClick={handleWishlistToggle}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isWishlisted ? <Heart size={16} fill="currentColor" /> : <Heart size={16} />}
            </motion.button>

            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {product.isNFT && (
                <AnimatedProductBadge variant="secondary" size="sm">
                  NFT
                </AnimatedProductBadge>
              )}
              {product.discount?.active && product.discount.percentage && (
                <AnimatedProductBadge variant="error" size="sm">
                  {product.discount.percentage}% OFF
                </AnimatedProductBadge>
              )}
            </div>
          </div>

          <div className="p-4">
            {/* Seller and Trust Indicators */}
            <div className="flex items-center justify-between mb-3">
              <SellerBadge 
                seller={product.seller} 
                onClick={handleSellerClick}
                size="md"
              />
              <div className="flex gap-1">
                {product.trust.verified && (
                  <AnimatedTrustIndicator type="verified" label="" />
                )}
                {product.trust.escrowProtected && (
                  <AnimatedTrustIndicator type="escrow" label="" />
                )}
                {product.trust.onChainCertified && (
                  <AnimatedTrustIndicator type="onchain" label="" />
                )}
                {product.seller.daoApproved && (
                  <AnimatedTrustIndicator type="dao" label="" />
                )}
              </div>
            </div>

            {/* Title */}
            <h3 className="font-semibold text-lg text-white mb-2 line-clamp-2">
              {product.title}
            </h3>

            {/* Description */}
            <p className="text-white/70 text-sm mb-3 line-clamp-2">
              {product.description}
            </p>

            {/* Shipping info */}
            {shippingInfo.length > 0 && (
              <div className="text-xs text-white/60 mb-3">
                {shippingInfo.join(' • ')}
              </div>
            )}

            {/* Pricing */}
            <div className="mb-4">
              <DualPricing
                cryptoPrice={priceData.crypto}
                cryptoSymbol={priceData.cryptoSymbol}
                fiatPrice={priceData.fiat}
                fiatSymbol={priceData.fiatSymbol}
                size="md"
                layout="vertical"
                realTimeConversion
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddToCart}
                className="flex-1"
                disabled={product.inventory === 0}
              >
                {product.inventory === 0 ? 'Out of Stock' : 'Buy Now'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddToCart}
                className="flex-1"
                disabled={product.inventory === 0}
              >
                Add to Cart
              </Button>
            </div>
          </div>
        </GlassPanel>
      </motion.div>
    );
  }

  // Desktop layout - full featured card
  return (
    <motion.div
      className={`cursor-pointer ${className}`}
      onClick={handleProductClick}
      {...productCardAnimations.hover}
      {...productCardAnimations.tap}
    >
      <GlassPanel 
        variant="secondary" 
        className="overflow-hidden"
        nftShadow={product.seller.daoApproved ? 'dao' : (product.isNFT ? 'standard' : undefined)}
      >
        {/* Image */}
        <div className="relative h-56 w-full">
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
            {isWishlisted ? <Heart size={16} fill="currentColor" /> : <Heart size={16} />}
          </motion.button>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {product.isNFT && (
              <AnimatedProductBadge variant="secondary" size="sm">
                NFT
              </AnimatedProductBadge>
            )}
            {product.discount?.active && product.discount.percentage && (
              <AnimatedProductBadge variant="error" size="sm">
                {product.discount.percentage}% OFF
              </AnimatedProductBadge>
            )}
            {product.isFeatured && (
              <AnimatedProductBadge variant="warning" size="sm">
                Featured
              </AnimatedProductBadge>
            )}
            {product.metadata?.qualityScore && product.metadata.qualityScore > 80 && (
              <AnimatedProductBadge variant="success" size="sm">
                High Quality
              </AnimatedProductBadge>
            )}
          </div>

          {/* Low stock indicator */}
          {product.inventory !== undefined && product.inventory < 5 && product.inventory > 0 && (
            <AnimatedProductBadge 
              variant="warning" 
              size="sm"
              className="absolute bottom-3 left-3"
            >
              Only {product.inventory} left
            </AnimatedProductBadge>
          )}

          {/* Out of stock indicator */}
          {product.inventory !== undefined && product.inventory === 0 && (
            <AnimatedProductBadge 
              variant="error" 
              size="sm"
              className="absolute bottom-3 left-3"
            >
              Out of Stock
            </AnimatedProductBadge>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Seller and Trust Indicators */}
          <div className="flex items-center justify-between mb-4">
            <SellerBadge 
              seller={product.seller} 
              onClick={handleSellerClick}
              size="md"
            />
            <div className="flex gap-1">
              {product.trust.verified && (
                <AnimatedTrustIndicator type="verified" label="" />
              )}
              {product.trust.escrowProtected && (
                <AnimatedTrustIndicator type="escrow" label="" />
              )}
              {product.trust.onChainCertified && (
                <AnimatedTrustIndicator type="onchain" label="" />
              )}
              {product.seller.daoApproved && (
                <AnimatedTrustIndicator type="dao" label="" />
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-xl text-white mb-2 line-clamp-2">
            {product.title}
          </h3>

          {/* Product metadata */}
          <div className="flex flex-wrap gap-2 mb-3">
            {product.condition && (
              <AnimatedProductBadge variant="primary" size="sm">
                {product.condition}
              </AnimatedProductBadge>
            )}
            {product.brand && (
              <AnimatedProductBadge variant="secondary" size="sm">
                {product.brand}
              </AnimatedProductBadge>
            )}
            {product.hasWarranty && (
              <AnimatedProductBadge variant="success" size="sm">
                Warranty
              </AnimatedProductBadge>
            )}
            {product.metadata?.certifications && product.metadata.certifications.length > 0 && (
              <AnimatedProductBadge variant="info" size="sm">
                Certified
              </AnimatedProductBadge>
            )}
          </div>

          {/* Description */}
          <p className="text-white/70 text-sm mb-4 line-clamp-2">
            {product.description}
          </p>

          {/* Shipping info */}
          {shippingInfo.length > 0 && (
            <div className="text-xs text-white/60 mb-4">
              {shippingInfo.join(' • ')}
            </div>
          )}

          {/* Pricing */}
          <div className="mb-5">
            <DualPricing
              cryptoPrice={priceData.crypto}
              cryptoSymbol={priceData.cryptoSymbol}
              fiatPrice={priceData.fiat}
              fiatSymbol={priceData.fiatSymbol}
              size="lg"
              layout="vertical"
              realTimeConversion
            />
          </div>

          {/* Engagement metrics */}
          <div className="mb-5">
            <AnimatedEngagementMetrics 
              views={product.views || 0} 
              favorites={product.favorites || 0} 
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={handleAddToCart}
              className="flex-1"
              disabled={product.inventory === 0}
            >
              {product.inventory === 0 ? 'Out of Stock' : 'Buy Now'}
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={handleAddToCart}
              className="flex-1"
              disabled={product.inventory === 0}
            >
              Add to Cart
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={handleQuickView}
            >
              <Eye size={20} />
            </Button>
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
};

export default ResponsiveProductCard;