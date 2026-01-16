/**
 * Theme Constants
 * Standardized colors and styles for the mobile app
 */

export const THEME = {
  colors: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',

    // Common colors
    white: '#ffffff',
    gray: '#9ca3af',
    border: '#e5e7eb',

    // Gradients
    gradients: {
      primary: ['#3b82f6', '#8b5cf6'],
      glass: ['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.4)'],
      glassDark: ['rgba(31, 41, 55, 0.8)', 'rgba(31, 41, 55, 0.4)'],
    },

    // Backgrounds
    background: '#f9fafb',

    // Text
    text: '#111827',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    full: 9999,
  },

  glass: {
    light: {
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(10px)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    dark: {
      backgroundColor: 'rgba(31, 41, 55, 0.7)',
      backdropFilter: 'blur(10px)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    }
  }
};

export const SETTINGS = {
  colors: {
    gray: '#9ca3af',
    lightGray: '#e5e7eb',
    darkGray: '#6b7280',
  }
};
