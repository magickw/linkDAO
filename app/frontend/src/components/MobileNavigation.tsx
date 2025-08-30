import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '@/context/NavigationContext';
import { useWeb3 } from '@/context/Web3Context';
import { useResponsive } from '@/design-system/hooks/useResponsive';
import { designTokens } from '@/design-system/tokens';
import GestureHandler from './GestureHandler';

interface MobileNavigationProps {
  className?: string;
  showLabels?: boolean;
  variant?: 'glassmorphic' | 'solid';
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  action?: () => void;
  isActive: boolean;
  badge?: number;
  requiresAuth?: boolean;
}

export default function MobileNavigation({ 
  className = '', 
  showLabels = true,
  variant = 'glassmorphic'
}: MobileNavigationProps) {
  const router = useRouter();
  const { navigationState, navigateToFeed } = useNavigation();
  const { isConnected } = useWeb3();
  const { isMobile, isTouch } = useResponsive();
  const [pressedItem, setPressedItem] = useState<string | null>(null);

  // Don't render on desktop or when not connected (for auth-required items)
  if (!isMobile) {
    return null;
  }

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      action: navigateToFeed,
      isActive: navigationState.activeView === 'feed' || router.pathname === '/',
      requiresAuth: false
    },
    {
      id: 'search',
      label: 'Search',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      href: '/search',
      isActive: router.pathname === '/search',
      requiresAuth: false
    },
    {
      id: 'marketplace',
      label: 'Market',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      href: '/marketplace',
      isActive: router.pathname.startsWith('/marketplace'),
      requiresAuth: false
    },
    {
      id: 'wallet',
      label: 'Wallet',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      href: '/wallet',
      isActive: router.pathname === '/wallet',
      requiresAuth: true
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      href: '/profile',
      isActive: router.pathname === '/profile',
      requiresAuth: true
    }
  ];

  // Filter items based on auth status
  const visibleItems = navItems.filter(item => !item.requiresAuth || isConnected);

  const getNavStyle = () => {
    if (variant === 'glassmorphic') {
      return {
        background: designTokens.glassmorphism.navbar.background,
        backdropFilter: designTokens.glassmorphism.navbar.backdropFilter,
        borderTop: designTokens.glassmorphism.navbar.border,
        boxShadow: designTokens.glassmorphism.navbar.boxShadow,
      };
    }
    return {};
  };

  const handleItemPress = (itemId: string) => {
    setPressedItem(itemId);
    // Haptic feedback for supported devices
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleItemRelease = () => {
    setPressedItem(null);
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = item.isActive;
    const isPressed = pressedItem === item.id;
    
    const itemContent = (
      <GestureHandler
        onTap={() => {
          if (item.action) {
            item.action();
          }
        }}
        className="flex flex-col items-center justify-center p-3 min-h-[64px] min-w-[64px] rounded-xl transition-all duration-200 touch-manipulation"
        style={{
          transform: isPressed ? 'scale(0.95)' : 'scale(1)',
          backgroundColor: isActive 
            ? 'rgba(102, 126, 234, 0.1)' 
            : isPressed 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'transparent',
        }}
      >
        <motion.div
          animate={{
            scale: isActive ? 1.1 : 1,
            color: isActive ? designTokens.colors.primary[500] : '#6b7280'
          }}
          transition={{ duration: 0.2 }}
          className="relative"
        >
          {item.icon}
          {item.badge && item.badge > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center"
            >
              {item.badge > 99 ? '99+' : item.badge}
            </motion.div>
          )}
        </motion.div>
        
        {showLabels && (
          <motion.span
            animate={{
              color: isActive ? designTokens.colors.primary[500] : '#6b7280',
              fontWeight: isActive ? '600' : '400'
            }}
            className="text-xs mt-1 text-center leading-tight"
          >
            {item.label}
          </motion.span>
        )}
      </GestureHandler>
    );

    if (item.href) {
      return (
        <Link key={item.id} href={item.href} className="flex-1 flex justify-center">
          {itemContent}
        </Link>
      );
    }

    return (
      <div key={item.id} className="flex-1 flex justify-center">
        {itemContent}
      </div>
    );
  };

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`fixed bottom-0 left-0 right-0 z-50 md:hidden ${className}`}
      style={getNavStyle()}
    >
      {/* Safe area padding for devices with home indicator */}
      <div className="pb-safe">
        <div className="flex items-center justify-around px-2 py-2">
          {visibleItems.map(renderNavItem)}
        </div>
      </div>

      {/* Connection status indicator */}
      <AnimatePresence>
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-0 left-0 right-0 bg-amber-500 text-white text-xs text-center py-1"
          >
            Connect wallet to access all features
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}