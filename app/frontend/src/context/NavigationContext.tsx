import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';

// Define types for navigation state
export interface NavigationState {
  activeView: 'feed' | 'community';
  activeCommunity?: string;
  activePost?: string;
  sidebarCollapsed: boolean;
  rightSidebarVisible: boolean;
  modalState: {
    postCreation: boolean;
    communityJoin: boolean;
    userProfile: boolean;
  };
}

interface NavigationContextType {
  navigationState: NavigationState;
  setActiveView: (view: 'feed' | 'community') => void;
  setActiveCommunity: (communityId?: string) => void;
  setActivePost: (postId?: string) => void;
  navigateToFeed: () => void;
  navigateToCommunity: (communityId: string) => void;
  navigateToPost: (postId: string, communityId?: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleRightSidebar: () => void;
  setRightSidebarVisible: (visible: boolean) => void;
  openModal: (modal: keyof NavigationState['modalState']) => void;
  closeModal: (modal: keyof NavigationState['modalState']) => void;
  closeAllModals: () => void;
}

// Create the context
const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Provider component
export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [navigationState, setNavigationState] = useState<NavigationState>({
    activeView: 'feed',
    activeCommunity: undefined,
    activePost: undefined,
    sidebarCollapsed: false,
    rightSidebarVisible: true,
    modalState: {
      postCreation: false,
      communityJoin: false,
      userProfile: false,
    },
  });

  // Sync navigation state with URL
  useEffect(() => {
    const updateStateFromURL = () => {
      const { pathname, query } = router;
      
      if (pathname === '/dashboard') {
        const { view, community, post } = query;
        
        setNavigationState(prev => ({
          ...prev,
          activeView: view === 'community' ? 'community' : 'feed',
          activeCommunity: typeof community === 'string' ? community : undefined,
          activePost: typeof post === 'string' ? post : undefined,
        }));
      } else if (pathname.startsWith('/dashboard/community/')) {
        // Extract community ID from path
        const pathParts = pathname.split('/');
        const communityId = pathParts[3];
        const { post } = query;
        
        setNavigationState(prev => ({
          ...prev,
          activeView: 'community',
          activeCommunity: communityId,
          activePost: typeof post === 'string' ? post : undefined,
        }));
      } else if (pathname.startsWith('/dashboard/post/')) {
        // Extract post ID from path
        const pathParts = pathname.split('/');
        const postId = pathParts[3];
        const { community } = query;
        
        setNavigationState(prev => ({
          ...prev,
          activeView: typeof community === 'string' ? 'community' : 'feed',
          activeCommunity: typeof community === 'string' ? community : undefined,
          activePost: postId,
        }));
      }
    };

    updateStateFromURL();
  }, [router.pathname, router.query]);

  // Handle responsive behavior - collapse sidebar on mobile by default
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        const isMobile = window.innerWidth < 768; // md breakpoint
        setNavigationState(prev => ({
          ...prev,
          sidebarCollapsed: isMobile,
          rightSidebarVisible: !isMobile,
        }));
      };

      // Set initial state
      handleResize();

      // Listen for resize events
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const setActiveView = (view: 'feed' | 'community') => {
    setNavigationState(prev => ({
      ...prev,
      activeView: view,
      // Clear active community when switching to feed
      activeCommunity: view === 'feed' ? undefined : prev.activeCommunity,
      activePost: undefined, // Clear active post when changing views
    }));
  };

  const setActiveCommunity = (communityId?: string) => {
    setNavigationState(prev => ({
      ...prev,
      activeCommunity: communityId,
      activeView: communityId ? 'community' : 'feed',
      activePost: undefined, // Clear active post when changing communities
    }));
  };

  const setActivePost = (postId?: string) => {
    setNavigationState(prev => ({
      ...prev,
      activePost: postId,
    }));
  };

  // Navigation functions that update URL
  const navigateToFeed = () => {
    router.push('/dashboard', undefined, { shallow: true });
  };

  const navigateToCommunity = (communityId: string) => {
    router.push(`/dashboard?view=community&community=${communityId}`, undefined, { shallow: true });
  };

  const navigateToPost = (postId: string, communityId?: string) => {
    if (communityId) {
      router.push(`/dashboard/community/${communityId}?post=${postId}`, undefined, { shallow: true });
    } else {
      router.push(`/dashboard/post/${postId}`, undefined, { shallow: true });
    }
  };

  const toggleSidebar = () => {
    setNavigationState(prev => ({
      ...prev,
      sidebarCollapsed: !prev.sidebarCollapsed,
    }));
  };

  const setSidebarCollapsed = (collapsed: boolean) => {
    setNavigationState(prev => ({
      ...prev,
      sidebarCollapsed: collapsed,
    }));
  };

  const toggleRightSidebar = () => {
    setNavigationState(prev => ({
      ...prev,
      rightSidebarVisible: !prev.rightSidebarVisible,
    }));
  };

  const setRightSidebarVisible = (visible: boolean) => {
    setNavigationState(prev => ({
      ...prev,
      rightSidebarVisible: visible,
    }));
  };

  const openModal = (modal: keyof NavigationState['modalState']) => {
    setNavigationState(prev => ({
      ...prev,
      modalState: {
        ...prev.modalState,
        [modal]: true,
      },
    }));
  };

  const closeModal = (modal: keyof NavigationState['modalState']) => {
    setNavigationState(prev => ({
      ...prev,
      modalState: {
        ...prev.modalState,
        [modal]: false,
      },
    }));
  };

  const closeAllModals = () => {
    setNavigationState(prev => ({
      ...prev,
      modalState: {
        postCreation: false,
        communityJoin: false,
        userProfile: false,
      },
    }));
  };

  return (
    <NavigationContext.Provider
      value={{
        navigationState,
        setActiveView,
        setActiveCommunity,
        setActivePost,
        navigateToFeed,
        navigateToCommunity,
        navigateToPost,
        toggleSidebar,
        setSidebarCollapsed,
        toggleRightSidebar,
        setRightSidebarVisible,
        openModal,
        closeModal,
        closeAllModals,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

// Hook to use the context
export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};