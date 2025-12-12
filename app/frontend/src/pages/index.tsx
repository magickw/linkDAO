import { useState, useEffect, useMemo, lazy, Suspense, useRef, useCallback, startTransition, useDeferredValue } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { useWeb3 } from '@/context/Web3Context';
import { useNavigation } from '@/context/NavigationContext';
import { useCreatePost } from '@/hooks/usePosts';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/context/ToastContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { CreatePostInput } from '@/models/Post';
import { QuickPost } from '@/models/QuickPost';
import Link from 'next/link';
import { Send, Vote, TrendingUp, Users, MessageCircle, RefreshCw, Award, Video, Mail, Shield, Zap } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import SupportWidget from '@/components/SupportWidget';
import { newsletterService } from '@/services/newsletterService';

// Lazy load heavy components
const SmartRightSidebar = lazy(() => import('@/components/SmartRightSidebar/SmartRightSidebar').catch(() => ({ default: () => <div>Failed to load sidebar</div> })));
const CommunityView = lazy(() => import('@/components/CommunityView').catch(() => ({ default: () => <div>Failed to load community view</div> })));
const NavigationSidebar = lazy(() => import('@/components/NavigationSidebar').catch(() => ({ default: () => <div>Failed to load navigation</div> })));
const FacebookStylePostComposer = lazy(() => import('@/components/FacebookStylePostComposer'));
const PostCreationModal = lazy(() => import('@/components/PostCreationModal').catch(() => ({ default: () => <div>Failed to load post modal</div> })));
const BottomSheet = lazy(() => import('@/components/BottomSheet'));
const EnhancedHomeFeed = lazy(() => import('@/components/EnhancedHomeFeed'));

import SEOHead from '@/components/SEO/SEOHead';

// Loading skeleton components
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

export default function Home() {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const { createPost, isLoading: isCreatingPost } = useCreatePost();
  const { profile } = useProfile(address);
  const { navigationState, openModal, closeModal } = useNavigation();

  // Use deferred value for isConnected to prevent blocking navigation
  // This allows the main thread to process navigation events during the heavy re-render
  const [deferredConnected, setDeferredConnected] = useState(isConnected);

  // Update deferred connected state in a transition to keep UI responsive
  useEffect(() => {
    if (isConnected !== deferredConnected) {
      startTransition(() => {
        setDeferredConnected(isConnected);
      });
    }
  }, [isConnected, deferredConnected]);

  const [mounted, setMounted] = useState(false);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [wsSubscribed, setWsSubscribed] = useState(false);
  const [isSupportWidgetOpen, setIsSupportWidgetOpen] = useState(false);
  const [isWalletSheetOpen, setIsWalletSheetOpen] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);

  // Newsletter subscription handler
  const handleNewsletterSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email') as string;

    if (email) {
      try {
        const result = await newsletterService.subscribeEmail(email);
        if (result.success) {
          alert('Successfully subscribed to newsletter!');
          (e.target as HTMLFormElement).reset();
        } else {
          alert(result.message || 'Failed to subscribe to newsletter');
        }
      } catch (error) {
        console.error('[Home] Error subscribing to newsletter:', error);
        alert('Failed to subscribe to newsletter. Please try again.');
      }
    }
  };

  // Refs for accessibility and memory leak prevention
  const skipToContentRef = useRef<HTMLAnchorElement>(null);

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Initialize WebSocket for real-time updates
  const { isConnected: wsConnected, subscribe, on, off } = useWebSocket({
    walletAddress: address || '',
    autoConnect: isConnected && !!address,
    autoReconnect: true
  });

  // Handle feed refresh with useCallback for stable reference
  const handleRefreshFeed = useCallback(() => {
    if (!isMounted.current) return;
    setHasNewPosts(false);
    setFeedRefreshKey(prev => prev + 1);
  }, []);

  // Debounced refresh to prevent rapid updates
  const debouncedRefresh = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          handleRefreshFeed();
        }, 500); // 500ms debounce
      };
    })(),
    [handleRefreshFeed]
  );

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

  // Navigation fix is now handled globally in _app.tsx NavigationFixer component

  // Handle post creation with useCallback and mount check
  const handlePostSubmit = useCallback(async (postData: CreatePostInput) => {
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
  // Use deferredConnected to prevent blocking navigation during the heavy re-render
  if (!deferredConnected) {
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
            ref={skipToContentRef}
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

          {/* Bento Grid Features Section */}
          <div id="features" className="py-24 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  Everything You Need in Web3
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                  A complete ecosystem for your digital life, seamlessly integrated.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-6 h-auto md:h-[600px]">
                {/* Social Feed - Large Card */}
                <div className="md:col-span-2 md:row-span-2 group relative overflow-hidden rounded-3xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 group-hover:opacity-100 transition-opacity"></div>
                  <div className="p-8 h-full flex flex-col">
                    <div className="mb-auto">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
                        <Users className="w-6 h-6" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Censorship-Resistant Social</h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Connect with your community without algorithms manipulating your feed. Your content is stored on IPFS, ensuring it stays yours forever.
                      </p>
                    </div>
                    <div className="mt-8 relative">
                      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white dark:from-gray-800 to-transparent z-10"></div>
                      {/* Mock Feed Items */}
                      <div className="space-y-4 opacity-50 group-hover:opacity-80 transition-opacity duration-500 transform group-hover:translate-y-[-10px]">
                        <div className="flex gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600"></div>
                          <div className="flex-1 space-y-2">
                            <div className="w-1/3 h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
                            <div className="w-full h-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
                          </div>
                        </div>
                        <div className="flex gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600"></div>
                          <div className="flex-1 space-y-2">
                            <div className="w-1/33 h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
                            <div className="w-3/4 h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wallet - Medium Card */}
                <div className="group relative overflow-hidden rounded-3xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all duration-300">
                  <div className="p-8">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600 dark:text-green-400 mb-4">
                      <Send className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Instant Payments</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Send ETH and stablecoins directly in chat.
                    </p>
                  </div>
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl transform translate-x-10 translate-y-10 group-hover:scale-150 transition-transform duration-500"></div>
                </div>

                {/* Governance - Medium Card */}
                <div className="group relative overflow-hidden rounded-3xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all duration-300">
                  <div className="p-8">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
                      <Vote className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">DAO Governance</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Vote on proposals that shape the platform.
                    </p>
                  </div>
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl transform translate-x-10 translate-y-10 group-hover:scale-150 transition-transform duration-500"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Why LinkDAO Section */}
          <div className="py-24 bg-gray-50 dark:bg-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  Own Your Digital Life
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                  Break free from traditional social media limitations and embrace true digital ownership.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">🔐</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Own Your Identity</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    No email logins, just your wallet. Your identity is truly yours, portable across the entire Web3 ecosystem.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">🌍</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Global Payments</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Crypto-native, borderless, and instant. Send value to anyone, anywhere, without traditional banking limitations.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">🗳️</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Community-Driven</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    You decide how the platform evolves. Participate in governance and shape the future of social networking.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="py-24 bg-white dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  Get Started in Minutes
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                  Join LinkDAO in four simple steps and start experiencing the future of social networking.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                      <span className="text-2xl font-bold text-white">1</span>
                    </div>
                    <div className="hidden lg:block absolute top-8 left-1/2 w-full flex justify-center items-center">
                      <svg className="w-8 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Connect Wallet</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Use MetaMask, WalletConnect, or any Web3 wallet to get started instantly.
                  </p>
                </div>

                <div className="text-center">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                      <span className="text-2xl font-bold text-white">2</span>
                    </div>
                    <div className="hidden lg:block absolute top-8 left-1/2 w-full flex justify-center items-center">
                      <svg className="w-8 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Create Profile</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Set up your decentralized profile with ENS domains and IPFS storage.
                  </p>
                </div>

                <div className="text-center">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                      <span className="text-2xl font-bold text-white">3</span>
                    </div>
                    <div className="hidden lg:block absolute top-8 left-1/2 w-full flex justify-center items-center">
                      <svg className="w-8 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Join Communities</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Discover DAOs, list products, and connect with like-minded individuals.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                    <span className="text-2xl font-bold text-white">4</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Participate in DAO</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Vote on proposals, earn rewards, and help shape the platform's future.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Trust & Transparency Section */}
          <div className="py-24 bg-gray-50 dark:bg-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  Built for Trust & Transparency
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                  Our Web3 marketplace ensures secure, transparent transactions with cutting-edge blockchain technology.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-6">
                    <span className="text-2xl">🔒</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">On-chain Escrow</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Smart contract escrow ensures safe payments. Funds are only released when both parties are satisfied.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-6">
                    <span className="text-2xl">🎫</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">x402 Payment Protocol</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Reduced transaction fees for purchases using Coinbase's x402 payment protocol.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg">
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-6">
                    <span className="text-2xl">🏛️</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Transparent DAO</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    All governance decisions are recorded on-chain. Complete transparency in platform evolution.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Support Center Section */}
          <div className="py-24 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  Need Help? We've Got You Covered
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                  Comprehensive support for LDAO tokens, marketplace features, and platform guidance. Get help 24/7.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <Link
                  href="/support"
                  className="group bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
                >
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Help Center</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Browse FAQs, guides, and documentation for all platform features
                  </p>
                </Link>

                <Link
                  href="/support/guides/ldao-complete-guide"
                  className="group bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
                >
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">LDAO Guide</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Complete guide to acquiring, staking, and using LDAO tokens
                  </p>
                </Link>

                <Link
                  href="/support/tutorials/first-ldao-purchase"
                  className="group bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
                >
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Video className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Tutorials</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Step-by-step video tutorials for getting started
                  </p>
                </Link>

                <a
                  href="mailto:support@linkdao.io"
                  className="group bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
                >
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Contact Us</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Direct email support with 4-hour response time
                  </p>
                </a>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Community Support</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                      Connect with other users in our Discord and Telegram communities
                    </p>
                    <div className="flex justify-center space-x-3">
                      <a
                        href="https://discord.gg/linkdao"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                      >
                        Discord
                      </a>
                      <a
                        href="https://t.me/LinkDAO_web3"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-blue-500 hover:bg-blue-600 transition-colors"
                      >
                        Telegram
                      </a>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Security</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                      Learn how to keep your wallet and assets safe on our platform.
                    </p>
                    <Link
                      href="/docs/support/security-guide"
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
                    >
                      Security Guide →
                    </Link>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Live Chat</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                      Get instant help from our support team. Available 24/7.
                    </p>
                    <Link
                      href="/support/live-chat"
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all"
                    >
                      Start Chat
                    </Link>
                  </div>
                </div>
              </div>

              <div className="mt-12 text-center">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Popular Support Topics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  {[
                    { title: "Getting Started", href: "/docs/getting-started", icon: "🚀" },
                    { title: "LDAO Token Acquisition", href: "/docs/ldao-token-guide", icon: "💰" },
                    { title: "Wallet Setup", href: "/docs/wallet-setup", icon: "💳" },
                    { title: "Marketplace Guide", href: "/docs/marketplace-guide", icon: "🏪" },
                    { title: "Governance Participation", href: "/docs/governance-guide", icon: "🏛️" },
                    { title: "Troubleshooting", href: "/docs/troubleshooting", icon: "🔧" }
                  ].map((topic) => (
                    <Link
                      key={topic.title}
                      href={topic.href}
                      className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-all border border-gray-200 dark:border-gray-700 group"
                    >
                      <span className="text-2xl mr-3">{topic.icon}</span>
                      <span className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {topic.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Community & Growth Section */}
          <div className="py-24 bg-white dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  Join Our Growing Community
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                  Be part of the Web3 social revolution. Connect with innovators, creators, and builders.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600 mb-2">1,200+</div>
                  <div className="text-gray-600 dark:text-gray-300">Active Users</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600 mb-2">300+</div>
                  <div className="text-gray-600 dark:text-gray-300">Marketplace Listings</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600 mb-2">50+</div>
                  <div className="text-gray-600 dark:text-gray-300">Active DAOs</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600 mb-2">$2M+</div>
                  <div className="text-gray-600 dark:text-gray-300">Volume Traded</div>
                </div>
              </div>

              <div className="text-center">
                <div className="flex flex-col sm:flex-row justify-center gap-6 mb-8">
                  <a
                    href="https://discord.gg/linkdao"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                  >
                    Join our Discord
                  </a>
                  <a
                    href="https://twitter.com/linkdao"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Follow us on X
                  </a>
                </div>

                {/* Newsletter Signup Form */}
                <div className="max-w-2xl mx-auto mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Stay in the Loop</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Join our newsletter to get the latest updates, product announcements, and community news.
                  </p>
                  <form
                    className="flex flex-col sm:flex-row gap-4"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target as HTMLFormElement);
                      const email = formData.get('email') as string;

                      if (email) {
                        const result = await newsletterService.subscribeEmail(email);
                        if (result.success) {
                          alert('Successfully subscribed to newsletter!');
                          (e.target as HTMLFormElement).reset();
                        } else {
                          alert(result.message || 'Failed to subscribe to newsletter');
                        }
                      }
                    }}
                  >
                    <input
                      type="email"
                      name="email"
                      placeholder="Enter your email"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                    <button
                      type="submit"
                      className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                    >
                      Subscribe
                    </button>
                  </form>
                </div>

                <ConnectButton.Custom>
                  {({ openConnectModal, authenticationStatus, mounted: rainbowMounted }) => {
                    const ready = rainbowMounted && authenticationStatus !== 'loading';
                    return (
                      <button
                        onClick={openConnectModal}
                        disabled={!ready}
                        className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50"
                      >
                        🚀 Start Your Web3 Journey
                      </button>
                    );
                  }}
                </ConnectButton.Custom>
              </div>
            </div>
          </div>
        </Layout>
      </>
    );
  }

  // Connected user experience - Main Social Dashboard/Feed
  return (
    <>
      <SEOHead
        title="Home Feed - LinkDAO"
        description="Your personalized Web3 social feed. Connect with communities, share content, and participate in decentralized governance."
        keywords="Web3 social feed, decentralized content, community posts, DAO governance, crypto social"
        url="https://linkdao.io"
        type="website"
        noIndex={true}
      />
      {/* Removed key prop to prevent full component tree remount on wallet connection */}
      <Layout title="LinkDAO - Home" fullWidth={true}>
        {/* Skip to content link for accessibility */}
        <a
          href="#main-feed-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-white dark:bg-gray-800 px-4 py-2 rounded-md shadow-lg"
        >
          Skip to feed content
        </a>

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-6 w-full px-0 sm:px-2 lg:px-4 mx-auto max-w-screen-2xl pt-0 lg:pt-6">
          {/* Left Sidebar - Navigation - hidden on mobile for home page since we have the burger menu */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24">
              <Suspense fallback={<SidebarSkeleton />}>
                <NavigationSidebar className="h-full" />
              </Suspense>
            </div>
          </div>

          {/* Center Feed */}
          <div className="col-span-1 lg:col-span-6">
            <div
              id="main-feed-content"
              ref={mainContentRef}
              tabIndex={-1}
              className="focus:outline-none"
            >
              <div className="py-6 px-4">
                {/* Post Composer - Inline Facebook-style */}
                <div className="mb-6">
                  <Suspense fallback={<FeedSkeleton />}>
                    <FacebookStylePostComposer
                      onSubmit={handlePostSubmit}
                      isLoading={isCreatingPost}
                      userAvatar={(profile as any)?.avatar}
                      userName={(profile as any)?.handle || `${address?.slice(0, 6)}...${address?.slice(-4)}`}
                    />
                  </Suspense>
                </div>

                {/* New Posts Banner - Real-time Update Indicator */}
                {hasNewPosts && (
                  <div className="sticky top-4 z-30 flex justify-center mb-6 animate-fade-in">
                    <button
                      onClick={handleRefreshFeed}
                      className="group flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-95"
                      aria-label="Refresh feed to see new posts"
                    >
                      <RefreshCw className="w-4 h-4 animate-spin-slow" />
                      <span className="font-medium">New posts available</span>
                      <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-bold group-hover:bg-white/30 transition-colors">
                        ↑
                      </span>
                    </button>
                  </div>
                )}

                {/* Enhanced Feed View with Advanced Features */}
                <Suspense fallback={<FeedSkeleton />}>
                  {navigationState.activeView === 'community' && navigationState.activeCommunity ? (
                    <CommunityView communitySlug={navigationState.activeCommunity} />
                  ) : (
                    <EnhancedHomeFeed
                      externalRefreshKey={feedRefreshKey}
                      userProfile={profile}
                      className=""
                    />
                  )}
                </Suspense>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Activity & Notifications */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24">
              <Suspense fallback={<SidebarSkeleton />}>
                <SmartRightSidebar context="feed" />
              </Suspense>
            </div>
          </div>
        </div>

        {/* Post Creation Modal */}
        <Suspense fallback={null}>
          <PostCreationModal
            isOpen={navigationState.modalState.postCreation}
            onClose={() => closeModal('postCreation')}
            onSubmit={handlePostSubmit}
            isLoading={isCreatingPost}
          />
        </Suspense>

        {/* Support Widget - Floating */}
        <SupportWidget isOpen={isSupportWidgetOpen} onClose={() => setIsSupportWidgetOpen(false)} />

        {/* Wallet Sheet Modal */}
        <Suspense fallback={null}>
          <BottomSheet
            isOpen={isWalletSheetOpen}
            onClose={() => setIsWalletSheetOpen(false)}
            title="Send Tokens"
          >
            <div className="p-4">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Wallet-to-wallet token sending feature coming soon!
              </p>
              <button
                onClick={() => setIsWalletSheetOpen(false)}
                className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </BottomSheet>
        </Suspense>
      </Layout>
    </>
  );
}