/**
 * Animation Utilities - Framer Motion animation presets
 * Provides consistent animations for the glassmorphism design system
 */

import { Variants, Transition } from 'framer-motion';

// Easing functions
export const easings = {
  easeInOut: [0.4, 0, 0.2, 1],
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
  spring: { type: 'spring', stiffness: 300, damping: 30 },
} as const;

// Page transition animations
export const pageTransitions: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: easings.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: easings.easeIn,
    },
  },
};

// Fade animations
export const fadeAnimations: Variants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { duration: 0.3, ease: easings.easeOut },
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.2, ease: easings.easeIn },
    },
  },
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: easings.easeOut },
    },
    exit: { 
      opacity: 0, 
      y: -10,
      transition: { duration: 0.2, ease: easings.easeIn },
    },
  },
  fadeInDown: {
    initial: { opacity: 0, y: -20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: easings.easeOut },
    },
    exit: { 
      opacity: 0, 
      y: 10,
      transition: { duration: 0.2, ease: easings.easeIn },
    },
  },
};

// Scale animations
export const scaleAnimations: Variants = {
  scaleIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.3, ease: easings.easeOut },
    },
    exit: { 
      opacity: 0, 
      scale: 0.9,
      transition: { duration: 0.2, ease: easings.easeIn },
    },
  },
  scaleInBounce: {
    initial: { opacity: 0, scale: 0.3 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.5, ease: easings.bounce },
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      transition: { duration: 0.2, ease: easings.easeIn },
    },
  },
};

// Slide animations
export const slideAnimations: Variants = {
  slideInLeft: {
    initial: { opacity: 0, x: -50 },
    animate: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.4, ease: easings.easeOut },
    },
    exit: { 
      opacity: 0, 
      x: -30,
      transition: { duration: 0.2, ease: easings.easeIn },
    },
  },
  slideInRight: {
    initial: { opacity: 0, x: 50 },
    animate: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.4, ease: easings.easeOut },
    },
    exit: { 
      opacity: 0, 
      x: 30,
      transition: { duration: 0.2, ease: easings.easeIn },
    },
  },
  slideInUp: {
    initial: { opacity: 0, y: 50 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: easings.easeOut },
    },
    exit: { 
      opacity: 0, 
      y: 30,
      transition: { duration: 0.2, ease: easings.easeIn },
    },
  },
  slideInDown: {
    initial: { opacity: 0, y: -50 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: easings.easeOut },
    },
    exit: { 
      opacity: 0, 
      y: -30,
      transition: { duration: 0.2, ease: easings.easeIn },
    },
  },
};

// Hover animations
export const hoverAnimations = {
  lift: {
    y: -4,
    transition: { duration: 0.2, ease: easings.easeOut },
  },
  scale: {
    scale: 1.05,
    transition: { duration: 0.2, ease: easings.easeOut },
  },
  glow: {
    boxShadow: '0 0 20px rgba(102, 126, 234, 0.4)',
    transition: { duration: 0.2, ease: easings.easeOut },
  },
  rotate: {
    rotate: 5,
    transition: { duration: 0.2, ease: easings.easeOut },
  },
};

// Tap animations
export const tapAnimations = {
  press: {
    scale: 0.95,
    transition: { duration: 0.1, ease: easings.easeInOut },
  },
  bounce: {
    scale: 0.9,
    transition: { duration: 0.1, ease: easings.bounce },
  },
};

// Loading animations
export const loadingAnimations: Variants = {
  spin: {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'linear',
      },
    },
  },
  pulse: {
    animate: {
      scale: [1, 1.1, 1],
      opacity: [1, 0.7, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: easings.easeInOut,
      },
    },
  },
  bounce: {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        ease: easings.easeInOut,
      },
    },
  },
  wave: {
    animate: {
      scaleY: [1, 1.5, 1],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        ease: easings.easeInOut,
      },
    },
  },
};

// Stagger animations for lists
export const staggerAnimations = {
  container: {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3, ease: easings.easeOut },
    },
  },
};

// Modal animations
export const modalAnimations: Variants = {
  backdrop: {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { duration: 0.2 },
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.2 },
    },
  },
  modal: {
    initial: { opacity: 0, scale: 0.8, y: 50 },
    animate: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { duration: 0.3, ease: easings.easeOut },
    },
    exit: { 
      opacity: 0, 
      scale: 0.9, 
      y: 30,
      transition: { duration: 0.2, ease: easings.easeIn },
    },
  },
};

// Notification animations
export const notificationAnimations: Variants = {
  toast: {
    initial: { opacity: 0, x: 300, scale: 0.8 },
    animate: { 
      opacity: 1, 
      x: 0, 
      scale: 1,
      transition: { duration: 0.3, ease: easings.easeOut },
    },
    exit: { 
      opacity: 0, 
      x: 300, 
      scale: 0.8,
      transition: { duration: 0.2, ease: easings.easeIn },
    },
  },
  banner: {
    initial: { opacity: 0, y: -100 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: easings.easeOut },
    },
    exit: { 
      opacity: 0, 
      y: -100,
      transition: { duration: 0.3, ease: easings.easeIn },
    },
  },
};

// Ripple effect animation
export const rippleAnimation = {
  initial: { scale: 0, opacity: 1 },
  animate: { 
    scale: 4, 
    opacity: 0,
    transition: { duration: 0.6, ease: easings.easeOut },
  },
};

// Glassmorphism specific animations
export const glassAnimations: Variants = {
  glassHover: {
    initial: {},
    hover: {
      backdropFilter: 'blur(16px)',
      background: 'rgba(255, 255, 255, 0.15)',
      boxShadow: '0 12px 48px 0 rgba(31, 38, 135, 0.5)',
      transition: { duration: 0.3, ease: easings.easeOut },
    },
  },
  glassFocus: {
    initial: {},
    focus: {
      backdropFilter: 'blur(20px)',
      background: 'rgba(255, 255, 255, 0.2)',
      borderColor: 'rgba(102, 126, 234, 0.5)',
      boxShadow: '0 0 0 2px rgba(102, 126, 234, 0.3)',
      transition: { duration: 0.2, ease: easings.easeOut },
    },
  },
};

// Utility function to create custom animations
export const createAnimation = (
  initial: any,
  animate: any,
  exit?: any,
  transition?: Transition
): Variants => ({
  initial,
  animate: {
    ...animate,
    transition: transition || { duration: 0.3, ease: easings.easeOut },
  },
  ...(exit && {
    exit: {
      ...exit,
      transition: transition || { duration: 0.2, ease: easings.easeIn },
    },
  }),
});

// Animation presets for common use cases
export const animationPresets = {
  // Card animations
  cardHover: {
    whileHover: hoverAnimations.lift,
    whileTap: tapAnimations.press,
  },
  
  // Button animations
  buttonPress: {
    whileHover: hoverAnimations.scale,
    whileTap: tapAnimations.bounce,
  },
  
  // List item animations
  listItem: {
    variants: staggerAnimations.item,
    initial: 'initial',
    animate: 'animate',
  },
  
  // Modal animations
  modalContent: {
    variants: modalAnimations.modal,
    initial: 'initial',
    animate: 'animate',
    exit: 'exit',
  },
  
  // Page animations
  pageContent: {
    variants: pageTransitions,
    initial: 'initial',
    animate: 'animate',
    exit: 'exit',
  },
};