/**
 * Homepage Component - Main Web3 Marketplace homepage
 * Combines all homepage sections with glassmorphic design
 */

import React from 'react';
import CategoryGrid from './CategoryGrid';
import FeaturedProducts from './FeaturedProducts';
import BannerCarousel from './BannerCarousel';
import DealsSection from './DealsSection';

const Homepage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner Carousel */}
      <BannerCarousel />
      
      {/* Category Grid */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Shop by Category</h2>
        <CategoryGrid />
      </div>
      
      {/* Featured Products */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Featured Products</h2>
        <FeaturedProducts />
      </div>
      
      {/* Deals of the Day */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Deals of the Day</h2>
        <DealsSection />
      </div>
    </div>
  );
};

export default Homepage;