/**
 * Design Tokens for Web3 Marketplace Glassmorphism Design System
 * Provides consistent styling tokens for glassmorphic UI components
 */

// Define the actual tokens object
const tokens = {
  // Glassmorphism Effects
  glassmorphism: {
    // Primary glass panel - main content areas
    primary: {
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '16px',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    },
    // Secondary glass panel - supporting content
    secondary: {
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.2)',
    },
    // Navbar glass effect
    navbar: {
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '0px',
      boxShadow: '0 2px 24px 0 rgba(31, 38, 135, 0.15)',
    },
    // Modal glass effect
    modal: {
      background: 'rgba(255, 255, 255, 0.12)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.25)',
      borderRadius: '20px',
      boxShadow: '0 12px 48px 0 rgba(31, 38, 135, 0.5)',
    },
  },

  // Tech-Inspired Gradients
  gradients: {
    // Primary brand gradients
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    
    // Tech-inspired gradients
    techBlue: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
    techPurple: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    techGreen: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
    
    // Hero section gradients
    heroMain: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    heroOverlay: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%)',
    
    // NFT-style gradients
    nftGold: 'linear-gradient(135deg, #ffd700 0%, #ffb347 100%)',
    nftSilver: 'linear-gradient(135deg, #c0c0c0 0%, #e6e6fa 100%)',
    nftRainbow: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 25%, #45b7d1 50%, #96ceb4 75%, #ffeaa7 100%)',
  },

  // NFT-Style Shadow Borders
  nftShadows: {
    // Standard NFT card shadow
    standard: {
      boxShadow: '0 0 20px rgba(102, 126, 234, 0.3), 0 0 40px rgba(118, 75, 162, 0.2)',
      border: '2px solid transparent',
      backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
    },
    // Verified/Premium NFT shadow
    premium: {
      boxShadow: '0 0 30px rgba(255, 215, 0, 0.4), 0 0 60px rgba(255, 179, 71, 0.3)',
      border: '2px solid rgba(255, 215, 0, 0.3)',
      backgroundImage: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,179,71,0.05))',
    },
    // DAO approved shadow
    dao: {
      boxShadow: '0 0 25px rgba(16, 185, 129, 0.4), 0 0 50px rgba(59, 130, 246, 0.3)',
      border: '2px solid rgba(16, 185, 129, 0.3)',
      backgroundImage: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.05))',
    },
  },

  // Animation Tokens
  animations: {
    // Hover effects
    hover: {
      transform: 'translateY(-4px)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadowIntensity: 1.5,
    },
    // Button press effects
    press: {
      transform: 'translateY(1px) scale(0.98)',
      transition: 'all 0.1s ease-in-out',
    },
    // Ripple animation
    ripple: {
      animation: 'ripple 0.6s linear',
      keyframes: `
        @keyframes ripple {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(4); opacity: 0; }
        }
      `,
    },
    // Fade in animation
    fadeIn: {
      animation: 'fadeIn 0.5s ease-in-out',
      keyframes: `
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `,
    },
    // Slide up animation
    slideUp: {
      animation: 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      keyframes: `
        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `,
    },
  },

  // Responsive Breakpoints (Mobile-First)
  breakpoints: {
    xs: '320px',   // Small phones
    sm: '640px',   // Large phones
    md: '768px',   // Tablets
    lg: '1024px',  // Small laptops
    xl: '1280px',  // Large laptops
    '2xl': '1536px', // Desktop monitors
  },

  // Spacing System
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
    '4xl': '6rem',   // 96px
  },

  // Typography
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Consolas', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
      '6xl': '3.75rem', // 60px
    },
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
  },

  // Colors
  colors: {
    // Primary brand colors
    primary: {
      50: '#f0f4ff',
      100: '#e0e9ff',
      500: '#667eea',
      600: '#5a6fd8',
      700: '#4f5fc7',
      900: '#2d3748',
    },
    // Trust indicators
    trust: {
      verified: '#10b981',    // Green for verified
      escrow: '#3b82f6',      // Blue for escrow protected
      onChain: '#8b5cf6',     // Purple for on-chain certified
      dao: '#f59e0b',         // Amber for DAO approved
    },
    // Status colors
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    // Neutral colors
    neutral: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },

  // Z-Index Scale
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },
} as const;

// Export with null-safety wrapper
export const designTokens = tokens;

// Type definitions for design tokens
export type GlassmorphismVariant = keyof typeof tokens.glassmorphism;
export type GradientVariant = keyof typeof tokens.gradients;
export type NFTShadowVariant = keyof typeof tokens.nftShadows;
export type AnimationVariant = keyof typeof tokens.animations;
export type BreakpointVariant = keyof typeof tokens.breakpoints;
export type SpacingVariant = keyof typeof tokens.spacing;
export type ColorVariant = keyof typeof tokens.colors;