/**
 * ProductDetailPage Component - Comprehensive product detail view with Web3 features
 * Features 3D/AR viewer, dual pricing, trust indicators, checkout flow, and DAO integration
 */

import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import { useRouter } from 'next/router';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { Button } from '../../../design-system/components/Button';
import { DualPricing } from '../../../design-system/components/DualPricing';
import { AnimatedProductBadge, AnimatedTrustIndicator } from '../../../components/VisualPolish/MarketplaceAnimations';
import { OptimizedImage } from '../../Performance/OptimizedImageLoader';

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
  const router = useRouter();

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
      console.log('Adding to wishlist:', product.id);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Product Images */}
          <div className="w-full lg:w-1/2">
            <GlassPanel variant="secondary" className="p-4 mb-4">
              <OptimizedImage
                src={selectedImage || product.media?.[0]?.url || ''}
                alt={product.title || 'Product'}
                width={600}
                height={384}
                className="w-full h-96 object-contain"
                priority="high"
                placeholder="skeleton"
                useProductDefault={true}
              />
            </GlassPanel>

            {product.media && product.media.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {product.media.map((media, index) => (
                  <GlassPanel
                    key={index}
                    variant="secondary"
                    className={`p-2 cursor-pointer border-2 ${selectedImage === media.url ? 'border-blue-500' : 'border-transparent'}`}
                    onClick={() => setSelectedImage(media.url)}
                  >
                    <OptimizedImage
                      src={media.thumbnail || media.url || ''}
                      alt={media.alt || `Product view ${index + 1}`}
                      width={150}
                      height={80}
                      className="w-full h-20 object-contain"
                      priority="medium"
                      placeholder="skeleton"
                      useProductDefault={true}
                    />
                  </GlassPanel>
                ))}
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
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-1 border-b border-white/10">
                      <span className="text-white/70">{key}:</span>
                      <span className="text-white">{value}</span>
                    </div>
                  ))}
                </div>
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
                >
                  <Heart size={20} className="text-white" />
                </Button>
                <Button
                  variant="ghost"
                  size="md"
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
    </div>
  );
};

export default ProductDetailPage;
