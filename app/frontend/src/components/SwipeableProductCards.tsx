'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { 
  HeartIcon, 
  ShareIcon, 
  ShoppingCartIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

interface Product {
  id: string;
  title: string;
  price: {
    crypto: string;
    fiat: string;
    currency: string;
  };
  image: string;
  seller: {
    name: string;
    avatar: string;
    verified: boolean;
    reputation: number;
  };
  likes: number;
  isLiked: boolean;
  category: string;
  tags: string[];
}

interface SwipeAction {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  label: string;
  threshold: number;
}

interface SwipeableProductCardsProps {
  products: Product[];
  onProductPress?: (product: Product) => void;
  onLike?: (productId: string) => void;
  onShare?: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
  onQuickView?: (productId: string) => void;
  className?: string;
}

const SwipeableProductCards: React.FC<SwipeableProductCardsProps> = ({
  products,
  onProductPress,
  onLike,
  onShare,
  onAddToCart,
  onQuickView,
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const swipeActions: { left: SwipeAction[]; right: SwipeAction[] } = {
    left: [
      {
        id: 'like',
        icon: HeartIcon,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        label: 'Like',
        threshold: 100
      },
      {
        id: 'share',
        icon: ShareIcon,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        label: 'Share',
        threshold: 150
      }
    ],
    right: [
      {
        id: 'cart',
        icon: ShoppingCartIcon,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        label: 'Add to Cart',
        threshold: 100
      },
      {
        id: 'quickview',
        icon: EyeIcon,
        color: 'text-purple-500',
        bgColor: 'bg-purple-50',
        label: 'Quick View',
        threshold: 150
      }
    ]
  };

  const handleSwipe = useCallback((direction: 'left' | 'right', productId: string, actionId: string) => {
    switch (actionId) {
      case 'like':
        onLike?.(productId);
        break;
      case 'share':
        onShare?.(productId);
        break;
      case 'cart':
        onAddToCart?.(productId);
        break;
      case 'quickview':
        onQuickView?.(productId);
        break;
    }
  }, [onLike, onShare, onAddToCart, onQuickView]);

  const ProductCard: React.FC<{ 
    product: Product; 
    index: number; 
    isActive: boolean;
    zIndex: number;
  }> = ({ product, index, isActive, zIndex }) => {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 0.8, 1, 0.8, 0.5]);

    const [activeAction, setActiveAction] = useState<SwipeAction | null>(null);

    const handleDrag = (event: any, info: PanInfo) => {
      const threshold = 100;
      const direction = info.offset.x > 0 ? 'right' : 'left';
      const distance = Math.abs(info.offset.x);
      
      const actions = swipeActions[direction];
      const triggeredAction = actions.find(action => distance >= action.threshold);
      
      setActiveAction(triggeredAction || null);
      setSwipeDirection(distance > threshold ? direction : null);
    };

    const handleDragEnd = (event: any, info: PanInfo) => {
      const threshold = 100;
      const direction = info.offset.x > 0 ? 'right' : 'left';
      const distance = Math.abs(info.offset.x);

      if (distance > threshold && activeAction) {
        handleSwipe(direction, product.id, activeAction.id);
        
        // Move to next card
        if (currentIndex < products.length - 1) {
          setCurrentIndex(currentIndex + 1);
        }
      }

      setActiveAction(null);
      setSwipeDirection(null);
      x.set(0);
    };

    return (
      <motion.div
        className={`
          absolute inset-0 cursor-grab active:cursor-grabbing
          ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}
        `}
        style={{ 
          x, 
          rotate, 
          opacity,
          zIndex: zIndex - index
        }}
        drag={isActive ? 'x' : false}
        dragConstraints={{ left: -300, right: 300 }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.95 }}
        animate={{
          scale: isActive ? 1 : 0.95,
          y: isActive ? 0 : index * 10
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        <div className="relative w-full h-full bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Swipe Actions Background */}
          {swipeDirection && (
            <motion.div
              className={`
                absolute inset-0 flex items-center justify-center
                ${activeAction?.bgColor || 'bg-gray-50'}
              `}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              exit={{ opacity: 0 }}
            >
              {activeAction && (
                <div className="flex flex-col items-center space-y-2">
                  <activeAction.icon className={`w-12 h-12 ${activeAction.color}`} />
                  <span className={`text-lg font-semibold ${activeAction.color}`}>
                    {activeAction.label}
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* Product Image */}
          <div className="relative h-2/3 overflow-hidden">
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-cover"
              draggable={false}
            />
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            
            {/* Quick actions */}
            <div className="absolute top-4 right-4 flex flex-col space-y-2">
              <motion.button
                className={`
                  p-3 rounded-full backdrop-blur-sm border border-white/20
                  ${product.isLiked ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-700'}
                `}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onLike?.(product.id);
                }}
              >
                {product.isLiked ? (
                  <HeartIconSolid className="w-5 h-5" />
                ) : (
                  <HeartIcon className="w-5 h-5" />
                )}
              </motion.button>
              
              <motion.button
                className="p-3 rounded-full bg-white/90 backdrop-blur-sm border border-white/20 text-gray-700"
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onShare?.(product.id);
                }}
              >
                <ShareIcon className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Category tag */}
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-gray-700">
                {product.category}
              </span>
            </div>
          </div>

          {/* Product Info */}
          <div className="p-6 h-1/3 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                {product.title}
              </h3>
              
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-2xl font-bold text-indigo-600">
                    {product.price.crypto}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    ≈ {product.price.fiat}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <HeartIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">{product.likes}</span>
                </div>
              </div>
            </div>

            {/* Seller info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={product.seller.avatar}
                  alt={product.seller.name}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-medium text-gray-900">
                      {product.seller.name}
                    </span>
                    {product.seller.verified && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < product.seller.reputation ? 'bg-yellow-400' : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      {product.seller.reputation}/5
                    </span>
                  </div>
                </div>
              </div>

              <motion.button
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium"
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onProductPress?.(product);
                }}
              >
                View
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`relative w-full h-[600px] ${className}`} ref={constraintsRef}>
      {/* Cards stack */}
      <div className="relative w-full h-full">
        {products.slice(currentIndex, currentIndex + 3).map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
            isActive={index === 0}
            zIndex={products.length - index}
          />
        ))}
      </div>

      {/* Progress indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {products.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Swipe hints */}
      <div className="absolute bottom-16 left-4 right-4 flex justify-between pointer-events-none">
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
            <HeartIcon className="w-4 h-4 text-red-500" />
          </div>
          <span className="text-sm">Swipe left to like</span>
        </div>
        
        <div className="flex items-center space-x-2 text-gray-500">
          <span className="text-sm">Swipe right to add</span>
          <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
            <ShoppingCartIcon className="w-4 h-4 text-green-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwipeableProductCards;