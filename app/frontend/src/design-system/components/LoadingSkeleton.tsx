/**
 * LoadingSkeleton Component - Glassmorphic loading skeletons
 * Provides consistent loading states with glassmorphism styling
 */

import React from 'react';
import { motion } from 'framer-motion';
import { designTokens } from '../tokens';

interface LoadingSkeletonProps {
  /** Skeleton variant */
  variant?: 'text' | 'card' | 'image' | 'button' | 'avatar' | 'custom';
  /** Width of the skeleton */
  width?: string | number;
  /** Height of the skeleton */
  height?: string | number;
  /** Border radius */
  borderRadius?: string;
  /** Number of lines for text skeleton */
  lines?: number;
  /** Animation speed */
  speed?: 'slow' | 'normal' | 'fast';
  /** Additional CSS classes */
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'text',
  width = '100%',
  height = '1rem',
  borderRadius,
  lines = 1,
  speed = 'normal',
  className = '',
}) => {
  const speedConfig = {
    slow: 2.5,
    normal: 1.5,
    fast: 1,
  };

  const animationDuration = speedConfig[speed];

  const baseSkeletonStyle = {
    background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)',
    backgroundSize: '200% 100%',
    borderRadius: borderRadius || designTokens.glassmorphism.primary.borderRadius,
    backdropFilter: 'blur(4px)',
  };

  const shimmerVariants = {
    animate: {
      backgroundPosition: ['200% 0', '-200% 0'],
      transition: {
        duration: animationDuration,
        repeat: Infinity,
        ease: 'linear' as const,
      },
    },
  };

  const getVariantStyle = () => {
    switch (variant) {
      case 'text':
        return {
          width,
          height,
          borderRadius: '4px',
        };
      
      case 'card':
        return {
          width: width || '300px',
          height: height || '200px',
          borderRadius: designTokens.glassmorphism.secondary.borderRadius,
        };
      
      case 'image':
        return {
          width: width || '100%',
          height: height || '200px',
          borderRadius: '8px',
        };
      
      case 'button':
        return {
          width: width || '120px',
          height: height || '40px',
          borderRadius: '12px',
        };
      
      case 'avatar':
        return {
          width: width || '40px',
          height: height || '40px',
          borderRadius: '50%',
        };
      
      case 'custom':
      default:
        return {
          width,
          height,
        };
    }
  };

  const skeletonStyle = {
    ...baseSkeletonStyle,
    ...getVariantStyle(),
  };

  // For text with multiple lines
  if (variant === 'text' && lines > 1) {
    return (
      <div className={`loading-skeleton loading-skeleton--text-multiline ${className}`}>
        {Array.from({ length: lines }, (_, index) => (
          <motion.div
            key={index}
            style={{
              ...skeletonStyle,
              width: index === lines - 1 ? '75%' : '100%',
              marginBottom: index < lines - 1 ? designTokens.spacing.xs : 0,
            }}
            variants={shimmerVariants}
            animate="animate"
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      style={skeletonStyle}
      className={`loading-skeleton loading-skeleton--${variant} ${className}`}
      variants={shimmerVariants}
      animate="animate"
    />
  );
};

// Specialized skeleton components
export const TextSkeleton: React.FC<Omit<LoadingSkeletonProps, 'variant'>> = (props) => (
  <LoadingSkeleton variant="text" {...props} />
);

export const CardSkeleton: React.FC<Omit<LoadingSkeletonProps, 'variant'>> = (props) => (
  <LoadingSkeleton variant="card" {...props} />
);

export const ImageSkeleton: React.FC<Omit<LoadingSkeletonProps, 'variant'>> = (props) => (
  <LoadingSkeleton variant="image" {...props} />
);

export const ButtonSkeleton: React.FC<Omit<LoadingSkeletonProps, 'variant'>> = (props) => (
  <LoadingSkeleton variant="button" {...props} />
);

export const AvatarSkeleton: React.FC<Omit<LoadingSkeletonProps, 'variant'>> = (props) => (
  <LoadingSkeleton variant="avatar" {...props} />
);

// Complex skeleton layouts
interface ProductCardSkeletonProps {
  className?: string;
}

export const ProductCardSkeleton: React.FC<ProductCardSkeletonProps> = ({ className = '' }) => (
  <div className={`product-card-skeleton ${className}`} style={{ padding: designTokens.spacing.lg }}>
    <ImageSkeleton height="200px" className="mb-4" />
    <div style={{ marginBottom: designTokens.spacing.sm }}>
      <TextSkeleton lines={2} />
    </div>
    <div style={{ marginBottom: designTokens.spacing.md }}>
      <TextSkeleton width="60%" height="1.5rem" />
    </div>
    <div style={{ display: 'flex', gap: designTokens.spacing.sm }}>
      <ButtonSkeleton width="80px" />
      <ButtonSkeleton width="80px" />
    </div>
  </div>
);

interface UserProfileSkeletonProps {
  className?: string;
}

export const UserProfileSkeleton: React.FC<UserProfileSkeletonProps> = ({ className = '' }) => (
  <div className={`user-profile-skeleton ${className}`} style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: designTokens.spacing.md 
  }}>
    <AvatarSkeleton width="48px" height="48px" />
    <div style={{ flex: 1 }}>
      <TextSkeleton width="120px" height="1.2rem" className="mb-2" />
      <TextSkeleton width="80px" height="0.9rem" />
    </div>
  </div>
);

interface NavbarSkeletonProps {
  className?: string;
}

export const NavbarSkeleton: React.FC<NavbarSkeletonProps> = ({ className = '' }) => (
  <div className={`navbar-skeleton ${className}`} style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${designTokens.spacing.md} ${designTokens.spacing.lg}`,
  }}>
    <TextSkeleton width="120px" height="32px" />
    <TextSkeleton width="300px" height="40px" borderRadius="20px" />
    <div style={{ display: 'flex', gap: designTokens.spacing.md }}>
      <ButtonSkeleton width="100px" />
      <AvatarSkeleton width="40px" height="40px" />
    </div>
  </div>
);