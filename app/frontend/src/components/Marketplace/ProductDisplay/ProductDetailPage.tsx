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
  MessageCircle
} from 'lucide-react';
import { useRouter } from 'next/router';

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
  const [selectedImage, setSelectedImage] = useState(product.media[0]?.url || '');
  const [isBuying, setIsBuying] = useState(false);
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
      console.log('Contacting seller:', product.seller.id);
    }
  };

  const handleViewSellerProfile = () => {
    if (onViewSellerProfile) {
      onViewSellerProfile(product.seller.id);
    } else {
      console.log('Viewing seller profile:', product.seller.id);
    }
  };

  const handleAskSeller = () => {
    // In a real implementation, this would create or navigate to a conversation with the seller
    console.log('Asking seller:', product.seller.id);
    // For now, we'll just navigate to the messaging page
    router.push('/messages');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Product Images */}
        <div className="w-full lg:w-1/2">
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <img 
              src={selectedImage} 
              alt={product.title} 
              className="w-full h-96 object-contain"
            />
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {product.media.map((media, index) => (
              <div 
                key={index}
                className={`bg-white rounded-lg shadow-sm p-2 cursor-pointer border-2 ${selectedImage === media.url ? 'border-blue-500' : 'border-transparent'}`}
                onClick={() => setSelectedImage(media.url)}
              >
                <img src={media.thumbnail || media.url} alt={media.alt || `Product view ${index + 1}`} className="w-full h-20 object-contain" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Product Info */}
        <div className="w-full lg:w-1/2">
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* Breadcrumbs */}
            <div className="flex items-center text-sm text-gray-500 mb-4">
              <span>Home</span>
              <ChevronRight size={16} />
              <span>{product.category}</span>
              <ChevronRight size={16} />
              <span>{product.title}</span>
            </div>
            
            {/* Title and Badges */}
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{product.title}</h1>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {product.trust.verified && (
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded flex items-center">
                  <CheckCircle size={14} className="mr-1" />
                  Verified
                </span>
              )}
              {product.trust.escrowProtected && (
                <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded flex items-center">
                  <Shield size={14} className="mr-1" />
                  Escrow Protected
                </span>
              )}
              {product.trust.onChainCertified && (
                <span className="bg-purple-100 text-purple-800 text-sm font-medium px-2.5 py-0.5 rounded flex items-center">
                  <Vote size={14} className="mr-1" />
                  On-Chain Certified
                </span>
              )}
              {product.seller.daoApproved && (
                <span className="bg-indigo-100 text-indigo-800 text-sm font-medium px-2.5 py-0.5 rounded flex items-center">
                  <Vote size={14} className="mr-1" />
                  DAO Approved
                </span>
              )}
            </div>
            
            {/* Rating */}
            <div className="flex items-center mb-4">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    size={20} 
                    className={i < Math.floor(product.reviews.average) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} 
                  />
                ))}
              </div>
              <span className="ml-2 text-sm font-medium">{product.reviews.average}</span>
              <span className="mx-2 text-gray-400">|</span>
              <span className="text-sm text-gray-600">{product.reviews.count} reviews</span>
            </div>
            
            {/* Price */}
            <div className="mb-6">
              <div className="text-3xl font-bold text-gray-900">
                {product.price.crypto} {product.price.cryptoSymbol}
              </div>
              <div className="text-lg text-gray-600">{product.price.fiat} {product.price.fiatSymbol}</div>
            </div>
            
            {/* Description */}
            <div className="mb-6">
              <p className="text-gray-700">{product.longDescription || product.description}</p>
            </div>
            
            {/* Specifications */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-800 mb-3">Specifications</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">{key}:</span>
                    <span className="text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Quantity Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <div className="flex items-center">
                <button 
                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded-l-md"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                >
                  -
                </button>
                <input 
                  type="number" 
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-center border-y border-gray-300 py-1"
                />
                <button 
                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded-r-md"
                  onClick={() => setQuantity(q => q + 1)}
                >
                  +
                </button>
                {product.inventory && (
                  <span className="ml-4 text-sm text-gray-600">
                    {product.inventory} in stock
                  </span>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <button 
                type="button"
                onClick={handleBuyNow}
                disabled={isBuying}
                aria-busy={isBuying}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                {isBuying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Shield size={20} className="mr-2" />
                    Buy Now with Escrow
                  </>
                )}
              </button>
              <button 
                type="button"
                onClick={handleAddToCart}
                className="flex-1 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                <ShoppingCart size={20} className="mr-2" />
                Add to Cart
              </button>
              <button 
                type="button"
                onClick={handleAddToWishlist}
                className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Heart size={20} className="text-gray-600" />
              </button>
              <button 
                type="button"
                onClick={handleAskSeller}
                className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
              >
                <MessageCircle size={20} className="text-gray-600" />
              </button>
              <button type="button" className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Share2 size={20} className="text-gray-600" />
              </button>
            </div>
            
            {/* Ask Seller Button */}
            <div className="mb-6">
              <button
                onClick={handleAskSeller}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors"
              >
                <MessageCircle size={20} />
                Ask Seller a Question
              </button>
            </div>
            
            {/* Trust Signals */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-medium text-gray-800 mb-3">Trust & Safety</h3>
              <div className="space-y-3">
                {product.trust.escrowProtected && (
                  <div className="flex items-center">
                    <ShieldCheck size={20} className="text-green-500 mr-2" />
                    <span className="text-sm">Escrow-protected transaction</span>
                  </div>
                )}
                {product.trust.verified && (
                  <div className="flex items-center">
                    <CheckCircle size={20} className="text-green-500 mr-2" />
                    <span className="text-sm">Verified seller</span>
                  </div>
                )}
                {product.seller.daoApproved && (
                  <div className="flex items-center">
                    <Vote size={20} className="text-green-500 mr-2" />
                    <span className="text-sm">DAO-approved product</span>
                  </div>
                )}
                {product.trust.onChainCertified && (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-sm">On-chain verified authenticity</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Seller Info */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="font-medium text-gray-800 mb-3">Seller Information</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <img 
                    src={product.seller.avatar} 
                    alt={product.seller.name} 
                    className="w-12 h-12 rounded-full mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-800">{product.seller.name}</div>
                    <div className="flex items-center">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={16} 
                            className={i < Math.floor(product.seller.reputation) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} 
                          />
                        ))}
                      </div>
                      <span className="ml-1 text-sm text-gray-600">{product.seller.reputation}</span>
                    </div>
                    <div className="text-sm text-gray-600">{product.seller.totalSales} sales</div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={handleViewSellerProfile}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    View Profile
                  </button>
                  <button 
                    onClick={handleContactSeller}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Contact
                  </button>
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-600">
                Member since {new Date(product.seller.memberSince).toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-600">
                Avg. response time: {product.seller.responseTime}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;