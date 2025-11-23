/**
 * QuickViewModal Component - Modal for quick product preview
 * Displays detailed product information in a modal overlay with enhanced features
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DualPricing } from '../../../design-system/components/DualPricing';
import { TrustIndicators } from '../../../design-system/components/TrustIndicators';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { Button } from '../../../design-system/components/Button';
import { designTokens } from '../../../design-system/tokens';
import { 
  AnimatedProductBadge, 
  AnimatedSellerBadge, 
  AnimatedEngagementMetrics, 
  AnimatedTrustIndicator,
  AnimatedPriceDisplay
} from '../../../components/VisualPolish/MarketplaceAnimations';
import { 
  Heart, Share2, ZoomIn, ZoomOut, 
  ChevronLeft, ChevronRight, 
  Star, Shield, CheckCircle, Vote,
  Truck, Calendar, Award, Wrench,
  Eye, BarChart2, TrendingUp
} from 'lucide-react';

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
    tier?: 'basic' | 'premium' | 'enterprise';
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
    warranty?: {
      duration: number;
      type: 'manufacturer' | 'seller' | 'extended';
      terms?: string;
    };
  };
  tags: string[];
}

interface QuickViewModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (productId: string) => void;
  onAddToWishlist?: (productId: string) => void;
  onSellerClick?: (sellerId: string) => void;
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
        <div className="absolute inset-0 bg-white/10 animate-pulse rounded-lg" />
      )}
      
      {error ? (
        <div className="w-full h-full flex items-center justify-center text-white/60 bg-white/5 rounded-lg">
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

const SellerInfo: React.FC<{ 
  seller: Product['seller']; 
  onClick?: () => void;
}> = ({ seller, onClick }) => {
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
    <div 
      className="flex items-center gap-3 cursor-pointer group"
      onClick={onClick}
    >
      <div className="w-12 h-12 rounded-full overflow-hidden">
        <OptimizedImage
          src={seller.avatar}
          alt={seller.name}
          className="w-full h-full"
        />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-white group-hover:text-white/80 transition-colors">
            {seller.name}
          </span>
          {seller.verified && <span className="text-sm">✅</span>}
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
        <div className="flex items-center gap-2 text-sm text-white/60">
          <span>⭐ {seller.reputation}</span>
          <span>•</span>
          <span className="capitalize">{seller.tier || 'basic'}</span>
        </div>
      </div>
    </div>
  );
};

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onAddToWishlist,
  onSellerClick,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });

  const handleAddToCart = () => {
    onAddToCart?.(product.id);
  };

  const handleWishlistToggle = () => {
    setIsWishlisted(!isWishlisted);
    onAddToWishlist?.(product.id);
  };

  const handleSellerClick = () => {
    onSellerClick?.(product.seller.id);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 1));
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setImagePosition({ x, y });
    }
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
  };

  // Format shipping information
  const shippingInfo = [];
  if (product.shipping?.freeShipping) {
    shippingInfo.push('Free shipping');
  }
  if (product.shipping?.handlingTime !== undefined) {
    if (product.shipping.handlingTime <= 1) {
      shippingInfo.push('Ships same day');
    } else if (product.shipping.handlingTime <= 2) {
      shippingInfo.push('Ships in 1-2 days');
    } else {
      shippingInfo.push(`Ships in ${product.shipping.handlingTime} days`);
    }
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative z-10 w-full max-w-6xl max-h-[90vh] overflow-y-auto"
          >
            <GlassPanel variant="primary" className="rounded-xl overflow-hidden">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                style={{
                  background: designTokens.glassmorphism.primary.background,
                  backdropFilter: designTokens.glassmorphism.primary.backdropFilter,
                  border: designTokens.glassmorphism.primary.border,
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
                {/* Product Images */}
                <div className="space-y-4">
                  {/* Main image with zoom */}
                  <div 
                    className="relative aspect-square rounded-lg overflow-hidden cursor-pointer"
                    onClick={handleImageClick}
                  >
                    <div 
                      className="w-full h-full"
                      style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: `${imagePosition.x * 100}% ${imagePosition.y * 100}%`,
                        transition: zoomLevel > 1 ? 'transform 0.2s ease' : 'none'
                      }}
                    >
                      <OptimizedImage
                        src={product.images[currentImageIndex]}
                        alt={product.title}
                        className="w-full h-full"
                      />
                    </div>
                    
                    {/* Zoom controls */}
                    <div className="absolute top-3 right-3 flex flex-col gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleZoomIn();
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-black/30 hover:bg-black/50 transition-colors"
                      >
                        <ZoomIn size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleZoomOut();
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-black/30 hover:bg-black/50 transition-colors"
                      >
                        <ZoomOut size={16} />
                      </button>
                      {zoomLevel > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResetZoom();
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-black/30 hover:bg-black/50 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>

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
                    </div>
                  </div>

                  {/* Thumbnail images */}
                  {product.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {product.images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                            currentImageIndex === index 
                              ? 'ring-2 ring-white' 
                              : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          <OptimizedImage
                            src={image}
                            alt={`${product.title} ${index + 1}`}
                            className="w-full h-full"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleWishlistToggle}
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      {isWishlisted ? <Heart size={16} fill="currentColor" /> : <Heart size={16} />}
                      Wishlist
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <Share2 size={16} />
                      Share
                    </Button>
                  </div>
                </div>

                {/* Product Details */}
                <div className="space-y-6">
                  {/* Title and pricing */}
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">{product.title}</h2>
                    <div className="mb-4">
                      <AnimatedPriceDisplay
                        cryptoPrice={product.price.crypto}
                        cryptoSymbol={product.price.cryptoSymbol}
                        fiatPrice={product.price.fiat}
                        fiatSymbol={product.price.fiatSymbol}
                      />
                    </div>
                  </div>

                  {/* Seller info */}
                  <SellerInfo seller={product.seller} onClick={handleSellerClick} />

                  {/* Trust indicators */}
                  <div>
                    <h3 className="text-sm font-medium text-white/80 mb-2">Trust & Protection</h3>
                    <div className="flex flex-wrap gap-2">
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
                  </div>

                  {/* Product metadata */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {product.condition && (
                      <div>
                        <div className="text-white/60 flex items-center gap-1">
                          <span>Condition</span>
                        </div>
                        <div className="text-white capitalize">{product.condition}</div>
                      </div>
                    )}
                    {product.brand && (
                      <div>
                        <div className="text-white/60 flex items-center gap-1">
                          <span>Brand</span>
                        </div>
                        <div className="text-white">{product.brand}</div>
                      </div>
                    )}
                    {product.inventory !== undefined && (
                      <div>
                        <div className="text-white/60 flex items-center gap-1">
                          <span>Availability</span>
                        </div>
                        <div className={`font-medium ${product.inventory > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {product.inventory > 0 ? `${product.inventory} in stock` : 'Out of stock'}
                        </div>
                      </div>
                    )}
                    {product.hasWarranty && product.metadata?.warranty && (
                      <div>
                        <div className="text-white/60 flex items-center gap-1">
                          <Wrench size={14} />
                          <span>Warranty</span>
                        </div>
                        <div className="text-white">
                          {product.metadata.warranty.duration} months {product.metadata.warranty.type}
                        </div>
                      </div>
                    )}
                    {product.metadata?.qualityScore && (
                      <div>
                        <div className="text-white/60 flex items-center gap-1">
                          <Award size={14} />
                          <span>Quality Score</span>
                        </div>
                        <div className="text-white">{product.metadata.qualityScore}/100</div>
                      </div>
                    )}
                  </div>

                  {/* Shipping info */}
                  {shippingInfo.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-white/80 mb-2 flex items-center gap-1">
                        <Truck size={14} />
                        <span>Shipping</span>
                      </h3>
                      <div className="text-white">
                        {shippingInfo.join(' • ')}
                      </div>
                      {product.shipping?.shipsFrom && (
                        <div className="text-white/60 text-sm mt-1">
                          Ships from {product.shipping.shipsFrom.city || product.shipping.shipsFrom.state || product.shipping.shipsFrom.country}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <h3 className="text-sm font-medium text-white/80 mb-2">Description</h3>
                    <p className="text-white/90">{product.description}</p>
                  </div>

                  {/* Metadata details */}
                  {(product.metadata?.weight || product.metadata?.dimensions || product.metadata?.materials || product.metadata?.certifications) && (
                    <div>
                      <h3 className="text-sm font-medium text-white/80 mb-2">Details</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {product.metadata?.weight && (
                          <div>
                            <div className="text-white/60">Weight</div>
                            <div className="text-white">{product.metadata.weight}g</div>
                          </div>
                        )}
                        {product.metadata?.dimensions && (
                          <div>
                            <div className="text-white/60">Dimensions</div>
                            <div className="text-white">
                              {product.metadata.dimensions.length} × {product.metadata.dimensions.width} × {product.metadata.dimensions.height} cm
                            </div>
                          </div>
                        )}
                        {product.metadata?.materials && (
                          <div className="col-span-2">
                            <div className="text-white/60">Materials</div>
                            <div className="text-white">{product.metadata.materials.join(', ')}</div>
                          </div>
                        )}
                        {product.metadata?.certifications && (
                          <div className="col-span-2">
                            <div className="text-white/60">Certifications</div>
                            <div className="flex flex-wrap gap-1">
                              {product.metadata.certifications.map((cert, index) => (
                                <AnimatedProductBadge key={index} variant="info" size="sm">
                                  {cert}
                                </AnimatedProductBadge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Engagement metrics */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-white/5">
                      <div className="flex items-center justify-center gap-1 text-white/60">
                        <Eye size={16} />
                        <span className="text-xs">Views</span>
                      </div>
                      <div className="text-white font-medium">{product.views || 0}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <div className="flex items-center justify-center gap-1 text-white/60">
                        <Heart size={16} />
                        <span className="text-xs">Favorites</span>
                      </div>
                      <div className="text-white font-medium">{product.favorites || 0}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <div className="flex items-center justify-center gap-1 text-white/60">
                        <BarChart2 size={16} />
                        <span className="text-xs">Popularity</span>
                      </div>
                      <div className="text-white font-medium">
                        {product.views && product.favorites ? 
                          Math.round((product.views + product.favorites * 2) / 100) : 0}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {product.tags && product.tags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-white/80 mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {product.tags.map((tag, index) => (
                          <AnimatedProductBadge key={index} variant="secondary" size="sm">
                            {tag}
                          </AnimatedProductBadge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-3 pt-4">
                    <div className="flex gap-3">
                      <div className="flex items-center border rounded-lg overflow-hidden">
                        <button
                          onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                          className="px-3 py-2 text-white hover:bg-white/10 transition-colors"
                          disabled={product.inventory === 0}
                        >
                          -
                        </button>
                        <span className="px-4 py-2 text-white">{selectedQuantity}</span>
                        <button
                          onClick={() => setSelectedQuantity(Math.min(product.inventory || 10, selectedQuantity + 1))}
                          className="px-3 py-2 text-white hover:bg-white/10 transition-colors"
                          disabled={product.inventory === 0}
                        >
                          +
                        </button>
                      </div>
                      
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handleAddToCart}
                        className="flex-1"
                        disabled={product.inventory === 0}
                      >
                        {product.inventory === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </Button>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleWishlistToggle}
                      disabled={product.inventory === 0}
                      className="flex items-center justify-center gap-2"
                    >
                      {isWishlisted ? <Heart size={16} fill="currentColor" /> : <Heart size={16} />}
                      {isWishlisted ? 'Added to Wishlist' : 'Add to Wishlist'}
                    </Button>
                  </div>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QuickViewModal;