import React, { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { useNavigation } from '@/context/NavigationContext';
import { LoadingSpinner } from '@/components/animations/LoadingSkeletons';
import TrendingSidebar from '@/components/TrendingSidebar';
import MobileNavigation from '@/components/MobileNavigation';

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
    setActiveCommunity
  } = useNavigation();

  // Notifications placeholder

  // State for sidebar visibility
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // Update document title
  useEffect(() => {
    document.title = title;
  }, [title]);

  // Handle navigation state persistence
  useEffect(() => {
    if (navigationState) {
      // Restore navigation state
      if (navigationState.activeView !== activeView) {
        setActiveView(activeView);
      }
      if (navigationState.activeCommunity !== communityId) {
        setActiveCommunity(communityId);
      }
    } else {
      // Initialize navigation state
      setActiveView(activeView);
      setActiveCommunity(communityId);
    }
  }, [activeView, communityId, navigationState, setActiveView, setActiveCommunity]);

  // Cleanup navigation state on unmount - not needed

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        {/* Left Sidebar */}
        <aside className={`${isLeftSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden`}>
          <div className="h-full overflow-y-auto">
            <TrendingSidebar />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Navigation placeholder */}

          {/* Content Area */}
          <main className="flex-1 overflow-hidden">
            <div className="h-full flex">
              {/* Main Content */}
              <div className="flex-1 overflow-y-auto">
                {children}
              </div>

              {/* Right Sidebar */}
              {rightSidebar && (
                <aside className={`${isRightSidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-hidden`}>
                  <div className="h-full overflow-y-auto">
                    {rightSidebar}
                  </div>
                </aside>
              )}
            </div>
          </main>

          {/* Mobile Navigation */}
          <MobileNavigation />

          {/* Floating Action Dock placeholder */}
        </div>

        {/* Notification System placeholder */}

        {/* Analytics placeholder */}
      </div>
  );
}