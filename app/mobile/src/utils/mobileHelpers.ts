import { Platform, Dimensions } from 'react-native';

/**
 * Get device dimensions
 */
export const getDeviceDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

/**
 * Check if device is iOS
 */
export const isIOS = () => {
  return Platform.OS === 'ios';
};

/**
 * Check if device is Android
 */
export const isAndroid = () => {
  return Platform.OS === 'android';
};

/**
 * Get platform-specific styles
 */
export const getPlatformStyles = (iosStyles: any, androidStyles: any) => {
  return Platform.OS === 'ios' ? iosStyles : androidStyles;
};

/**
 * Format date for mobile display
 */
export const formatMobileDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Format time for mobile display
 */
export const formatMobileTime = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Truncate text for mobile display
 */
export const truncateText = (text: string, maxLength: number = 100) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Check if device is in landscape mode
 */
export const isLandscape = () => {
  const { width, height } = Dimensions.get('window');
  return width > height;
};

/**
 * Get safe area insets (placeholder for actual safe area implementation)
 */
export const getSafeAreaInsets = () => {
  return {
    top: isIOS() ? 44 : 24,
    bottom: isIOS() ? 34 : 0,
    left: 0,
    right: 0
  };
};

/**
 * Convert hex color to rgba
 */
export const hexToRgba = (hex: string, alpha: number = 1) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Generate random ID
 */
export const generateId = () => {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

/**
 * Debounce function
 */
export const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 */
export const throttle = (func: Function, limit: number) => {
  let inThrottle: boolean;
  return function(...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};