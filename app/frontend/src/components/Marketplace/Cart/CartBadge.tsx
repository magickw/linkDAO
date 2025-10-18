/**
 * CartBadge Component - Shows cart item count with animation
 */

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

interface CartBadgeProps {
  className?: string;
  showText?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const CartBadge: React.FC<CartBadgeProps> = ({
  className = '',
  showText = false,
  size = 'medium'
}) => {
  const { state } = useCart();
  const itemCount = state.totals.itemCount;

  const sizeClasses = {
    small: {
      icon: 'w-4 h-4',
      badge: 'w-4 h-4 text-xs',
      container: 'p-1'
    },
    medium: {
      icon: 'w-6 h-6',
      badge: 'w-5 h-5 text-xs',
      container: 'p-2'
    },
    large: {
      icon: 'w-8 h-8',
      badge: 'w-6 h-6 text-sm',
      container: 'p-3'
    }
  };

  const classes = sizeClasses[size];

  return (
    <Link href="/marketplace/cart" className={`relative inline-flex items-center gap-2 ${className}`}>
      <motion.div
        className={`relative ${classes.container} rounded-full hover:bg-white/10 transition-colors`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <ShoppingCart className={`${classes.icon} text-gray-700 dark:text-gray-300`} />
        
        <AnimatePresence>
          {itemCount > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={`absolute -top-1 -right-1 ${classes.badge} bg-red-500 text-white rounded-full flex items-center justify-center font-medium shadow-lg`}
            >
              {itemCount > 99 ? '99+' : itemCount}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {showText && (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Cart
          </span>
          {itemCount > 0 && (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </Link>
  );
};

export default CartBadge;