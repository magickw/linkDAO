import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GlassmorphismCard,
  EnhancedPostCardGlass,
  GlassSidebarLink,
  AnimatedButton,
  StaggeredList,
  FloatingActionButton,
  AnimatedToast,
  RippleEffect,
  useEnhancedTheme,
  EnhancedThemeToggle,
  PostCardSkeleton,
  UserProfileCardSkeleton,
  QuickActionsSkeleton,
  PulseLoader,
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveStack,
  MobileFirstCard,
  VisualPolishClasses
} from './index';

// Enhanced Dashboard Layout with Visual Polish
interface VisualPolishDashboardProps {
  children: React.ReactNode;
  className?: string;
}

export function VisualPolishDashboard({
  children,
  className = ''
}: VisualPolishDashboardProps) {
  const { actualTheme } = useEnhancedTheme();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900">
        <ResponsiveContainer className="py-8">
          <ResponsiveStack direction={{ xs: 'col', lg: 'row' }} spacing="xl">
            {/* Sidebar Skeleton */}
            <div className="w-full lg:w-64 flex-shrink-0 space-y-6">
              <UserProfileCardSkeleton />
              <QuickActionsSkeleton />
              <GlassmorphismCard className="p-4">
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
                      <div className="flex-1 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </GlassmorphismCard>
            </div>

            {/* Main Content Skeleton */}
            <div className="flex-1 space-y-6">
              {[...Array(3)].map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          </ResponsiveStack>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <motion.div
      className={`min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}

// Enhanced Header with Theme Toggle
interface VisualPolishHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function VisualPolishHeader({
  title,
  subtitle,
  actions,
  className = ''
}: VisualPolishHeaderProps) {
  return (
    <motion.div
      className={`sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-white/20 dark:border-gray-700/20 ${className}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <ResponsiveContainer className="py-4">
        <ResponsiveStack direction={{ xs: 'row' }} justify="between" align="center">
          <div>
            <motion.h1
              className="text-2xl font-bold text-gray-900 dark:text-white"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {title}
            </motion.h1>
            {subtitle && (
              <motion.p
                className="text-gray-600 dark:text-gray-400 mt-1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                {subtitle}
              </motion.p>
            )}
          </div>
          
          <motion.div
            className="flex items-center space-x-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            {actions}
            <EnhancedThemeToggle showSettings />
          </motion.div>
        </ResponsiveStack>
      </ResponsiveContainer>
    </motion.div>
  );
}

// Enhanced Sidebar with Glass Links
interface VisualPolishSidebarProps {
  navigation: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    active?: boolean;
    badge?: number;
    onClick?: () => void;
  }>;
  userProfile?: {
    name: string;
    avatar?: string;
    stats?: Array<{ label: string; value: string | number }>;
  };
  walletInfo?: {
    balance: string;
    address: string;
    transactions?: Array<{ type: string; amount: string; time: string }>;
  };
  className?: string;
}

export function VisualPolishSidebar({
  navigation,
  userProfile,
  walletInfo,
  className = ''
}: VisualPolishSidebarProps) {
  return (
    <motion.div
      className={`w-full lg:w-64 flex-shrink-0 space-y-6 ${className}`}
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* User Profile Card */}
      {userProfile && (
        <GlassmorphismCard className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
              {userProfile.avatar ? (
                <img src={userProfile.avatar} alt={userProfile.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                userProfile.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {userProfile.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Active now
              </p>
            </div>
          </div>
          
          {userProfile.stats && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {userProfile.stats.map((stat, index) => (
                <div key={index}>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassmorphismCard>
      )}

      {/* Navigation */}
      <GlassmorphismCard className="p-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Navigation
        </h3>
        <StaggeredList className="space-y-1">
          {navigation.map((item) => (
            <GlassSidebarLink
              key={item.id}
              onClick={item.onClick}
              active={item.active}
              icon={item.icon}
              badge={item.badge}
            >
              {item.label}
            </GlassSidebarLink>
          ))}
        </StaggeredList>
      </GlassmorphismCard>

      {/* Wallet Info */}
      {walletInfo && (
        <GlassmorphismCard className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Wallet
            </h3>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          
          <div className="mb-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {walletInfo.balance}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {walletInfo.address.slice(0, 6)}...{walletInfo.address.slice(-4)}
            </div>
          </div>

          <ResponsiveGrid cols={{ xs: 2 }} gap="sm" className="mb-4">
            <AnimatedButton variant="primary" size="sm" className="text-xs">
              Send
            </AnimatedButton>
            <AnimatedButton variant="secondary" size="sm" className="text-xs">
              Receive
            </AnimatedButton>
          </ResponsiveGrid>

          {walletInfo.transactions && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                Recent
              </h4>
              <div className="space-y-2">
                {walletInfo.transactions.slice(0, 3).map((tx, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span className="text-gray-600 dark:text-gray-300">{tx.type}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {tx.amount}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        {tx.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassmorphismCard>
      )}
    </motion.div>
  );
}

// Enhanced Main Content Area
interface VisualPolishMainContentProps {
  children: React.ReactNode;
  className?: string;
}

export function VisualPolishMainContent({
  children,
  className = ''
}: VisualPolishMainContentProps) {
  return (
    <motion.div
      className={`flex-1 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

// Enhanced Notification System
interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

export function VisualPolishNotificationSystem() {
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);

  const addNotification = (notification: Omit<NotificationProps, 'id' | 'onClose'>) => {
    const id = Date.now().toString();
    const newNotification = {
      ...notification,
      id,
      onClose: removeNotification
    };
    
    setNotifications(prev => [...prev, newNotification]);
    
    if (notification.duration !== 0) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration || 5000);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <AnimatedToast
            key={notification.id}
            type={notification.type}
            onClose={() => notification.onClose(notification.id)}
          >
            <div>
              <div className="font-semibold">{notification.title}</div>
              <div className="text-sm opacity-90">{notification.message}</div>
            </div>
          </AnimatedToast>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Export the notification system hook
export function useVisualPolishNotifications() {
  const [notificationSystem, setNotificationSystem] = useState<{
    addNotification: (notification: Omit<NotificationProps, 'id' | 'onClose'>) => void;
  } | null>(null);

  return {
    addNotification: notificationSystem?.addNotification || (() => {}),
    NotificationSystem: VisualPolishNotificationSystem
  };
}

// Default export for lazy loading
export default VisualPolishDashboard;