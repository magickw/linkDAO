import React, { createContext, useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Enhanced Theme Context with more options
interface EnhancedThemeContextType {
  theme: 'light' | 'dark' | 'system';
  actualTheme: 'light' | 'dark';
  accentColor: string;
  glassmorphismIntensity: 'low' | 'medium' | 'high';
  animationsEnabled: boolean;
  spacing: (factor: number) => string;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setAccentColor: (color: string) => void;
  setGlassmorphismIntensity: (intensity: 'low' | 'medium' | 'high') => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  toggleTheme: () => void;
}

const EnhancedThemeContext = createContext<EnhancedThemeContextType | undefined>(undefined);

export function useEnhancedTheme() {
  const context = useContext(EnhancedThemeContext);
  if (!context) {
    // Return a fallback context instead of throwing
    console.warn('useEnhancedTheme used outside of EnhancedThemeProvider, using fallback values');
    return {
      theme: 'system' as const,
      actualTheme: 'light' as const,
      accentColor: '#3b82f6',
      glassmorphismIntensity: 'medium' as const,
      animationsEnabled: true,
      spacing: (factor: number) => `${factor * 8}px`,
      setTheme: () => {},
      setAccentColor: () => {},
      setGlassmorphismIntensity: () => {},
      setAnimationsEnabled: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}

// Enhanced Theme Provider
interface EnhancedThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';
  defaultAccentColor?: string;
  defaultGlassmorphismIntensity?: 'low' | 'medium' | 'high';
  defaultAnimationsEnabled?: boolean;
}

export function EnhancedThemeProvider({
  children,
  defaultTheme = 'system',
  defaultAccentColor = '#3b82f6',
  defaultGlassmorphismIntensity = 'medium',
  defaultAnimationsEnabled = true
}: EnhancedThemeProviderProps) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(defaultTheme);
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');
  const [accentColor, setAccentColor] = useState(defaultAccentColor);
  const [glassmorphismIntensity, setGlassmorphismIntensity] = useState(defaultGlassmorphismIntensity);
  const [animationsEnabled, setAnimationsEnabled] = useState(defaultAnimationsEnabled);

  // Initialize from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('enhanced-theme') as 'light' | 'dark' | 'system' | null;
    const savedAccentColor = localStorage.getItem('accent-color');
    const savedGlassmorphism = localStorage.getItem('glassmorphism-intensity') as 'low' | 'medium' | 'high' | null;
    const savedAnimations = localStorage.getItem('animations-enabled');

    if (savedTheme) setTheme(savedTheme);
    if (savedAccentColor) setAccentColor(savedAccentColor);
    if (savedGlassmorphism) setGlassmorphismIntensity(savedGlassmorphism);
    if (savedAnimations !== null) setAnimationsEnabled(savedAnimations === 'true');
  }, []);

  // Update actual theme based on theme setting and system preference
  useEffect(() => {
    const updateActualTheme = () => {
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setActualTheme(systemTheme);
      } else {
        setActualTheme(theme);
      }
    };

    updateActualTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateActualTheme);

    return () => mediaQuery.removeEventListener('change', updateActualTheme);
  }, [theme]);

  // Apply theme and settings to document
  useEffect(() => {
    const root = document.documentElement;

    // Apply theme class
    if (actualTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply accent color CSS variables
    root.style.setProperty('--accent-color', accentColor);

    // Apply glassmorphism intensity
    const intensityValues = {
      low: {
        blur: '8px',
        opacity: '0.05',
        border: '0.1'
      },
      medium: {
        blur: '12px',
        opacity: '0.1',
        border: '0.2'
      },
      high: {
        blur: '16px',
        opacity: '0.15',
        border: '0.3'
      }
    };

    const intensity = intensityValues[glassmorphismIntensity];
    root.style.setProperty('--glass-blur', intensity.blur);
    root.style.setProperty('--glass-opacity', intensity.opacity);
    root.style.setProperty('--glass-border-opacity', intensity.border);

    // Apply animations preference
    if (!animationsEnabled) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Save to localStorage
    localStorage.setItem('enhanced-theme', theme);
    localStorage.setItem('accent-color', accentColor);
    localStorage.setItem('glassmorphism-intensity', glassmorphismIntensity);
    localStorage.setItem('animations-enabled', animationsEnabled.toString());
  }, [theme, actualTheme, accentColor, glassmorphismIntensity, animationsEnabled]);

  const toggleTheme = () => {
    setTheme(current => current === 'dark' ? 'light' : 'dark');
  };

  // Material-UI compatible spacing function (8px base)
  const spacing = (factor: number) => `${factor * 8}px`;

  const value = {
    theme,
    actualTheme,
    accentColor,
    glassmorphismIntensity,
    animationsEnabled,
    spacing,
    setTheme,
    setAccentColor,
    setGlassmorphismIntensity,
    setAnimationsEnabled,
    toggleTheme
  };

  return (
    <EnhancedThemeContext.Provider value={value}>
      {children}
    </EnhancedThemeContext.Provider>
  );
}

// Enhanced Theme Toggle with more options
interface EnhancedThemeToggleProps {
  className?: string;
  showSettings?: boolean;
}

export function EnhancedThemeToggle({
  className = '',
  showSettings = false
}: EnhancedThemeToggleProps) {
  const {
    theme,
    actualTheme,
    accentColor,
    glassmorphismIntensity,
    animationsEnabled,
    setTheme,
    setAccentColor,
    setGlassmorphismIntensity,
    setAnimationsEnabled,
    toggleTheme
  } = useEnhancedTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const accentColors = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Green', value: '#10b981' },
    { name: 'Orange', value: '#f59e0b' },
    { name: 'Red', value: '#ef4444' }
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Main toggle button */}
      <motion.button
        onClick={showSettings ? () => setIsOpen(!isOpen) : toggleTheme}
        className="w-10 h-10 rounded-xl bg-white/10 dark:bg-gray-800/50 backdrop-blur-lg border border-white/20 dark:border-gray-700/50 hover:bg-white/20 dark:hover:bg-gray-700/50 transition-all duration-200 flex items-center justify-center group shadow-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative">
          {/* Sun Icon */}
          <motion.svg
            className="w-5 h-5 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            animate={{
              opacity: actualTheme === 'dark' ? 0 : 1,
              rotate: actualTheme === 'dark' ? 90 : 0,
              scale: actualTheme === 'dark' ? 0 : 1
            }}
            transition={{ duration: 0.3 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </motion.svg>

          {/* Moon Icon */}
          <motion.svg
            className="w-5 h-5 text-blue-400 absolute inset-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            animate={{
              opacity: actualTheme === 'dark' ? 1 : 0,
              rotate: actualTheme === 'dark' ? 0 : -90,
              scale: actualTheme === 'dark' ? 1 : 0
            }}
            transition={{ duration: 0.3 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </motion.svg>
        </div>
      </motion.button>

      {/* Settings dropdown */}
      <AnimatePresence>
        {isOpen && showSettings && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              className="absolute right-0 mt-2 w-80 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-gray-700/50 py-4 z-50"
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {/* Theme Selection */}
              <div className="px-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Theme</h3>
                <div className="grid grid-cols-3 gap-2">
                  {(['light', 'dark', 'system'] as const).map((themeOption) => (
                    <motion.button
                      key={themeOption}
                      onClick={() => setTheme(themeOption)}
                      className={`p-2 rounded-lg text-sm font-medium transition-all duration-200 ${theme === themeOption
                          ? 'bg-primary-500 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div className="px-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Accent Color</h3>
                <div className="grid grid-cols-6 gap-2">
                  {accentColors.map((color) => (
                    <motion.button
                      key={color.value}
                      onClick={() => setAccentColor(color.value)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 ${accentColor === color.value
                          ? 'border-gray-400 dark:border-gray-300 scale-110'
                          : 'border-gray-200 dark:border-gray-600'
                        }`}
                      style={{ backgroundColor: color.value }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Glassmorphism Intensity */}
              <div className="px-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Glass Effect</h3>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((intensity) => (
                    <motion.button
                      key={intensity}
                      onClick={() => setGlassmorphismIntensity(intensity)}
                      className={`p-2 rounded-lg text-sm font-medium transition-all duration-200 ${glassmorphismIntensity === intensity
                          ? 'bg-primary-500 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Animations Toggle */}
              <div className="px-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Animations</h3>
                  <motion.button
                    onClick={() => setAnimationsEnabled(!animationsEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${animationsEnabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.span
                      className="inline-block h-4 w-4 transform rounded-full bg-white shadow-lg"
                      animate={{
                        x: animationsEnabled ? 24 : 4
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Theme-aware component wrapper
interface ThemeAwareProps {
  children: React.ReactNode;
  lightClass?: string;
  darkClass?: string;
  className?: string;
}

export function ThemeAware({
  children,
  lightClass = '',
  darkClass = '',
  className = ''
}: ThemeAwareProps) {
  const { actualTheme } = useEnhancedTheme();

  const themeClass = actualTheme === 'dark' ? darkClass : lightClass;

  return (
    <div className={`${className} ${themeClass}`}>
      {children}
    </div>
  );
}

// System preference detector
export function useSystemTheme() {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    updateSystemTheme();
    mediaQuery.addEventListener('change', updateSystemTheme);

    return () => mediaQuery.removeEventListener('change', updateSystemTheme);
  }, []);

  return systemTheme;
}