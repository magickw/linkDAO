/**
 * GlassPanel Component - Core glassmorphic container
 * Provides consistent glassmorphism styling with variants
 */

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { designTokens, GlassmorphismVariant, NFTShadowVariant } from '../tokens';

interface GlassPanelProps extends Omit<HTMLMotionProps<'div'>, 'style'> {
  /** Glassmorphism variant to apply */
  variant?: GlassmorphismVariant;
  /** NFT-style shadow variant */
  nftShadow?: NFTShadowVariant;
  /** Enable hover effects */
  hoverable?: boolean;
  /** Custom padding */
  padding?: string;
  /** Custom margin */
  margin?: string;
  /** Additional CSS classes */
  className?: string;
  /** Children components */
  children: React.ReactNode;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  variant = 'primary',
  nftShadow,
  hoverable = false,
  padding = designTokens?.spacing?.lg || '1.5rem',
  margin = '0',
  className = '',
  children,
  ...motionProps
}) => {
  const glassStyle = designTokens?.glassmorphism?.[variant] || designTokens.glassmorphism.primary;
  const nftShadowStyle = nftShadow ? (designTokens?.nftShadows?.[nftShadow] || null) : null;
  const hoverAnimation = hoverable ? (designTokens?.animations?.hover || {}) : {};

  const combinedStyle = {
    ...glassStyle,
    ...(nftShadowStyle && {
      boxShadow: nftShadowStyle.boxShadow,
      border: nftShadowStyle.border,
      backgroundImage: nftShadowStyle.backgroundImage,
    }),
    padding,
    margin,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  };

  const hoverVariants = hoverable ? {
    hover: {
      y: -4,
      boxShadow: nftShadowStyle 
        ? `${nftShadowStyle.boxShadow.replace(/rgba\(([^)]+)\)/g, (match, rgba) => {
            const values = rgba.split(',');
            const alpha = parseFloat(values[3]) * 1.5;
            return `rgba(${values[0]},${values[1]},${values[2]},${Math.min(alpha, 1)})`;
          })}`
        : '0 12px 48px 0 rgba(31, 38, 135, 0.5)',
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const },
    },
  } : undefined;

  return (
    <motion.div
      style={combinedStyle}
      className={`glass-panel ${className}`}
      variants={hoverVariants}
      whileHover={hoverable ? 'hover' : undefined}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
};

// Specialized glass panel variants
export const GlassCard: React.FC<Omit<GlassPanelProps, 'variant'>> = (props) => (
  <GlassPanel variant="secondary" hoverable {...props} />
);

export const GlassModal: React.FC<Omit<GlassPanelProps, 'variant'>> = (props) => (
  <GlassPanel variant="modal" {...props} />
);

export const GlassNavbar: React.FC<Omit<GlassPanelProps, 'variant'>> = (props) => (
  <GlassPanel variant="navbar" {...props} />
);

// NFT-style glass panels
export const NFTGlassCard: React.FC<Omit<GlassPanelProps, 'nftShadow'>> = (props) => (
  <GlassPanel nftShadow="standard" hoverable {...props} />
);

export const PremiumNFTCard: React.FC<Omit<GlassPanelProps, 'nftShadow'>> = (props) => (
  <GlassPanel nftShadow="premium" hoverable {...props} />
);

export const DAOApprovedCard: React.FC<Omit<GlassPanelProps, 'nftShadow'>> = (props) => (
  <GlassPanel nftShadow="dao" hoverable {...props} />
);