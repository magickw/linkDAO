import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  XMarkIcon,
  UserCircleIcon,
  CogIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  MoonIcon,
  SunIcon,
  BellIcon,
  ShieldCheckIcon,
  HeartIcon,
  BookmarkIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  action?: () => void;
  badge?: number;
  divider?: boolean;
  destructive?: boolean;
}

interface MobileSlideOutMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress?: string;
  userAvatar?: string;
  userName?: string;
  onNavigate: (path: string) => void;
  onThemeToggle: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  className?: string;
}

export const MobileSlideOutMenu: React.FC<MobileSlideOutMenuProps> = ({
  isOpen,
  onClose,
  userAddress,
  userAvatar,
  userName,
  onNavigate,
  onThemeToggle,
  onLogout,
  isDarkMode,
  className = ''
}) => {
  const { 
    triggerHapticFeedback, 
    createSwipeHandler, 
    touchTargetClasses, 
    safeAreaInsets 
  } = useMobileOptimization();
  const { 
    announceToScreenReader, 
    manageFocus, 
    accessibilityClasses 
  } = useMobileAccessibility();
  
  const menuRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  const menuItems: MenuItem[] = [
    {
      id: 'profile',
      label: 'Profile',
      icon: UserCircleIcon,
      href: '/profile'
    },
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      icon: BookmarkIcon,
      href: '/bookmarks'
    },
    {
      id: 'liked-posts',
      label: 'Liked Posts',
      icon: HeartIcon,
      href: '/liked'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: ChartBarIcon,
      href: '/analytics'
    },
    {
      id: 'divider-1',
      label: '',
      icon: () => null,
      divider: true
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: BellIcon,
      href: '/notifications',
      badge: 3
    },
    {
      id: 'privacy',
      label: 'Privacy & Security',
      icon: ShieldCheckIcon,
      href: '/privacy'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: CogIcon,
      href: '/settings'
    },
    {
      id: 'theme',
      label: isDarkMode ? 'Light Mode' : 'Dark Mode',
      icon: isDarkMode ? SunIcon : MoonIcon,
      action: onThemeToggle
    },
    {
      id: 'divider-2',
      label: '',
      icon: () => null,
      divider: true
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: QuestionMarkCircleIcon,
      href: '/help'
    },
    {
      id: 'logout',
      label: 'Sign Out',
      icon: ArrowRightOnRectangleIcon,
      action: onLogout,
      destructive: true
    }
  ];

  // Focus management
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      manageFocus(firstFocusableRef.current);
      announceToScreenReader('Menu opened');
    }
  }, [isOpen, manageFocus, announceToScreenReader]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleItemPress = (item: MenuItem) => {
    triggerHapticFeedback('light');
    
    if (item.action) {
      item.action();
      announceToScreenReader(`${item.label} activated`);
    } else if (item.href) {
      onNavigate(item.href);
      announceToScreenReader(`Navigating to ${item.label}`);
      onClose();
    }
  };

  const handleBackdropPress = () => {
    triggerHapticFeedback('light');
    onClose();
  };

  const swipeHandler = createSwipeHandler({
    onSwipeLeft: () => onClose(),
    threshold: 100
  });

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`fixed inset-0 z-50 ${className}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropPress}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Menu Panel */}
          <motion.div
            ref={menuRef}
            className={`
              absolute left-0 top-0 bottom-0 w-80 max-w-[85vw]
              bg-white dark:bg-gray-900
              shadow-2xl
              ${accessibilityClasses}
            `}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring' as any, stiffness: 300, damping: 30 }}
            {...swipeHandler}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700"
              style={{ paddingTop: `max(${safeAreaInsets.top}px, 16px)` }}
            >
              <div className="flex items-center space-x-3">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt="Profile"
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <UserCircleIcon className="w-10 h-10 text-gray-400" />
                )}
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {userName || 'Anonymous'}
                  </p>
                  {userAddress && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatAddress(userAddress)}
                    </p>
                  )}
                </div>
              </div>
              
              <button
                ref={firstFocusableRef}
                onClick={onClose}
                className={`
                  ${touchTargetClasses}
                  text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                  transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  rounded-lg
                `}
                aria-label="Close menu"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto py-2">
              {menuItems.map((item) => {
                if (item.divider) {
                  return (
                    <div
                      key={item.id}
                      className="my-2 border-t border-gray-200 dark:border-gray-700"
                      role="separator"
                    />
                  );
                }

                const IconComponent = item.icon;
                
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => handleItemPress(item)}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3
                      ${touchTargetClasses}
                      ${item.destructive 
                        ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }
                      transition-colors duration-200
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      focus:ring-inset
                    `}
                    whileTap={{ scale: 0.98 }}
                    aria-label={item.label}
                  >
                    <IconComponent className="w-6 h-6 flex-shrink-0" />
                    <span className="flex-1 text-left font-medium">
                      {item.label}
                    </span>
                    
                    {/* Badge */}
                    {item.badge && item.badge > 0 && (
                      <motion.div
                        className="bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring' as any, stiffness: 500, damping: 30 }}
                        aria-label={`${item.badge} notifications`}
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Footer */}
            <div 
              className="p-4 border-t border-gray-200 dark:border-gray-700"
              style={{ paddingBottom: `max(${safeAreaInsets.bottom}px, 16px)` }}
            >
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                LinkDAO Social Platform v1.0
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileSlideOutMenu;