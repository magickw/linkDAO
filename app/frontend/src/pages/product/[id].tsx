import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { ProductDetailPage } from '@/components/Marketplace/ProductDisplay/ProductDetailPage';
import { designTokens } from '@/design-system/tokens';
import { useToast } from '@/context/ToastContext';
import { Button, GlassPanel } from '@/design-system';

interface ProductDetail {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  media: Array<{
    type: 'image' | 'video' | '3d' | 'ar';
    url: string;
    thumbnail?: string;
    alt?: string;
  }>;
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

const ProductPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { address, isConnected } = useAccount();
  const { addToast } = useToast();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProduct(id as string);
    }
  }, [id]);

  const fetchProduct = async (productId: string) => {
    try {
      setLoading(true);
      // Mock product data - in real app, fetch from API
      const mockProduct: ProductDetail = {
        id: productId,
        title: 'Premium Wireless Headphones',
        description: 'Experience crystal-clear audio with our premium wireless headphones.',
        longDescription: 'Experience crystal-clear audio with our premium wireless headphones featuring active noise cancellation, 30-hour battery life, and premium materials. These headphones are designed for audiophiles who demand the best in sound quality and comfort. With advanced drivers and precision-tuned acoustics, every note comes through with stunning clarity.',
        media: [
          { type: 'image', url: '/api/placeholder/600/600', alt: 'Headphones front view' },
          { type: 'image', url: '/api/placeholder/600/600', alt: 'Headphones side view' },
          { type: '3d', url: '/models/headphones.glb', thumbnail: '/api/placeholder/600/600', alt: '3D model' },
          { type: 'video', url: '/videos/headphones-demo.mp4', thumbnail: '/api/placeholder/600/600', alt: 'Product demo' }
        ],
        price: {
          crypto: '0.25',
          cryptoSymbol: 'ETH',
          fiat: '425.00',
          fiatSymbol: 'USD'
        },
        seller: {
          id: 'seller-1',
          name: 'TechGear Pro',
          avatar: '/api/placeholder/64/64',
          verified: true,
          reputation: 4.8,
          daoApproved: true,
          totalSales: 1247,
          memberSince: '2022-03-15',
          responseTime: '< 2 hours'
        },
        trust: {
          verified: true,
          escrowProtected: true,
          onChainCertified: true,
          authenticityNFT: '0x123...abc'
        },
        specifications: {
          'Brand': 'AudioTech',
          'Model': 'AT-WH1000XM5',
          'Type': 'Over-ear',
          'Connectivity': 'Bluetooth 5.2, USB-C',
          'Battery Life': '30 hours',
          'Noise Cancellation': 'Active',
          'Weight': '250g',
          'Warranty': '2 years + NFT Certificate'
        },
        category: 'Electronics',
        tags: ['Premium', 'Wireless', 'Noise Cancelling', 'Long Battery'],
        isNFT: false,
        inventory: 15,
        shipping: {
          freeShipping: true,
          estimatedDays: '2-3 business days'
        },
        reviews: {
          average: 4.8,
          count: 324
        }
      };

      setProduct(mockProduct);
    } catch (error) {
      console.error('Error fetching product:', error);
      addToast('Failed to load product details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (productId: string, quantity: number) => {
    addToast(`Added ${quantity} item(s) to cart`, 'success');
    console.log('Added to cart:', { productId, quantity });
  };

  const handleBuyNow = (productId: string, quantity: number) => {
    console.log('Buy now:', { productId, quantity });
  };

  const handleAddToWishlist = (productId: string) => {
    addToast('Added to wishlist', 'success');
    console.log('Added to wishlist:', productId);
  };

  const handleContactSeller = (sellerId: string) => {
    addToast('Opening seller contact', 'info');
    console.log('Contact seller:', sellerId);
  };

  const handleViewSellerProfile = (sellerId: string) => {
    router.push(`/seller/${sellerId}`);
  };

  const handleOrderComplete = (orderData: any) => {
    addToast('Order placed successfully!', 'success');
    console.log('Order completed:', orderData);
    router.push('/orders');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="fixed inset-0 z-0"
          style={{ background: designTokens.gradients.heroMain }}
        />
        <div className="relative z-10 animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/50"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="fixed inset-0 z-0"
          style={{ background: designTokens.gradients.heroMain }}
        />
        <div className="relative z-10 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Product Not Found</h1>
          <button
            onClick={() => router.push('/marketplace')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Background */}
      <div
        className="fixed inset-0 z-0"
        style={{ background: designTokens.gradients.heroMain }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="mb-4">
            <div className="flex items-center space-x-2 text-sm text-white/70">
              <button onClick={() => router.push('/marketplace')} className="hover:text-white">
                Marketplace
              </button>
              <span>›</span>
              <button onClick={() => router.push(`/marketplace?category=${product.category.toLowerCase()}`)} className="hover:text-white">
                {product.category}
              </button>
              <span>›</span>
              <span className="text-white">{product.title}</span>
            </div>
          </nav>
        </div>

        {/* Product Detail Page */}
        <ProductDetailPage
          product={product}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onAddToWishlist={handleAddToWishlist}
          onContactSeller={handleContactSeller}
          onViewSellerProfile={handleViewSellerProfile}
          onOrderComplete={handleOrderComplete}
        />
      </div>
    </div>
  );
};

// Checkout Modal Component
const CheckoutModal: React.FC<{
  product: ProductDetail;
  quantity: number;
  onClose: () => void;
}> = ({ product, quantity, onClose }) => {
  const [step, setStep] = useState<'shipping' | 'payment' | 'review'>('shipping');
  const [paymentMethod, setPaymentMethod] = useState<'eth' | 'usdc' | 'card' | 'paypal'>('eth');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl"
      >
        <GlassPanel variant="primary" className="max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Checkout</h2>
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
              {(['shipping', 'payment', 'review'] as const).map((stepName, index) => (
                <div key={stepName} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === stepName
                    ? 'bg-blue-500 text-white'
                    : index < (['shipping', 'payment', 'review'] as const).indexOf(step)
                      ? 'bg-green-500 text-white'
                      : 'bg-white/20 text-white/70'
                    }`}>
                    {index + 1}
                  </div>
                  {index < 2 && (
                    <div className={`w-16 h-0.5 mx-2 ${index < (['shipping', 'payment', 'review'] as const).indexOf(step)
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
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <input
                    type="text"
                    placeholder="Address"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400 sm:col-span-2"
                  />
                  <input
                    type="text"
                    placeholder="City"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <input
                    type="text"
                    placeholder="ZIP Code"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <Button onClick={() => setStep('payment')} className="w-full">
                  Continue to Payment
                </Button>
              </div>
            )}

            {step === 'payment' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white">Payment Method</h3>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'eth', name: 'Ethereum', icon: '⚡', desc: 'Instant settlement' },
                    { id: 'usdc', name: 'USDC', icon: '💵', desc: 'Stable value' },
                    { id: 'card', name: 'Credit Card', icon: '💳', desc: 'Traditional' },
                    { id: 'paypal', name: 'PayPal', icon: '🅿️', desc: 'Buyer protection' }
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id as any)}
                      className={`p-4 rounded-lg border-2 transition-all ${paymentMethod === method.id
                        ? 'border-blue-400 bg-blue-500/20'
                        : 'border-white/20 bg-white/5 hover:border-white/40'
                        }`}
                    >
                      <div className="text-2xl mb-2">{method.icon}</div>
                      <div className="text-white font-medium">{method.name}</div>
                      <div className="text-white/70 text-sm">{method.desc}</div>
                    </button>
                  ))}
                </div>

                <div className="flex space-x-4">
                  <Button variant="outline" onClick={() => setStep('shipping')} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={() => setStep('review')} className="flex-1">
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
                        src={product.media[0].url}
                        alt={product.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{product.title}</h4>
                        <p className="text-white/70">Quantity: {quantity}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">
                          {(parseFloat(product.price.crypto) * quantity).toFixed(4)} {product.price.cryptoSymbol}
                        </div>
                        <div className="text-white/70 text-sm">
                          {product.price.fiatSymbol}{(parseFloat(product.price.fiat) * quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/20 pt-4">
                      <div className="flex justify-between text-white">
                        <span>Total:</span>
                        <span className="font-semibold">
                          {(parseFloat(product.price.crypto) * quantity).toFixed(4)} {product.price.cryptoSymbol}
                          <div className="text-white/70 text-sm">
                            {product.price.fiatSymbol}{(parseFloat(product.price.fiat) * quantity).toFixed(2)}
                          </div>
                        </span>
                      </div>
                    </div>
                  </div>
                </GlassPanel>

                {/* Security Features */}
                <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-4">
                  <h4 className="text-green-300 font-medium mb-2">🔒 Your Purchase is Protected</h4>
                  <ul className="text-green-200 text-sm space-y-1">
                    <li>• Smart contract escrow protection</li>
                    <li>• NFT authenticity certificate</li>
                    <li>• 30-day return guarantee</li>
                    <li>• Dispute resolution via DAO</li>
                  </ul>
                </div>

                <div className="flex space-x-4">
                  <Button variant="outline" onClick={() => setStep('payment')} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={() => {
                    // Process payment
                    console.log('Processing payment...');
                    onClose();
                  }} className="flex-1">
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

export default ProductPage;