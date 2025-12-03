/**
 * ProductCard Component - Glassmorphic product card with lazy-loaded images
 * Displays product information with trust indicators and dual pricing
 */

import React, { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { useRouter } from 'next/router';
import { DualPricing } from '../../../design-system/components/DualPricing';
import { StablecoinPricing } from '../../../design-system/components/StablecoinPricing';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { Button } from '../../../design-system/components/Button';
import { OptimizedImage } from '../../Performance/OptimizedImageLoader';
import { designTokens } from '../../../design-system/tokens';
import {
  AnimatedProductBadge,
  AnimatedEngagementMetrics,
  AnimatedTrustIndicator
} from '../../../components/VisualPolish/MarketplaceAnimations';
import { useCart } from '../../../hooks/useCart';
import { useToast } from '../../../context/ToastContext';
import useMarketplaceErrorHandler from '../../../hooks/useMarketplaceErrorHandler';
import { usePrice } from '../../../hooks/useMarketplaceData';
import { formatPrice, formatDualPrice } from '../../../utils/priceFormatter';
import { validateProductID, validateSellerID, normalizeID } from '../../../utils/idValidator';
import AuctionTimer from '../AuctionTimer';

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

interface ProductCardProps {
  product: Product;
  variant?: 'grid' | 'list';
  showTrustIndicators?: boolean;
  onProductClick?: (productId: string) => void;
  onSellerClick?: (sellerId: string) => void;
  onAddToCart?: (productId: string) => void;
  onAddToWishlist?: (productId: string) => void;
  onBidClick?: (productId: string) => void;
  className?: string;
  isAuction?: boolean;
  highestBid?: string;
  endTime?: string;
  reservePrice?: string;
}

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
}

// Remove the local OptimizedImage component as we're now using the performance-optimized version

const SellerBadge: React.FC<{ seller: Product['seller']; onClick?: () => void }> = ({
  seller,
  onClick
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

  return (
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
          width={24}
          height={24}
          className="w-full h-full"
          priority="low"
          placeholder="skeleton"
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-white/90">{seller.name}</span>
        {seller.verified && <span className="text-xs">✅</span>}
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
    </motion.div>
  );
};

const ReputationIndicator: React.FC<{ reputation: number }> = ({ reputation }) => {
  // Determine reputation level
  const getReputationLevel = (score: number) => {
    if (score >= 2000) return { level: 'Excellent', color: '#10B981' };
    if (score >= 1500) return { level: 'Good', color: '#3B82F6' };
    if (score >= 1000) return { level: 'Fair', color: '#F59E0B' };
    if (score >= 500) return { level: 'Poor', color: '#EF4444' };
    return { level: 'Very Poor', color: '#78716C' };
  };

  const { level, color } = getReputationLevel(reputation);

  return (
    <div className="flex items-center gap-1 text-xs">
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-white/70">{level}</span>
    </div>
  );
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  variant = 'grid',
  showTrustIndicators = true,
  onProductClick,
  onSellerClick,
  onAddToCart,
  onAddToWishlist,
  onBidClick,
  className = '',
  isAuction = false,
  highestBid,
  endTime,
  reservePrice,
}) => {
  const router = useRouter();
  const { actions: cartActions } = useCart();
  const { addToast } = useToast();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Validate and normalize IDs for consistency
  const normalizedProductId = normalizeID(product.id, 'product');
  const normalizedSellerId = normalizeID(product.seller.id, 'seller');

  // Use centralized price data management
  const { priceData } = usePrice(normalizedProductId);

  // Check if product is in cart
  const isInCart = cartActions.isInCart(normalizedProductId);
  const cartItem = cartActions.getItem(normalizedProductId);

  // Calculate time remaining for auctions
  useEffect(() => {
    if (!isAuction || !endTime) return;

    const calculateTimeRemaining = () => {
      const end = new Date(endTime);
      const now = new Date();
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        return 'Ended';
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        return `${days}d ${hours}h`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    };

    setTimeRemaining(calculateTimeRemaining());
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuction, endTime]);

  const { handleError, showErrorToast } = useMarketplaceErrorHandler();

  const handleProductClick = () => {
    try {
      // Validate product ID before navigation
      const productValidation = validateProductID(product.id);
      if (!productValidation.isValid) {
        console.warn('Invalid product ID:', productValidation.errors);
        showErrorToast('Invalid product ID');
        return;
      }

      // Use direct navigation with fallback to callback
      if (onProductClick) {
        onProductClick(normalizedProductId);
      } else {
        router.push(`/marketplace/listing/${normalizedProductId}`);
      }
    } catch (error) {
      handleError(error, 'Product Navigation');
      showErrorToast('Failed to navigate to product details');
    }
  };

  const handleSellerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Validate seller ID before navigation
      const sellerValidation = validateSellerID(product.seller.id);
      if (!sellerValidation.isValid) {
        console.warn('Invalid seller ID:', sellerValidation.errors);
        showErrorToast('Invalid seller ID');
        return;
      }

      // Use direct navigation with fallback to callback
      if (onSellerClick) {
        onSellerClick(normalizedSellerId);
      } else {
        router.push(`/marketplace/seller/store/${normalizedSellerId}`);
      }
    } catch (error) {
      handleError(error, 'Seller Navigation');
      showErrorToast('Failed to navigate to seller store');
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isAddingToCart) return;

    setIsAddingToCart(true);

    try {
      // Create cart item from product with consistent pricing
      const cartCurrentPrice = priceData || {
        productId: normalizedProductId,
        amount: parseFloat(product.price.amount),
        currency: product.price.currency,
        usdEquivalent: product.price.usdEquivalent || '0',
        lastUpdated: new Date()
      };

      const cartItem = {
        id: normalizedProductId,
        title: product.title,
        description: product.description,
        image: product.images[0] || '',
        price: {
          crypto: cartCurrentPrice.amount.toString(),
          cryptoSymbol: cartCurrentPrice.currency,
          fiat: cartCurrentPrice.usdEquivalent || '0',
          fiatSymbol: 'USD'
        },
        seller: {
          id: normalizedSellerId,
          name: product.seller.name,
          avatar: product.seller.avatar,
          verified: product.seller.verified,
          daoApproved: product.seller.daoApproved,
          escrowSupported: product.trust.escrowProtected
        },
        category: product.category,
        isDigital: product.category === 'digital' || product.isNFT || false,
        isNFT: product.isNFT || false,
        inventory: product.inventory || 1,
        shipping: {
          cost: product.shipping?.freeShipping ? '0' : '0.001',
          freeShipping: product.shipping?.freeShipping || product.category === 'digital' || product.isNFT || false,
          estimatedDays: product.shipping?.handlingTime || (product.category === 'digital' || product.isNFT ? 'instant' : '3-5'),
          regions: ['US', 'CA', 'EU']
        },
        trust: {
          escrowProtected: product.trust.escrowProtected,
          onChainCertified: product.trust.onChainCertified,
          safetyScore: 95
        }
      };

      await cartActions.addItem(cartItem, 1);

      // Call optional callback
      onAddToCart?.(normalizedProductId);

      addToast(`Added "${product.title}" to cart! 🛒`, 'success');
    } catch (error) {
      console.error('Error adding to cart:', error);
      addToast('Failed to add item to cart. Please try again.', 'error');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
    onAddToWishlist?.(normalizedProductId);
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" as any },
    },
    hover: {
      y: -8,
      transition: { duration: 0.2, ease: "easeOut" as any },
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

  // Format price data for dual pricing component using centralized formatter
  const currentPrice = priceData || {
    productId: normalizedProductId,
    amount: parseFloat(product.price.amount),
    currency: product.price.currency,
    usdEquivalent: product.price.usdEquivalent || '0',
    lastUpdated: new Date()
  };

  const formattedPrice = formatDualPrice(
    currentPrice.amount,
    currentPrice.currency,
    parseFloat(currentPrice.usdEquivalent || '0'),
    'USD', // Only support USD
    { layout: 'horizontal', primaryCurrency: 'crypto' }
  );

  const priceDisplayData = {
    crypto: currentPrice.amount.toString(),
    cryptoSymbol: currentPrice.currency,
    fiat: currentPrice.usdEquivalent || '0',
    fiatSymbol: 'USD' // Only support USD
  };

  // Helper function to check if a currency is a stablecoin
  const isStablecoin = (currency: string): boolean => {
    const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX'];
    return stablecoins.includes(currency.toUpperCase());
  };

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
                width={96}
                height={96}
                className="w-full h-full"
                priority="medium"
                placeholder="skeleton"
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
                  <div className="flex gap-1">
                    {product.trust.verified && (
                      <AnimatedTrustIndicator type="verified" label="Verified" />
                    )}
                    {product.trust.escrowProtected && (
                      <AnimatedTrustIndicator type="escrow" label="Escrow" />
                    )}
                    {product.trust.onChainCertified && (
                      <AnimatedTrustIndicator type="onchain" label="On-Chain" />
                    )}
                    {product.seller.daoApproved && (
                      <AnimatedTrustIndicator type="dao" label="DAO" />
                    )}
                  </div>
                )}
              </div>

              <h3 className="font-semibold text-lg text-white mb-1 truncate">
                {product.title}
              </h3>

              {/* Product metadata */}
              <div className="flex flex-wrap gap-2 mb-2">
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
                {product.isFeatured && (
                  <AnimatedProductBadge variant="warning" size="sm">
                    Featured
                  </AnimatedProductBadge>
                )}
                {/* Quality Score Badge */}
                {product.metadata?.qualityScore && product.metadata.qualityScore > 80 && (
                  <AnimatedProductBadge variant="success" size="sm">
                    High Quality
                  </AnimatedProductBadge>
                )}
              </div>

              <p className="text-white/70 text-sm mb-3 line-clamp-2">
                {product.description}
              </p>

              {/* Shipping info */}
              {shippingInfo.length > 0 && (
                <div className="text-xs text-white/60 mb-2">
                  {shippingInfo.join(' • ')}
                </div>
              )}

              {/* Discount badge */}
              {product.discount?.active && product.discount.percentage && (
                <div className="mb-2">
                  <AnimatedProductBadge variant="error" size="sm">
                    {product.discount.percentage}% OFF
                  </AnimatedProductBadge>
                </div>
              )}

              {/* Auction Badge for List View */}
              {isAuction && (
                <div className="mb-2">
                  <AnimatedProductBadge variant="warning" size="sm">
                    AUCTION
                  </AnimatedProductBadge>
                </div>
              )}

              <div className="flex items-center justify-between">
                {isAuction ? (
                  <div className="flex flex-col">
                    <span className="text-white font-bold">
                      {highestBid ? `${highestBid} ${product.price.currency}` : `${product.price.amount} ${product.price.currency}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-white/70">Ends in:</span>
                      {endTime ? (
                        <AuctionTimer endTime={endTime} className="text-sm" />
                      ) : (
                        <span className="text-sm text-white/70">{timeRemaining}</span>
                      )}
                    </div>
                  </div>
                ) : isStablecoin(priceDisplayData.cryptoSymbol) ? (
                  <StablecoinPricing
                    price={priceDisplayData.crypto}
                    symbol={priceDisplayData.cryptoSymbol}
                    size="sm"
                    layout="horizontal"
                  />
                ) : (
                  <DualPricing
                    cryptoPrice={priceDisplayData.crypto}
                    cryptoSymbol={priceDisplayData.cryptoSymbol}
                    fiatPrice={priceDisplayData.fiat}
                    fiatSymbol={priceDisplayData.fiatSymbol}
                    size="sm"
                    layout="horizontal"
                  />
                )}

                <div className="flex gap-2">
                  {isAuction ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onBidClick && onBidClick(product.id)}
                    >
                      Place Bid
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAddToCart}
                        disabled={product.inventory === 0 || isAddingToCart}
                      >
                        {isAddingToCart ? 'Adding...' : isInCart ? `In Cart (${cartItem?.quantity || 0})` : 'Add to Cart'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleWishlistToggle}
                      >
                        {isWishlisted ? '❤️' : '🤍'}
                      </Button>
                    </>
                  )}
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
            width={400}
            height={300}
            className="w-full h-full"
            priority={product.isFeatured ? "high" : "medium"}
            placeholder="skeleton"
            preload={product.isFeatured}
            onLoad={() => {
              // Preload additional images for this product
              if (product.images.length > 1) {
                product.images.slice(1, 3).forEach(imageUrl => {
                  const img = new Image();
                  img.src = imageUrl;
                });
              }
            }}
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

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {/* NFT badge */}
            {product.isNFT && (
              <AnimatedProductBadge variant="secondary" size="sm">
                NFT
              </AnimatedProductBadge>
            )}

            {/* Discount badge */}
            {product.discount?.active && product.discount.percentage && (
              <AnimatedProductBadge variant="error" size="sm">
                {product.discount.percentage}% OFF
              </AnimatedProductBadge>
            )}

            {/* Featured badge */}
            {product.isFeatured && (
              <AnimatedProductBadge variant="warning" size="sm">
                Featured
              </AnimatedProductBadge>
            )}

            {/* Quality Score Badge */}
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
        <div className="p-4">
          {/* Seller and Trust Indicators */}
          <div className="flex items-center justify-between mb-3">
            <SellerBadge
              seller={product.seller}
              onClick={() => onSellerClick?.(product.seller.id)}
            />
            {showTrustIndicators && (
              <div className="flex gap-1">
                {product.trust.verified && (
                  <AnimatedTrustIndicator type="verified" label="Verified" />
                )}
                {product.trust.escrowProtected && (
                  <AnimatedTrustIndicator type="escrow" label="Escrow" />
                )}
                {product.trust.onChainCertified && (
                  <AnimatedTrustIndicator type="onchain" label="On-Chain" />
                )}
                {product.seller.daoApproved && (
                  <AnimatedTrustIndicator type="dao" label="DAO" />
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-lg text-white mb-2 line-clamp-2">
            {product.title}
          </h3>

          {/* Product metadata */}
          <div className="flex flex-wrap gap-1 mb-2">
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
            {/* Certification badges */}
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
            <div className="text-xs text-white/60 mb-3">
              {shippingInfo.join(' • ')}
            </div>
          )}

          {/* Pricing */}
          <div className="mb-4">
            {isStablecoin(priceDisplayData.cryptoSymbol) ? (
              <StablecoinPricing
                price={priceDisplayData.crypto}
                symbol={priceDisplayData.cryptoSymbol}
                size="md"
                layout="vertical"
              />
            ) : (
              <DualPricing
                cryptoPrice={priceDisplayData.crypto}
                cryptoSymbol={priceDisplayData.cryptoSymbol}
                fiatPrice={priceDisplayData.fiat}
                fiatSymbol={priceDisplayData.fiatSymbol}
                size="md"
                layout="vertical"
                realTimeConversion
              />
            )}
          </div>

          {/* Engagement metrics */}
          <div className="mb-4">
            <AnimatedEngagementMetrics
              views={product.views || 0}
              favorites={product.favorites || 0}
            />
          </div>

          {/* Auction Badge */}
          {isAuction && (
            <div className="mb-3">
              <AnimatedProductBadge variant="warning" size="sm">
                AUCTION
              </AnimatedProductBadge>
            </div>
          )}

          {/* Auction Info */}
          {isAuction && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/70 text-sm">Current Bid</span>
                <span className="text-white font-bold">
                  {highestBid ? `${highestBid} ${product.price.currency}` : `${product.price.amount} ${product.price.currency}`}
                </span>
              </div>
              {reservePrice && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/70 text-sm">Reserve Price</span>
                  <span className="text-white">{reservePrice} {product.price.currency}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-white/70 text-sm">Ends in</span>
                {endTime ? (
                  <AuctionTimer endTime={endTime} />
                ) : (
                  <span className="font-bold text-white">{timeRemaining}</span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isAuction ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onBidClick && onBidClick(product.id)}
                className="flex-1"
              >
                Place Bid
              </Button>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleProductClick}
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
                  disabled={product.inventory === 0 || isAddingToCart}
                >
                  {isAddingToCart ? 'Adding...' : isInCart ? `In Cart (${cartItem?.quantity || 0})` : 'Add to Cart'}
                </Button>
              </>
            )}
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
};

export default ProductCard;