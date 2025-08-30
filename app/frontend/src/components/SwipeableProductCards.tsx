import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useResponsive } from '@/design-system/hooks/useResponsive';
import { designTokens } from '@/design-system/tokens';
import GestureHandler from './GestureHandler';

interface Product {
  id: string;
  title: string;
  price: {
    crypto: string;
    fiat: string;
    currency: string;
  };
  images: string[];
  seller: {
    name: string;
    verified: boolean;
    reputation: number;
  };
  trustIndicators: {
    verified: boolean;
    escrowProtected: boolean;
    onChainCertified: boolean;
  };
  category: string;
  isNFT?: boolean;
}

interface SwipeableProductCardsProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
  onProductFavorite?: (productId: string) => void;
  onProductShare?: (productId: string) => void;
  className?: string;
  cardVariant?: 'compact' | 'standard' | 'detailed';
  showSwipeHint?: boolean;
}

export default function SwipeableProductCards({
  products,
  onProductSelect,
  onProductFavorite,
  onProductShare,
  className = '',
  cardVariant = 'standard',
  showSwipeHint = true
}: SwipeableProductCardsProps) {
  const { isMobile, isTouch } = useResponsive();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null);
  const [showHint, setShowHint] = useState(showSwipeHint);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSwipeLeft = useCallback(() => {
    if (currentIndex < products.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setDragDirection('left');
      setTimeout(() => setDragDirection(null), 300);
    }
  }, [currentIndex, products.length]);

  const handleSwipeRight = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setDragDirection('right');
      setTimeout(() => setDragDirection(null), 300);
    }
  }, [currentIndex]);

  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    const threshold = 100;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    if (Math.abs(velocity) > 500 || Math.abs(offset) > threshold) {
      if (offset > 0 || velocity > 0) {
        handleSwipeRight();
      } else {
        handleSwipeLeft();
      }
    }
    
    if (showHint) {
      setShowHint(false);
    }
  }, [handleSwipeLeft, handleSwipeRight, showHint]);

  const renderTrustIndicators = (indicators: Product['trustIndicators']) => (
    <div className="flex space-x-1">
      {indicators.verified && (
        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
          ✅ Verified
        </span>
      )}
      {indicators.escrowProtected && (
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center">
          🔒 Escrow
        </span>
      )}
      {indicators.onChainCertified && (
        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full flex items-center">
          ⛓️ On-Chain
        </span>
      )}
    </div>
  );

  const renderProductCard = (product: Product, index: number) => {
    const isActive = index === currentIndex;
    const offset = index - currentIndex;
    
    return (
      <motion.div
        key={product.id}
        className="absolute inset-0"
        initial={false}
        animate={{
          x: `${offset * 100}%`,
          scale: isActive ? 1 : 0.9,
          opacity: Math.abs(offset) > 1 ? 0 : 1,
          zIndex: isActive ? 10 : Math.max(0, 10 - Math.abs(offset))
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30
        }}
        drag={isActive && isMobile ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{
          background: designTokens.glassmorphism.primary.background,
          backdropFilter: designTokens.glassmorphism.primary.backdropFilter,
          border: designTokens.glassmorphism.primary.border,
          borderRadius: designTokens.glassmorphism.primary.borderRadius,
          boxShadow: product.isNFT 
            ? designTokens.nftShadows.standard.boxShadow 
            : designTokens.glassmorphism.primary.boxShadow,
        }}
      >
        <div className="h-full flex flex-col">
          {/* Product Image */}
          <div className="relative h-48 overflow-hidden rounded-t-2xl">
            <img
              src={product.images[0]}
              alt={product.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            
            {/* NFT Badge */}
            {product.isNFT && (
              <div className="absolute top-3 left-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                NFT
              </div>
            )}
            
            {/* Action buttons */}
            <div className="absolute top-3 right-3 flex space-x-2">
              {onProductShare && (
                <GestureHandler
                  onTap={() => onProductShare(product.id)}
                  className="p-2 bg-black/20 backdrop-blur-sm rounded-full text-white hover:bg-black/30 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                </GestureHandler>
              )}
              
              {onProductFavorite && (
                <GestureHandler
                  onTap={() => onProductFavorite(product.id)}
                  className="p-2 bg-black/20 backdrop-blur-sm rounded-full text-white hover:bg-black/30 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </GestureHandler>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="flex-1 p-4 space-y-3">
            {/* Seller info */}
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {product.seller.name.charAt(0)}
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {product.seller.name}
              </span>
              {product.seller.verified && (
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>

            {/* Product title */}
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-2">
              {product.title}
            </h3>

            {/* Trust indicators */}
            {renderTrustIndicators(product.trustIndicators)}

            {/* Price */}
            <div className="space-y-1">
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {product.price.crypto}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {product.price.currency}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                ≈ {product.price.fiat}
              </div>
            </div>

            {/* Action button */}
            <GestureHandler
              onTap={() => onProductSelect(product)}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-medium text-center hover:from-blue-600 hover:to-purple-600 transition-all duration-200 touch-manipulation"
            >
              View Details
            </GestureHandler>
          </div>
        </div>
      </motion.div>
    );
  };

  if (!products.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No products available
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Cards container */}
      <div 
        ref={containerRef}
        className="relative h-[500px] overflow-hidden"
        style={{ perspective: '1000px' }}
      >
        {products.map((product, index) => renderProductCard(product, index))}
      </div>

      {/* Navigation dots */}
      <div className="flex justify-center space-x-2 mt-4">
        {products.map((_, index) => (
          <GestureHandler
            key={index}
            onTap={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              index === currentIndex 
                ? 'bg-blue-500 w-6' 
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <div />
          </GestureHandler>
        ))}
      </div>

      {/* Navigation arrows for desktop */}
      {!isMobile && (
        <>
          <button
            onClick={handleSwipeRight}
            disabled={currentIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={handleSwipeLeft}
            disabled={currentIndex === products.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Swipe hint */}
      <AnimatePresence>
        {showHint && isMobile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/70 text-white text-sm px-4 py-2 rounded-full flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <span>Swipe to browse</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product counter */}
      <div className="text-center mt-2 text-sm text-gray-500 dark:text-gray-400">
        {currentIndex + 1} of {products.length}
      </div>
    </div>
  );
}