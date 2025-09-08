/**
 * Enhanced Marketplace Demo Page - Showcasing the complete e-commerce flow
 * Features: Product grid, cart management, checkout process, escrow integration
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Filter, Search, Grid, List } from 'lucide-react';
import { EnhancedProductGrid } from '../components/Marketplace/ProductDisplay/EnhancedProductGrid';
import { EnhancedCheckoutFlow } from '../components/Marketplace/Payment/EnhancedCheckoutFlow';
import { EnhancedPaymentProcessor } from '../components/Marketplace/Payment/EnhancedPaymentProcessor';
import { ShippingManager } from '../components/Marketplace/Shipping/ShippingManager';
import { EnhancedCartProvider, useEnhancedCart } from '../hooks/useEnhancedCart';
import { GlassPanel } from '../design-system/components/GlassPanel';
import { Button } from '../design-system/components/Button';
import { useToast } from '@/context/ToastContext';
import Layout from '../components/Layout';

// Mock product data
const mockProducts = [
  {
    id: '1',
    title: 'Handcrafted Wooden Watch',
    description: 'Eco-friendly timepiece made from sustainable bamboo',
    images: {
      thumbnail: '/images/watch-thumb.jpg',
      small: '/images/watch-small.jpg',
      large: '/images/watch-large.jpg',
    },
    price: {
      crypto: '0.15',
      cryptoSymbol: 'ETH',
      fiat: '245.99',
      fiatSymbol: 'USD',
    },
    seller: {
      id: '0x1234...5678',
      name: 'EcoCrafts Studio',
      avatar: '/images/seller1.jpg',
      verified: true,
      reputation: 96,
      daoApproved: true,
      badges: ['verified', 'dao-approved'] as ('verified' | 'dao-approved' | 'top-seller')[],
    },
    trust: {
      verified: true,
      escrowProtected: true,
      onChainCertified: true,
      safetyScore: 95,
    },
    category: 'accessories',
    isNFT: false,
    inventory: 12,
    shipping: {
      freeShipping: true,
      estimatedDays: '3-5',
      digitalDelivery: false,
    },
    reviews: {
      average: 4.8,
      count: 156,
    },
    createdAt: new Date('2024-01-15'),
    featured: true,
    stats: {
      views: 2450,
      likes: 189,
    },
  },
  {
    id: '2',
    title: 'Digital Art Collection #1',
    description: 'Unique NFT artwork by emerging digital artist',
    images: {
      thumbnail: '/images/nft-thumb.jpg',
      small: '/images/nft-small.jpg',
      large: '/images/nft-large.jpg',
    },
    price: {
      crypto: '0.08',
      cryptoSymbol: 'ETH',
      fiat: '132.00',
      fiatSymbol: 'USD',
      isAuction: true,
      currentBid: '0.06',
    },
    seller: {
      id: '0x9876...4321',
      name: 'CryptoArtist',
      avatar: '/images/seller2.jpg',
      verified: true,
      reputation: 88,
      daoApproved: false,
      badges: ['verified'] as ('verified' | 'dao-approved' | 'top-seller')[],
    },
    trust: {
      verified: true,
      escrowProtected: true,
      onChainCertified: true,
      safetyScore: 92,
      authenticityNFT: '0xabc...def',
    },
    category: 'nft',
    isNFT: true,
    shipping: {
      freeShipping: true,
      estimatedDays: 'instant',
      digitalDelivery: true,
    },
    reviews: {
      average: 4.6,
      count: 43,
    },
    createdAt: new Date('2024-01-20'),
    stats: {
      views: 890,
      likes: 67,
    },
  },
  {
    id: '3',
    title: 'Premium Coffee Subscription',
    description: 'Monthly delivery of ethically sourced coffee beans',
    images: {
      thumbnail: '/images/coffee-thumb.jpg',
      small: '/images/coffee-small.jpg',
      large: '/images/coffee-large.jpg',
    },
    price: {
      crypto: '0.045',
      cryptoSymbol: 'ETH',
      fiat: '74.99',
      fiatSymbol: 'USD',
    },
    seller: {
      id: '0x5555...9999',
      name: 'Bean There Coffee',
      avatar: '/images/seller3.jpg',
      verified: true,
      reputation: 94,
      daoApproved: true,
      badges: ['verified', 'dao-approved', 'top-seller'] as ('verified' | 'dao-approved' | 'top-seller')[],
    },
    trust: {
      verified: true,
      escrowProtected: true,
      onChainCertified: false,
      safetyScore: 89,
    },
    category: 'food',
    isNFT: false,
    inventory: 50,
    shipping: {
      freeShipping: false,
      estimatedDays: '5-7',
      cost: '0.01',
      digitalDelivery: false,
    },
    reviews: {
      average: 4.9,
      count: 278,
    },
    createdAt: new Date('2024-01-10'),
    stats: {
      views: 1650,
      likes: 234,
    },
  },
];

// Main marketplace demo component
const MarketplaceDemoContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<'browse' | 'cart' | 'checkout' | 'payment' | 'shipping'>('browse');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [filters, setFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  
  const cart = useEnhancedCart();
  const { addToast } = useToast();

  const handleProductClick = (productId: string) => {
    setSelectedProduct(productId);
    cart.addToRecentlyViewed(productId);
  };

  const handleAddToCart = (productId: string) => {
    const product = mockProducts.find(p => p.id === productId);
    if (product) {
      cart.addItem({
        ...product,
        image: product.images.small, // Add the required image property
        seller: {
          ...product.seller,
          escrowSupported: true,
        },
        isDigital: product.shipping.digitalDelivery || false,
        shipping: {
          cost: product.shipping.cost || '0',
          freeShipping: product.shipping.freeShipping,
          estimatedDays: product.shipping.estimatedDays,
          regions: ['US', 'CA', 'EU'], // Default shipping regions
        },
        trust: {
          ...product.trust,
        },
      });
      
      // Add visual feedback
      addToast(`${product.title} added to cart`, 'success');
      console.log(`Added ${product.title} to cart`);
    }
  };

  const handleCheckoutComplete = (orderData: any) => {
    console.log('Order completed:', orderData);
    setCurrentView('payment');
  };

  const handlePaymentSuccess = (result: any) => {
    console.log('Payment successful:', result);
    cart.clearCart();
    setCurrentView('browse');
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment failed:', error);
    // Handle error appropriately
  };

  // Mock cart items for checkout demo
  const mockCartItems = [
    {
      id: '1',
      title: 'Handcrafted Wooden Watch',
      price: {
        crypto: '0.15',
        cryptoSymbol: 'ETH',
        fiat: '245.99',
        fiatSymbol: 'USD',
      },
      seller: {
        id: '0x1234...5678',
        name: 'EcoCrafts Studio',
        avatar: '/images/seller1.jpg',
        verified: true,
        daoApproved: true,
      },
      image: '/images/watch-small.jpg',
      quantity: 1,
      isDigital: false,
      escrowProtected: true,
      shippingCost: '0',
      estimatedDelivery: '3-5 days',
    },
  ];

  const mockPaymentRequest = {
    listingId: '1',
    sellerId: '0x1234...5678',
    items: [
      {
        id: '1',
        title: 'Handcrafted Wooden Watch',
        price: '0.15',
        quantity: 1,
      },
    ],
    paymentToken: 'ETH' as const,
    totalAmount: '0.15',
    escrowEnabled: true,
  };

  return (
    <div className="min-h-screen">
      {/* Navigation Header */}
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-3xl font-bold text-white">Web3 Marketplace</h1>
              <nav className="flex gap-4">
                <button
                  onClick={() => setCurrentView('browse')}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                    currentView === 'browse' 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Browse
                </button>
                <button
                  onClick={() => setCurrentView('cart')}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium ${
                    currentView === 'cart' 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <ShoppingCart size={16} />
                  Cart ({cart.state.totals.itemCount})
                  {cart.state.totals.itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                  )}
                </button>
                {currentView === 'checkout' && (
                  <span className="px-4 py-2 bg-yellow-500/30 text-yellow-300 rounded-lg font-medium">
                    Checkout
                  </span>
                )}
                {currentView === 'payment' && (
                  <span className="px-4 py-2 bg-green-500/30 text-green-300 rounded-lg font-medium">
                    Payment
                  </span>
                )}
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="pl-10 pr-4 py-2 bg-white/15 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/20"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {currentView === 'browse' && (
            <motion.div
              key="browse"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h2 className="text-4xl font-bold text-white mb-4">Discover Amazing Products</h2>
                <p className="text-xl text-white/80 max-w-2xl mx-auto">Shop with confidence using our Web3-powered marketplace with escrow protection and verified sellers</p>
              </div>

              <EnhancedProductGrid
                products={mockProducts}
                filters={filters}
                onProductClick={handleProductClick}
                onAddToCart={handleAddToCart}
                onAddToWishlist={cart.addToWishlist}
                onFiltersChange={setFilters}
                showQuickView={true}
              />
            </motion.div>
          )}

          {currentView === 'cart' && (
            <motion.div
              key="cart"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h2 className="text-4xl font-bold text-white mb-4">Shopping Cart</h2>
                <p className="text-xl text-white/80">Review your items and proceed to checkout</p>
              </div>

              {cart.state.items.length === 0 ? (
                <GlassPanel variant="primary" className="p-12 text-center border border-white/20 bg-black/30">
                  <ShoppingCart size={48} className="mx-auto text-white/60 mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Your cart is empty</h3>
                  <p className="text-white/80 mb-6 text-lg">Start shopping to add items to your cart</p>
                  <Button
                    variant="primary"
                    onClick={() => setCurrentView('browse')}
                    className="px-6 py-3 text-lg font-medium"
                  >
                    Continue Shopping
                  </Button>
                </GlassPanel>
              ) : (
                <div className="space-y-6">
                  {/* Cart items display would go here */}
                  <div className="text-center">
                    <Button
                      variant="primary"
                      size="large"
                      onClick={() => setCurrentView('checkout')}
                    >
                      Proceed to Checkout
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentView === 'checkout' && (
            <motion.div
              key="checkout"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <EnhancedCheckoutFlow
                cartItems={mockCartItems}
                onComplete={handleCheckoutComplete}
                onCancel={() => setCurrentView('cart')}
              />
            </motion.div>
          )}

          {currentView === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <EnhancedPaymentProcessor
                paymentRequest={mockPaymentRequest}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onCancel={() => setCurrentView('checkout')}
              />
            </motion.div>
          )}

          {currentView === 'shipping' && (
            <motion.div
              key="shipping"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ShippingManager
                orderId="ORDER_123456"
                products={[
                  {
                    id: '1',
                    title: 'Handcrafted Wooden Watch',
                    image: '/images/watch-small.jpg',
                    isDigital: false,
                  },
                ]}
                shippingAddress={{
                  id: '1',
                  firstName: 'John',
                  lastName: 'Doe',
                  address1: '123 Main St',
                  city: 'New York',
                  state: 'NY',
                  zipCode: '10001',
                  country: 'US',
                  email: 'john@example.com',
                  isDefault: true,
                  verified: true,
                }}
                mode="tracking"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Page component with cart provider
const EnhancedMarketplaceDemo: React.FC = () => {
  return (
    <Layout>
      <EnhancedCartProvider>
        <MarketplaceDemoContent />
      </EnhancedCartProvider>
    </Layout>
  );
};

export default EnhancedMarketplaceDemo;