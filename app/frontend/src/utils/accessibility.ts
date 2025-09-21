/**
 * Accessibility utilities for Reddit-style community components
 */

// WCAG 2.1 AA compliance helpers
export const WCAG_AA_CONTRAST_RATIO = 4.5;
export const WCAG_AAA_CONTRAST_RATIO = 7;

/**
 * Calculate color contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Calculate relative luminance
    const sRGB = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Check if color combination meets WCAG AA standards
 */
export function meetsWCAGAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= WCAG_AA_CONTRAST_RATIO;
}

/**
 * Generate accessible color combinations
 */
export function getAccessibleColors(baseColor: string): {
  light: { foreground: string; background: string };
  dark: { foreground: string; background: string };
} {
  // This is a simplified implementation
  // In a real app, you'd want more sophisticated color generation
  return {
    light: {
      foreground: '#1f2937', // gray-800
      background: '#f9fafb', // gray-50
    },
    dark: {
      foreground: '#f9fafb', // gray-50
      background: '#1f2937', // gray-800
    },
  };
}

/**
 * Keyboard navigation constants
 */
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

/**
 * ARIA role constants
 */
export const ARIA_ROLES = {
  ARTICLE: 'article',
  BANNER: 'banner',
  BUTTON: 'button',
  DIALOG: 'dialog',
  GROUP: 'group',
  HEADING: 'heading',
  LINK: 'link',
  LIST: 'list',
  LISTITEM: 'listitem',
  MAIN: 'main',
  MENU: 'menu',
  MENUITEM: 'menuitem',
  NAVIGATION: 'navigation',
  REGION: 'region',
  STATUS: 'status',
  TAB: 'tab',
  TABLIST: 'tablist',
  TABPANEL: 'tabpanel',
  TEXTBOX: 'textbox',
} as const;

/**
 * Screen reader text utilities
 */
export function createScreenReaderText(text: string): string {
  return text;
}

export function formatNumberForScreenReader(num: number): string {
  if (num === 0) return 'zero';
  if (num === 1) return 'one';
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)} thousand`;
  return `${(num / 1000000).toFixed(1)} million`;
}

export function formatTimeForScreenReader(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  
  return date.toLocaleDateString();
}

/**
 * Focus management utilities
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ');

  return Array.from(container.querySelectorAll(focusableSelectors));
}

export function getFirstFocusableElement(container: HTMLElement): HTMLElement | null {
  const focusableElements = getFocusableElements(container);
  return focusableElements[0] || null;
}

export function getLastFocusableElement(container: HTMLElement): HTMLElement | null {
  const focusableElements = getFocusableElements(container);
  return focusableElements[focusableElements.length - 1] || null;
}

/**
 * Touch target size validation (minimum 44px for WCAG AA)
 */
export const MIN_TOUCH_TARGET_SIZE = 44;

export function validateTouchTargetSize(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width >= MIN_TOUCH_TARGET_SIZE && rect.height >= MIN_TOUCH_TARGET_SIZE;
}

/**
 * Reduced motion utilities
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function getAnimationDuration(defaultDuration: number): number {
  return prefersReducedMotion() ? 0 : defaultDuration;
}

/**
 * High contrast mode detection
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(prefers-contrast: high)').matches ||
    window.matchMedia('(-ms-high-contrast: active)').matches
  );
}

/**
 * Screen reader detection utilities
 */
export function detectScreenReader(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for common screen reader indicators
  return (
    'speechSynthesis' in window ||
    navigator.userAgent.includes('NVDA') ||
    navigator.userAgent.includes('JAWS') ||
    navigator.userAgent.includes('VoiceOver') ||
    navigator.userAgent.includes('Talkback') ||
    // Check for accessibility APIs
    'getComputedAccessibleNode' in document ||
    'accessibilityController' in window
  );
}

/**
 * ARIA live region management
 */
export class LiveRegionManager {
  private static instance: LiveRegionManager;
  private liveRegion: HTMLElement | null = null;

  static getInstance(): LiveRegionManager {
    if (!LiveRegionManager.instance) {
      LiveRegionManager.instance = new LiveRegionManager();
    }
    return LiveRegionManager.instance;
  }

  private constructor() {
    this.createLiveRegion();
  }

  private createLiveRegion(): void {
    if (typeof document === 'undefined') return;

    this.liveRegion = document.createElement('div');
    this.liveRegion.id = 'accessibility-live-region';
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.style.position = 'absolute';
    this.liveRegion.style.left = '-10000px';
    this.liveRegion.style.width = '1px';
    this.liveRegion.style.height = '1px';
    this.liveRegion.style.overflow = 'hidden';

    document.body.appendChild(this.liveRegion);
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.liveRegion) return;

    this.liveRegion.setAttribute('aria-live', priority);
    this.liveRegion.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = '';
      }
    }, 1000);
  }
}

/**
 * Accessibility testing utilities
 */
export function checkAccessibility(element: HTMLElement): {
  hasProperLabels: boolean;
  hasKeyboardSupport: boolean;
  meetsContrastRequirements: boolean;
  hasProperFocus: boolean;
} {
  const hasAriaLabel = element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby');
  const hasTabIndex = element.hasAttribute('tabindex') || element.tagName.toLowerCase() === 'button' || element.tagName.toLowerCase() === 'a';
  
  return {
    hasProperLabels: hasAriaLabel,
    hasKeyboardSupport: hasTabIndex,
    meetsContrastRequirements: true, // Would need actual color analysis
    hasProperFocus: element.matches(':focus-visible') || element.style.outline !== 'none',
  };
}

/**
 * Generate unique IDs for ARIA relationships
 */
let idCounter = 0;
export function generateUniqueId(prefix: string = 'a11y'): string {
  return `${prefix}-${++idCounter}-${Date.now()}`;
}

/**
 * Debounce function for accessibility announcements
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Accessibility-friendly animation utilities
 */
export const accessibleAnimations = {
  fadeIn: (prefersReduced: boolean) => 
    prefersReduced ? {} : { opacity: [0, 1] },
  
  slideIn: (prefersReduced: boolean) => 
    prefersReduced ? {} : { x: [-20, 0], opacity: [0, 1] },
  
  scale: (prefersReduced: boolean) => 
    prefersReduced ? {} : { scale: [0.95, 1] },
  
  duration: (prefersReduced: boolean, defaultMs: number = 200) => 
    prefersReduced ? 0 : defaultMs,
};