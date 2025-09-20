'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  UserGroupIcon, 
  ChatBubbleLeftRightIcon, 
  ClipboardDocumentListIcon, 
  ShoppingBagIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  ClipboardDocumentListIcon as ClipboardDocumentListIconSolid,
  ShoppingBagIcon as ShoppingBagIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid
} from '@heroicons/react/24/solid';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconSolid: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
}

interface MobileNavigationProps {
  className?: string;
  onItemPress?: (item: NavItem) => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  className = '',
  onItemPress
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string>('home');
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: HomeIcon,
      iconSolid: HomeIconSolid,
      path: '/'
    },
    {
      id: 'communities',
      label: 'Communities',
      icon: UserGroupIcon,
      iconSolid: UserGroupIconSolid,
      path: '/dao/ethereum-builders'
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: ChatBubbleLeftRightIcon,
      iconSolid: ChatBubbleLeftRightIconSolid,
      path: '/messaging',
      badge: 3
    },
    {
      id: 'governance',
      label: 'Governance',
      icon: ClipboardDocumentListIcon,
      iconSolid: ClipboardDocumentListIconSolid,
      path: '/governance'
    },
    {
      id: 'marketplace',
      label: 'Marketplace',
      icon: ShoppingBagIcon,
      iconSolid: ShoppingBagIconSolid,
      path: '/marketplace'
    }
  ];

  // Handle scroll to show/hide navigation
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Update active item based on current path
  useEffect(() => {
    if (!pathname) return;
    
    const currentItem = navItems.find(item => 
      item.path === pathname || 
      (item.path !== '/' && pathname.startsWith(item.path))
    );
    
    if (currentItem) {
      setActiveItem(currentItem.id);
    }
  }, [pathname]);

  const handleItemPress = (item: NavItem) => {
    setActiveItem(item.id);
    router.push(item.path);
    onItemPress?.(item);

    // Haptic feedback for supported devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const NavItemComponent: React.FC<{ item: NavItem; isActive: boolean }> = ({ 
    item, 
    isActive 
  }) => {
    const IconComponent = isActive ? item.iconSolid : item.icon;
    
    return (
      <motion.button
        className={`
          relative flex flex-col items-center justify-center p-2 rounded-xl
          transition-all duration-200 ease-out
          ${isActive 
            ? 'text-indigo-600 bg-indigo-50/80 backdrop-blur-sm' 
            : 'text-gray-600 hover:text-indigo-500 hover:bg-gray-50/50'
          }
          active:scale-95 touch-manipulation
          min-h-[56px] min-w-[56px]
        `}
        onClick={() => handleItemPress(item)}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
        aria-label={item.label}
        role="tab"
        aria-selected={isActive}
      >
        {/* Icon with animation */}
        <motion.div
          className="relative"
          animate={{
            scale: isActive ? 1.1 : 1,
            rotate: isActive && item.id === 'sell' ? 45 : 0
          }}
          transition={{ duration: 0.2 }}
        >
          <IconComponent className="w-6 h-6" />
          
          {/* Badge */}
          {item.badge && item.badge > 0 && (
            <motion.div
              className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              {item.badge > 99 ? '99+' : item.badge}
            </motion.div>
          )}
        </motion.div>

        {/* Label */}
        <motion.span
          className={`
            text-xs font-medium mt-1 transition-all duration-200
            ${isActive ? 'opacity-100' : 'opacity-70'}
          `}
          animate={{
            fontSize: isActive ? '0.75rem' : '0.7rem',
            fontWeight: isActive ? 600 : 500
          }}
        >
          {item.label}
        </motion.span>

        {/* Active indicator */}
        {isActive && (
          <motion.div
            className="absolute -top-1 left-1/2 w-1 h-1 bg-indigo-600 rounded-full"
            layoutId="activeIndicator"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
      </motion.button>
    );
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          className={`
            fixed bottom-0 left-0 right-0 z-50 md:hidden
            bg-white/90 backdrop-blur-lg border-t border-gray-200/50
            shadow-lg shadow-black/5
            ${className}
          `}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          role="tablist"
          aria-label="Main navigation"
        >
          {/* Safe area padding for devices with home indicator */}
          <div className="px-4 pt-2 pb-safe">
            <div className="flex items-center justify-around">
              {navItems.map((item) => (
                <NavItemComponent
                  key={item.id}
                  item={item}
                  isActive={activeItem === item.id}
                />
              ))}
            </div>
          </div>

          {/* Gesture indicator */}
          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gray-300 rounded-full opacity-30" />
        </motion.nav>
      )}
    </AnimatePresence>
  );
};

export default MobileNavigation;