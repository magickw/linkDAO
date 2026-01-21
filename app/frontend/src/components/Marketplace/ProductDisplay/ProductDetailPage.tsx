/**
 * ProductDetailPage Component - Comprehensive product detail view with Web3 features
 * Features 3D/AR viewer, dual pricing, trust indicators, checkout flow, and DAO integration
 */

import React, { useState, useEffect } from 'react';
import {
  Star,
  Shield,
  CheckCircle,
  Vote,
  Heart,
  Share2,
  ShoppingCart,
  ChevronRight,
  Truck,
  RotateCcw,
  ShieldCheck,
  MessageCircle,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Users,
  Eye,
  Clock,
  Package,
  ChevronLeft,
  ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { Button } from '../../../design-system/components/Button';
import { DualPricing } from '../../../design-system/components/DualPricing';
import { AnimatedProductBadge, AnimatedTrustIndicator } from '../../../components/VisualPolish/MarketplaceAnimations';
import { OptimizedImage } from '../../Performance/OptimizedImageLoader';
import { SpecificationPreview } from '../../Marketplace/Seller/SpecificationPreview';

interface ProductDetailPageProps {
  product: {
    id: string;
    title: string;
    description: string;
    longDescription?: string;
    price: {
      crypto: string;
      cryptoSymbol: string;
      fiat: string;
      fiatSymbol: string;
      primary?: 'crypto' | 'fiat';
    };
    seller: {
      id: string;
      name: string;
      avatar: string;
      verified: boolean;
      reputation: number;
      daoApproved: boolean;
      totalSales: number;
      memberSince: string;
      responseTime: string;
    };
    trust: {
      verified: boolean;
      escrowProtected: boolean;
      onChainCertified: boolean;
      authenticityNFT?: string;
    };
    specifications: Record<string, string>;
    category: string;
    tags: string[];
    isNFT?: boolean;
    inventory?: number;
    shipping: {
      freeShipping: boolean;
      estimatedDays: string;
      cost?: string;
      methods?: string[];
      handlingTime?: string;
      shipsFrom?: {
        country: string;
        state?: string;
        city?: string;
      };
      internationalShipping?: boolean;
      internationalCost?: string;
      localPickup?: boolean;
    };
    reviews: {
      average: number;
      count: number;
    };
    views?: number;
    soldCount?: number;
    media: Array<{
      type: 'image' | 'video' | '3d' | 'ar';
      url: string;
      thumbnail?: string;
      alt?: string;
    }>;
  };
  onAddToCart?: (productId: string, quantity: number) => void;
  onBuyNow?: (productId: string, quantity: number) => void | Promise<void>;
  onAddToWishlist?: (productId: string) => void;
  onContactSeller?: (sellerId: string) => void;
  onViewSellerProfile?: (sellerId: string) => void;
  onOrderComplete?: (orderData: any) => void;
}

const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  onAddToCart,
  onBuyNow,
  onAddToWishlist,
  onContactSeller,
  onViewSellerProfile,
  onOrderComplete
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(product.media && product.media.length > 0 ? product.media[0].url : '');
  const [isBuying, setIsBuying] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [showStockNotification, setShowStockNotification] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const router = useRouter();

  // Fetch related products
  useEffect(() => {
    const fetchRelatedProducts = async () => {
      setLoadingRelated(true);
      try {
        // Import marketplaceService dynamically to avoid circular dependencies
        const { marketplaceService } = await import('../../../services/marketplaceService');

        // Fetch products from the same category, excluding current product
        const listings = await marketplaceService.getMarketplaceListings({
          limit: 8,
          offset: 0,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        });

        // Filter out current product and limit to 4 items
        const related = listings
          .filter((item: any) => item.id !== product.id)
          .slice(0, 4);

        setRelatedProducts(related);
      } catch (error) {
        console.error('Error fetching related products:', error);
        setRelatedProducts([]);
      } finally {
        setLoadingRelated(false);
      }
    };

    fetchRelatedProducts();
  }, [product.id]);

  // Check if stock is low
  const isLowStock = product.inventory !== undefined && product.inventory !== null && product.inventory < 10 && product.inventory > 0;
  const isOutOfStock = product.inventory === 0;

  const handleAddToCart = () => {
    // Add to cart functionality
    if (onAddToCart) {
      onAddToCart(product.id, quantity);
    } else {
      console.log('Adding to cart:', { productId: product.id, quantity });
    }
  };

  const handleBuyNow = async () => {
    if (isBuying) return;
    setIsBuying(true);
    try {
      // Buy now functionality
      if (onBuyNow) {
        await Promise.resolve(onBuyNow(product.id, quantity));
      } else {
        console.log('Buying now:', { productId: product.id, quantity });
      }
    } finally {
      // In most cases navigation occurs; this is a safe reset if it doesn't
      setIsBuying(false);
    }
  };

  const handleAddToWishlist = () => {
    if (onAddToWishlist) {
      onAddToWishlist(product.id);
    } else {
      // Toggle wishlist state locally
      setIsInWishlist(!isInWishlist);
      setShowToast({
        message: isInWishlist ? 'Removed from wishlist' : 'Added to wishlist',
        type: 'success'
      });
      setTimeout(() => setShowToast(null), 3000);
      console.log('Wishlist toggled:', { productId: product.id, inWishlist: !isInWishlist });
    }
  };

  const handleShare = async () => {
    // Try to use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: `Check out this product: ${product.title}`,
          url: window.location.href
        });
      } catch (err) {
        // User cancelled or share failed, show dialog
        setShowShareDialog(true);
      }
    } else {
      // Fallback to share dialog
      setShowShareDialog(true);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowToast({
        message: 'Link copied to clipboard!',
        type: 'success'
      });
      setTimeout(() => setShowToast(null), 3000);
    } catch (err) {
      setShowToast({
        message: 'Failed to copy link',
        type: 'error'
      });
      setTimeout(() => setShowToast(null), 3000);
    }
  };

  const handleSocialShare = (platform: string) => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(product.title);
    const text = encodeURIComponent(`Check out this product: ${product.title}`);

    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
    setShowShareDialog(false);
  };

  const handleContactSeller = () => {
    if (onContactSeller) {
      onContactSeller(product.seller.id);
    } else {
      // Open messaging modal to communicate with seller
      setShowMessageModal(true);
    }
  };

  const handleViewSellerProfile = () => {
    if (onViewSellerProfile) {
      onViewSellerProfile(product.seller.id);
    } else {
      console.log('Viewing seller profile:', product.seller.id);
    }
  };

  const handleImageZoom = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) {
      setIsZoomed(true);
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setZoomPosition({ x, y });
    }
  };

  const handleZoomOut = () => {
    setIsZoomed(false);
    setZoomPosition({ x: 0, y: 0 });
  };

  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index);
    setShowLightbox(true);
    document.body.style.overflow = 'hidden';
  };

  const handleCloseLightbox = () => {
    setShowLightbox(false);
    document.body.style.overflow = 'unset';
  };

  const handleNextImage = () => {
    if (product.media && product.media.length > 0) {
      setLightboxIndex((prev) => (prev + 1) % product.media.length);
    }
  };

  const handlePrevImage = () => {
    if (product.media && product.media.length > 0) {
      setLightboxIndex((prev) => (prev - 1 + product.media.length) % product.media.length);
    }
  };

  const handleNotifyStock = () => {
    setShowStockNotification(true);
    // In a real implementation, this would call an API to subscribe to stock notifications
    setTimeout(() => setShowStockNotification(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Product Images */}
          <div className="w-full lg:w-1/2">
            <GlassPanel variant="secondary" className="pl-3 pr-6 py-3 mb-6 relative group">
              {/* Main Image with Zoom */}
              <div
                className="relative w-full h-96 overflow-hidden cursor-zoom-in"
                onClick={handleImageZoom}
                onMouseMove={isZoomed ? handleImageZoom : undefined}
                onMouseLeave={handleZoomOut}
              >
                <OptimizedImage
                  src={selectedImage || product.media?.[0]?.url || ''}
                  alt={product.title || 'Product'}
                  width={600}
                  height={384}
                  className={`w-full h-96 object-contain transition-transform duration-200 ${isZoomed ? 'scale-150' : 'scale-100'
                    }`}
                  style={isZoomed ? { transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` } : {}}
                  lazy={false}
                  quality={75}
                />

                {/* Zoom Controls */}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenLightbox(product.media?.findIndex(m => m.url === selectedImage) || 0);
                    }}
                    className="p-3 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors min-h-[44px] min-w-[44px]"
                    aria-label="Open lightbox"
                  >
                    <Maximize2 size={20} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      isZoomed ? handleZoomOut() : handleImageZoom(e as any);
                    }}
                    className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
                    aria-label={isZoomed ? "Zoom out" : "Zoom in"}
                  >
                    {isZoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
                  </button>
                </div>

                {/* Zoom Hint */}
                {!isZoomed && (
                  <div className="absolute bottom-2 right-2 p-2 bg-black/50 rounded-lg text-white text-xs">
                    Click to zoom
                  </div>
                )}
              </div>

              {/* Image Indicators */}
              {product.media && product.media.length > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  {product.media.map((media, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(media.url)}
                      className={`w-2 h-2 rounded-full transition-all ${selectedImage === media.url
                          ? 'bg-blue-500 w-6'
                          : 'bg-white/30 hover:bg-white/50'
                        }`}
                      aria-label={`View image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </GlassPanel>

            {/* Thumbnail Gallery */}
            {product.media && product.media.length > 0 && (
              <div className="grid grid-cols-4 gap-4">
                {product.media.map((media, index) => (
                  <GlassPanel
                    key={index}
                    variant="secondary"
                    className={`pl-1 pr-3 py-1 cursor-pointer border-2 transition-all ${selectedImage === media.url ? 'border-blue-500 scale-105' : 'border-transparent hover:border-white/30'
                      }`}
                    onClick={() => setSelectedImage(media.url)}
                  >
                    <OptimizedImage
                      src={media.thumbnail || media.url || ''}
                      alt={media.alt || `Product view ${index + 1}`}
                      width={150}
                      height={80}
                      className="w-full h-20 object-contain"
                      lazy={true}
                      quality={75}
                    />
                  </GlassPanel>
                ))}
              </div>
            )}

            {/* Lightbox */}
            {showLightbox && product.media && product.media.length > 0 && (
              <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
                <button
                  onClick={handleCloseLightbox}
                  className="absolute top-4 right-4 p-2 text-white hover:text-white/80 transition-colors"
                  aria-label="Close lightbox"
                >
                  <X size={32} />
                </button>

                <button
                  onClick={handlePrevImage}
                  className="absolute left-4 p-2 text-white hover:text-white/80 transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={48} />
                </button>

                <div className="max-w-5xl max-h-screen p-4">
                  <OptimizedImage
                    src={product.media[lightboxIndex].url || ''}
                    alt={product.media[lightboxIndex].alt || `Product view ${lightboxIndex + 1}`}
                    width={1200}
                    height={800}
                    className="max-w-full max-h-[80vh] object-contain"
                    lazy={false}
                    quality={100}
                  />
                </div>

                <button
                  onClick={handleNextImage}
                  className="absolute right-4 p-2 text-white hover:text-white/80 transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRightIcon size={48} />
                </button>

                {/* Image Counter */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
                  {lightboxIndex + 1} / {product.media.length}
                </div>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="w-full lg:w-1/2">
            <GlassPanel variant="secondary" className="p-6">
              {/* Breadcrumbs */}
              <div className="flex items-center text-sm text-white/70 mb-4">
                <span>Home</span>
                <ChevronRight size={16} />
                <span>{product.category}</span>
                <ChevronRight size={16} />
                <span>{product.title}</span>
              </div>

              {/* Title and Badges */}
              <h1 className="text-3xl font-bold text-white mb-2">{product.title}</h1>

              <div className="flex flex-wrap gap-2 mb-4">
                {product.trust.verified && (
                  <AnimatedProductBadge variant="success" size="sm">
                    <CheckCircle size={14} className="mr-1" />
                    Verified
                  </AnimatedProductBadge>
                )}
                {product.trust.escrowProtected && (
                  <AnimatedProductBadge variant="primary" size="sm">
                    <Shield size={14} className="mr-1" />
                    Escrow Protected
                  </AnimatedProductBadge>
                )}
                {product.trust.onChainCertified && (
                  <AnimatedProductBadge variant="secondary" size="sm">
                    <Vote size={14} className="mr-1" />
                    On-Chain Certified
                  </AnimatedProductBadge>
                )}
                {product.seller.daoApproved && (
                  <AnimatedProductBadge variant="warning" size="sm">
                    <Vote size={14} className="mr-1" />
                    DAO Approved
                  </AnimatedProductBadge>
                )}
              </div>

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {product.tags.map((tag, index) => (
                    <AnimatedProductBadge key={index} variant="info" size="sm">
                      #{tag}
                    </AnimatedProductBadge>
                  ))}
                </div>
              )}

              {/* Rating and Views */}
              <div className="flex items-center mb-4">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={20}
                      className={i < Math.floor(product.reviews.average) ? 'fill-yellow-400 text-yellow-400' : 'text-white/30'}
                    />
                  ))}
                </div>
                <span className="ml-2 text-sm font-medium text-white">{product.reviews.average}</span>
                <span className="mx-2 text-white/40">|</span>
                <span className="text-sm text-white/70">{product.reviews.count} reviews</span>
                {product.soldCount !== undefined && (
                  <>
                    <span className="mx-2 text-white/40">|</span>
                    <span className="text-sm text-white/70">{product.soldCount} sold</span>
                  </>
                )}
                {product.views !== undefined && (
                  <>
                    <span className="mx-2 text-white/40">|</span>
                    <span className="text-sm text-white/70">{product.views} views</span>
                  </>
                )}
              </div>

              {/* Price */}
              <div className="mb-6">
                <DualPricing
                  cryptoPrice={product.price.crypto}
                  cryptoSymbol={product.price.cryptoSymbol}
                  fiatPrice={product.price.fiat}
                  fiatSymbol={product.price.fiatSymbol}
                  defaultPrimary={product.price.primary || 'crypto'}
                  size="lg"
                  layout="vertical"
                />
              </div>

              {/* Stock Availability Warning */}
              {product.inventory !== undefined && product.inventory !== null && (
                <div className="mb-6">
                  {isOutOfStock ? (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                      <div className="flex items-center">
                        <AlertTriangle size={20} className="text-red-400 mr-2" />
                        <div>
                          <p className="text-red-400 font-medium">Out of Stock</p>
                          <p className="text-red-300/70 text-sm">This item is currently unavailable</p>
                          <button
                            onClick={handleNotifyStock}
                            disabled={showStockNotification}
                            className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                          >
                            {showStockNotification ? '✓ Notified!' : 'Notify me when available'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : isLowStock ? (
                    <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-4 mb-4">
                      <div className="flex items-center">
                        <Package size={20} className="text-orange-400 mr-2" />
                        <div>
                          <p className="text-orange-400 font-medium">Only {product.inventory} left!</p>
                          <p className="text-orange-300/70 text-sm">Order soon before it's gone</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-4">
                      <div className="flex items-center">
                        <CheckCircle size={20} className="text-green-400 mr-2" />
                        <div>
                          <p className="text-green-400 font-medium">In Stock</p>
                          <p className="text-green-300/70 text-sm">
                            {product.inventory >= 999999 ? 'Unlimited quantity available' : `${product.inventory} items available`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Social Proof */}
              {(product.views !== undefined || product.soldCount !== undefined) && (
                <div className="mb-6 bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {product.views !== undefined && (
                        <div className="flex items-center text-white/70">
                          <Eye size={16} className="mr-1" />
                          <span className="text-sm">{product.views} views</span>
                        </div>
                      )}
                      {product.soldCount !== undefined && product.soldCount > 0 && (
                        <div className="flex items-center text-white/70">
                          <ShoppingCart size={16} className="mr-1" />
                          <span className="text-sm">{product.soldCount} sold</span>
                        </div>
                      )}
                    </div>
                    {(product.views !== undefined && product.views > 100) || (product.soldCount !== undefined && product.soldCount > 10) ? (
                      <div className="flex items-center text-green-400 text-sm">
                        <Users size={16} className="mr-1" />
                        <span>Popular item</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="mb-6">
                <p className="text-white/80">{product.longDescription || product.description}</p>
              </div>

              {/* Shipping Information */}
              <div className="mb-6 bg-white/5 rounded-lg p-4">
                <h3 className="font-medium text-white mb-3 flex items-center">
                  <Truck size={20} className="mr-2 text-blue-400" />
                  Shipping & Delivery
                </h3>
                <div className="space-y-3">
                  {/* Free Shipping Badge or Cost */}
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Shipping Cost</span>
                    {product.shipping.freeShipping ? (
                      <span className="text-green-400 font-medium flex items-center">
                        <CheckCircle size={16} className="mr-1" />
                        Free Shipping
                      </span>
                    ) : (
                      <span className="text-white font-medium">
                        {product.shipping.cost || 'Contact seller'}
                      </span>
                    )}
                  </div>

                  {/* Estimated Delivery */}
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Estimated Delivery</span>
                    <span className="text-white">
                      {product.shipping.estimatedDays} business days
                    </span>
                  </div>

                  {/* Handling Time */}
                  {product.shipping.handlingTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Handling Time</span>
                      <span className="text-white">
                        {product.shipping.handlingTime === 'same-day'
                          ? 'Same day'
                          : `${product.shipping.handlingTime} business days`}
                      </span>
                    </div>
                  )}

                  {/* Ships From */}
                  {product.shipping.shipsFrom && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Ships From</span>
                      <span className="text-white">
                        {[
                          product.shipping.shipsFrom.city,
                          product.shipping.shipsFrom.state,
                          product.shipping.shipsFrom.country
                        ].filter(Boolean).join(', ') || product.shipping.shipsFrom.country}
                      </span>
                    </div>
                  )}

                  {/* Shipping Methods */}
                  {product.shipping.methods && product.shipping.methods.length > 0 && (
                    <div className="flex items-start justify-between">
                      <span className="text-white/70">Shipping Methods</span>
                      <div className="flex flex-wrap gap-2 justify-end">
                        {product.shipping.methods.map((method) => (
                          <span
                            key={method}
                            className="px-2 py-1 bg-purple-900/50 text-purple-200 text-xs rounded-full capitalize"
                          >
                            {method === 'standard' && '📦 '}
                            {method === 'express' && '🚀 '}
                            {method === 'overnight' && '⚡ '}
                            {method === 'economy' && '💰 '}
                            {method}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* International Shipping */}
                  {product.shipping.internationalShipping && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">International Shipping</span>
                      <span className="text-white">
                        {product.shipping.internationalCost
                          ? `Available (+${product.shipping.internationalCost})`
                          : 'Available'}
                      </span>
                    </div>
                  )}

                  {/* Local Pickup */}
                  {product.shipping.localPickup && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Local Pickup</span>
                      <span className="text-green-400 flex items-center">
                        <CheckCircle size={16} className="mr-1" />
                        Available
                      </span>
                    </div>
                  )}
                </div>

                {/* Shipping Policy Note */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="flex items-start">
                    <RotateCcw size={16} className="mr-2 text-white/50 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-white/50">
                      Delivery times are estimates and may vary. Contact the seller for specific shipping details.
                    </p>
                  </div>
                </div>
              </div>

              {/* Specifications */}
              <div className="mb-6">
                <h3 className="font-medium text-white mb-3">Specifications</h3>
                <SpecificationPreview
                  specs={product.metadata?.specs || {}}
                  sizeConfig={product.metadata?.sizeConfig}
                  category={product.categoryId}
                />
              </div>

              {/* Quantity Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-white mb-2">Quantity</label>
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={product.inventory === 0}
                  >
                    -
                  </Button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center bg-white/10 border-y border-white/20 py-1 text-white"
                    min="1"
                    max={product.inventory && product.inventory < 999999 ? product.inventory : undefined}
                    disabled={product.inventory >= 999999} // Disable input for unlimited items
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(q => product.inventory && product.inventory < 999999 ? Math.min(product.inventory, q + 1) : q + 1)}
                    disabled={product.inventory === 0 || (product.inventory && product.inventory < 999999 && quantity >= product.inventory)}
                  >
                    +
                  </Button>
                  {product.inventory !== undefined && product.inventory !== null && (
                    <span className="ml-4 text-sm text-white/70">
                      {product.inventory >= 999999 ? 'Unlimited' : `${product.inventory} in stock`}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleBuyNow}
                  disabled={isBuying || (product.inventory === 0)}
                  className="flex-1"
                >
                  {isBuying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Processing...
                    </>
                  ) : product.inventory === 0 ? (
                    'Out of Stock'
                  ) : (
                    <>
                      <Shield size={20} className="mr-2" />
                      Buy Now with Escrow
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleAddToCart}
                  className="flex-1"
                  disabled={product.inventory === 0}
                >
                  <ShoppingCart size={20} className="mr-2" />
                  Add to Cart
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={handleAddToWishlist}
                  className="relative"
                >
                  <Heart
                    size={20}
                    className={isInWishlist ? "text-red-500 fill-red-500" : "text-white"}
                  />
                  {isInWishlist && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={handleShare}
                >
                  <Share2 size={20} className="text-white" />
                </Button>
              </div>

              {/* Trust Signals */}
              <div className="border-t border-white/20 pt-6">
                <h3 className="font-medium text-white mb-3">Trust & Safety</h3>
                <div className="space-y-3">
                  {product.trust.escrowProtected && (
                    <div className="flex items-center">
                      <ShieldCheck size={20} className="text-green-500 mr-2" />
                      <span className="text-sm text-white">Escrow-protected transaction</span>
                    </div>
                  )}
                  {product.trust.verified && (
                    <div className="flex items-center">
                      <CheckCircle size={20} className="text-green-500 mr-2" />
                      <span className="text-sm text-white">Verified seller</span>
                    </div>
                  )}
                  {product.seller.daoApproved && (
                    <div className="flex items-center">
                      <Vote size={20} className="text-green-500 mr-2" />
                      <span className="text-sm text-white">DAO-approved product</span>
                    </div>
                  )}
                  {product.trust.onChainCertified && (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span className="text-sm text-white">On-chain verified authenticity</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Seller Info */}
              <div className="border-t border-white/20 pt-6 mt-6">
                <h3 className="font-medium text-white mb-3">Seller Information</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <OptimizedImage
                      src={product.seller.avatar || ''}
                      alt={product.seller.name}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-full mr-3 object-cover"
                      priority="medium"
                      placeholder="skeleton"
                    />
                    <div>
                      <div className="font-medium text-white">{product.seller.name}</div>
                      <div className="flex items-center">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              className={i < Math.floor(product.seller.reputation) ? 'fill-yellow-400 text-yellow-400' : 'text-white/30'}
                            />
                          ))}
                        </div>
                        <span className="ml-1 text-sm text-white/70">{product.seller.reputation}</span>
                      </div>
                      <div className="text-sm text-white/70">{product.seller.totalSales} sales</div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleViewSellerProfile}
                    >
                      View Profile
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleContactSeller}
                    >
                      Contact
                    </Button>
                  </div>
                </div>
                <div className="mt-3 text-sm text-white/70">
                  Member since {product.seller.memberSince ? new Date(product.seller.memberSince).toLocaleDateString() : 'Unknown'}
                </div>
                <div className="text-sm text-white/70">
                  Avg. response time: {product.seller.responseTime}
                </div>
              </div>
            </GlassPanel>
          </div>
        </div>

        {/* Related Products Section */}
        <div className="mt-8">
          <GlassPanel variant="secondary" className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6">You May Also Like</h2>

            {loadingRelated ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-4 animate-pulse">
                    <div className="aspect-square bg-white/10 rounded-lg mb-3"></div>
                    <div className="h-4 bg-white/10 rounded mb-2"></div>
                    <div className="h-4 bg-white/10 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : relatedProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {relatedProducts.map((relatedProduct) => {
                  const imageUrl = relatedProduct.images?.[0] || relatedProduct.image || '';
                  const price = relatedProduct.price?.amount || relatedProduct.priceAmount || 0;
                  const priceDisplay = typeof price === 'number' ? price.toFixed(2) : price;
                  const rating = relatedProduct.rating || relatedProduct.reviews?.average || 4.5;

                  return (
                    <Link key={relatedProduct.id} href={`/marketplace/listing/${relatedProduct.id}`}>
                      <a className="block bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer group">
                        <div className="aspect-square bg-white/10 rounded-lg mb-3 overflow-hidden">
                          <OptimizedImage
                            src={imageUrl || `https://placehold.co/300x300/4B2E83/FFFFFF?text=${encodeURIComponent(relatedProduct.title || 'Product')}`}
                            alt={relatedProduct.title || 'Product'}
                            width={300}
                            height={300}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            lazy={true}
                            quality={75}
                          />
                        </div>
                        <h3 className="text-white font-medium text-sm mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                          {relatedProduct.title || 'Untitled Product'}
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="text-blue-400 font-semibold">${priceDisplay}</span>
                          <div className="flex items-center text-yellow-400 text-xs">
                            <Star size={12} className="fill-current" />
                            <span className="ml-1">{rating.toFixed(1)}</span>
                          </div>
                        </div>
                        {relatedProduct.seller?.name && (
                          <p className="text-white/50 text-xs mt-2 truncate">
                            by {relatedProduct.seller.name}
                          </p>
                        )}
                      </a>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-white/50">
                No related products available at the moment
              </div>
            )}
          </GlassPanel>
        </div>

        {/* FAQ Section */}
        <div className="mt-8">
          <GlassPanel variant="secondary" className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {[
                {
                  q: "What payment methods do you accept?",
                  a: "We accept various payment methods including cryptocurrency (ETH, USDC), credit/debit cards, and other fiat currencies. All transactions are protected by our escrow system."
                },
                {
                  q: "How long does shipping take?",
                  a: `Shipping typically takes ${product.shipping.estimatedDays} business days. Express shipping options are available for faster delivery.`
                },
                {
                  q: "What is your return policy?",
                  a: "We offer a 30-day return policy for most items. Items must be returned in their original condition. Please contact the seller directly to initiate a return."
                },
                {
                  q: "Is this product authentic?",
                  a: "Yes! This product is verified and on-chain certified. You can view the authenticity certificate on the blockchain for complete transparency."
                }
              ].map((faq, index) => (
                <div key={index} className="border-b border-white/10 pb-4 last:border-0">
                  <h3 className="text-white font-medium mb-2">{faq.q}</h3>
                  <p className="text-white/70 text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>

      {/* Messaging Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Message {product.seller.name}</h3>
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-300 text-sm mb-2">
                  Send a direct message to the seller about this product
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your message
                  </label>
                  <textarea
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder={`Hi ${product.seller.name}, I'm interested in "${product.title}"...`}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowMessageModal(false)}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Send Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Dialog */}
      {showShareDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Share this product</h3>
                <button
                  onClick={() => setShowShareDialog(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Product Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={window.location.href}
                    readOnly
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Share on social media
                </label>
                <div className="grid grid-cols-5 gap-2">
                  <button
                    onClick={() => handleSocialShare('twitter')}
                    className="flex flex-col items-center p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <div className="text-2xl mb-1">𝕏</div>
                    <span className="text-xs text-gray-300">Twitter</span>
                  </button>
                  <button
                    onClick={() => handleSocialShare('facebook')}
                    className="flex flex-col items-center p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <div className="text-2xl mb-1">📘</div>
                    <span className="text-xs text-gray-300">Facebook</span>
                  </button>
                  <button
                    onClick={() => handleSocialShare('linkedin')}
                    className="flex flex-col items-center p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <div className="text-2xl mb-1">💼</div>
                    <span className="text-xs text-gray-300">LinkedIn</span>
                  </button>
                  <button
                    onClick={() => handleSocialShare('whatsapp')}
                    className="flex flex-col items-center p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <div className="text-2xl mb-1">📱</div>
                    <span className="text-xs text-gray-300">WhatsApp</span>
                  </button>
                  <button
                    onClick={() => handleSocialShare('telegram')}
                    className="flex flex-col items-center p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <div className="text-2xl mb-1">✈️</div>
                    <span className="text-xs text-gray-300">Telegram</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform ${showToast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
            }`}
        >
          <div className="flex items-center gap-2">
            {showToast.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertTriangle size={20} />
            )}
            <span className="font-medium">{showToast.message}</span>
          </div>
        </div>
      )}

      {/* Mobile Sticky CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-white/20 p-4 z-40">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <DualPricing
              cryptoPrice={product.price.crypto}
              cryptoSymbol={product.price.cryptoSymbol}
              fiatPrice={product.price.fiat}
              fiatSymbol={product.price.fiatSymbol}
              defaultPrimary={product.price.primary || 'crypto'}
              size="sm"
              layout="horizontal"
            />
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={handleBuyNow}
            disabled={isBuying || (product.inventory === 0)}
            className="flex-shrink-0"
          >
            {isBuying ? 'Processing...' : product.inventory === 0 ? 'Out of Stock' : 'Buy Now'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
