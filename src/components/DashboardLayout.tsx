import React, { ReactNode, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '@/context/NavigationContext';
import { ThemeProvider, ThemeToggle } from '@/context/ThemeContext';
import { Analytics } from "@vercel/analytics/next";
import NotificationSystem from '@/components/NotificationSystem';
import RealTimeNotifications from '@/components/RealTimeNotifications';
import NavigationSidebar from '@/components/NavigationSidebar';
import MobileNavigation from '@/components/MobileNavigation';
import FloatingActionDock from '@/components/FloatingActionDock';
import { Web3ErrorBoundary } from '@/components/ErrorBoundaries';
import { LoadingState } from '@/components/FallbackStates';
import { LoadingOverlay } from '@/components/LoadingAnimations';
import { NotificationBadge, AnimatedButton } from '@/components/MicroInteractions';
import { 
  fadeInUp, 
  slideInFromLeft, 
  slideInFromRight, 
  pageTransition,
  modalOverlay,
  sidebarSlide,
  sidebarContent
} from '@/lib/animations';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  activeView: 'feed' | 'community';
  communityId?: string;
  rightSidebar?: ReactNode;
  onCreatePost?: () => void;
}

export default function DashboardLayout({ 
  children, 
  title = 'Dashboard - LinkDAO',
  activeView,
  communityId,
  rightSidebar,
  onCreatePost 
}: DashboardLayoutProps) {
  const { isConnected } = useAccount();
  const router = useRouter();
  const { 
    navigationState, 
    setActiveView, 
    setActiveCommunity,
    toggleSidebar,
    setSidebarCollapsed 
  } = useNavigation();
  const [isMobile, setIsMobile] = useState(false);

  // Sync props with navigation state
  useEffect(() => {
    if (activeView !== navigationState.activeView) {
      setActiveView(activeView);
    }
    if (communityId !== navigationState.activeCommunity) {
      setActiveCommunity(communityId);
    }
  }, [activeView, communityId, navigationState.activeView, navigationState.activeCommunity, setActiveView, setActiveCommunity]);

  // Redirect to login if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  // Handle mobile detection and responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Auto-collapse sidebar on mobile
      if (mobile && !navigationState.sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [navigationState.sidebarCollapsed, setSidebarCollapsed]);

  // Handle escape key to close sidebar on mobile
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !navigationState.sidebarCollapsed && isMobile) {
        setSidebarCollapsed(true);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [navigationState.sidebarCollapsed, setSidebarCollapsed, isMobile]);

  if (!isConnected) {
    return (
      <ThemeProvider>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center"
        >
          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            className="text-center"
          >
            <LoadingState 
              message="Please connect your wallet to access the dashboard"
              size="lg"
            />
          </motion.div>
        </motion.div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <RealTimeNotifications>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"
        >
        <Head>
          <title>{title}</title>
          <meta name="description" content="LinkDAO - Web3 Social Dashboard" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {!navigationState.sidebarCollapsed && isMobile && (
            <motion.div 
              variants={modalOverlay}
              initial="initial"
              animate="animate"
              exit="exit"
              className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
              onClick={() => setSidebarCollapsed(true)}
            />
          )}
        </AnimatePresence>

      <div className="flex h-screen overflow-hidden">
        {/* Left Sidebar */}
        <motion.div 
          variants={sidebarSlide}
          animate={navigationState.sidebarCollapsed ? 'collapsed' : 'expanded'}
          className={`
            fixed md:static inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 
            ${navigationState.sidebarCollapsed ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
            ${isMobile ? 'shadow-2xl w-64' : ''}
          `}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <motion.div 
              className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700"
              layout
            >
              <AnimatePresence>
                {!navigationState.sidebarCollapsed && (
                  <motion.h1 
                    variants={sidebarContent}
                    initial="collapsed"
                    animate="expanded"
                    exit="collapsed"
                    className="text-xl font-bold text-gray-900 dark:text-white"
                  >
                    LinkDAO
                  </motion.h1>
                )}
              </AnimatePresence>
              <motion.button
                onClick={toggleSidebar}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                aria-label={navigationState.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  animate={{ rotate: navigationState.sidebarCollapsed ? 0 : 180 }}
                  transition={{ duration: 0.2 }}
                >
                  {navigationState.sidebarCollapsed ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  )}
                </motion.svg>
              </motion.button>
            </motion.div>

            {/* Navigation Sidebar Component */}
            <NavigationSidebar className="flex-1" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header Bar */}
          <motion.header 
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-30"
          >
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <motion.button
                onClick={toggleSidebar}
                className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                aria-label="Toggle sidebar"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </motion.button>

              {/* Breadcrumb */}
              <motion.div 
                className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400"
                layout
              >
                <span>Dashboard</span>
                <motion.svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  animate={{ rotate: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </motion.svg>
                <motion.span 
                  className="text-gray-900 dark:text-white capitalize"
                  key={navigationState.activeView}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {navigationState.activeView}
                  {navigationState.activeCommunity && ` - ${navigationState.activeCommunity}`}
                </motion.span>
              </motion.div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-3">
              {/* Theme toggle */}
              <ThemeToggle />

              {/* Search button */}
              <motion.button 
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </motion.button>

              {/* Notifications button */}
              <motion.button 
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 relative transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <NotificationBadge count={3} />
              </motion.button>
            </div>
          </motion.header>

          {/* Main content with right sidebar */}
          <div className="flex-1 flex overflow-hidden">
            {/* Main content */}
            <motion.main 
              variants={pageTransition}
              initial="initial"
              animate="animate"
              className={`flex-1 overflow-y-auto p-3 md:p-6 ${
                navigationState.rightSidebarVisible && !isMobile ? 'mr-80' : ''
              } ${isMobile ? 'pb-20' : ''}`}
            >
              <Web3ErrorBoundary>
                <motion.div
                  key={`${navigationState.activeView}-${navigationState.activeCommunity}`}
                  variants={pageTransition}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {children}
                </motion.div>
              </Web3ErrorBoundary>
            </motion.main>

            {/* Right Sidebar - Hidden on mobile */}
            <AnimatePresence>
              {navigationState.rightSidebarVisible && !isMobile && (
                <motion.aside 
                  variants={slideInFromRight}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="fixed right-0 top-16 bottom-0 w-80 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-l border-gray-200 dark:border-gray-700 overflow-y-auto z-20"
                >
                  <div className="p-6">
                    {rightSidebar || (
                      /* Default sidebar content */
                      <motion.div 
                        variants={fadeInUp}
                        initial="initial"
                        animate="animate"
                        className="space-y-6"
                      >
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            Trending
                          </h3>
                          <div className="space-y-2">
                            <motion.div 
                              className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                              whileHover={{ scale: 1.02 }}
                              transition={{ duration: 0.1 }}
                            >
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                Trending content will appear here
                              </p>
                            </motion.div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            Quick Actions
                          </h3>
                          <div className="space-y-2">
                            <AnimatedButton
                              onClick={onCreatePost}
                              variant="ghost"
                              className="w-full justify-start"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Create Post
                            </AnimatedButton>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation />

      {/* Floating Action Dock for Mobile */}
      <FloatingActionDock onCreatePost={onCreatePost} />

      {/* Notification System */}
      {isConnected && <NotificationSystem />}
      
      {/* Analytics */}
      <Analytics />
      </motion.div>
    </RealTimeNotifications>
    </ThemeProvider>
  );
}