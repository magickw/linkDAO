import React, { ReactNode, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { useNavigation } from '@/context/NavigationContext';
import { Analytics } from "@vercel/analytics/next";
import NotificationSystem from '@/components/NotificationSystem';
import RealTimeNotifications from '@/components/RealTimeNotifications';
import NavigationSidebar from '@/components/NavigationSidebar';
import MobileNavigation from '@/components/MobileNavigation';
import FloatingActionDock from '@/components/FloatingActionDock';
import { Web3ErrorBoundary } from '@/components/ErrorBoundaries';
import { LoadingState } from '@/components/FallbackStates';

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <LoadingState 
          message="Please connect your wallet to access the dashboard"
          size="lg"
        />
      </div>
    );
  }

  return (
    <RealTimeNotifications>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Head>
        <title>{title}</title>
        <meta name="description" content="LinkDAO - Web3 Social Dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Mobile sidebar overlay */}
      {!navigationState.sidebarCollapsed && isMobile && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      <div className="flex h-screen overflow-hidden">
        {/* Left Sidebar */}
        <div className={`
          fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out
          ${navigationState.sidebarCollapsed ? '-translate-x-full md:translate-x-0 md:w-16' : 'translate-x-0'}
          ${isMobile ? 'shadow-2xl' : ''}
        `}>
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              {!navigationState.sidebarCollapsed && (
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  LinkDAO
                </h1>
              )}
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label={navigationState.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {navigationState.sidebarCollapsed ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  )}
                </svg>
              </button>
            </div>

            {/* Navigation Sidebar Component */}
            <NavigationSidebar className="flex-1" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header Bar */}
          <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                onClick={toggleSidebar}
                className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Toggle sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Breadcrumb */}
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <span>Dashboard</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-gray-900 dark:text-white capitalize">
                  {navigationState.activeView}
                  {navigationState.activeCommunity && ` - ${navigationState.activeCommunity}`}
                </span>
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-3">
              {/* Search button */}
              <button className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Notifications button */}
              <button className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </header>

          {/* Main content with right sidebar */}
          <div className="flex-1 flex overflow-hidden">
            {/* Main content */}
            <main className={`flex-1 overflow-y-auto p-3 md:p-6 ${
              navigationState.rightSidebarVisible && !isMobile ? 'mr-80' : ''
            } ${isMobile ? 'pb-20' : ''}`}>
              <Web3ErrorBoundary>
                {children}
              </Web3ErrorBoundary>
            </main>

            {/* Right Sidebar - Hidden on mobile */}
            {navigationState.rightSidebarVisible && !isMobile && (
              <aside className="fixed right-0 top-16 bottom-0 w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
                <div className="p-6">
                  {rightSidebar || (
                    /* Default sidebar content */
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          Trending
                        </h3>
                        <div className="space-y-2">
                          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              Trending content will appear here
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          Quick Actions
                        </h3>
                        <div className="space-y-2">
                          <button 
                            onClick={onCreatePost}
                            className="w-full p-3 text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              Create Post
                            </p>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            )}
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
      </div>
    </RealTimeNotifications>
  );
}