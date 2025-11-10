import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWeb3 } from '@/context/Web3Context';

/**
 * LegacyFunctionalityPreserver
 * 
 * This component ensures that all existing functionality from the old dashboard
 * and social pages continues to work in the new integrated dashboard.
 * It handles URL redirects, preserves user state, and maintains backward compatibility.
 */
export default function LegacyFunctionalityPreserver() {
  const router = useRouter();
  const { isConnected } = useWeb3();

  useEffect(() => {
    // Handle legacy URL redirects
    const handleLegacyRoutes = () => {
      const currentPath = router.pathname;
      const query = router.query;

      // Redirect old social pages to dashboard
      if ((currentPath === '/social' || currentPath === '/web3-social') && isConnected) {
        // Preserve any query parameters and redirect to dashboard with feed view
        const preservedQuery = { ...query, view: 'feed' };
        router.replace({
          pathname: '/dashboard',
          query: preservedQuery
        });
        return;
      }

      // Handle old dashboard URLs with specific views
      if (currentPath === '/dashboard' && query.view) {
        const view = query.view as string;
        
        // Preserve view state in the new dashboard
        if (view === 'feed' || view === 'community') {
          // The new dashboard will handle these views automatically
          // Remove the query parameter to clean up the URL
          const { view: _, ...cleanQuery } = query;
          router.replace({
            pathname: '/dashboard',
            query: cleanQuery
          }, undefined, { shallow: true });
        }
      }

      // Handle community-specific URLs
      if (currentPath === '/dashboard' && query.community) {
        // Preserve community selection in navigation context
        // This will be handled by the NavigationContext
      }
    };

    handleLegacyRoutes();
  }, [router, isConnected]);

  // Preserve localStorage data from old implementations
  useEffect(() => {
    const preserveLegacyData = () => {
      // Migrate old user preferences from multiple sources
      const oldSocialPreferences = localStorage.getItem('social-preferences');
      const oldWeb3SocialPreferences = localStorage.getItem('web3-social-preferences');
      
      if ((oldSocialPreferences || oldWeb3SocialPreferences) && !localStorage.getItem('dashboard-preferences')) {
        try {
          const socialPrefs = oldSocialPreferences ? JSON.parse(oldSocialPreferences) : {};
          const web3SocialPrefs = oldWeb3SocialPreferences ? JSON.parse(oldWeb3SocialPreferences) : {};
          
          // Merge preferences with web3-social taking priority
          const mergedPreferences = {
            ...socialPrefs,
            ...web3SocialPrefs,
            migratedFrom: oldWeb3SocialPreferences ? 'web3-social-page' : 'social-page',
            migrationDate: new Date().toISOString()
          };
          
          localStorage.setItem('dashboard-preferences', JSON.stringify(mergedPreferences));
        } catch (error) {
          console.warn('Failed to migrate legacy preferences:', error);
        }
      }

      // Migrate old feed settings from multiple sources
      const oldFeedSettings = typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('feed-settings') : null;
      const oldSocialFeedSettings = typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('social-feed-settings') : null;
      const legacyFeedState = typeof window !== 'undefined' && window.sessionStorage ? sessionStorage.getItem('legacy-feed-state') : null;
      
      if ((oldFeedSettings || oldSocialFeedSettings || legacyFeedState) && typeof window !== 'undefined' && window.localStorage && !localStorage.getItem('dashboard-feed-settings')) {
        try {
          const feedSettings = oldFeedSettings ? JSON.parse(oldFeedSettings) : {};
          const socialFeedSettings = oldSocialFeedSettings ? JSON.parse(oldSocialFeedSettings) : {};
          const feedState = legacyFeedState ? JSON.parse(legacyFeedState) : {};
          
          // Merge all feed settings
          const mergedSettings = {
            ...feedSettings,
            ...socialFeedSettings,
            ...feedState,
            migratedFrom: oldSocialFeedSettings ? 'social-feed' : 'legacy-feed',
            migrationDate: new Date().toISOString()
          };
          
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('dashboard-feed-settings', JSON.stringify(mergedSettings));
          }
          
          // Clean up session storage
          if (legacyFeedState && typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.removeItem('legacy-feed-state');
          }
        } catch (error) {
          console.warn('Failed to migrate legacy feed settings:', error);
        }
      }

      // Migrate community memberships
      const oldCommunities = localStorage.getItem('joined-communities');
      if (oldCommunities && !localStorage.getItem('dashboard-communities')) {
        try {
          const communities = JSON.parse(oldCommunities);
          localStorage.setItem('dashboard-communities', JSON.stringify({
            communities,
            migratedFrom: 'social-page',
            migrationDate: new Date().toISOString()
          }));
        } catch (error) {
          console.warn('Failed to migrate legacy communities:', error);
        }
      }
    };

    preserveLegacyData();
  }, []);

  // Handle legacy event listeners and cleanup
  useEffect(() => {
    const handleLegacyEvents = () => {
      // Clean up old event listeners that might still be active
      const oldEvents = [
        'social-post-created',
        'social-feed-updated',
        'community-joined',
        'wallet-connected'
      ];

      oldEvents.forEach(eventName => {
        // Remove any existing listeners
        window.removeEventListener(eventName, () => {});
      });

      // Add compatibility layer for old custom events
      const handleLegacyPostCreated = (event: CustomEvent) => {
        // Convert old post creation events to new format
        window.dispatchEvent(new CustomEvent('dashboard-post-created', {
          detail: {
            ...event.detail,
            source: 'legacy-compatibility'
          }
        }));
      };

      const handleLegacyFeedUpdate = (event: CustomEvent) => {
        // Convert old feed update events to new format
        window.dispatchEvent(new CustomEvent('dashboard-feed-updated', {
          detail: {
            ...event.detail,
            source: 'legacy-compatibility'
          }
        }));
      };

      // Add compatibility listeners
      window.addEventListener('social-post-created', handleLegacyPostCreated as EventListener);
      window.addEventListener('social-feed-updated', handleLegacyFeedUpdate as EventListener);

      // Cleanup function
      return () => {
        window.removeEventListener('social-post-created', handleLegacyPostCreated as EventListener);
        window.removeEventListener('social-feed-updated', handleLegacyFeedUpdate as EventListener);
      };
    };

    const cleanup = handleLegacyEvents();
    return cleanup;
  }, []);

  // Preserve scroll position for better UX during migration
  useEffect(() => {
    const preserveScrollPosition = () => {
      if (typeof window === 'undefined' || !window.sessionStorage) return;
      
      const savedPosition = sessionStorage.getItem('legacy-scroll-position');
      if (savedPosition && router.pathname === '/dashboard') {
        try {
          const position = JSON.parse(savedPosition);
          window.scrollTo(0, position.y);
          sessionStorage.removeItem('legacy-scroll-position');
        } catch (error) {
          console.warn('Failed to restore scroll position:', error);
        }
      }
    };

    // Save scroll position before navigation
    const handleBeforeUnload = () => {
      if (typeof window === 'undefined' || !window.sessionStorage) return;
      
      sessionStorage.setItem('legacy-scroll-position', JSON.stringify({
        x: window.scrollX,
        y: window.scrollY
      }));
    };

    preserveScrollPosition();
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, [router.pathname]);

  // Handle legacy API compatibility
  useEffect(() => {
    // Ensure backward compatibility with old API calls
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      let url = typeof input === 'string' ? input : input.toString();
      
      // Redirect old API endpoints to new ones
      if (url.includes('/api/social/')) {
        url = url.replace('/api/social/', '/api/dashboard/');
      }
      
      if (url.includes('/api/feed/')) {
        url = url.replace('/api/feed/', '/api/dashboard/feed/');
      }
      
      if (url.includes('/api/web3-social/')) {
        url = url.replace('/api/web3-social/', '/api/dashboard/');
      }
      
      return originalFetch(url, init);
    };

    // Cleanup
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // This component doesn't render anything visible
  // It only handles background compatibility tasks
  return null;
}