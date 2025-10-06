import React from 'react';
import { motion } from 'framer-motion';
import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  PlusIcon, 
  ChatBubbleLeftRightIcon, 
  UserIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import { 
  HomeIcon as HomeIconSolid, 
  MagnifyingGlassIcon as MagnifyingGlassIconSolid, 
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid, 
  UserIcon as UserIconSolid,
  Squares2X2Icon as Squares2X2IconSolid
} from '@heroicons/react/24/solid';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeIcon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
  isActive?: boolean;
}

interface MobileBottomNavigationProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onCreatePost: () => void;
  unreadMessages?: number;
  className?: string;
}

export const MobileBottomNavigation: React.FC<MobileBottomNavigationProps> = ({
  currentPath,
  onNavigate,
  onCreatePost,
  unreadMessages = 0,
  className = ''
}) => {
  const { triggerHapticFeedback, touchTargetClasses, safeAreaInsets } = useMobileOptimization();
  const { announceToScreenReader, accessibilityClasses } = useMobileAccessibility();

  const navigationItems: NavigationItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: HomeIcon,
      activeIcon: HomeIconSolid,
      href: '/',
      isActive: currentPath === '/'
    },
    {
      id: 'search',
      label: 'Search',
      icon: MagnifyingGlassIcon,
      activeIcon: MagnifyingGlassIconSolid,
      href: '/search',
      isActive: currentPath === '/search'
    },
    {
      id: 'create',
      label: 'Create',
      icon: PlusIcon,
      activeIcon: PlusIcon,
      href: '#',
      isActive: false
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: ChatBubbleLeftRightIcon,
      activeIcon: ChatBubbleLeftRightIconSolid,
      href: '/messages',
      badge: unreadMessages,
      isActive: currentPath === '/messages'
    },
    {
      id: 'communities',
      label: 'Communities',
      icon: Squares2X2Icon,
      activeIcon: Squares2X2IconSolid,
      href: '/communities',
      isActive: currentPath === '/communities'
    }
  ];

  const handleItemPress = (item: NavigationItem) => {
    triggerHapticFeedback('light');
    
    if (item.id === 'create') {
      onCreatePost();
      announceToScreenReader('Opening post composer');
    } else {
      onNavigate(item.href);
      announceToScreenReader(`Navigating to ${item.label}`);
    }
  };

  return (
    <motion.nav
      className={`
        fixed bottom-0 left-0 right-0 z-50
        bg-white/90 dark:bg-gray-900/90
        backdrop-blur-lg border-t border-gray-200 dark:border-gray-700
        ${className}
        ${accessibilityClasses}
      `}
      style={{
        paddingBottom: `max(${safeAreaInsets.bottom}px, 8px)`
      }}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navigationItems.map((item) => {
          const IconComponent = item.isActive ? item.activeIcon : item.icon;
          const isCreateButton = item.id === 'create';
          
          return (
            <motion.button
              key={item.id}
              onClick={() => handleItemPress(item)}
              className={`
                relative flex flex-col items-center justify-center
                ${touchTargetClasses}
                ${isCreateButton 
                  ? 'bg-blue-500 text-white rounded-full p-3 shadow-lg' 
                  : 'text-gray-600 dark:text-gray-400 p-2'
                }
                ${item.isActive && !isCreateButton 
                  ? 'text-blue-500 dark:text-blue-400' 
                  : ''
                }
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              aria-label={item.label}
              aria-current={item.isActive ? 'page' : undefined}
            >
              <div className="relative">
                <IconComponent 
                  className={`
                    ${isCreateButton ? 'w-6 h-6' : 'w-6 h-6'}
                    transition-transform duration-200
                  `} 
                />
                
                {/* Badge for unread messages */}
                {item.badge && item.badge > 0 && (
                  <motion.div
                    className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    aria-label={`${item.badge} unread messages`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </motion.div>
                )}
              </div>
              
              {/* Label */}
              {!isCreateButton && (
                <span className={`
                  text-xs mt-1 font-medium
                  ${item.isActive ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}
                  transition-colors duration-200
                `}>
                  {item.label}
                </span>
              )}
              
              {/* Active indicator */}
              {item.isActive && !isCreateButton && (
                <motion.div
                  className="absolute -bottom-1 w-1 h-1 bg-blue-500 rounded-full"
                  layoutId="activeIndicator"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default MobileBottomNavigation;