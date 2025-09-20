/**
 * Visual Polish Components - Task 9 Implementation
 * Enhanced components with glassmorphism effects, smooth animations, and theme system
 */

// Glassmorphism Components
export {
  default as GlassmorphismCard,
  EnhancedPostCardGlass,
  GlassSidebarLink
} from './GlassmorphismCard';

// Smooth Animations
export {
  smoothHoverAnimations,
  microAnimations,
  staggerAnimations,
  AnimatedButton,
  AnimatedCard,
  StaggeredList,
  FloatingActionButton,
  PageTransition,
  AnimatedToast,
  RippleEffect
} from './SmoothAnimations';

// Enhanced Theme System
export {
  useEnhancedTheme,
  EnhancedThemeProvider,
  EnhancedThemeToggle,
  ThemeAware,
  useSystemTheme
} from './EnhancedThemeSystem';

// Loading Skeletons
export {
  PostCardSkeleton,
  SidebarLinkSkeleton,
  UserProfileCardSkeleton,
  WalletDashboardSkeleton,
  FeedSkeleton,
  NavigationSkeleton,
  TrendingWidgetSkeleton,
  ReputationProgressSkeleton,
  BadgeCollectionSkeleton,
  StaggeredSkeleton,
  PulseLoader
} from './LoadingSkeletons';

// Responsive Design
export {
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveStack,
  ResponsiveText,
  MobileFirstCard,
  ResponsiveNavigation,
  ResponsiveImage,
  useResponsiveSpacing
} from './ResponsiveDesign';

// Enhanced component variants for existing components
export const VisualPolishVariants = {
  // Post card variants
  postCard: {
    glass: 'glass-enhanced post-card-enhanced',
    trending: 'post-card-trending',
    pinned: 'post-card-pinned'
  },
  
  // Button variants
  button: {
    enhanced: 'btn-enhanced',
    primary: 'btn-primary',
    secondary: 'btn-secondary'
  },
  
  // Sidebar variants
  sidebar: {
    link: 'sidebar-link',
    linkActive: 'sidebar-link-active'
  },
  
  // Animation variants
  animations: {
    hover: 'smooth-hover',
    scale: 'smooth-scale',
    glow: 'smooth-glow',
    fadeInUp: 'animate-fadeInUp',
    fadeInDown: 'animate-fadeInDown',
    scaleIn: 'animate-scaleIn',
    shimmer: 'animate-shimmer',
    pulseGlow: 'animate-pulse-glow',
    float: 'animate-float'
  },
  
  // Form variants
  form: {
    input: 'input-enhanced',
    focus: 'focus-enhanced'
  },
  
  // Badge variants
  badge: {
    enhanced: 'badge-enhanced',
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning'
  },
  
  // Modal variants
  modal: {
    enhanced: 'modal-enhanced',
    backdrop: 'modal-backdrop'
  },
  
  // Notification variants
  notification: {
    enhanced: 'notification-enhanced',
    success: 'notification-success',
    error: 'notification-error',
    warning: 'notification-warning',
    info: 'notification-info'
  },
  
  // Skeleton variants
  skeleton: {
    enhanced: 'skeleton-enhanced'
  },
  
  // Theme variants
  theme: {
    toggle: 'theme-toggle'
  },
  
  // Tooltip variants
  tooltip: {
    enhanced: 'tooltip-enhanced'
  }
};

// Utility functions for applying visual polish
export const VisualPolishUtils = {
  // Apply glassmorphism effect
  applyGlass: (variant: 'primary' | 'secondary' | 'modal' | 'navbar' = 'primary') => {
    return `glass-enhanced glass-${variant}`;
  },
  
  // Apply hover animation
  applyHover: (type: 'lift' | 'scale' | 'glow' = 'lift') => {
    return `smooth-hover smooth-${type}`;
  },
  
  // Apply micro-animation
  applyAnimation: (type: 'fadeInUp' | 'fadeInDown' | 'scaleIn' | 'shimmer' | 'pulseGlow' | 'float') => {
    return `animate-${type}`;
  },
  
  // Apply responsive classes
  applyResponsive: (classes: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
  }) => {
    const responsiveClasses = [];
    if (classes.xs) responsiveClasses.push(classes.xs);
    if (classes.sm) responsiveClasses.push(`sm:${classes.sm}`);
    if (classes.md) responsiveClasses.push(`md:${classes.md}`);
    if (classes.lg) responsiveClasses.push(`lg:${classes.lg}`);
    if (classes.xl) responsiveClasses.push(`xl:${classes.xl}`);
    return responsiveClasses.join(' ');
  },
  
  // Apply theme-aware classes
  applyThemeAware: (lightClass: string, darkClass: string) => {
    return `${lightClass} dark:${darkClass}`;
  },
  
  // Combine multiple visual polish effects
  combine: (...effects: string[]) => {
    return effects.filter(Boolean).join(' ');
  }
};

// CSS class constants for easy reference
export const VisualPolishClasses = {
  // Glass effects
  GLASS_PRIMARY: 'glass-enhanced',
  GLASS_HOVER: 'glass-hover',
  
  // Animations
  SMOOTH_HOVER: 'smooth-hover',
  SMOOTH_SCALE: 'smooth-scale',
  SMOOTH_GLOW: 'smooth-glow',
  FADE_IN_UP: 'animate-fadeInUp',
  FADE_IN_DOWN: 'animate-fadeInDown',
  SCALE_IN: 'animate-scaleIn',
  SHIMMER: 'animate-shimmer',
  PULSE_GLOW: 'animate-pulse-glow',
  FLOAT: 'animate-float',
  
  // Components
  POST_CARD: 'post-card-enhanced',
  POST_CARD_TRENDING: 'post-card-trending',
  POST_CARD_PINNED: 'post-card-pinned',
  SIDEBAR_LINK: 'sidebar-link',
  SIDEBAR_LINK_ACTIVE: 'sidebar-link-active',
  BUTTON_ENHANCED: 'btn-enhanced',
  BUTTON_PRIMARY: 'btn-primary',
  BUTTON_SECONDARY: 'btn-secondary',
  INPUT_ENHANCED: 'input-enhanced',
  BADGE_ENHANCED: 'badge-enhanced',
  MODAL_ENHANCED: 'modal-enhanced',
  NOTIFICATION_ENHANCED: 'notification-enhanced',
  SKELETON_ENHANCED: 'skeleton-enhanced',
  THEME_TOGGLE: 'theme-toggle',
  TOOLTIP_ENHANCED: 'tooltip-enhanced',
  
  // Focus
  FOCUS_ENHANCED: 'focus-enhanced'
} as const;

// Type definitions
export type VisualPolishVariant = keyof typeof VisualPolishVariants;
export type GlassmorphismVariant = 'primary' | 'secondary' | 'modal' | 'navbar';
export type HoverAnimationType = 'lift' | 'scale' | 'glow';
export type MicroAnimationType = 'fadeInUp' | 'fadeInDown' | 'scaleIn' | 'shimmer' | 'pulseGlow' | 'float';

// Integration Components
export {
  VisualPolishDashboard,
  VisualPolishHeader,
  VisualPolishSidebar,
  VisualPolishMainContent,
  VisualPolishNotificationSystem,
  useVisualPolishNotifications
} from './VisualPolishIntegration';

// Default export with all utilities
export default {
  variants: VisualPolishVariants,
  utils: VisualPolishUtils,
  classes: VisualPolishClasses
};