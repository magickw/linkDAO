/**
 * Design System Index - Main export file for the glassmorphism design system
 * Provides centralized access to all design system components and utilities
 */

// Design Tokens
export { designTokens } from './tokens';
export type {
  GlassmorphismVariant,
  GradientVariant,
  NFTShadowVariant,
  AnimationVariant,
  BreakpointVariant,
  SpacingVariant,
  ColorVariant,
} from './tokens';

// Core Components
export {
  GlassPanel,
  GlassCard,
  GlassModal,
  GlassNavbar,
  NFTGlassCard,
  PremiumNFTCard,
  DAOApprovedCard,
} from './components/GlassPanel';

export {
  Button,
  PrimaryButton,
  SecondaryButton,
  OutlineButton,
  GhostButton,
  GradientButton,
} from './components/Button';

export {
  TrustIndicators,
  VerifiedBadge,
  EscrowBadge,
  OnChainBadge,
  DAOBadge,
} from './components/TrustIndicators';

export {
  DualPricing,
  ProductPricing,
  CardPricing,
  CompactPricing,
} from './components/DualPricing';

export {
  LoadingSkeleton,
  TextSkeleton,
  CardSkeleton,
  ImageSkeleton,
  ButtonSkeleton,
  AvatarSkeleton,
  ProductCardSkeleton,
  UserProfileSkeleton,
  NavbarSkeleton,
} from './components/LoadingSkeleton';

// Hooks
export {
  useResponsive,
  useBreakpoint,
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsTouch,
  useResponsiveValue,
  useResponsiveColumns,
  useResponsiveSpacing,
} from './hooks/useResponsive';

// Animations
export {
  easings,
  pageTransitions,
  fadeAnimations,
  scaleAnimations,
  slideAnimations,
  hoverAnimations,
  tapAnimations,
  loadingAnimations,
  staggerAnimations,
  modalAnimations,
  notificationAnimations,
  rippleAnimation,
  glassAnimations,
  createAnimation,
  animationPresets,
} from './animations';

// Utility functions for design system
export const createGlassStyle = (variant: GlassmorphismVariant = 'primary') => {
  return designTokens.glassmorphism[variant];
};

export const createGradientStyle = (variant: GradientVariant = 'primary') => {
  return {
    background: designTokens.gradients[variant],
  };
};

export const createNFTShadowStyle = (variant: NFTShadowVariant = 'standard') => {
  return designTokens.nftShadows[variant];
};

// Responsive utilities
export const getBreakpointValue = (breakpoint: BreakpointVariant): number => {
  return parseInt(designTokens.breakpoints[breakpoint]);
};

export const createResponsiveStyle = (styles: Record<BreakpointVariant, any>) => {
  const mediaQueries: Record<string, any> = {};
  
  Object.entries(styles).forEach(([breakpoint, style]) => {
    const bp = breakpoint as BreakpointVariant;
    const minWidth = designTokens.breakpoints[bp];
    mediaQueries[`@media (min-width: ${minWidth})`] = style;
  });
  
  return mediaQueries;
};

// Color utilities
export const getColorWithOpacity = (color: string, opacity: number): string => {
  // Simple utility to add opacity to hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return `#${hex}${alpha}`;
  }
  return color;
};

// Animation utilities
export const createStaggeredAnimation = (
  itemAnimation: any,
  staggerDelay: number = 0.1
) => ({
  container: {
    animate: {
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  },
  item: itemAnimation,
});

// Theme configuration
export const createTheme = (overrides: Partial<typeof designTokens> = {}) => {
  return {
    ...designTokens,
    ...overrides,
  };
};

// CSS-in-JS utilities for styled-components or emotion
export const glassmorphismCSS = (variant: GlassmorphismVariant = 'primary') => `
  background: ${designTokens.glassmorphism[variant].background};
  backdrop-filter: ${designTokens.glassmorphism[variant].backdropFilter};
  border: ${designTokens.glassmorphism[variant].border};
  border-radius: ${designTokens.glassmorphism[variant].borderRadius};
  box-shadow: ${designTokens.glassmorphism[variant].boxShadow};
`;

export const gradientCSS = (variant: GradientVariant = 'primary') => `
  background: ${designTokens.gradients[variant]};
`;

export const nftShadowCSS = (variant: NFTShadowVariant = 'standard') => `
  box-shadow: ${designTokens.nftShadows[variant].boxShadow};
  border: ${designTokens.nftShadows[variant].border};
  background-image: ${designTokens.nftShadows[variant].backgroundImage};
`;

// Default export with all utilities
export default {
  tokens: designTokens,
  createGlassStyle,
  createGradientStyle,
  createNFTShadowStyle,
  getBreakpointValue,
  createResponsiveStyle,
  getColorWithOpacity,
  createStaggeredAnimation,
  createTheme,
  glassmorphismCSS,
  gradientCSS,
  nftShadowCSS,
};