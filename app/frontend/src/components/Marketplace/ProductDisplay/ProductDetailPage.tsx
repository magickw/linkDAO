/**
 * ProductDetailPage Component - Comprehensive product detail view
 * Features large media viewer, seller info, and trust indicators
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DualPricing } from '../../../design-system/components/DualPricing';
import { TrustIndicators } from '../../../design-system/components/TrustIndicators';
import { LoadingSkeleton } from '../../../design-system/components/LoadingSkeleton';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { Button } from '../../../design-system/components/Button';
import { designTokens } from '../../../design-system/tokens';

interface ProductMedia {
  type: 'image' | 'video' | '3d';
  url: string;
  thumbnail?: string;
  alt?: string;
}

interface ProductDetail {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  media: ProductMedia[];
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
  };
  reviews: {
    average: number;
    count: number;
  };
}

interface MediaViewerProps {
  media: ProductMedia[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

const MediaViewer: React.FC<MediaViewerProps> = ({ 
  media, 
  currentIndex, 
  onIndexChange 
}) => {
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentMedia = media[currentIndex];

  const handleMediaLoad = () => {
    setLoading(false);
  };

  const handlePrevious = () => {
    onIndexChange(currentIndex > 0 ? currentIndex - 1 : media.length - 1);
  };

  const handleNext = () => {
    onIndexChange(currentIndex < media.length - 1 ? currentIndex + 1 : 0);
  };

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  const renderMedia = () => {
    switch (currentMedia.type) {
      case 'video':
        return (
          <video
            ref={videoRef}
            src={currentMedia.url}
            controls
            className="w-full h-full object-cover"
            onLoadedData={handleMediaLoad}
            poster={currentMedia.thumbnail}
          />
        );
      
      case '3d':
        return (
          <div className="w-full h-full flex items-center justify-center bg-black/20">
            <div className="text-center text-white">
              <div className="text-4xl mb-2">🎮</div>
              <p className="text-sm">3D Model Viewer</p>
              <p className="text-xs text-white/60 mt-1">
                Interactive 3D model would load here
              </p>
            </div>
          </div>
        );
      
      default:
        return (
          <img
            src={currentMedia.url}
            alt={currentMedia.alt || 'Product image'}
            className="w-full h-full object-cover"
            onLoad={handleMediaLoad}
          />
        );
    }
  };

  return (
    <>
      <div className="relative">
        <GlassPanel variant="secondary" className="overflow-hidden">
          <div className="relative h-96 lg:h-[500px]">
            {loading && (
              <div className="absolute inset-0">
                <LoadingSkeleton variant="image" height="100%" />
              </div>
            )}
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                {renderMedia()}
              </motion.div>
            </AnimatePresence>

            {/* Navigation arrows */}
            {media.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform"
                  style={{
                    background: designTokens.glassmorphism.primary.background,
                    backdropFilter: designTokens.glassmorphism.primary.backdropFilter,
                    border: designTokens.glassmorphism.primary.border,
                  }}
                >
                  ←
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform"
                  style={{
                    background: designTokens.glassmorphism.primary.background,
                    backdropFilter: designTokens.glassmorphism.primary.backdropFilter,
                    border: designTokens.glassmorphism.primary.border,
                  }}
                >
                  →
                </button>
              </>
            )}

            {/* Fullscreen button */}
            <button
              onClick={toggleFullscreen}
              className="absolute top-4 right-4 w-8 h-8 rounded flex items-center justify-center text-white hover:scale-110 transition-transform"
              style={{
                background: designTokens.glassmorphism.primary.background,
                backdropFilter: designTokens.glassmorphism.primary.backdropFilter,
                border: designTokens.glassmorphism.primary.border,
              }}
            >
              ⛶
            </button>

            {/* Media type indicator */}
            <div 
              className="absolute bottom-4 left-4 px-2 py-1 rounded text-xs font-medium text-white"
              style={{
                background: designTokens.glassmorphism.primary.background,
                backdropFilter: designTokens.glassmorphism.primary.backdropFilter,
              }}
            >
              {currentMedia.type.toUpperCase()} {currentIndex + 1}/{media.length}
            </div>
          </div>
        </GlassPanel>

        {/* Thumbnail navigation */}
        {media.length > 1 && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {media.map((item, index) => (
              <button
                key={index}
                onClick={() => onIndexChange(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex 
                    ? 'border-white/60 scale-105' 
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                <img
                  src={item.thumbnail || item.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {item.type !== 'image' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="text-white text-xs">
                      {item.type === 'video' ? '▶️' : '🎮'}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen modal */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={toggleFullscreen}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="max-w-7xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              {renderMedia()}
            </motion.div>
            <button
              onClick={toggleFullscreen}
              className="absolute top-4 right-4 text-white text-2xl hover:scale-110 transition-transform"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

interface SellerInfoCardProps {
  seller: ProductDetail['seller'];
  onContactSeller?: () => void;
  onViewProfile?: () => void;
}

const SellerInfoCard: React.FC<SellerInfoCardProps> = ({
  seller,
  onContactSeller,
  onViewProfile,
}) => (
  <GlassPanel variant="secondary" className="p-6">
    <div className="flex items-start gap-4">
      <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
        <img
          src={seller.avatar}
          alt={seller.name}
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-semibold text-white">{seller.name}</h3>
          {seller.verified && <span className="text-sm">✅</span>}
          {seller.daoApproved && (
            <div 
              className="px-2 py-1 rounded text-xs font-medium"
              style={{
                background: designTokens.colors.trust.dao + '20',
                color: designTokens.colors.trust.dao,
                border: `1px solid ${designTokens.colors.trust.dao}40`,
              }}
            >
              DAO Approved
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-white/70 mb-4">
          <div>
            <div className="font-medium text-white">Reputation</div>
            <div className="flex items-center gap-1">
              <span>{seller.reputation}/5.0</span>
              <div className="flex">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={i < Math.floor(seller.reputation) ? 'text-yellow-400' : 'text-white/30'}>
                    ⭐
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="font-medium text-white">Total Sales</div>
            <div>{seller.totalSales.toLocaleString()}</div>
          </div>
          <div>
            <div className="font-medium text-white">Member Since</div>
            <div>{seller.memberSince}</div>
          </div>
          <div>
            <div className="font-medium text-white">Response Time</div>
            <div>{seller.responseTime}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="small"
            onClick={onContactSeller}
            className="flex-1"
          >
            Contact Seller
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={onViewProfile}
            className="flex-1"
          >
            View Profile
          </Button>
        </div>
      </div>
    </div>
  </GlassPanel>
);

interface ProductDetailPageProps {
  product: ProductDetail;
  onAddToCart?: (productId: string, quantity: number) => void;
  onBuyNow?: (productId: string, quantity: number) => void;
  onAddToWishlist?: (productId: string) => void;
  onContactSeller?: (sellerId: string) => void;
  onViewSellerProfile?: (sellerId: string) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  onAddToCart,
  onBuyNow,
  onAddToWishlist,
  onContactSeller,
  onViewSellerProfile,
}) => {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description');

  const handleAddToCart = () => {
    onAddToCart?.(product.id, quantity);
  };

  const handleBuyNow = () => {
    onBuyNow?.(product.id, quantity);
  };

  const handleAddToWishlist = () => {
    onAddToWishlist?.(product.id);
  };

  const handleContactSeller = () => {
    onContactSeller?.(product.seller.id);
  };

  const handleViewSellerProfile = () => {
    onViewSellerProfile?.(product.seller.id);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Media Viewer */}
        <div>
          <MediaViewer
            media={product.media}
            currentIndex={currentMediaIndex}
            onIndexChange={setCurrentMediaIndex}
          />
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Title and Trust Indicators */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-3xl font-bold text-white pr-4">{product.title}</h1>
              <TrustIndicators
                {...product.trust}
                daoApproved={product.seller.daoApproved}
                layout="badges"
                size="medium"
              />
            </div>
            
            {/* Category and Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span 
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  background: designTokens.glassmorphism.secondary.background,
                  border: designTokens.glassmorphism.secondary.border,
                  color: 'white',
                }}
              >
                {product.category}
              </span>
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 rounded text-xs text-white/70"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Reviews */}
            <div className="flex items-center gap-2 text-sm text-white/70">
              <div className="flex">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={i < Math.floor(product.reviews.average) ? 'text-yellow-400' : 'text-white/30'}>
                    ⭐
                  </span>
                ))}
              </div>
              <span>{product.reviews.average}/5.0</span>
              <span>({product.reviews.count} reviews)</span>
            </div>
          </div>

          {/* Pricing */}
          <GlassPanel variant="secondary" className="p-6">
            <DualPricing
              cryptoPrice={product.price.crypto}
              cryptoSymbol={product.price.cryptoSymbol}
              fiatPrice={product.price.fiat}
              fiatSymbol={product.price.fiatSymbol}
              size="large"
              layout="vertical"
              showToggle
              realTimeConversion
            />
            
            {/* Shipping Info */}
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span>🚚</span>
                {product.shipping.freeShipping ? (
                  <span className="text-green-400 font-medium">Free shipping</span>
                ) : (
                  <span>Shipping: {product.shipping.cost}</span>
                )}
                <span>• Estimated delivery: {product.shipping.estimatedDays}</span>
              </div>
            </div>
          </GlassPanel>

          {/* Quantity and Actions */}
          <div className="space-y-4">
            {product.inventory !== undefined && (
              <div className="flex items-center gap-4">
                <label className="text-white font-medium">Quantity:</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded flex items-center justify-center text-white"
                    style={{
                      background: designTokens.glassmorphism.secondary.background,
                      border: designTokens.glassmorphism.secondary.border,
                    }}
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-white">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.inventory || 1, quantity + 1))}
                    className="w-8 h-8 rounded flex items-center justify-center text-white"
                    style={{
                      background: designTokens.glassmorphism.secondary.background,
                      border: designTokens.glassmorphism.secondary.border,
                    }}
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-white/70">
                  {product.inventory} available
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="primary"
                size="large"
                onClick={handleBuyNow}
                className="flex-1"
              >
                Buy Now
              </Button>
              <Button
                variant="outline"
                size="large"
                onClick={handleAddToCart}
                className="flex-1"
              >
                Add to Cart
              </Button>
              <Button
                variant="ghost"
                size="large"
                onClick={handleAddToWishlist}
              >
                🤍
              </Button>
            </div>
          </div>

          {/* Seller Info */}
          <SellerInfoCard
            seller={product.seller}
            onContactSeller={handleContactSeller}
            onViewProfile={handleViewSellerProfile}
          />
        </div>
      </div>

      {/* Product Details Tabs */}
      <GlassPanel variant="secondary" className="p-6">
        <div className="flex gap-6 mb-6 border-b border-white/20">
          {(['description', 'specifications', 'reviews'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-white'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="text-white/90">
          {activeTab === 'description' && (
            <div className="prose prose-invert max-w-none">
              <p className="text-lg leading-relaxed">{product.longDescription}</p>
            </div>
          )}

          {activeTab === 'specifications' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} className="flex justify-between py-2 border-b border-white/10">
                  <span className="font-medium">{key}:</span>
                  <span className="text-white/70">{value}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="text-center py-8 text-white/60">
              <p>Reviews component would be implemented here</p>
              <p className="text-sm mt-2">
                Average: {product.reviews.average}/5.0 ({product.reviews.count} reviews)
              </p>
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
};

export default ProductDetailPage;