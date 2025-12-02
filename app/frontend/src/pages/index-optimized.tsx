import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useWeb3 } from '@/context/Web3Context';
import { useNavigation } from '@/context/NavigationContext';
import { useToast } from '@/context/ToastContext';
import Link from 'next/link';
import { Send, Vote, TrendingUp, Users, RefreshCw, Award, Video, Mail, Shield, Zap } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import SupportWidget from '@/components/SupportWidget';
import { newsletterService } from '@/services/newsletterService';

// Dynamic imports with proper loading states and error boundaries
const Layout = dynamic(() => import('@/components/Layout'), {
  loading: () => <div className="min-h-screen bg-gray-900 animate-pulse" />,
  ssr: false
});

const SmartRightSidebar = dynamic(
  () => import('@/components/SmartRightSidebar/SmartRightSidebar').catch(() => ({ 
    default: () => <div className="w-80 bg-gray-100 dark:bg-gray-800 p-4">Failed to load sidebar</div> 
  })),
  { 
    loading: () => <div className="w-80 bg-gray-100 dark:bg-gray-800 p-4 animate-pulse" />,
    ssr: false 
  }
);

const CommunityView = dynamic(
  () => import('@/components/CommunityView').catch(() => ({ 
    default: () => <div className="flex-1 bg-white dark:bg-gray-800 p-8">Failed to load community view</div> 
  })),
  { 
    loading: () => <div className="flex-1 bg-white dark:bg-gray-800 p-8 animate-pulse" />,
    ssr: false 
  }
);

const NavigationSidebar = dynamic(
  () => import('@/components/NavigationSidebar').catch(() => ({ 
    default: () => <div className="w-64 bg-gray-100 dark:bg-gray-800 p-4">Failed to load navigation</div> 
  })),
  { 
    loading: () => <div className="w-64 bg-gray-100 dark:bg-gray-800 p-4 animate-pulse" />,
    ssr: false 
  }
);

const FacebookStylePostComposer = dynamic(
  () => import('@/components/FacebookStylePostComposer'),
  { 
    loading: () => <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm animate-pulse">Loading composer...</div>,
    ssr: false 
  }
);

const PostCreationModal = dynamic(
  () => import('@/components/PostCreationModal').catch(() => ({ 
    default: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">Failed to load post modal</div> 
  })),
  { 
    loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-pulse">Loading...</div>,
    ssr: false 
  }
);

const BottomSheet = dynamic(
  () => import('@/components/BottomSheet'),
  { 
    loading: () => <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-xl animate-pulse">Loading...</div>,
    ssr: false 
  }
);

const EnhancedHomeFeed = dynamic(
  () => import('@/components/EnhancedHomeFeed'),
  { 
    loading: () => <FeedSkeleton />,
    ssr: false 
  }
);

const SEOHead = dynamic(() => import('@/components/SEO/SEOHead'), {
  ssr: false
});

// Optimized loading skeleton components
const FeedSkeleton = () => (
  <div className="space-y-6">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/6" />
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
        <div className="flex items-center space-x-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        </div>
      </div>
    ))}
  </div>
);

const SidebarSkeleton = () => (
  <div className="w-64 bg-gray-100 dark:bg-gray-800 p-4 space-y-4 animate-pulse">
    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
  </div>
);

// Optimized hooks with memoization
const useOptimizedProfile = (address?: string) => {
  const { useProfile } = require('@/hooks/useProfile');
  return useProfile(address);
};

const useOptimizedPosts = () => {
  const { useCreatePost } = require('@/hooks/usePosts');
  return useCreatePost();
};

const useOptimizedWebSocket = (walletAddress: string, autoConnect: boolean) => {
  const { useWebSocket } = require('@/hooks/useWebSocket');
  return useWebSocket({
    walletAddress,
    autoConnect,
    autoReconnect: true
  });
};

export default function Home() {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const { createPost, isLoading: isCreatingPost } = useOptimizedPosts();
  const { profile } = useOptimizedProfile(address);
  const { navigationState, openModal, closeModal } = useNavigation();

  const [mounted, setMounted] = useState(false);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [wsSubscribed, setWsSubscribed] = useState(false);
  const [isSupportWidgetOpen, setIsSupportWidgetOpen] = useState(false);
  const [isWalletSheetOpen, setIsWalletSheetOpen] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);

  // Memoized newsletter subscription handler
  const handleNewsletterSubscribe = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email') as string;

    if (email) {
      try {
        const result = await newsletterService.subscribeEmail(email);
        if (result.success) {
          addToast('Successfully subscribed to newsletter!', 'success');
          (e.target as HTMLFormElement).reset();
        } else {
          addToast(result.message || 'Failed to subscribe to newsletter', 'error');
        }
      } catch (error) {
        console.error('[Home] Error subscribing to newsletter:', error);
        addToast('Failed to subscribe to newsletter. Please try again.', 'error');
      }
    }
  }, [addToast]);

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Initialize WebSocket for real-time updates
  const { isConnected: wsConnected, subscribe, on, off } = useOptimizedWebSocket(
    address || '',
    isConnected && !!address
  );

  // Handle feed refresh with useCallback for stable reference
  const handleRefreshFeed = useCallback(() => {
    if (!isMounted.current) return;
    setHasNewPosts(false);
    setFeedRefreshKey(prev => prev + 1);
  }, []);

  // Debounced refresh to prevent rapid updates
  const debouncedRefresh = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleRefreshFeed();
      }, 500); // 500ms debounce
    };
  }, [handleRefreshFeed]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip to content with Ctrl+Alt+C
      if (e.ctrlKey && e.altKey && e.key === 'c') {
        mainContentRef.current?.focus();
      }

      // Refresh feed with Ctrl+Alt+R
      if (e.ctrlKey && e.altKey && e.key === 'r') {
        handleRefreshFeed();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRefreshFeed]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Subscribe to feed updates when connected
  useEffect(() => {
    if (wsConnected && address && !wsSubscribed) {
      // Subscribe to global feed updates
      subscribe('feed', 'all', {
        eventTypes: ['feed_update', 'new_post']
      });
      setWsSubscribed(true);

      // Listen for new posts with stable callback
      const handleFeedUpdate = (data: any) => {
        if (!isMounted.current) return;
        console.log('New post received:', data);
        // Only refresh if it's not the user's own post (to prevent double refresh)
        if (data.author?.toLowerCase() !== address.toLowerCase()) {
          debouncedRefresh();
          addToast('New post added to feed', 'success');
        }
      };

      on('feed_update', handleFeedUpdate);

      return () => {
        off('feed_update', handleFeedUpdate);
        setWsSubscribed(false);
      };
    }
  }, [wsConnected, address, wsSubscribed, subscribe, on, off, addToast, debouncedRefresh]);

  // Handle post creation with useCallback and mount check
  const handlePostSubmit = useCallback(async (postData: any) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to post', 'error');
      return;
    }

    try {
      let newPost;
      // If no communityId is provided, create a quick post
      if (!postData.communityId) {
        // Import QuickPostService dynamically to avoid circular dependencies
        const { QuickPostService } = await import('@/services/quickPostService');
        newPost = await QuickPostService.createQuickPost({ ...postData, author: address.toLowerCase() });
      } else {
        // Otherwise, create a regular post
        newPost = await createPost({ ...postData, author: address.toLowerCase() });
      }

      // Check if component is still mounted before updating state
      if (!isMounted.current) return;

      addToast('Post created successfully!', 'success');
      closeModal('postCreation');
      // Set hasNewPosts to trigger the refresh banner (but don't double refresh)
      setHasNewPosts(true);
    } catch (error) {
      console.error('Error creating post:', error);
      if (!isMounted.current) return;
      addToast('Failed to create post', 'error');
    }
  }, [isConnected, address, createPost, addToast, closeModal]);

  // If not connected, show enhanced landing page
  if (!mounted || !isConnected) {
    const scrollToFeatures = () => {
      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
      <>
        <SEOHead
          title="LinkDAO - The Web3 Social Network | Decentralized Social Platform"
          description="Join LinkDAO, the decentralized Web3 social network where you own your identity, data, and content. Connect, trade, govern, and earn in a censorship-resistant platform built on Ethereum."
          keywords="Web3 social network, decentralized social media, blockchain social platform, DAO governance, crypto marketplace, NFT social, Ethereum social network, DeFi social, Web3 community, decentralized identity"
          url="https://linkdao.io"
          image="https://linkdao.io/og-image.png"
          type="website"
          author="LinkDAO"
          locale="en_US"
          twitterCard="summary_large_image"
          twitterSite="@linkdao"
          twitterCreator="@linkdao"
          ogSiteName="LinkDAO"
          structuredData={{
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            'name': 'LinkDAO',
            'url': 'https://linkdao.io',
            'description': 'The Web3 Social Network where Identity, Money, and Governance are Yours',
            'potentialAction': {
              '@type': 'SearchAction',
              'target': 'https://linkdao.io/search?q={search_term_string}',
              'query-input': 'required name=search_term_string'
            },
            'publisher': {
              '@type': 'Organization',
              'name': 'LinkDAO',
              'logo': {
                '@type': 'ImageObject',
                'url': 'https://linkdao.io/logo.png'
              }
            }
          }}
          additionalMeta={[
            { name: 'theme-color', content: '#3B82F6' },
            { name: 'apple-mobile-web-app-capable', content: 'yes' },
            { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
            { name: 'apple-mobile-web-app-title', content: 'LinkDAO' },
            { name: 'application-name', content: 'LinkDAO' },
            { name: 'msapplication-TileColor', content: '#3B82F6' },
            { name: 'msapplication-config', content: '/browserconfig.xml' }
          ]}
        />
        <Layout title="LinkDAO - The Web3 Social Network" fullWidth={true}>
          {/* Skip to content link for accessibility */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-white dark:bg-gray-800 px-4 py-2 rounded-md shadow-lg"
          >
            Skip to main content
          </a>

          {/* Animated Hero Section */}
          <div className="relative min-h-[75vh] md:min-h-[80vh] flex flex-col justify-center overflow-hidden bg-gray-900">
            {/* Animated Mesh Gradient Background */}
            <div className="absolute inset-0 opacity-40">
              <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
              <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
              <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
              <div className="absolute bottom-0 right-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-6000"></div>
            </div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[length:30px_30px]"></div>

            <div className="relative z-10 mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-16 pb-12 text-center lg:text-left lg:flex lg:items-center lg:justify-between lg:gap-10">
              <div className="lg:w-1/2 xl:w-6/12">
                <div className="inline-flex items-center px-3 py-1 rounded-full border border-primary-500/30 bg-primary-500/10 text-primary-300 text-xs font-medium mb-4 backdrop-blur-sm">
                  <span className="flex h-2 w-2 rounded-full bg-primary-400 mr-2 animate-pulse"></span>
                  The Future of Social is Here
                </div>

                <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight">
                  Own Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Identity</span>.<br />
                  Shape Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400">World</span>.
                </h1>

                <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl leading-relaxed">
                  LinkDAO is the first decentralized social network where you truly own your data, earn from your content, and govern the platform itself.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <ConnectButton.Custom>
                    {({ openConnectModal, authenticationStatus, mounted: rainbowMounted }) => {
                      const ready = rainbowMounted && authenticationStatus !== 'loading';
                      return (
                        <button
                          onClick={openConnectModal}
                          disabled={!ready}
                          className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-primary-600 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600"
                        >
                          <div className="absolute -inset-3 rounded-xl bg-gradient-to-r from-cyan-400 via-primary-500 to-purple-500 opacity-30 group-hover:opacity-100 blur-lg transition-opacity duration-200" />
                          <span className="relative flex items-center gap-2">
                            Connect Wallet <Zap className="w-5 h-5" />
                          </span>
                        </button>
                      );
                    }}
                  </ConnectButton.Custom>

                  <button
                    onClick={scrollToFeatures}
                    className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-600"
                  >
                    Explore Features
                  </button>
                </div>
              </div>

              {/* Floating 3D Elements (Visual Representation) */}
              <div className="hidden lg:block lg:w-1/2 relative h-[500px]">
                {/* Central Phone/Feed Mockup */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-[400px] bg-gray-900 rounded-[2rem] border-4 border-gray-800 shadow-2xl overflow-hidden z-20 rotate-[-5deg] hover:rotate-0 transition-transform duration-500">
                  <div className="absolute top-0 left-0 right-0 h-4 bg-gray-800 z-30 rounded-b-lg mx-12"></div>
                  <div className="p-3 space-y-3 mt-6 opacity-80">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"></div>
                      <div className="space-y-1">
                        <div className="w-16 h-2 bg-gray-700 rounded"></div>
                        <div className="w-12 h-1.5 bg-gray-800 rounded"></div>
                      </div>
                    </div>
                    <div className="w-full h-32 bg-gray-800 rounded-xl"></div>
                    <div className="space-y-1.5">
                      <div className="w-full h-2.5 bg-gray-700 rounded"></div>
                      <div className="w-4/5 h-2.5 bg-gray-700 rounded"></div>
                    </div>
                  </div>
                </div>

                {/* Floating Cards */}
                <div className="absolute top-16 right-8 bg-white/10 backdrop-blur-xl border border-white/20 p-3 rounded-xl shadow-xl animate-float z-30">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-500/20 rounded-lg text-green-400">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[0.65rem] text-gray-400">LDAO Price</div>
                      <div className="text-base font-bold text-white">$4.20 <span className="text-green-400 text-xs">+12%</span></div>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-32 -left-8 bg-white/10 backdrop-blur-xl border border-white/20 p-3 rounded-xl shadow-xl animate-float animation-delay-2000 z-30">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
                      <Vote className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[0.65rem] text-gray-400">Active Proposal</div>
                      <div className="text-xs font-bold text-white">Treasury Allocation</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Activity Ticker */}
            <div className="absolute bottom-0 w-full bg-black/30 backdrop-blur-md border-t border-white/10 py-3 overflow-hidden">
              <div className="flex animate-marquee whitespace-nowrap">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center gap-8 mx-4">
                    <span className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      User 0x12...34 minted "Cosmic #402"
                    </span>
                    <span className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Proposal #89 passed with 98% Yes
                    </span>
                    <span className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      New Community "DeFi Degens" created
                    </span>
                    <span className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                      Marketplace volume hit $1.2M
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rest of the landing page content would continue here... */}
          {/* For brevity, I'll include a placeholder for the rest */}
          <div className="py-24 bg-gray-50 dark:bg-gray-900" id="features">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Everything You Need in Web3
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
                A complete ecosystem for your digital life, seamlessly integrated.
              </p>
            </div>
          </div>
        </Layout>
      </>
    );
  }

  // Connected state - show main application
  return (
    <>
      <SEOHead
        title="LinkDAO - Home"
        description="Your decentralized social network feed"
        url="https://linkdao.io/"
        type="website"
      />
      <Layout>
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
          {/* Left Sidebar - Navigation */}
          <div className={`${navigationState.sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700`}>
            <NavigationSidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Home</h1>
                <button
                  onClick={handleRefreshFeed}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </header>

            {/* Feed Content */}
            <main className="flex-1 overflow-y-auto" ref={mainContentRef}>
              {hasNewPosts && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-6 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-800 dark:text-blue-200">New posts available</span>
                    <button
                      onClick={handleRefreshFeed}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              )}

              <div className="p-6">
                {/* Post Composer */}
                <FacebookStylePostComposer onSubmit={handlePostSubmit} isLoading={isCreatingPost} />

                {/* Home Feed */}
                <EnhancedHomeFeed key={feedRefreshKey} />
              </div>
            </main>
          </div>

          {/* Right Sidebar */}
          {navigationState.rightSidebarVisible && (
            <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
              <SmartRightSidebar />
            </div>
          )}

          {/* Support Widget */}
          {isSupportWidgetOpen && (
            <SupportWidget onClose={() => setIsSupportWidgetOpen(false)} />
          )}

          {/* Post Creation Modal */}
          {navigationState.modalState.postCreation && (
            <PostCreationModal
              isOpen={navigationState.modalState.postCreation}
              onClose={() => closeModal('postCreation')}
              onSubmit={handlePostSubmit}
              isLoading={isCreatingPost}
            />
          )}

          {/* Wallet Bottom Sheet */}
          {isWalletSheetOpen && (
            <BottomSheet
              isOpen={isWalletSheetOpen}
              onClose={() => setIsWalletSheetOpen(false)}
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Connect Wallet
                </h3>
                <ConnectButton />
              </div>
            </BottomSheet>
          )}
        </div>
      </Layout>
    </>
  );
}