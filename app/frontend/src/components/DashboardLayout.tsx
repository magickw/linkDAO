import React, { ReactNode, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { useNavigation } from '@/context/NavigationContext';
import dynamic from 'next/dynamic';

const Analytics = dynamic(() => import('@vercel/analytics/react').then(mod => ({ default: mod.Analytics })), {
  ssr: false
});
import NotificationSystem from '@/components/NotificationSystem';
import RealTimeNotifications from '@/components/RealTimeNotifications';
import NavigationSidebar from '@/components/NavigationSidebar';
import MobileNavigation from '@/components/MobileNavigation';
import FloatingActionDock from '@/components/FloatingActionDock';
import { Web3ErrorBoundary } from '@/components/ErrorBoundaries';
import { LoadingState } from '@/components/FallbackStates';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { PageTransition, ViewTransition } from '@/components/animations/TransitionComponents';
import { EnhancedThemeToggle } from '@/components/VisualPolish';
import { LoadingSpinner } from '@/components/animations/LoadingSkeletons';
import { MessagingWidget } from '@/components/Messaging';
import TrendingSidebar from '@/components/TrendingSidebar';
import EnhancedNotificationSystem from '@/components/EnhancedNotificationSystem';

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
  const [showNotifications, setShowNotifications] = useState(false);

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
          fixed md:static top-16 bottom-0 left-4 z-50 w-80 md:w-96 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 transform transition-all duration-300 ease-bounce-in
          ${navigationState.sidebarCollapsed ? '-translate-x-full md:translate-x-0 md:w-16' : 'translate-x-0'}
          ${isMobile ? 'shadow-2xl animate-slideInLeft' : ''}
        `}>
            <div className="flex flex-col h-full overflow-y-auto">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                {!navigationState.sidebarCollapsed && (
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent animate-fadeInLeft">
                    LinkDAO
                  </h1>
                )}
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200 hover:scale-110 active:scale-95"
                  aria-label={navigationState.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  <svg className={`w-5 h-5 transition-transform duration-300 ${navigationState.sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <header className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 px-4 py-3 flex items-center justify-between animate-fadeInDown">
              <div className="flex items-center space-x-4">
                {/* Mobile menu button */}
                <button
                  onClick={toggleSidebar}
                  className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200 hover:scale-110 active:scale-95"
                  aria-label="Toggle sidebar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Breadcrumb */}
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 animate-slideInLeft">
                  <span className="font-medium">Dashboard</span>
                  <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-gray-900 dark:text-white capitalize font-medium">
                    {navigationState.activeView}
                    {navigationState.activeCommunity && ` - ${navigationState.activeCommunity}`}
                  </span>
                </div>
              </div>

              {/* Right side actions */}
              <div className="flex items-center space-x-3 animate-slideInRight">
                {/* Search button */}
                <button className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200 hover:scale-110 active:scale-95 group">
                  <svg className="w-5 h-5 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>

                {/* Theme toggle */}
                <EnhancedThemeToggle />

                {/* Notifications button */}
                <button
                  onClick={() => setShowNotifications(true)}
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-primary-500 relative transition-all duration-200 hover:scale-110 active:scale-95 group"
                >
                  <svg className="w-5 h-5 group-hover:animate-wiggle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                </button>

                {/* Quick Messaging Access */}
                <button
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-primary-500 relative transition-all duration-200 hover:scale-110 active:scale-95 group"
                  title="Open Messaging"
                >
                  <svg className="w-5 h-5 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </button>
              </div>
            </header>

            {/* Main content with right sidebar */}
            <div className="flex-1 flex overflow-hidden">
              {/* Main content */}
              <main className={`flex-1 overflow-y-auto p-3 md:p-6 ${navigationState.rightSidebarVisible && !isMobile ? 'mr-80' : ''}
                ${!navigationState.sidebarCollapsed && !isMobile ? 'ml-80 md:ml-96' : (!isMobile ? 'md:ml-20' : '')}
                ${isMobile ? 'pb-20' : ''}`}>
                <Web3ErrorBoundary>
                  <PageTransition animation="fade" duration={300}>
                    {children}
                  </PageTransition>
                </Web3ErrorBoundary>
              </main>

              {/* Right Sidebar - Hidden on mobile */}
              {navigationState.rightSidebarVisible && !isMobile && (
                <aside className="fixed right-4 top-16 bottom-0 w-80 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-l border-gray-200/50 dark:border-gray-700/50 overflow-y-auto animate-slideInRight">
                  <div className="p-6">
                    {rightSidebar || (
                      <TrendingSidebar
                        onCreatePost={onCreatePost}
                        onOpenWallet={() => console.log('Open wallet')}
                        userWalletAddress="0x1234...5678"
                      />
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

        {/* Wallet-to-Wallet Messaging Widget */}
        {isConnected && <MessagingWidget />}

        {/* Performance Monitoring (Development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 left-4 bg-black/80 text-white text-xs p-2 rounded z-50">
            Performance Monitor Active
          </div>
        )}

        {/* Enhanced Notification System */}
        <EnhancedNotificationSystem
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          onNotificationClick={(notification) => {
            console.log('Notification clicked:', notification);
            // Handle notification click - navigate to relevant page
          }}
        />

        {/* Footer (same as main Layout) */}
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {/* Quick Links */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quick Links</h3>
                <ul className="space-y-2">
                  <li><a href="/" className="text-base text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">Home</a></li>
                  <li><a href="/dao/ethereum-builders" className="text-base text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">Communities</a></li>
                  <li><a href="/marketplace" className="text-base text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">Marketplace</a></li>
                  <li><a href="/governance" className="text-base text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">Governance</a></li>
                </ul>
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Connect</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-base text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">Twitter</a></li>
                  <li><a href="#" className="text-base text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">Discord</a></li>
                  <li><a href="#" className="text-base text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">Telegram</a></li>
                  <li><a href="#" className="text-base text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">GitHub</a></li>
                </ul>
              </div>

              {/* Legal Links */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Legal</h3>
                <ul className="space-y-2">
                  <li><a href="/terms" className="text-base text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">Terms of Service</a></li>
                  <li><a href="/privacy" className="text-base text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">Privacy Policy</a></li>
                </ul>
              </div>

              {/* Newsletter Subscription */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stay Updated</h3>
                <p className="text-base text-gray-600 dark:text-gray-300">Join our newsletter to get the latest updates.</p>
                <form className="flex flex-col sm:flex-row">
                  <input type="email" placeholder="Enter your email" className="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500" />
                  <button type="submit" className="mt-2 sm:mt-0 sm:ml-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Subscribe</button>
                </form>
              </div>
            </div>

            <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
              <p className="text-base text-gray-500 dark:text-gray-400 text-center">
                © {new Date().getFullYear()} LinkDAO. All rights reserved.
              </p>
              <p className="text-base text-gray-500 dark:text-gray-400 text-center">
                Designed and powered by{" "}
                <a
                  href="https://bytestitch.us/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  ByteStitch
                </a>
              </p>
            </div>
          </div>
        </footer>

        {/* Analytics */}
        <Analytics />
      </div>
    </RealTimeNotifications>
  );
}