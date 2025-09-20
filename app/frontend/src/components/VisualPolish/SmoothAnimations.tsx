import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

// Smooth hover animations for interactive elements
export const smoothHoverAnimations = {
  lift: {
    whileHover: {
      y: -4,
      transition: { duration: 0.2, ease: 'easeOut' }
    }
  },
  scale: {
    whileHover: {
      scale: 1.05,
      transition: { duration: 0.2, ease: 'easeOut' }
    }
  },
  glow: {
    whileHover: {
      boxShadow: '0 0 20px rgba(102, 126, 234, 0.4)',
      transition: { duration: 0.2, ease: 'easeOut' }
    }
  },
  subtle: {
    whileHover: {
      y: -2,
      scale: 1.02,
      transition: { duration: 0.15, ease: 'easeOut' }
    }
  }
};

// Micro-animations for state changes
export const microAnimations = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  },
  slideUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.3, ease: 'easeOut' as const }
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { duration: 0.2, ease: 'easeOut' as const }
  },
  bounce: {
    initial: { opacity: 0, scale: 0.3 },
    animate: { 
      opacity: 1, 
      scale: 1
    },
    exit: { opacity: 0, scale: 0.8 },
    transition: { 
      type: 'spring' as const,
      stiffness: 400,
      damping: 25
    }
  }
};

// Stagger animations for lists
export const staggerAnimations = {
  container: {
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' }
    }
  }
};

// Enhanced Button with smooth animations
interface AnimatedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  animation?: 'lift' | 'scale' | 'glow' | 'subtle';
}

export function AnimatedButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  animation = 'lift'
}: AnimatedButtonProps) {
  const baseClasses = 'font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden';
  
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-lg',
    secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-500',
    ghost: 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-500',
    gradient: 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white hover:from-primary-700 hover:to-secondary-700 focus:ring-primary-500 shadow-lg'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...smoothHoverAnimations[animation]}
      whileTap={{ scale: 0.95 }}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            className="flex items-center justify-center"
            {...microAnimations.fadeIn}
          >
            <motion.div
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        ) : (
          <motion.span
            key="content"
            {...microAnimations.fadeIn}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// Animated Card Container
interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  animation?: 'fadeIn' | 'slideUp' | 'scaleIn' | 'bounce';
}

export function AnimatedCard({
  children,
  className = '',
  delay = 0,
  animation = 'slideUp'
}: AnimatedCardProps) {
  return (
    <motion.div
      className={className}
      initial={microAnimations[animation].initial}
      animate={microAnimations[animation].animate}
      exit={microAnimations[animation].exit}
      transition={{
        ...(microAnimations[animation].transition || {}),
        delay
      }}
    >
      {children}
    </motion.div>
  );
}

// Staggered List Container
interface StaggeredListProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggeredList({
  children,
  className = '',
  staggerDelay = 0.1
}: StaggeredListProps) {
  return (
    <motion.div
      className={className}
      variants={{
        animate: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1
          }
        }
      }}
      initial="initial"
      animate="animate"
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={staggerAnimations.item}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// Floating Action Button with smooth animations
interface FloatingActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function FloatingActionButton({
  onClick,
  icon,
  className = '',
  size = 'md',
  position = 'bottom-right'
}: FloatingActionButtonProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-14 h-14',
    lg: 'w-16 h-16'
  };

  const positionClasses = {
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    'top-right': 'fixed top-6 right-6',
    'top-left': 'fixed top-6 left-6'
  };

  return (
    <motion.button
      onClick={onClick}
      className={`
        ${sizeClasses[size]} ${positionClasses[position]}
        bg-gradient-to-r from-primary-600 to-secondary-600
        text-white rounded-full shadow-lg
        flex items-center justify-center
        z-50 ${className}
      `}
      whileHover={{
        scale: 1.1,
        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.9 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
        delay: 0.5
      }}
    >
      {icon}
    </motion.button>
  );
}

// Page transition wrapper
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({
  children,
  className = ''
}: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.3,
        ease: 'easeOut'
      }}
    >
      {children}
    </motion.div>
  );
}

// Notification toast with smooth animations
interface AnimatedToastProps {
  children: React.ReactNode;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose?: () => void;
}

export function AnimatedToast({
  children,
  type = 'info',
  onClose
}: AnimatedToastProps) {
  const typeStyles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-black',
    info: 'bg-blue-500 text-white'
  };

  return (
    <motion.div
      className={`
        px-4 py-3 rounded-lg shadow-lg backdrop-blur-lg
        ${typeStyles[type]}
        flex items-center justify-between
        min-w-[300px] max-w-[500px]
      `}
      initial={{ opacity: 0, x: 300, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      layout
    >
      <div className="flex-1">
        {children}
      </div>
      
      {onClose && (
        <motion.button
          onClick={onClose}
          className="ml-3 text-white/80 hover:text-white"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          ✕
        </motion.button>
      )}
    </motion.div>
  );
}

// Ripple effect component
interface RippleEffectProps {
  children: React.ReactNode;
  className?: string;
  rippleColor?: string;
}

export function RippleEffect({
  children,
  className = '',
  rippleColor = 'rgba(255, 255, 255, 0.6)'
}: RippleEffectProps) {
  const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const newRipple = {
      id: Date.now(),
      x,
      y
    };
    
    setRipples(prev => [...prev, newRipple]);
    
    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 600);
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onClick={handleClick}
    >
      {children}
      
      {/* Ripples */}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.div
            key={ripple.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              backgroundColor: rippleColor
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}