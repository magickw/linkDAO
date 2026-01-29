import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';
import MobileSlideOutMenu from './MobileSlideOutMenu';

interface MobileLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  showBottomNav?: boolean;
  showHeader?: boolean;
  headerTitle?: string;
  headerActions?: React.ReactNode;
  onCreatePost?: () => void;
  userAddress?: string;
  userAvatar?: string;
  handle?: string;
  unreadMessages?: number;
  isDarkMode?: boolean;
  onThemeToggle?: () => void;
  onLogout?: () => void;
  className?: string;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  currentPath,
  onNavigate,
  showBottomNav = true,
  showHeader = true,
  headerTitle,
  headerActions,
  onCreatePost = () => {},
  userAddress,
  userAvatar,
  handle,
  unreadMessages = 0,
  isDarkMode = false,
  onThemeToggle = () => {},
  onLogout = () => {},
  className = ''
}) => {
  const { 
    isMobile, 
    safeAreaInsets, 
    isKeyboardVisible, 
    mobileOptimizedClasses,
    orientation 
  } = useMobileOptimization();
  const { accessibilityClasses } = useMobileAccessibility();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Calculate layout dimensions
  const bottomNavHeight = showBottomNav ? 80 : 0;
  const keyboardOffset = isKeyboardVisible ? 0 : bottomNavHeight;

  useEffect(() => {
    // Calculate header height including safe area
    const baseHeaderHeight = showHeader ? 60 : 0;
    setHeaderHeight(baseHeaderHeight + safeAreaInsets.top);
  }, [showHeader, safeAreaInsets.top]);

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMenuClose = () => {
    setIsMenuOpen(false);
  };

  if (!isMobile) {
    // Return desktop layout or redirect
    return (
      <div className={`min-h-screen ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div 
      className={`
        min-h-screen bg-gray-50 dark:bg-gray-900
        ${mobileOptimizedClasses}
        ${accessibilityClasses}
        ${className}
      `}
    >
      {/* Header */}
      {showHeader && (
        <motion.header
          className="fixed top-0 left-0 right-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700"
          style={{
            height: `${headerHeight}px`,
            paddingTop: `${safeAreaInsets.top}px`
          }}
          initial={{ y: -headerHeight }}
          animate={{ y: 0 }}
          transition={{ type: 'spring' as any, stiffness: 300, damping: 30 }}
        >
          <div className="flex items-center justify-between h-[60px] px-4">
            {/* Left side - Menu button */}
            <button
              onClick={handleMenuToggle}
              className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Center - Title */}
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {headerTitle || 'LinkDAO'}
            </h1>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-2">
              {headerActions}
            </div>
          </div>
        </motion.header>
      )}

      {/* Main Content */}
      <main
        className={`
          flex-1 overflow-hidden
          ${orientation === 'landscape' ? 'landscape-layout' : 'portrait-layout'}
        `}
        style={{
          paddingTop: `${headerHeight}px`,
          paddingBottom: `${keyboardOffset + safeAreaInsets.bottom}px`,
          minHeight: `calc(100vh - ${headerHeight}px - ${keyboardOffset + safeAreaInsets.bottom}px)`
        }}
      >
        <div className="h-full overflow-y-auto mobile-scroll">
          {children}
        </div>
      </main>

      {/* Bottom Navigation - Removed as per mobile tab bar removal task */}

      {/* Slide Out Menu */}
      <MobileSlideOutMenu
        isOpen={isMenuOpen}
        onClose={handleMenuClose}
        userAddress={userAddress}
        userAvatar={userAvatar}
        userName={handle}
        onNavigate={onNavigate}
        onThemeToggle={onThemeToggle}
        onLogout={onLogout}
        isDarkMode={isDarkMode}
      />

      {/* Keyboard spacer for iOS */}
      {isKeyboardVisible && (
        <div 
          className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900"
          style={{ height: `${safeAreaInsets.bottom}px` }}
        />
      )}
    </div>
  );
};

// Hook for mobile layout context
export const useMobileLayout = () => {
  const { isMobile, isKeyboardVisible, safeAreaInsets, orientation } = useMobileOptimization();
  
  return {
    isMobile,
    isKeyboardVisible,
    safeAreaInsets,
    orientation,
    getContentHeight: (headerHeight: number, bottomNavHeight: number) => {
      const keyboardOffset = isKeyboardVisible ? 0 : bottomNavHeight;
      return `calc(100vh - ${headerHeight}px - ${keyboardOffset + safeAreaInsets.bottom}px)`;
    },
    getScrollableHeight: (headerHeight: number, bottomNavHeight: number, additionalOffset: number = 0) => {
      const keyboardOffset = isKeyboardVisible ? 0 : bottomNavHeight;
      return `calc(100vh - ${headerHeight}px - ${keyboardOffset + safeAreaInsets.bottom}px - ${additionalOffset}px)`;
    }
  };
};

export default MobileLayout;