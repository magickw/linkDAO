// Accessibility components and utilities
export { AccessibilityProvider, useAccessibilityContext, withAccessibility } from './AccessibilityProvider';
export { SkipLinks } from './SkipLinks';
export { FocusManager } from './FocusManager';

// Accessibility hooks
export { 
  useAccessibility, 
  useKeyboardNavigation, 
  useFocusManagement,
  type AccessibilityState,
  type AccessibilityActions,
  type UseAccessibilityReturn
} from '@/hooks/useAccessibility';

// Accessibility utilities
export {
  getContrastRatio,
  meetsWCAGAA,
  getAccessibleColors,
  KEYBOARD_KEYS,
  ARIA_ROLES,
  formatNumberForScreenReader,
  formatTimeForScreenReader,
  getFocusableElements,
  getFirstFocusableElement,
  getLastFocusableElement,
  MIN_TOUCH_TARGET_SIZE,
  validateTouchTargetSize,
  prefersReducedMotion,
  prefersHighContrast,
  detectScreenReader,
  LiveRegionManager,
  checkAccessibility,
  generateUniqueId,
  debounce,
  accessibleAnimations
} from '@/utils/accessibility';