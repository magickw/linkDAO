/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Add more vibrant accent colors
        secondary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        accent: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        }
      },
      // Add gradient backgrounds
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        'gradient-accent': 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
      },
      // Mobile optimization spacing
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        'touch-target': '44px',
        'touch-target-large': '56px',
      },
      minWidth: {
        'touch-target': '44px',
        'touch-target-large': '56px',
      },
      backdropBlur: {
        'mobile': '20px',
      },
      // Add custom animations
      animation: {
        'fadeIn': 'fadeIn 0.3s ease-in-out',
        'bounce': 'bounce 1s infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'skeleton-loading': 'skeleton-loading 1.5s infinite',
        'mobile-bounce': 'mobile-bounce 0.1s ease-out',
      },
      // Add keyframes for custom animations
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'skeleton-loading': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'mobile-bounce': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      screens: {
        'touch': { 'raw': '(hover: none) and (pointer: coarse)' },
        'no-touch': { 'raw': '(hover: hover) and (pointer: fine)' },
        'landscape': { 'raw': '(orientation: landscape)' },
        'portrait': { 'raw': '(orientation: portrait)' },
        'reduce-motion': { 'raw': '(prefers-reduced-motion: reduce)' },
        'high-contrast': { 'raw': '(prefers-contrast: high)' },
      },
    },
  },
  plugins: [
    // Custom plugin for mobile optimizations
    function({ addUtilities, addComponents, theme }) {
      const newUtilities = {
        '.touch-manipulation': {
          'touch-action': 'manipulation',
          '-webkit-touch-callout': 'none',
          '-webkit-user-select': 'none',
          '-moz-user-select': 'none',
          '-ms-user-select': 'none',
          'user-select': 'none',
        },
        '.hardware-accelerated': {
          'transform': 'translateZ(0)',
          '-webkit-transform': 'translateZ(0)',
          'will-change': 'transform',
        },
        '.mobile-scroll': {
          '-webkit-overflow-scrolling': 'touch',
          'scroll-behavior': 'smooth',
        },
        '.mobile-optimized': {
          '-webkit-tap-highlight-color': 'transparent',
          '-webkit-touch-callout': 'none',
          '-webkit-user-select': 'none',
          '-moz-user-select': 'none',
          '-ms-user-select': 'none',
          'user-select': 'none',
        },
        '.safe-area-insets': {
          'padding-top': 'env(safe-area-inset-top)',
          'padding-bottom': 'env(safe-area-inset-bottom)',
          'padding-left': 'env(safe-area-inset-left)',
          'padding-right': 'env(safe-area-inset-right)',
        },
        '.pb-safe': {
          'padding-bottom': 'calc(1rem + env(safe-area-inset-bottom))',
        },
        '.pt-safe': {
          'padding-top': 'calc(1rem + env(safe-area-inset-top))',
        },
        '.mb-safe': {
          'margin-bottom': 'calc(1rem + env(safe-area-inset-bottom))',
        },
        '.mt-safe': {
          'margin-top': 'calc(1rem + env(safe-area-inset-top))',
        },
      };

      const newComponents = {
        '.touch-target': {
          'min-height': '44px',
          'min-width': '44px',
          'display': 'inline-flex',
          'align-items': 'center',
          'justify-content': 'center',
        },
        '.touch-target-large': {
          'min-height': '56px',
          'min-width': '56px',
          'display': 'inline-flex',
          'align-items': 'center',
          'justify-content': 'center',
        },
        '.mobile-glass': {
          'background': 'rgba(255, 255, 255, 0.8)',
          'backdrop-filter': 'blur(20px)',
          '-webkit-backdrop-filter': 'blur(20px)',
          'border': '1px solid rgba(255, 255, 255, 0.2)',
        },
        '.mobile-glass-dark': {
          'background': 'rgba(17, 24, 39, 0.8)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.mobile-skeleton': {
          'background': 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          'background-size': '200% 100%',
          'animation': 'skeleton-loading 1.5s infinite',
        },
        '.mobile-skeleton-dark': {
          'background': 'linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%)',
          'background-size': '200% 100%',
        },
      };

      addUtilities(newUtilities);
      addComponents(newComponents);
    },
  ],
}