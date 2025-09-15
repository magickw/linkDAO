/**
 * ProductGridDemo - Demonstration component showing enhanced marketplace features
 * Showcases the improved grid layout, conditional CTAs, and trust indicators
 */

import React, { useState, useEffect } from 'react';
import { mockProducts, MockProduct } from '../../../data/mockProducts';
import DemoProductCard from './DemoProductCard';

interface ProductGridDemoProps {
  className?: string;
}

const ProductGridDemo: React.FC<ProductGridDemoProps> = ({ className = '' }) => {
  const [products, setProducts] = useState<MockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedListingType, setSelectedListingType] = useState<string>('all');

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setProducts(mockProducts);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredProducts = products.filter(product => {
    const categoryMatch = selectedCategory === 'all' || product.category === selectedCategory;
    const listingTypeMatch = selectedListingType === 'all' || product.listingType === selectedListingType;
    return categoryMatch && listingTypeMatch;
  });

  const categories = ['all', 'electronics', 'nft', 'collectibles', 'fashion'];
  const listingTypes = ['all', 'FIXED_PRICE', 'AUCTION'];

  const SkeletonCard = () => (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 animate-pulse">
      <div className="aspect-square bg-gray-300/20 rounded-lg mb-4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-300/20 rounded w-3/4"></div>
        <div className="h-3 bg-gray-300/20 rounded w-1/2"></div>
        <div className="h-6 bg-gray-300/20 rounded w-2/3"></div>
        <div className="flex gap-2 mt-4">
          <div className="h-8 bg-gray-300/20 rounded flex-1"></div>
          <div className="h-8 bg-gray-300/20 rounded w-8"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Demo Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Enhanced Marketplace Demo
        </h1>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Showcasing improved grid layout (3-5 desktop columns), conditional CTA buttons, 
          trust indicators, and multi-seller escrow integration.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 justify-center">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(category => (
              <option key={category} value={category} className="bg-gray-800">
                {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Listing Type</label>
          <select
            value={selectedListingType}
            onChange={(e) => setSelectedListingType(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {listingTypes.map(type => (
              <option key={type} value={type} className="bg-gray-800">
                {type === 'all' ? 'All Types' : type === 'FIXED_PRICE' ? 'Fixed Price' : 'Auction'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{filteredProducts.length}</div>
          <div className="text-sm text-gray-300">Products</div>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            {filteredProducts.filter(p => p.listingType === 'FIXED_PRICE').length}
          </div>
          <div className="text-sm text-gray-300">Fixed Price</div>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">
            {filteredProducts.filter(p => p.listingType === 'AUCTION').length}
          </div>
          <div className="text-sm text-gray-300">Auctions</div>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {filteredProducts.filter(p => p.isNFT).length}
          </div>
          <div className="text-sm text-gray-300">NFTs</div>
        </div>
      </div>

      {/* Enhanced Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {loading ? (
          // Show skeleton loaders
          Array.from({ length: 8 }, (_, i) => (
            <SkeletonCard key={i} />
          ))
        ) : (
          // Show actual products
          filteredProducts.map((product) => (
            <DemoProductCard
              key={product.id}
              product={product}
              onAddToCart={(productId: string) => {
                console.log('Added to cart:', productId);
                // Here you would integrate with your cart system
              }}
              onBidNow={(productId: string) => {
                console.log('Bid now:', productId);
                // Here you would open bid modal
              }}
              onFavorite={(productId: string) => {
                console.log('Favorited:', productId);
                // Here you would handle favorites
              }}
            />
          ))
        )}
      </div>

      {/* Feature Highlights */}
      <div className="mt-12 space-y-6">
        <h2 className="text-2xl font-bold text-center text-white">✨ Enhanced Features</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-blue-400 text-2xl mb-3">📱</div>
            <h3 className="font-semibold text-white mb-2">Responsive Grid</h3>
            <p className="text-gray-300 text-sm">
              Optimized breakpoints: 3-5 columns desktop, 2-3 tablet, 1-2 mobile for perfect viewing on any device.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-green-400 text-2xl mb-3">🛒</div>
            <h3 className="font-semibold text-white mb-2">Smart CTAs</h3>
            <p className="text-gray-300 text-sm">
              Conditional buttons: "Add to Cart" for fixed-price items, "Bid Now" for auctions. Context-aware interactions.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-purple-400 text-2xl mb-3">🔒</div>
            <h3 className="font-semibold text-white mb-2">Trust Indicators</h3>
            <p className="text-gray-300 text-sm">
              Verified sellers ✅, DAO-approved 🗳, escrow protected 🔒, and reputation scores for buyer confidence.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-yellow-400 text-2xl mb-3">💰</div>
            <h3 className="font-semibold text-white mb-2">Dual Pricing</h3>
            <p className="text-gray-300 text-sm">
              Bold crypto prices (ETH, USDC) with fiat equivalents. Clear pricing for both crypto and traditional users.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-red-400 text-2xl mb-3">⚡</div>
            <h3 className="font-semibold text-white mb-2">Performance</h3>
            <p className="text-gray-300 text-sm">
              Lazy loading, image optimization, Redis caching, and CDN integration for lightning-fast browsing.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-indigo-400 text-2xl mb-3">🤝</div>
            <h3 className="font-semibold text-white mb-2">Multi-Seller Escrow</h3>
            <p className="text-gray-300 text-sm">
              Separate escrow contracts per seller with automated release, dispute resolution, and DAO governance.
            </p>
          </div>
        </div>
      </div>

      {/* Demo Instructions */}
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-6 border border-white/20">
        <h3 className="font-semibold text-white mb-3">🎮 Try the Demo</h3>
        <ul className="space-y-2 text-gray-300 text-sm">
          <li>• <strong>Filter by category:</strong> See how different product types display</li>
          <li>• <strong>Compare listing types:</strong> Notice "Add to Cart" vs "Bid Now" buttons</li>
          <li>• <strong>Check trust indicators:</strong> Look for verification badges and safety scores</li>
          <li>• <strong>Resize your browser:</strong> Watch the responsive grid adapt</li>
          <li>• <strong>Hover over products:</strong> See enhanced interactions and animations</li>
        </ul>
      </div>
    </div>
  );
};

export default ProductGridDemo;