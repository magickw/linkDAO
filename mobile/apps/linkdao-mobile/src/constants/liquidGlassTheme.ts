/**
 * iOS 26 Liquid Glass UI Theme
 * 
 * Liquid Glass is a translucent, dynamic material that reflects and refracts
 * surrounding content while transforming to bring focus to user tasks.
 * 
 * Key Characteristics:
 * - Lensing: Bends and concentrates light in real-time
 * - Materialization: Elements appear by gradually modulating light bending
 * - Fluidity: Gel-like flexibility with instant touch responsiveness
 * - Morphing: Dynamic transformation between control states
 * - Adaptivity: Multi-layer composition adjusting to content, color scheme, and size
 */

import { StyleSheet, Dimensions } from 'react-native';

// Screen dimensions for adaptive layouts
const { width, height } = Dimensions.get('window');

// Glass variants - matching iOS 26 specifications
export enum GlassVariant {
  REGULAR = 'regular',      // Toolbars, buttons, navigation bars, standard controls
  CLEAR = 'clear',          // Small floating controls over photos/maps with bold foreground
  IDENTITY = 'identity',    // Conditional toggling (minimal glass effect)
}

// Glass shapes
export enum GlassShape {
  CAPSULE = 'capsule',                    // Default, rounded pill shape
  CIRCLE = 'circle',                      // Perfect circle
  ROUNDED_RECTANGLE = 'roundedRectangle', // Standard rounded corners
  CONTAINER_CONCENTRIC = 'containerConcentric', // Aligns with container corners
  ELLIPSE = 'ellipse',                    // Stretched circle
}

// Transparency levels (opacity notation system)
export enum GlassOpacity {
  FULL = 1.0,           // 100% - Vital content (main text, primary CTAs, logos)
  HIGH = 0.7,           // 70% - Supporting text, secondary buttons, navigation tabs
  MEDIUM = 0.4,         // 40% - Decorative UI (dividers, outlines, icons)
  LOW = 0.2,            // 20% - Subtle tints, background overlays, atmospheric effects
  MINIMAL = 0.08,       // 8% - Very subtle glass effect
}

// Tint colors for semantic meaning
export enum GlassTint {
  PRIMARY = '#3b82f6',
  SECONDARY = '#8b5cf6',
  SUCCESS = '#10b981',
  WARNING = '#f59e0b',
  ERROR = '#ef4444',
  INFO = '#06b6d4',
  NEUTRAL = '#ffffff',
}

// Light conditions for adaptive glass
export enum LightCondition {
  BRIGHT = 'bright',       // Direct sunlight
  NORMAL = 'normal',       // Indoor lighting
  DIM = 'dim',            // Low light
  DARK = 'dark',          // Night mode
}

// Glass effect configuration
export interface GlassEffectConfig {
  variant: GlassVariant;
  shape: GlassShape;
  opacity: GlassOpacity;
  tint?: GlassTint;
  tintOpacity?: number;
  isInteractive: boolean;
  isEnabled: boolean;
  lightCondition?: LightCondition;
}

// Liquid Glass color palette
export const LiquidGlassColors = {
  // Core glass colors
  glass: {
    light: {
      background: 'rgba(255, 255, 255, 0.7)',
      border: 'rgba(255, 255, 255, 0.3)',
      shadow: 'rgba(0, 0, 0, 0.1)',
      highlight: 'rgba(255, 255, 255, 0.8)',
    },
    dark: {
      background: 'rgba(31, 41, 55, 0.7)',
      border: 'rgba(255, 255, 255, 0.1)',
      shadow: 'rgba(0, 0, 0, 0.3)',
      highlight: 'rgba(255, 255, 255, 0.15)',
    },
  },

  // Tinted glass variants
  tints: {
    primary: 'rgba(59, 130, 246, 0.15)',
    secondary: 'rgba(139, 92, 246, 0.15)',
    success: 'rgba(16, 185, 129, 0.15)',
    warning: 'rgba(245, 158, 11, 0.15)',
    error: 'rgba(239, 68, 68, 0.15)',
    info: 'rgba(6, 182, 212, 0.15)',
  },

  // Text colors (high contrast for legibility)
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.9)',
    tertiary: 'rgba(255, 255, 255, 0.7)',
    disabled: 'rgba(255, 255, 255, 0.4)',
  },

  // Gradient colors
  gradients: {
    primary: ['#3b82f6', '#8b5cf6'],
    secondary: ['#8b5cf6', '#ec4899'],
    success: ['#10b981', '#06b6d4'],
    warning: ['#f59e0b', '#ef4444'],
    glass: ['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.4)'],
    glassDark: ['rgba(31, 41, 55, 0.8)', 'rgba(31, 41, 55, 0.4)'],
  },
};

// Glass blur amounts (backdrop blur simulation)
export const GlassBlur = {
  LIGHT: 10,    // Subtle blur for light backgrounds
  MEDIUM: 20,   // Standard blur
  HEAVY: 40,    // Strong blur for dark backgrounds
  ULTRA: 60,    // Maximum blur for special effects
};

// Border radius values
export const GlassBorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

// Shadow configurations for depth
export const GlassShadow = {
  light: {
    small: {
      shadowColor: 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: 'rgba(0, 0, 0, 0.15)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.6,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: 'rgba(0, 0, 0, 0.2)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.7,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  dark: {
    small: {
      shadowColor: 'rgba(0, 0, 0, 0.3)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.6,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: 'rgba(0, 0, 0, 0.4)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.7,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: 'rgba(0, 0, 0, 0.5)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.8,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};

// Animation configurations
export const GlassAnimation = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
  spring: {
    stiffness: 300,
    damping: 30,
    mass: 1,
  },
};

// Default glass effect configurations
export const DefaultGlassConfigs: Record<GlassVariant, Partial<GlassEffectConfig>> = {
  [GlassVariant.REGULAR]: {
    variant: GlassVariant.REGULAR,
    opacity: GlassOpacity.HIGH,
    isInteractive: false,
    isEnabled: true,
  },
  [GlassVariant.CLEAR]: {
    variant: GlassVariant.CLEAR,
    opacity: GlassOpacity.MEDIUM,
    isInteractive: false,
    isEnabled: true,
  },
  [GlassVariant.IDENTITY]: {
    variant: GlassVariant.IDENTITY,
    opacity: GlassOpacity.MINIMAL,
    isInteractive: false,
    isEnabled: true,
  },
};

// Helper function to create glass styles
export const createGlassStyle = (
  config: GlassEffectConfig,
  isDarkMode: boolean = false
): any => {
  const { variant, opacity, tint, tintOpacity, isInteractive, shape } = config;
  const colors = isDarkMode ? LiquidGlassColors.glass.dark : LiquidGlassColors.glass.light;
  
  // Base glass style
  const baseStyle: any = {
    backgroundColor: colors.background.replace('0.7', opacity.toString()),
    borderWidth: 1,
    borderColor: colors.border,
    // Note: backdropBlur is not available in React Native StyleSheet
    // This would need to be implemented with a custom component or library
    shadowColor: isDarkMode ? GlassShadow.dark.medium.shadowColor : GlassShadow.light.medium.shadowColor,
    shadowOffset: isDarkMode ? GlassShadow.dark.medium.shadowOffset : GlassShadow.light.medium.shadowOffset,
    shadowOpacity: isDarkMode ? GlassShadow.dark.medium.shadowOpacity : GlassShadow.light.medium.shadowOpacity,
    shadowRadius: isDarkMode ? GlassShadow.dark.medium.shadowRadius : GlassShadow.light.medium.shadowRadius,
    elevation: isDarkMode ? GlassShadow.dark.medium.elevation : GlassShadow.light.medium.elevation,
  };

  // Apply tint if specified
  if (tint && tintOpacity) {
    baseStyle.backgroundColor = LiquidGlassColors.tints[tint].replace('0.15', (opacity * tintOpacity).toString());
  }

  // Apply shape
  switch (shape) {
    case GlassShape.CAPSULE:
      baseStyle.borderRadius = width * 0.5;
      break;
    case GlassShape.CIRCLE:
      baseStyle.borderRadius = 9999;
      break;
    case GlassShape.ROUNDED_RECTANGLE:
      baseStyle.borderRadius = GlassBorderRadius.lg;
      break;
    case GlassShape.CONTAINER_CONCENTRIC:
      baseStyle.borderRadius = GlassBorderRadius['2xl'];
      break;
    case GlassShape.ELLIPSE:
      baseStyle.borderRadius = GlassBorderRadius.xl;
      break;
  }

  // Apply interactive effects
  if (isInteractive) {
    baseStyle.transform = [{ scale: 1 }];
    // Note: These would be applied via Animated API in actual implementation
  }

  return baseStyle;
};

// Pre-defined glass styles for common use cases
export const GlassStyles = StyleSheet.create({
  // Regular glass card
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
    padding: 16,
    ...GlassShadow.light.medium,
  },

  // Clear glass overlay
  overlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    ...GlassShadow.light.small,
  },

  // Glass button
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 9999,
    paddingHorizontal: 24,
    paddingVertical: 12,
    ...GlassShadow.light.medium,
  },

  // Glass navigation bar
  navbar: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    ...GlassShadow.light.large,
  },

  // Glass modal
  modal: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 24,
    padding: 24,
    ...GlassShadow.light.large,
  },

  // Dark mode variants
  cardDark: {
    backgroundColor: 'rgba(31, 41, 55, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    ...GlassShadow.dark.medium,
  },

  navbarDark: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    ...GlassShadow.dark.large,
  },
});

// Export complete theme
export const LiquidGlassTheme = {
  colors: LiquidGlassColors,
  blur: GlassBlur,
  borderRadius: GlassBorderRadius,
  shadow: GlassShadow,
  animation: GlassAnimation,
  variant: GlassVariant,
  shape: GlassShape,
  opacity: GlassOpacity,
  tint: GlassTint,
  lightCondition: LightCondition,
  styles: GlassStyles,
  createStyle: createGlassStyle,
  defaults: DefaultGlassConfigs,
};

export default LiquidGlassTheme;