import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, Shield, CheckCircle, Vote, ShoppingCart } from 'lucide-react';
import { comparisonService, ComparisonState } from '@/services/comparisonService';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { OptimizedImage } from '@/components/Performance/OptimizedImageLoader';
import { DualPricing } from '@/design-system/components/DualPricing';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/context/ToastContext';
import Layout from '@/components/Layout';
import SEO from '@/components/SEO';

const ComparePage: React.FC = () => {
  const [state, setState] = useState<ComparisonState>({ items: [] });
  const router = useRouter();
  const { actions: cartActions } = useCart();
  const { addToast } = useToast();

  useEffect(() => {
    const unsubscribe = comparisonService.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  const handleAddToCart = (product: any) => {
    // Transform to cart format
    const cartItem = {
      id: product.id,
      title: product.title,
      description: product.description,
      image: product.images?.[0] || '',
      price: {
        crypto: product.priceAmount?.toString() || '0',
        cryptoSymbol: product.priceCurrency || 'ETH',
        fiat: product.priceAmount?.toString() || '0',
        fiatSymbol: 'USD'
      },
      seller: {
        id: product.seller?.id || product.sellerId || '',
        name: product.seller?.name || product.seller?.storeName || 'Unknown Seller',
        avatar: product.seller?.avatar || '',
        verified: product.seller?.verified || false,
        daoApproved: product.seller?.daoApproved || false,
        escrowSupported: product.trust?.escrowProtected || true,
        walletAddress: product.seller?.walletAddress || ''
      },
      category: product.category?.name || product.categoryId || 'general',
      isDigital: product.categoryId === 'digital' || !!product.nft,
      isNFT: !!product.nft,
      inventory: product.inventory || 1,
      shipping: {
        cost: product.shipping?.free ? '0' : '0.001',
        freeShipping: product.shipping?.free || false,
        estimatedDays: product.shipping?.estimatedDays || '3-5',
        regions: ['US', 'CA', 'EU']
      },
      trust: {
        escrowProtected: product.trust?.escrowProtected || true,
        onChainCertified: product.trust?.onChainCertified || false,
        safetyScore: product.trust?.safetyScore || 90
      }
    };

    cartActions.addItem(cartItem, 1);
    addToast(`Added "${product.title}" to cart!`, 'success');
  };

  const attributes = [
    { label: 'Price', key: 'price' },
    { label: 'Category', key: 'category' },
    { label: 'Seller', key: 'seller' },
    { label: 'Condition', key: 'condition' },
    { label: 'Inventory', key: 'inventory' },
    { label: 'Trust', key: 'trust' },
    { label: 'Shipping', key: 'shipping' },
  ];

  const renderAttributeValue = (product: any, key: string) => {
    switch (key) {
      case 'price':
        return (
          <div className="py-4">
            <DualPricing
              cryptoPrice={product.priceAmount?.toString() || product.price || '0'}
              cryptoSymbol={product.priceCurrency || 'ETH'}
              fiatPrice={product.priceAmount?.toString() || product.price || '0'}
              fiatSymbol="USD"
              size="sm"
            />
          </div>
        );
      case 'category':
        return <span className="text-white/80">{product.category?.name || product.categoryId || 'General'}</span>;
      case 'seller':
        return (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden">
              <OptimizedImage src={product.seller?.avatar || ''} alt="" width={24} height={24} />
            </div>
            <span className="text-white/80">{product.seller?.name || product.seller?.storeName || 'Seller'}</span>
          </div>
        );
      case 'condition':
        return <span className="text-white/80 capitalize">{product.metadata?.condition || 'New'}</span>;
      case 'inventory':
        return <span className={product.inventory > 0 ? 'text-green-400' : 'text-red-400'}>{product.inventory > 0 ? `${product.inventory} in stock` : 'Out of stock'}</span>;
      case 'trust':
        return (
          <div className="flex flex-col gap-1">
            {product.trust?.escrowProtected && (
              <div className="flex items-center gap-1 text-xs text-blue-400">
                <Shield size={12} /> Escrow
              </div>
            )}
            {product.trust?.verified && (
              <div className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle size={12} /> Verified
              </div>
            )}
            {product.seller?.daoApproved && (
              <div className="flex items-center gap-1 text-xs text-yellow-400">
                <Vote size={12} /> DAO
              </div>
            )}
          </div>
        );
      case 'shipping':
        return (
          <div className="text-xs text-white/60">
            {product.shipping?.free ? 'Free Shipping' : `Cost: ${product.shipping?.cost || 'Calculated at checkout'}`}
            <div className="mt-1">{product.shipping?.estimatedDays || '3-5'} days est.</div>
          </div>
        );
      default:
        return null;
    }
  };

  if (state.items.length === 0) {
    return (
      <Layout fullWidth>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
          <div className="text-center space-y-6">
            <h1 className="text-3xl font-bold text-white">No products to compare</h1>
            <p className="text-white/60">Add products to your comparison list while browsing the marketplace.</p>
            <Button variant="primary" onClick={() => router.push('/marketplace')}>
              Back to Marketplace
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout fullWidth>
      <SEO title="Product Comparison - LinkDAO Marketplace" />
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-12 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <h1 className="text-3xl font-bold text-white">Compare Products</h1>
            <button
              onClick={() => comparisonService.clearComparison()}
              className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 size={20} />
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[200px_repeat(5,1fr)] gap-4 overflow-x-auto pb-8">
            {/* Labels column - hidden on mobile */}
            <div className="hidden lg:flex flex-col pt-[320px]">
              {attributes.map((attr) => (
                <div key={attr.key} className="h-24 flex items-center font-medium text-white/60 border-b border-white/10">
                  {attr.label}
                </div>
              ))}
            </div>

            {/* Product columns */}
            {state.items.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="min-w-[280px]"
              >
                <GlassPanel variant="secondary" className="h-full flex flex-col">
                  {/* Product Header */}
                  <div className="p-4 space-y-4 border-b border-white/10 relative h-[320px]">
                    <button
                      onClick={() => comparisonService.removeItem(product.id)}
                      className="absolute top-2 right-2 p-1 bg-black/30 text-white hover:bg-red-500 rounded-full transition-colors z-10"
                    >
                      <Trash2 size={14} />
                    </button>
                    
                    <div className="aspect-square w-full rounded-lg overflow-hidden bg-white/5">
                      <OptimizedImage
                        src={product.images?.[0] || ''}
                        alt={product.title}
                        width={250}
                        height={250}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <h3 className="font-bold text-white line-clamp-2 min-h-[3rem]">{product.title}</h3>
                  </div>

                  {/* Attributes */}
                  <div className="flex-1">
                    {attributes.map((attr) => (
                      <div key={attr.key} className="h-24 p-4 flex flex-col justify-center border-b border-white/10">
                        <div className="lg:hidden text-xs font-medium text-white/40 mb-1">{attr.label}</div>
                        {renderAttributeValue(product, attr.key)}
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="p-4 mt-auto space-y-3">
                    <Button
                      variant="primary"
                      className="w-full flex items-center justify-center gap-2"
                      onClick={() => handleAddToCart(product)}
                      disabled={product.inventory === 0}
                    >
                      <ShoppingCart size={18} />
                      Add to Cart
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push(`/marketplace/listing/${product.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </GlassPanel>
              </motion.div>
            ))}
            
            {/* Fill remaining slots */}
            {state.items.length < 5 && Array.from({ length: 5 - state.items.length }).map((_, i) => (
              <div key={`empty-${i}`} className="hidden lg:block min-w-[280px]">
                <div className="h-full rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center p-8 text-center">
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                      <span className="text-2xl text-white/20">+</span>
                    </div>
                    <p className="text-sm text-white/20">Add product to compare</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ComparePage;
