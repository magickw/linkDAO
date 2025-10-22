import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

// Enhanced product card animations
export const productCardAnimations = {
  entrance: {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.95 },
    transition: { duration: 0.3, ease: 'easeOut' as any }
  },
  hover: {
    whileHover: {
      y: -8,
      scale: 1.02,
      transition: { duration: 0.2, ease: 'easeOut' as any }
    }
  },
  tap: {
    whileTap: { scale: 0.98 }
  }
};

// Enhanced search bar animations
export const searchBarAnimations = {
  focus: {
    whileFocus: {
      scale: 1.02,
      transition: { duration: 0.2 }
    }
  },
  suggestion: {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.2 }
  }
};

// Enhanced filter panel animations
export const filterPanelAnimations = {
  expand: {
    initial: { opacity: 0, height: 0 },
    animate: { opacity: 1, height: 'auto' },
    exit: { opacity: 0, height: 0 },
    transition: { duration: 0.3, ease: 'easeInOut' as any }
  },
  collapse: {
    initial: { opacity: 1, height: 'auto' },
    animate: { opacity: 0, height: 0 },
    exit: { opacity: 0, height: 0 },
    transition: { duration: 0.3, ease: 'easeInOut' as any }
  }
};

// Enhanced badge animations
export const badgeAnimations = {
  pulse: {
    animate: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut' as any
      }
    }
  },
  bounce: {
    whileHover: {
      y: -2,
      transition: { type: 'spring', stiffness: 400, damping: 10 }
    }
  }
};

// Enhanced notification animations
export const notificationAnimations = {
  toast: {
    initial: { opacity: 0, x: 300, scale: 0.8 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 300, scale: 0.8 },
    transition: { duration: 0.3, ease: 'easeOut' as any }
  },
  banner: {
    initial: { opacity: 0, y: -50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -50 },
    transition: { duration: 0.3, ease: 'easeOut' as any }
  }
};

// Animated Product Badge Component
interface AnimatedProductBadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

export function AnimatedProductBadge({
  children,
  variant = 'primary',
  size = 'md',
  animated = true,
  className = ''
}: AnimatedProductBadgeProps) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full transition-all duration-200';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg',
    secondary: 'bg-gradient-to-r from-secondary-500 to-secondary-600 text-white shadow-lg',
    success: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg',
    warning: 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg',
    error: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg',
    info: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <motion.div
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      whileHover={animated ? { scale: 1.05, y: -2 } : {}}
      whileTap={animated ? { scale: 0.95 } : {}}
      animate={animated ? { 
        scale: [1, 1.05, 1],
        transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as any }
      } : {}}

    >
      {children}
    </motion.div>
  );
}

// Animated Seller Badge Component
interface AnimatedSellerBadgeProps {
  children: React.ReactNode;
  tier?: 'basic' | 'premium' | 'enterprise' | 'dao';
  onlineStatus?: 'online' | 'offline' | 'away';
  animated?: boolean;
  className?: string;
}

export function AnimatedSellerBadge({
  children,
  tier = 'basic',
  onlineStatus = 'offline',
  animated = true,
  className = ''
}: AnimatedSellerBadgeProps) {
  const baseClasses = 'inline-flex items-center gap-2 font-medium rounded-lg px-3 py-1.5 transition-all duration-200';
  
  const tierClasses = {
    basic: 'bg-gray-700/50 text-white border border-gray-600',
    premium: 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 text-white border border-purple-500/50',
    enterprise: 'bg-gradient-to-r from-blue-600/30 to-cyan-600/30 text-white border border-blue-500/50',
    dao: 'bg-gradient-to-r from-amber-600/30 to-yellow-600/30 text-white border border-amber-500/50'
  };

  // Online status indicator
  const getStatusIndicator = () => {
    const statusColors = {
      online: 'bg-green-500',
      offline: 'bg-gray-500',
      away: 'bg-yellow-500'
    };
    
    return (
      <div className="relative">
        <div className={`w-3 h-3 rounded-full ${statusColors[onlineStatus]}`} />
        {animated && onlineStatus === 'online' && (
          <motion.div
            className={`absolute inset-0 rounded-full ${statusColors[onlineStatus]}`}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.7, 0, 0.7]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut' as any
            }}

          />
        )}
      </div>
    );
  };

  return (
    <motion.div
      className={`${baseClasses} ${tierClasses[tier]} ${className}`}
      whileHover={animated ? { scale: 1.03, y: -1 } : {}}
      whileTap={animated ? { scale: 0.98 } : {}}
      animate={animated && tier === 'dao' ? { 
        boxShadow: [
          '0 0 5px rgba(255, 215, 0, 0.3)',
          '0 0 20px rgba(255, 215, 0, 0.6)',
          '0 0 5px rgba(255, 215, 0, 0.3)'
        ],
        transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
      } : {}}
    >
      {getStatusIndicator()}
      <span>{children}</span>
    </motion.div>
  );
}

// Animated Engagement Metrics Component
interface AnimatedEngagementMetricsProps {
  views: number;
  favorites: number;
  sales?: number;
  className?: string;
}

export function AnimatedEngagementMetrics({
  views,
  favorites,
  sales,
  className = ''
}: AnimatedEngagementMetricsProps) {
  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <div className={`flex items-center gap-4 text-sm ${className}`}>
      <motion.div 
        className="flex items-center gap-1 text-white/70"
        whileHover={{ scale: 1.1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
      >
        <motion.span
          animate={{ 
            scale: [1, 1.2, 1],
            color: ['#9ca3af', '#60a5fa', '#9ca3af']
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity, 
            ease: 'easeInOut' 
          }}
        >
          👁️
        </motion.span>
        <span>{formatNumber(views)}</span>
      </motion.div>
      
      <motion.div 
        className="flex items-center gap-1 text-white/70"
        whileHover={{ scale: 1.1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
      >
        <motion.span
          animate={{ 
            scale: [1, 1.2, 1],
            color: ['#9ca3af', '#f87171', '#9ca3af']
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity, 
            ease: 'easeInOut',
            delay: 0.5
          }}
        >
          ❤️
        </motion.span>
        <span>{formatNumber(favorites)}</span>
      </motion.div>
      
      {sales !== undefined && (
        <motion.div 
          className="flex items-center gap-1 text-white/70"
          whileHover={{ scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        >
          <motion.span
            animate={{ 
              scale: [1, 1.2, 1],
              color: ['#9ca3af', '#34d399', '#9ca3af']
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: 'easeInOut',
              delay: 1
            }}
          >
            🛒
          </motion.span>
          <span>{formatNumber(sales)}</span>
        </motion.div>
      )}
    </div>
  );
}

// Animated Price Display Component
interface AnimatedPriceDisplayProps {
  cryptoPrice: string;
  cryptoSymbol: string;
  fiatPrice?: string;
  fiatSymbol?: string;
  className?: string;
}

export function AnimatedPriceDisplay({
  cryptoPrice,
  cryptoSymbol,
  fiatPrice,
  fiatSymbol = 'USD',
  className = ''
}: AnimatedPriceDisplayProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div 
      className={`flex flex-col ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="text-2xl font-bold text-white"
        animate={isHovered ? { 
          scale: 1.05,
          textShadow: '0 0 8px rgba(255, 255, 255, 0.5)'
        } : { 
          scale: 1,
          textShadow: 'none'
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {cryptoPrice} {cryptoSymbol}
      </motion.div>
      
      {fiatPrice && (
        <motion.div
          className="text-sm text-white/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0.8 }}
          transition={{ duration: 0.3 }}
        >
          ≈ {fiatSymbol === 'USD' ? '$' : fiatSymbol}{fiatPrice}
        </motion.div>
      )}
    </div>
  );
}

// Animated Trust Indicator Component
interface AnimatedTrustIndicatorProps {
  type: 'verified' | 'escrow' | 'onchain' | 'dao';
  label: string;
  className?: string;
}

export function AnimatedTrustIndicator({
  type,
  label,
  className = ''
}: AnimatedTrustIndicatorProps) {
  const iconMap = {
    verified: '✅',
    escrow: '🔒',
    onchain: '⛓️',
    dao: '🏛️'
  };

  const colorMap = {
    verified: 'from-green-500 to-emerald-500',
    escrow: 'from-blue-500 to-cyan-500',
    onchain: 'from-purple-500 to-fuchsia-500',
    dao: 'from-amber-500 to-yellow-500'
  };

  return (
    <motion.div
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
        bg-gradient-to-r ${colorMap[type]} text-white
        shadow-lg ${className}
      `}
      whileHover={{ 
        scale: 1.1,
        y: -2,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
      }}
      whileTap={{ scale: 0.95 }}
      animate={{
        boxShadow: [
          '0 0 4px rgba(255, 255, 255, 0.2)',
          '0 0 12px rgba(255, 255, 255, 0.4)',
          '0 0 4px rgba(255, 255, 255, 0.2)'
        ]
      }}
      transition={{
        boxShadow: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }
      }}
    >
      <span>{iconMap[type]}</span>
      <span>{label}</span>
    </motion.div>
  );
}

// Animated Loading Skeleton Component
interface AnimatedLoadingSkeletonProps {
  variant?: 'text' | 'rect' | 'circle' | 'productCard';
  width?: string;
  height?: string;
  className?: string;
}

export function AnimatedLoadingSkeleton({
  variant = 'text',
  width = '100%',
  height = '1rem',
  className = ''
}: AnimatedLoadingSkeletonProps) {
  const baseClasses = 'rounded-lg';
  
  const variantClasses = {
    text: 'h-4 rounded',
    rect: 'rounded',
    circle: 'rounded-full',
    productCard: 'rounded-xl'
  };

  return (
    <motion.div
      className={`
        ${baseClasses} ${variantClasses[variant]} ${className}
        bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700
        bg-[length:200%_100%]
      `}
      style={{ width, height }}
      animate={{
        backgroundPosition: ['100% 0', '0 0', '100% 0']
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    />
  );
}

// Animated Search Result Item Component
interface AnimatedSearchResultItemProps {
  title: string;
  description: string;
  image: string;
  price: string;
  onClick?: () => void;
  className?: string;
}

export function AnimatedSearchResultItem({
  title,
  description,
  image,
  price,
  onClick,
  className = ''
}: AnimatedSearchResultItemProps) {
  return (
    <motion.div
      className={`
        flex items-center gap-4 p-4 rounded-xl cursor-pointer
        bg-white/5 hover:bg-white/10 backdrop-blur-sm
        border border-white/10 hover:border-white/20
        transition-all duration-300 ${className}
      `}
      onClick={onClick}
      whileHover={{
        x: 4,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
      }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="w-16 h-16 rounded-lg overflow-hidden"
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover"
        />
      </motion.div>
      
      <div className="flex-1 min-w-0">
        <motion.h3 
          className="font-semibold text-white truncate"
          style={{
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent'
          }}
          animate={{ 
            background: [
              'linear-gradient(90deg, #ffffff, #e5e7eb)',
              'linear-gradient(90deg, #e5e7eb, #ffffff)',
              'linear-gradient(90deg, #ffffff, #e5e7eb)'
            ]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          {title}
        </motion.h3>
        <p className="text-sm text-white/70 line-clamp-2">{description}</p>
      </div>
      
      <motion.div
        className="text-lg font-bold text-white"
        whileHover={{ scale: 1.1 }}
        transition={{ type: 'spring', stiffness: 400 }}
      >
        {price}
      </motion.div>
    </motion.div>
  );
}

// Animated Filter Toggle Component
interface AnimatedFilterToggleProps {
  active: boolean;
  label: string;
  count?: number;
  onClick?: () => void;
  className?: string;
}

export function AnimatedFilterToggle({
  active,
  label,
  count,
  onClick,
  className = ''
}: AnimatedFilterToggleProps) {
  return (
    <motion.button
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
        transition-all duration-200 ${className}
        ${active 
          ? 'bg-primary-600 text-white shadow-lg' 
          : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
        }
      `}
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      animate={active ? {
        boxShadow: [
          '0 0 4px rgba(102, 126, 234, 0.3)',
          '0 0 16px rgba(102, 126, 234, 0.6)',
          '0 0 4px rgba(102, 126, 234, 0.3)'
        ] as any
      } : {}}
      transition={{
        boxShadow: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }
      }}
    >
      <span>{label}</span>
      {count !== undefined && (
        <motion.span
          className="px-2 py-0.5 rounded-full text-xs bg-white/20"
          animate={active ? { 
            scale: [1, 1.2, 1],
            backgroundColor: ['#ffffff33', '#ffffff66', '#ffffff33'] as any
          } : {}}
          transition={{ 
            scale: { duration: 1, repeat: Infinity },
            backgroundColor: { duration: 2, repeat: Infinity }
          }}
        >
          {count}
        </motion.span>
      )}
    </motion.button>
  );
}

// Animated Category Card Component
interface AnimatedCategoryCardProps {
  title: string;
  itemCount: number;
  icon: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function AnimatedCategoryCard({
  title,
  itemCount,
  icon,
  onClick,
  className = ''
}: AnimatedCategoryCardProps) {
  const hoverVariants: Variants = {
    rest: {
      scale: 1,
      transition: {
        duration: 0.3,
        ease: 'easeOut' as any,
      },
    },
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.2,
        ease: 'easeOut' as any,
      },
    },
  };

  const tapVariants: Variants = {
    rest: {
      scale: 1,
      transition: {
        duration: 0.2,
      },
    },
    tap: {
      scale: 0.95,
      transition: {
        duration: 0.2,
      },
    },
  };

  const staggerAnimations = {
    container: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.1,
          ease: 'easeInOut' as any,
        },
      },
    },
    item: {
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.3,
          ease: 'easeInOut' as any,
        },
      },
    },
  };

  return (
    <motion.div
      className={`
        relative p-6 rounded-2xl cursor-pointer
        bg-gradient-to-br from-white/10 to-white/5
        border border-white/10 hover:border-white/20
        backdrop-blur-sm transition-all duration-300 ${className}
      `}
      onClick={onClick}
      whileHover={{
        y: -8,
        scale: 1.02,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)'
      }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
        <motion.div
          className="text-3xl mb-4"
          animate={{ 
            rotate: [0, 5, -5, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            rotate: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
          }}
        >
          {icon}
        </motion.div>
        
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        
        <motion.div
          className="text-sm text-white/70"
          animate={{ 
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: 'easeInOut' 
          }}
        >
          {itemCount} items
        </motion.div>
      </div>
    </motion.div>
  );
}
