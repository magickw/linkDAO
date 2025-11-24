/**
 * TrustIndicators Component - Web3 trust badges and indicators
 * Displays verification status, escrow protection, and blockchain certification
 */

import React from 'react';
import { motion } from 'framer-motion';
import { designTokens } from '../tokens';

interface TrustIndicatorsProps {
  /** Product is verified */
  verified?: boolean;
  /** Transaction is escrow protected */
  escrowProtected?: boolean;
  /** Item is on-chain certified */
  onChainCertified?: boolean;
  /** Seller is DAO approved */
  daoApproved?: boolean;
  /** Display as badges or inline */
  layout?: 'badges' | 'inline' | 'compact';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

interface TrustBadgeProps {
  icon: string;
  label: string;
  color: string;
  glowColor: string;
  size: 'sm' | 'md' | 'lg';
  layout: 'badges' | 'inline' | 'compact';
}

const TrustBadge: React.FC<TrustBadgeProps> = ({
  icon,
  label,
  color,
  glowColor,
  size,
  layout,
}) => {
  const sizeConfig = {
    sm: {
      fontSize: designTokens?.typography?.fontSize?.xs || '0.75rem',
      padding: `${designTokens?.spacing?.xs || '0.25rem'} ${designTokens?.spacing?.sm || '0.5rem'}`,
      iconSize: '12px',
      borderRadius: '6px',
    },
    md: {
      fontSize: designTokens?.typography?.fontSize?.sm || '0.875rem',
      padding: `${designTokens?.spacing?.sm || '0.5rem'} ${designTokens?.spacing?.md || '1rem'}`,
      iconSize: '14px',
      borderRadius: '8px',
    },
    lg: {
      fontSize: designTokens?.typography?.fontSize?.base || '1rem',
      padding: `${designTokens?.spacing?.md || '1rem'} ${designTokens?.spacing?.lg || '1.5rem'}`,
      iconSize: '16px',
      borderRadius: '10px',
    },
  };

  const config = sizeConfig[size] || sizeConfig.md;

  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: designTokens?.spacing?.xs || '0.25rem',
    padding: config.padding,
    borderRadius: config.borderRadius,
    fontSize: config.fontSize,
    fontWeight: designTokens?.typography?.fontWeight?.medium || '500',
    color: '#ffffff',
    background: `linear-gradient(135deg, ${color}dd, ${color}aa)`,
    border: `1px solid ${color}66`,
    backdropFilter: 'blur(8px)',
    boxShadow: `0 0 12px ${glowColor}40, 0 2px 8px rgba(0,0,0,0.2)`,
    whiteSpace: 'nowrap' as const,
  };

  const iconStyle = {
    fontSize: config.iconSize,
    lineHeight: 1,
  };

  const hoverVariants = {
    hover: {
      scale: 1.05,
      boxShadow: `0 0 20px ${glowColor}60, 0 4px 12px rgba(0,0,0,0.3)`,
      transition: { duration: 0.2 },
    },
  };

  return (
    <motion.div
      style={badgeStyle}
      className="trust-badge"
      variants={hoverVariants}
      whileHover="hover"
    >
      <span style={iconStyle}>{icon}</span>
      {layout !== 'compact' && <span>{label}</span>}
    </motion.div>
  );
};

export const TrustIndicators: React.FC<TrustIndicatorsProps> = ({
  verified = false,
  escrowProtected = false,
  onChainCertified = false,
  daoApproved = false,
  layout = 'badges',
  size = 'md',
  className = '',
}) => {
  const indicators = [];

  if (verified) {
    indicators.push({
      key: 'verified',
      icon: '✅',
      label: 'Verified',
      color: designTokens.colors.trust.verified,
      glowColor: designTokens.colors.trust.verified,
    });
  }

  if (escrowProtected) {
    indicators.push({
      key: 'escrow',
      icon: '🔒',
      label: 'Escrow Protected',
      color: designTokens.colors.trust.escrow,
      glowColor: designTokens.colors.trust.escrow,
    });
  }

  if (onChainCertified) {
    indicators.push({
      key: 'onchain',
      icon: '⛓️',
      label: 'On-Chain Certified',
      color: designTokens.colors.trust.onChain,
      glowColor: designTokens.colors.trust.onChain,
    });
  }

  if (daoApproved) {
    indicators.push({
      key: 'dao',
      icon: '🏛️',
      label: 'DAO Approved',
      color: designTokens.colors.trust.dao,
      glowColor: designTokens.colors.trust.dao,
    });
  }

  if (indicators.length === 0) {
    return null;
  }

  const containerStyle = {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: designTokens.spacing.sm,
    flexWrap: layout === 'inline' ? 'nowrap' as const : 'wrap' as const,
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3, ease: 'easeOut' as const },
    },
  };

  return (
    <motion.div
      style={containerStyle}
      className={`trust-indicators trust-indicators--${layout} ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {indicators.map((indicator) => (
        <motion.div key={indicator.key} variants={itemVariants}>
          <TrustBadge
            icon={indicator.icon}
            label={indicator.label}
            color={indicator.color}
            glowColor={indicator.glowColor}
            size={size}
            layout={layout}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};

// Specialized trust indicator components
export const VerifiedBadge: React.FC<Omit<TrustIndicatorsProps, 'verified'>> = (props) => (
  <TrustIndicators verified {...props} />
);

export const EscrowBadge: React.FC<Omit<TrustIndicatorsProps, 'escrowProtected'>> = (props) => (
  <TrustIndicators escrowProtected {...props} />
);

export const OnChainBadge: React.FC<Omit<TrustIndicatorsProps, 'onChainCertified'>> = (props) => (
  <TrustIndicators onChainCertified {...props} />
);

export const DAOBadge: React.FC<Omit<TrustIndicatorsProps, 'daoApproved'>> = (props) => (
  <TrustIndicators daoApproved {...props} />
);