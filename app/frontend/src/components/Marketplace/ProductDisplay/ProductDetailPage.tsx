/**
 * ProductDetailPage Component - Comprehensive product detail view with Web3 features
 * Features 3D/AR viewer, dual pricing, trust indicators, checkout flow, and DAO integration
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { DualPricing } from '../../../design-system/components/DualPricing';
import { TrustIndicators } from '../../../design-system/components/TrustIndicators';
import { LoadingSkeleton } from '../../../design-system/components/LoadingSkeleton';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { Button } from '../../../design-system/components/Button';
import { designTokens } from '../../../design-system/tokens';

interface ProductMedia {
  type: 'image' | 'video' | '3d' | 'ar';
  url: string;
  thumbnail?: string;
  alt?: string;
}

type ViewMode = '2D' | '3D' | 'AR';
type PaymentMethod = 'eth' | 'usdc' | 'card' | 'paypal';
type CheckoutStep = 'shipping' | 'payment' | 'review';

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

interface CheckoutModalProps {
  product: ProductDetail;
  quantity: number;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (orderData: any) => void;
}

const MediaViewer: React.FC<MediaViewerProps> = ({ 
  media, 
  currentIndex, 
  onIndexChange 
}) => {
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('2D');
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
    if (viewMode === '3D') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
              <span className="text-2xl">🎮</span>
            </div>
            <p className="text-white/70 mb-2">3D Model Viewer</p>
            <p className="text-sm text-white/50 mb-4">Interactive 3D model with 360° rotation</p>
            <div className="flex justify-center space-x-2 text-xs text-white/40">
              <span>• Drag to rotate</span>
              <span>• Scroll to zoom</span>
              <span>• Double-click to reset</span>
            </div>
          </div>
        </div>
      );
    }
    
    if (viewMode === 'AR') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
              <span className="text-2xl">📱</span>
            </div>
            <p className="text-white/70 mb-2">AR Preview</p>
            <p className="text-sm text-white/50 mb-4">See how this product looks in your space</p>
            <Button variant="outline" className="mb-2">
              Open AR Camera
            </Button>
            <div className="text-xs text-white/40">
              <p>• Point camera at flat surface</p>
              <p>• Tap to place product</p>
              <p>• Pinch to resize</p>
            </div>
          </div>
        </div>
      );
    }

    // Default 2D view
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
      case 'ar':
        return (
          <img
            src={currentMedia.thumbnail || currentMedia.url}
            alt={currentMedia.alt || 'Product image'}
            className="w-full h-full object-cover"
            onLoad={handleMediaLoad}
          />
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

            {/* View Mode Switcher */}
            <div className="absolute top-4 left-4 flex space-x-2">
              {(['2D', '3D', 'AR'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    viewMode === mode
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/15'
                  }`}
                  disabled={mode !== '2D' && !media.some(m => m.type === '3d' || m.type === 'ar')}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Media type indicator */}
            <div 
              className="absolute bottom-4 left-4 px-2 py-1 rounded text-xs font-medium text-white"
              style={{
                background: designTokens.glassmorphism.primary.background,
                backdropFilter: designTokens.glassmorphism.primary.backdropFilter,
              }}
            >
              {viewMode} View • {currentIndex + 1}/{media.length}
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

// Comprehensive Checkout Modal Component
const CheckoutModal: React.FC<CheckoutModalProps> = ({
  product,
  quantity,
  isOpen,
  onClose,
  onComplete
}) => {
  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('eth');
  const [shippingData, setShippingData] = useState({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    zipCode: '',
    country: ''
  });

  const totalPrice = {
    crypto: (parseFloat(product.price.crypto) * quantity).toFixed(4),
    fiat: (parseFloat(product.price.fiat) * quantity).toFixed(2)
  };

  const handleShippingSubmit = () => {
    setStep('payment');
  };

  const handlePaymentSubmit = () => {
    setStep('review');
  };

  const handleOrderComplete = () => {
    const orderData = {
      productId: product.id,
      quantity,
      shippingData,
      paymentMethod,
      totalPrice,
      timestamp: new Date().toISOString()
    };
    onComplete(orderData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <GlassPanel variant="primary">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Secure Checkout</h2>
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center mb-8">
              {(['shipping', 'payment', 'review'] as CheckoutStep[]).map((stepName, index) => (
                <div key={stepName} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === stepName
                      ? 'bg-blue-500 text-white'
                      : index < (['shipping', 'payment', 'review'] as CheckoutStep[]).indexOf(step)
                      ? 'bg-green-500 text-white'
                      : 'bg-white/20 text-white/70'
                  }`}>
                    {index < (['shipping', 'payment', 'review'] as CheckoutStep[]).indexOf(step) ? '✓' : index + 1}
                  </div>
                  {index < 2 && (
                    <div className={`w-16 h-0.5 mx-2 ${
                      index < (['shipping', 'payment', 'review'] as CheckoutStep[]).indexOf(step)
                        ? 'bg-green-500'
                        : 'bg-white/20'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            {step === 'shipping' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white">Shipping Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={shippingData.firstName}
                    onChange={(e) => setShippingData({...shippingData, firstName: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={shippingData.lastName}
                    onChange={(e) => setShippingData({...shippingData, lastName: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <input
                    type="text"
                    placeholder="Address"
                    value={shippingData.address}
                    onChange={(e) => setShippingData({...shippingData, address: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400 sm:col-span-2"
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={shippingData.city}
                    onChange={(e) => setShippingData({...shippingData, city: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <input
                    type="text"
                    placeholder="ZIP Code"
                    value={shippingData.zipCode}
                    onChange={(e) => setShippingData({...shippingData, zipCode: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <Button onClick={handleShippingSubmit} className="w-full">
                  Continue to Payment
                </Button>
              </div>
            )}

            {step === 'payment' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white">Payment Method</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'eth', name: 'Ethereum', icon: '⚡', desc: 'Instant settlement', fee: '0%' },
                    { id: 'usdc', name: 'USDC', icon: '💵', desc: 'Stable value', fee: '0.5%' },
                    { id: 'card', name: 'Credit Card', icon: '💳', desc: 'Traditional', fee: '2.9%' },
                    { id: 'paypal', name: 'PayPal', icon: '🅿️', desc: 'Buyer protection', fee: '3.5%' }
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        paymentMethod === method.id
                          ? 'border-blue-400 bg-blue-500/20'
                          : 'border-white/20 bg-white/5 hover:border-white/40'
                      }`}
                    >
                      <div className="text-2xl mb-2">{method.icon}</div>
                      <div className="text-white font-medium">{method.name}</div>
                      <div className="text-white/70 text-sm">{method.desc}</div>
                      <div className="text-green-400 text-xs mt-1">Fee: {method.fee}</div>
                    </button>
                  ))}
                </div>

                <div className="flex space-x-4">
                  <Button variant="outline" onClick={() => setStep('shipping')} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={handlePaymentSubmit} className="flex-1">
                    Continue to Review
                  </Button>
                </div>
              </div>
            )}

            {step === 'review' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white">Order Review</h3>
                
                {/* Order Summary */}
                <GlassPanel variant="secondary">
                  <div className="p-4">
                    <div className="flex items-center space-x-4 mb-4">
                      <img
                        src={product.media[0]?.thumbnail || product.media[0]?.url}
                        alt={product.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{product.title}</h4>
                        <p className="text-white/70">Quantity: {quantity}</p>
                        <p className="text-white/70 text-sm">Seller: {product.seller.name}</p>
                      </div>
                      <div className="text-right">
                        <DualPricing
                          cryptoPrice={totalPrice.crypto}
                          cryptoSymbol={product.price.cryptoSymbol}
                          fiatPrice={totalPrice.fiat}
                          fiatSymbol={product.price.fiatSymbol}
                          size="small"
                          layout="vertical"
                        />
                      </div>
                    </div>
                    
                    <div className="border-t border-white/20 pt-4 space-y-2">
                      <div className="flex justify-between text-white/70 text-sm">
                        <span>Subtotal:</span>
                        <span>{totalPrice.crypto} {product.price.cryptoSymbol}</span>
                      </div>
                      <div className="flex justify-between text-white/70 text-sm">
                        <span>Shipping:</span>
                        <span className="text-green-400">Free</span>
                      </div>
                      <div className="flex justify-between text-white font-semibold">
                        <span>Total:</span>
                        <span>{totalPrice.crypto} {product.price.cryptoSymbol}</span>
                      </div>
                    </div>
                  </div>
                </GlassPanel>

                {/* Security Features */}
                <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-4">
                  <h4 className="text-green-300 font-medium mb-2 flex items-center">
                    <span className="mr-2">🔒</span>
                    Your Purchase is Protected
                  </h4>
                  <ul className="text-green-200 text-sm space-y-1">
                    <li>• Smart contract escrow protection</li>
                    <li>• NFT authenticity certificate included</li>
                    <li>• 30-day return guarantee</li>
                    <li>• Dispute resolution via DAO governance</li>
                    <li>• Blockchain-verified transaction record</li>
                  </ul>
                </div>

                <div className="flex space-x-4">
                  <Button variant="outline" onClick={() => setStep('payment')} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={handleOrderComplete} className="flex-1">
                    Complete Purchase
                  </Button>
                </div>
              </div>
            )}
          </div>
        </GlassPanel>
      </motion.div>
    </div>
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
  onOrderComplete?: (orderData: any) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  onAddToCart,
  onBuyNow,
  onAddToWishlist,
  onContactSeller,
  onViewSellerProfile,
  onOrderComplete,
}) => {
  const { address, isConnected } = useAccount();
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description');
  const [showCheckout, setShowCheckout] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const handleAddToCart = () => {
    onAddToCart?.(product.id, quantity);
  };

  const handleBuyNow = () => {
    if (!isConnected) {
      // Show connect wallet message
      return;
    }
    setShowCheckout(true);
  };

  const handleAddToWishlist = () => {
    setIsWishlisted(!isWishlisted);
    onAddToWishlist?.(product.id);
  };

  const handleOrderComplete = (orderData: any) => {
    onOrderComplete?.(orderData);
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

            <div className="space-y-3">
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  size="large"
                  onClick={handleBuyNow}
                  className="flex-1"
                  disabled={!isConnected}
                >
                  {isConnected ? 'Buy Now' : 'Connect Wallet to Buy'}
                </Button>
                <Button
                  variant="outline"
                  size="large"
                  onClick={handleAddToCart}
                  className="flex-1"
                  disabled={!isConnected}
                >
                  Add to Cart
                </Button>
                <Button
                  variant="ghost"
                  size="large"
                  onClick={handleAddToWishlist}
                  className={isWishlisted ? 'text-red-400' : ''}
                >
                  {isWishlisted ? '❤️' : '🤍'}
                </Button>
              </div>
              
              {!isConnected && (
                <p className="text-center text-white/70 text-sm">
                  Connect your wallet to purchase this item
                </p>
              )}
              
              {/* Quick Actions */}
              <div className="flex gap-2 text-sm">
                <button className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors">
                  📋 Compare
                </button>
                <button className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors">
                  📤 Share
                </button>
                <button className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors">
                  🚨 Report
                </button>
              </div>
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

      {/* Checkout Modal */}
      <CheckoutModal
        product={product}
        quantity={quantity}
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        onComplete={handleOrderComplete}
      />
    </div>
  );
};

export default ProductDetailPage;