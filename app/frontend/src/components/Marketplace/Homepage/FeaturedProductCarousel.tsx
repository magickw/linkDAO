/**
 * FeaturedProductCarousel Component - Auto-rotating product showcase
 * Displays featured products with NFT and physical product support
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, NFTGlassCard, PremiumNFTCard } from '@/design-system/components/GlassPanel';
import { Button, GhostButton } from '@/design-system/components/Button';
import { TrustIndicators } from '@/design-system/components/TrustIndicators';
import { DualPricing } from '@/design-system/components/DualPricing';
import { designTokens } from '@/design-system/tokens';

interface FeaturedProduct {
  id: string;
  title: string;
  description: string;
  image: string;
  type: 'nft' | 'physical' | 'digital';
  price: {
    crypto: string;
    fiat: string;
    currency: string;
  };
  seller: {
    id: string;
    name: string;
    avatar: string;
    verified: boolean;
    reputation: number;
  };
  badges: {
    verified: boolean;
    escrowProtected: boolean;
    onChainCertified: boolean;
    daoApproved?: boolean;
  };
  stats: {
    views: number;
    likes: number;
    bids?: number;
  };
  category: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

interface FeaturedProductCarouselProps {
  autoRotate?: boolean;
  rotationInterval?: number;
  className?: string;
}

export const FeaturedProductCarousel: React.FC<FeaturedProductCarouselProps> = ({
  autoRotate = true,
  rotationInterval = 5000,
  className = "",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();

  const featuredProducts: FeaturedProduct[] = [
    {
      id: '1',
      title: 'Ethereum Genesis Collection #1337',
      description: 'Rare digital art piece from the legendary Genesis collection featuring unique algorithmic patterns.',
      image: '/api/placeholder/400/300',
      type: 'nft',
      price: {
        crypto: '2.5 ETH',
        fiat: '$4,250',
        currency: 'ETH',
      },
      seller: {
        id: '0x2345678901234567890123456789012345678901',
        name: 'CryptoArtist',
        avatar: '/api/placeholder/40/40',
        verified: true,
        reputation: 4.9,
      },
      badges: {
        verified: true,
        escrowProtected: true,
        onChainCertified: true,
        daoApproved: true,
      },
      stats: {
        views: 15420,
        likes: 892,
        bids: 23,
      },
      category: 'Digital Art',
      rarity: 'legendary',
    },
    {
      id: '2',
      title: 'Ledger Nano X - Crypto Hardware Wallet',
      description: 'Secure your crypto assets with the most trusted hardware wallet in the industry.',
      image: '/api/placeholder/400/300',
      type: 'physical',
      price: {
        crypto: '0.07 ETH',
        fiat: '$119',
        currency: 'USDC',
      },
      seller: {
        id: '0x1234567890123456789012345678901234567890',
        name: 'CryptoGear Store',
        avatar: '/api/placeholder/40/40',
        verified: true,
        reputation: 4.8,
      },
      badges: {
        verified: true,
        escrowProtected: true,
        onChainCertified: false,
      },
      stats: {
        views: 8934,
        likes: 456,
      },
      category: 'Hardware',
    },
    {
      id: '3',
      title: 'Web3 Development Course Bundle',
      description: 'Complete course series covering Solidity, DApp development, and smart contract security.',
      image: '/api/placeholder/400/300',
      type: 'digital',
      price: {
        crypto: '0.15 ETH',
        fiat: '$255',
        currency: 'USDC',
      },
      seller: {
        id: '0x3456789012345678901234567890123456789012',
        name: 'Web3Academy',
        avatar: '/api/placeholder/40/40',
        verified: true,
        reputation: 4.9,
      },
      badges: {
        verified: true,
        escrowProtected: true,
        onChainCertified: true,
        daoApproved: true,
      },
      stats: {
        views: 12567,
        likes: 734,
      },
      category: 'Education',
    },
    {
      id: '4',
      title: 'Metaverse Land Plot - Prime Location',
      description: 'Premium virtual real estate in the heart of the metaverse district with high foot traffic.',
      image: '/api/placeholder/400/300',
      type: 'nft',
      price: {
        crypto: '5.2 ETH',
        fiat: '$8,840',
        currency: 'ETH',
      },
      seller: {
        id: '0x4567890123456789012345678901234567890123',
        name: 'MetaLand Ventures',
        avatar: '/api/placeholder/40/40',
        verified: true,
        reputation: 4.7,
      },
      badges: {
        verified: true,
        escrowProtected: true,
        onChainCertified: true,
      },
      stats: {
        views: 9876,
        likes: 543,
        bids: 12,
      },
      category: 'Metaverse',
      rarity: 'epic',
    },
  ];

  // Auto-rotation logic
  useEffect(() => {
    if (!autoRotate || isHovered) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredProducts.length);
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [autoRotate, isHovered, rotationInterval, featuredProducts.length]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredProducts.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + featuredProducts.length) % featuredProducts.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const getCardComponent = (product: FeaturedProduct) => {
    if (product.type === 'nft' && product.rarity === 'legendary') {
      return PremiumNFTCard;
    } else if (product.type === 'nft') {
      return NFTGlassCard;
    }
    return GlassCard;
  };

  const getRarityColor = (rarity?: string) => {
    switch (rarity) {
      case 'legendary': return 'text-yellow-400';
      case 'epic': return 'text-purple-400';
      case 'rare': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const currentProduct = featuredProducts[currentIndex];
  const CardComponent = getCardComponent(currentProduct);

  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-8"
      >
        <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Featured Products
        </h3>
        <p className="text-white/70">
          Handpicked items from verified sellers
        </p>
      </motion.div>

      {/* Carousel Container */}
      <div className="relative max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5, ease: 'easeInOut' as any }}
          >
            <CardComponent className="overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Image */}
                <div className="relative">
                  <div className="aspect-w-4 aspect-h-3 rounded-lg overflow-hidden bg-gray-800">
                    <img
                      src={currentProduct.image}
                      alt={currentProduct.title}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Type Badge */}
                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        currentProduct.type === 'nft' 
                          ? 'bg-purple-500/80 text-white' 
                          : currentProduct.type === 'physical'
                          ? 'bg-blue-500/80 text-white'
                          : 'bg-green-500/80 text-white'
                      }`}>
                        {currentProduct.type.toUpperCase()}
                      </span>
                    </div>

                    {/* Rarity Badge */}
                    {currentProduct.rarity && (
                      <div className="absolute top-4 right-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium bg-black/60 ${getRarityColor(currentProduct.rarity)}`}>
                          {currentProduct.rarity.toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Stats Overlay */}
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between text-white/80 text-sm">
                      <div className="flex items-center space-x-4">
                        <span>👁️ {currentProduct.stats.views.toLocaleString()}</span>
                        <span>❤️ {currentProduct.stats.likes}</span>
                        {currentProduct.stats.bids && (
                          <span>🔥 {currentProduct.stats.bids} bids</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Details */}
                <div className="flex flex-col justify-between">
                  <div>
                    {/* Category */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-white/60">{currentProduct.category}</span>
                      <TrustIndicators
                        verified={currentProduct.badges.verified}
                        escrowProtected={currentProduct.badges.escrowProtected}
                        onChainCertified={currentProduct.badges.onChainCertified}
                        daoApproved={currentProduct.badges.daoApproved}
                      />
                    </div>

                    {/* Title */}
                    <h4 className="text-xl font-bold text-white mb-3">
                      {currentProduct.title}
                    </h4>

                    {/* Description */}
                    <p className="text-white/70 mb-4 line-clamp-3">
                      {currentProduct.description}
                    </p>

                    {/* Seller Info */}
                    <button 
                      onClick={() => router.push(`/seller/${currentProduct.seller.id}`)}
                      className="flex items-center space-x-3 mb-4 p-2 rounded-lg hover:bg-white/10 transition-colors group cursor-pointer w-full text-left"
                    >
                      <img
                        src={currentProduct.seller.avatar}
                        alt={currentProduct.seller.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-1">
                          <span className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
                            {currentProduct.seller.name}
                          </span>
                          {currentProduct.seller.verified && (
                            <span className="text-green-400">✓</span>
                          )}
                          <span className="text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                            → Visit Store
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-yellow-400">⭐</span>
                          <span className="text-white/60 text-xs">
                            {currentProduct.seller.reputation}
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Price and Actions */}
                  <div>
                    <DualPricing
                      cryptoPrice={currentProduct.price.crypto}
                      fiatPrice={currentProduct.price.fiat}
                      cryptoSymbol={currentProduct.price.currency}
                      className="mb-4"
                    />

                    <div className="flex space-x-3">
                      <Button variant="primary" className="flex-1">
                        {currentProduct.type === 'nft' ? 'Place Bid' : 'Buy Now'}
                      </Button>
                      <GhostButton>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </GhostButton>
                    </div>
                  </div>
                </div>
              </div>
            </CardComponent>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all z-10"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all z-10"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Dots Indicator */}
      <div className="flex justify-center space-x-2 mt-6">
        {featuredProducts.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentIndex
                ? 'bg-white scale-125'
                : 'bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>

      {/* Auto-rotation indicator */}
      {autoRotate && !isHovered && (
        <div className="absolute top-4 right-4 flex items-center space-x-2 text-white/60 text-xs">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span>Auto-rotating</span>
        </div>
      )}
    </div>
  );
};