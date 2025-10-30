'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useChatHistory } from '@/hooks/useChatHistory';
import { governanceService } from '@/services/governanceService';
import { CommunityMembershipService } from '@/services/communityMembershipService';
import type { CommunityMembership } from '@/models/CommunityMembership';
import { useAccount } from 'wagmi';
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

  const { address } = useAccount();

  // Live unread counts
  const { conversations } = useChatHistory();
  const [messagesUnread, setMessagesUnread] = useState(0);
  const [governancePending, setGovernancePending] = useState(0);

  useEffect(() => {
    try {
      // We don't have direct access to wallet address here; sum across all keys
      const total = (conversations || []).reduce((sum, conv: any) => sum + Object.values(conv.unreadCounts || {}).reduce((s: number, v: any) => s + (typeof v === 'number' ? v : 0), 0), 0);
      setMessagesUnread(total);
    } catch { setMessagesUnread(0); }
  }, [conversations]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!address) { if (active) setGovernancePending(0); return; }
        // Get user's joined communities with fallback for 503 errors
        let memberships: CommunityMembership[] = [];
        try {
          memberships = await CommunityMembershipService.getUserMemberships(address, { isActive: true, limit: 100 });
        } catch (err) {
          // Handle 503 Service Unavailable specifically
          if (err instanceof Error && err.message.includes('503')) {
            console.warn('Backend service unavailable, using empty memberships for governance count');
            // Continue with empty memberships instead of throwing
            memberships = [];
          } else {
            // Re-throw other errors
            throw err;
          }
        }
        const communityIds = new Set(memberships.map(m => m.communityId));
        const proposals = await governanceService.getAllActiveProposals();
        const count = Array.isArray(proposals)
          ? proposals.filter((p: any) => (p.status === 'ACTIVE' || p.status === 'active') && communityIds.has(p.communityId) && (p.canVote ?? true)).length
          : 0;
        if (active) setGovernancePending(count);
      } catch { if (active) setGovernancePending(0); }
    })();
    return () => { active = false; };
  }, [address]);

  const navItems: NavItem[] = useMemo(() => ([
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
      path: '/communities'
    },
    // {
    //   id: 'messaging',
    //   label: 'Messages',
    //   icon: ChatBubbleLeftRightIcon,
    //   iconSolid: ChatBubbleLeftRightIconSolid,
    //   path: '/messaging',
    //   badge: messagesUnread
    // },
    {
      id: 'marketplace',
      label: 'Marketplace',
      icon: ShoppingBagIcon,
      iconSolid: ShoppingBagIconSolid,
      path: '/marketplace'
    },
    {
      id: 'governance',
      label: 'Governance',
      icon: ClipboardDocumentListIcon,
      iconSolid: ClipboardDocumentListIconSolid,
      path: '/governance',
      badge: governancePending
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Cog6ToothIcon,
      iconSolid: Cog6ToothIconSolid,
      path: '/settings'
    }
  ]), [messagesUnread, governancePending]);

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
          relative flex flex-col items-center justify-center p-2 rounded-2xl
          transition-all duration-200 ease-out
          ${isActive 
            ? 'text-indigo-600 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 backdrop-blur-sm' 
            : 'text-gray-600 hover:text-indigo-500 hover:bg-gray-50/50 dark:hover:bg-gray-800/40'
          }
          hover:scale-105 active:scale-95 touch-manipulation
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
              transition={{ type: 'spring' as any, stiffness: 500, damping: 30 }}
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
          <>
            <motion.div
              className="absolute -top-1 left-1/2 w-1 h-1 bg-indigo-600 rounded-full"
              layoutId="activeIndicatorDot"
              transition={{ type: 'spring' as any, stiffness: 500, damping: 30 }}
            />
            <motion.div
              className="absolute -bottom-1 left-3 right-3 h-0.5 bg-indigo-500/80 rounded-full"
              layoutId="activeIndicatorBar"
              transition={{ type: 'spring' as any, stiffness: 500, damping: 30 }}
            />
          </>
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
          transition={{ type: 'spring' as any, stiffness: 500, damping: 40 }}
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