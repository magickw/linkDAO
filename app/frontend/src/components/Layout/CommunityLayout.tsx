import React, { useState, useEffect } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface CommunityLayoutProps {
  children: React.ReactNode;
  leftSidebar?: React.ReactNode;
  rightSidebar?: React.ReactNode;
  className?: string;
}

export default function CommunityLayout({
  children,
  leftSidebar,
  rightSidebar,
  className = ''
}: CommunityLayoutProps) {
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  
  // Media queries for responsive behavior
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Auto-collapse sidebars based on screen size
  useEffect(() => {
    if (isMobile) {
      setLeftSidebarCollapsed(true);
      setRightSidebarCollapsed(true);
    } else if (isTablet) {
      setLeftSidebarCollapsed(true);
      setRightSidebarCollapsed(false);
    } else if (isDesktop) {
      setLeftSidebarCollapsed(false);
      setRightSidebarCollapsed(false);
    }
  }, [isMobile, isTablet, isDesktop]);

  const getGridColumns = () => {
    if (isMobile) {
      return '1fr'; // Single column on mobile
    } else if (isTablet) {
      return '1fr 300px'; // Two columns on tablet (content + right sidebar)
    } else {
      // Three columns on desktop
      const leftCol = leftSidebarCollapsed ? '0' : '250px';
      const rightCol = rightSidebarCollapsed ? '0' : '300px';
      return `${leftCol} 1fr ${rightCol}`;
    }
  };

  return (
    <div 
      className={`community-layout min-h-screen ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: getGridColumns(),
        gap: '1rem',
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 1rem'
      }}
    >
      {/* Left Sidebar */}
      {leftSidebar && (
        <>
          {/* Desktop/Tablet Left Sidebar */}
          {!isMobile && !leftSidebarCollapsed && (
            <aside 
              className="left-sidebar sticky top-4 h-fit"
              role="complementary"
              aria-label="Navigation sidebar"
            >
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                {leftSidebar}
              </div>
            </aside>
          )}
          
          {/* Mobile Left Sidebar Overlay */}
          {isMobile && !leftSidebarCollapsed && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={() => setLeftSidebarCollapsed(true)}
                aria-hidden="true"
              />
              
              {/* Sidebar */}
              <aside 
                className="fixed left-0 top-0 h-full w-80 bg-white dark:bg-gray-800 z-50 transform transition-transform duration-300 ease-in-out shadow-xl"
                role="complementary"
                aria-label="Navigation sidebar"
              >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setLeftSidebarCollapsed(true)}
                    className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label="Close navigation sidebar"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="overflow-y-auto h-full pb-20">
                  {leftSidebar}
                </div>
              </aside>
            </>
          )}
        </>
      )}

      {/* Main Content */}
      <main 
        className="main-content min-h-screen"
        role="main"
        aria-label="Main content"
      >
        {/* Mobile sidebar toggle buttons */}
        {isMobile && (
          <div className="flex justify-between mb-4 sticky top-0 bg-white dark:bg-gray-900 z-30 py-2 border-b border-gray-200 dark:border-gray-700">
            {leftSidebar && (
              <button
                onClick={() => setLeftSidebarCollapsed(false)}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Open navigation sidebar"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Menu
              </button>
            )}
            
            {rightSidebar && (
              <button
                onClick={() => setRightSidebarCollapsed(false)}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Open community sidebar"
              >
                Info
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
          </div>
        )}
        
        {children}
      </main>

      {/* Right Sidebar */}
      {rightSidebar && (
        <>
          {/* Desktop/Tablet Right Sidebar */}
          {!rightSidebarCollapsed && (isDesktop || isTablet) && (
            <aside 
              className="right-sidebar sticky top-4 h-fit"
              role="complementary"
              aria-label="Community information sidebar"
            >
              <div className="space-y-4">
                {rightSidebar}
              </div>
            </aside>
          )}
          
          {/* Mobile Right Sidebar Overlay */}
          {isMobile && !rightSidebarCollapsed && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={() => setRightSidebarCollapsed(true)}
                aria-hidden="true"
              />
              
              {/* Sidebar */}
              <aside 
                className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 z-50 transform transition-transform duration-300 ease-in-out shadow-xl"
                role="complementary"
                aria-label="Community information sidebar"
              >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setRightSidebarCollapsed(true)}
                    className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label="Close community sidebar"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="overflow-y-auto h-full pb-20 p-4 space-y-4">
                  {rightSidebar}
                </div>
              </aside>
            </>
          )}
        </>
      )}
    </div>
  );
}