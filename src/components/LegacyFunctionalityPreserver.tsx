import React from 'react';
import { useRouter } from 'next/router';
import { useWeb3 } from '@/context/Web3Context';
import { useNavigation } from '@/context/NavigationContext';

/**
 * Component to ensure all existing functionality is preserved during migration
 * This component provides fallback access to legacy features and maintains
 * backward compatibility for existing user workflows
 */
export default function LegacyFunctionalityPreserver() {
  const router = useRouter();
  const { isConnected } = useWeb3();
  const { navigationState, setActiveView } = useNavigation();

  // Handle legacy route redirects
  React.useEffect(() => {
    const handleRouteChange = (url: string) => {
      // Redirect legacy social routes to dashboard feed
      if (url === '/social' && isConnected) {
        setActiveView('feed');
        router.replace('/dashboard');
      }
      
      // Handle community-specific routes
      if (url.startsWith('/community/') && isConnected) {
        const communityId = url.split('/community/')[1];
        setActiveView('community');
        // The NavigationContext will handle setting the active community
        router.replace(`/dashboard?community=${communityId}`);
      }
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router, isConnected, setActiveView]);

  // Preserve URL parameters for deep linking
  React.useEffect(() => {
    const { community, post, view } = router.query;
    
    if (community && typeof community === 'string') {
      setActiveView('community');
      // The CommunityView component will handle the specific community
    }
    
    if (view && typeof view === 'string') {
      if (view === 'feed' || view === 'community') {
        setActiveView(view);
      }
    }
  }, [router.query, setActiveView]);

  // Preserve browser back/forward functionality
  React.useEffect(() => {
    const handlePopState = () => {
      // Ensure navigation state is synced with browser history
      const currentPath = window.location.pathname;
      const currentQuery = new URLSearchParams(window.location.search);
      
      if (currentPath === '/dashboard') {
        const view = currentQuery.get('view');
        const community = currentQuery.get('community');
        
        if (view === 'community' && community) {
          setActiveView('community');
        } else {
          setActiveView('feed');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveView]);

  // Update URL when navigation state changes (for deep linking)
  React.useEffect(() => {
    if (router.pathname === '/dashboard') {
      const currentQuery = new URLSearchParams(window.location.search);
      
      // Update view parameter
      if (navigationState.activeView !== 'feed') {
        currentQuery.set('view', navigationState.activeView);
      } else {
        currentQuery.delete('view');
      }
      
      // Update community parameter
      if (navigationState.activeCommunity) {
        currentQuery.set('community', navigationState.activeCommunity);
      } else {
        currentQuery.delete('community');
      }
      
      const newUrl = currentQuery.toString() 
        ? `${router.pathname}?${currentQuery.toString()}`
        : router.pathname;
      
      // Only update if URL actually changed
      if (newUrl !== window.location.pathname + window.location.search) {
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [navigationState.activeView, navigationState.activeCommunity, router.pathname]);

  return null; // This component doesn't render anything
}