import React from 'react';
import { useMobileSidebar } from '@/hooks/useMobileSidebar';
import { useResponsive } from '@/design-system/hooks/useResponsive';
import { MobileSidebarOverlay, LeftSidebarOverlay, RightSidebarOverlay } from './MobileSidebarOverlay';
import MobileSidebarToggle, { LeftSidebarToggle, RightSidebarToggle } from './MobileSidebarToggle';

interface MobileSidebarManagerProps {
  leftSidebarContent?: React.ReactNode;
  rightSidebarContent?: React.ReactNode;
  leftSidebarTitle?: string;
  rightSidebarTitle?: string;
  showLeftToggle?: boolean;
  showRightToggle?: boolean;
  leftToggleVariant?: 'menu' | 'filter' | 'info' | 'custom';
  rightToggleVariant?: 'menu' | 'filter' | 'info' | 'custom';
  children: React.ReactNode;
  className?: string;
}

export default function MobileSidebarManager({
  leftSidebarContent,
  rightSidebarContent,
  leftSidebarTitle,
  rightSidebarTitle,
  showLeftToggle = true,
  showRightToggle = true,
  leftToggleVariant = 'menu',
  rightToggleVariant = 'info',
  children,
  className = ''
}: MobileSidebarManagerProps) {
  const {
    sidebarState,
    toggleLeftSidebar,
    toggleRightSidebar,
    closeSidebars,
    isAnyOpen
  } = useMobileSidebar();

  const { isMobile } = useResponsive();

  // Only render mobile sidebar management on mobile devices
  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Main content */}
      <div className={`transition-all duration-300 ${isAnyOpen ? 'pointer-events-none' : ''}`}>
        {children}
      </div>

      {/* Mobile sidebar toggles */}
      <div className="md:hidden">
        {/* Left sidebar toggle */}
        {showLeftToggle && leftSidebarContent && (
          <LeftSidebarToggle
            isOpen={sidebarState.leftSidebarOpen}
            onToggle={toggleLeftSidebar}
            variant={leftToggleVariant}
            position="fixed"
            className="top-4 left-4 z-30"
          />
        )}

        {/* Right sidebar toggle */}
        {showRightToggle && rightSidebarContent && (
          <RightSidebarToggle
            isOpen={sidebarState.rightSidebarOpen}
            onToggle={toggleRightSidebar}
            variant={rightToggleVariant}
            position="fixed"
            className="top-4 right-4 z-30"
          />
        )}
      </div>

      {/* Left sidebar overlay */}
      {leftSidebarContent && (
        <LeftSidebarOverlay
          isOpen={sidebarState.leftSidebarOpen}
          onClose={closeSidebars}
          title={leftSidebarTitle}
        >
          {leftSidebarContent}
        </LeftSidebarOverlay>
      )}

      {/* Right sidebar overlay */}
      {rightSidebarContent && (
        <RightSidebarOverlay
          isOpen={sidebarState.rightSidebarOpen}
          onClose={closeSidebars}
          title={rightSidebarTitle}
        >
          {rightSidebarContent}
        </RightSidebarOverlay>
      )}
    </div>
  );
}

// Hook for external components to control sidebars
export function useMobileSidebarControl() {
  const {
    sidebarState,
    openLeftSidebar,
    openRightSidebar,
    closeSidebars,
    toggleLeftSidebar,
    toggleRightSidebar,
    isAnyOpen
  } = useMobileSidebar();

  return {
    isLeftOpen: sidebarState.leftSidebarOpen,
    isRightOpen: sidebarState.rightSidebarOpen,
    isAnyOpen,
    openLeft: openLeftSidebar,
    openRight: openRightSidebar,
    close: closeSidebars,
    toggleLeft: toggleLeftSidebar,
    toggleRight: toggleRightSidebar
  };
}

// Context provider for sidebar state (optional)
export const MobileSidebarContext = React.createContext<ReturnType<typeof useMobileSidebar> | null>(null);

export function MobileSidebarProvider({ children }: { children: React.ReactNode }) {
  const sidebarHook = useMobileSidebar();

  return (
    <MobileSidebarContext.Provider value={sidebarHook}>
      {children}
    </MobileSidebarContext.Provider>
  );
}

export function useMobileSidebarContext() {
  const context = React.useContext(MobileSidebarContext);
  if (!context) {
    throw new Error('useMobileSidebarContext must be used within MobileSidebarProvider');
  }
  return context;
}