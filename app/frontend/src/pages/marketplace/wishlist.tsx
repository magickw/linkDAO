/**
 * Wishlist Page - Displays user's saved products
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { wishlistService, WishlistItem } from '@/services/wishlistService';
import { ShoppingCart, X } from 'lucide-react';

const WishlistPage: React.FC = () => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Load wishlist items
    const loadWishlist = async () => {
      const state = await wishlistService.getWishlistState();
      setWishlistItems(state.items);
    };

    loadWishlist();

    // Subscribe to wishlist changes
    const unsubscribe = wishlistService.subscribe((state) => {
      setWishlistItems(state.items);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleRemoveItem = async (itemId: string) => {
    await wishlistService.removeItem(itemId);
  };

  const handleAddToCart = (item: WishlistItem) => {
    // In a real implementation, you would add to cart here
    console.log('Add to cart:', item);
    alert(`Added ${item.title} to your cart!`);
  };

  const handleViewProduct = (itemId: string) => {
    router.push(`/marketplace/listing/${encodeURIComponent(itemId)}`);
  };

  return (
    <Layout title="My Wishlist | Marketplace" fullWidth={true}>
      <Head>
        <title>My Wishlist | Marketplace</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-white mb-8">My Wishlist</h1>

          {wishlistItems.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20">
              <h2 className="text-2xl font-semibold text-white mb-2">Your wishlist is empty</h2>
              <p className="text-white/70 mb-6">Save items that you like to your wishlist</p>
              <button
                onClick={() => router.push('/marketplace')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Browse Marketplace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlistItems.map((item) => (
                <div key={item.id} className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/20">
                  <div className="relative">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="absolute top-2 right-2 bg-white/20 hover:bg-white/30 rounded-full p-1 shadow-md backdrop-blur-sm"
                    >
                      <X size={20} className="text-white" />
                    </button>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                    <p className="text-white/70 text-sm mb-2 line-clamp-2">{item.description}</p>
                    
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-bold text-white">
                        {item.price.fiatSymbol}{item.price.fiat}
                      </span>
                      <span className="text-sm text-white/70">
                        {item.price.crypto} {item.price.cryptoSymbol}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                      >
                        <ShoppingCart size={16} />
                        Add to Cart
                      </button>
                      <button
                        onClick={() => handleViewProduct(item.id)}
                        className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-lg transition-colors border border-white/30"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default WishlistPage;