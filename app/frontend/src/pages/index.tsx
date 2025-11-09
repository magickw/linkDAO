import { useState, useEffect, useMemo, lazy, Suspense, useRef } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { useWeb3 } from '@/context/Web3Context';
import { useNavigation } from '@/context/NavigationContext';
import { useCreatePost } from '@/hooks/usePosts';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/context/ToastContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { CreatePostInput } from '@/models/Post';
import Link from 'next/link';
import { Send, Vote, TrendingUp, Users, MessageCircle, RefreshCw, Award, Video, Mail, Shield, Zap } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import SupportWidget from '@/components/SupportWidget';

// Lazy load heavy components
const SmartRightSidebar = lazy(() => import('@/components/SmartRightSidebar/SmartRightSidebar'));
const CommunityView = lazy(() => import('@/components/CommunityView'));
const NavigationSidebar = lazy(() => import('@/components/NavigationSidebar'));
const FacebookStylePostComposer = lazy(() => import('@/components/FacebookStylePostComposer'));
const PostCreationModal = lazy(() => import('@/components/PostCreationModal'));
const BottomSheet = lazy(() => import('@/components/BottomSheet'));
const EnhancedFeedView = lazy(() => import('@/components/Feed/EnhancedFeedView'));

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
  const { data: profile } = useProfile(address);
  const { navigationState, openModal, closeModal } = useNavigation();
  
  const [mounted, setMounted] = useState(false);
  const [isWalletSheetOpen, setIsWalletSheetOpen] = useState(false);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [isSupportWidgetOpen, setIsSupportWidgetOpen] = useState(false);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);

  // Refs for accessibility
  const mainContentRef = useRef<HTMLDivElement>(null);
  const skipToContentRef = useRef<HTMLAnchorElement>(null);

  // Initialize WebSocket for real-time updates
  const { isConnected: wsConnected, subscribe, on, off } = useWebSocket({
    walletAddress: address || '',
    autoConnect: isConnected && !!address,
    autoReconnect: true
  });

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
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Subscribe to feed updates when connected
  useEffect(() => {
    if (wsConnected && address) {
      // Subscribe to global feed updates
      subscribe('feed', 'all', {
        eventTypes: ['feed_update', 'new_post']
      });

      // Listen for new posts
      const handleFeedUpdate = (data: any) => {
        console.log('New post received:', data);
        // Add the new post to the feed immediately
        setFeedRefreshKey(prev => prev + 1);
        addToast('New post added to feed', 'success');
      };

      on('feed_update', handleFeedUpdate);

      return () => {
        off('feed_update', handleFeedUpdate);
      };
    }
  }, [wsConnected, address, subscribe, on, off, addToast]);

  // Handle post creation
  const handlePostSubmit = async (postData: CreatePostInput) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to post', 'error');
      return;
    }

    try {
      const newPost = await createPost({ ...postData, author: address });
      addToast('Post created successfully!', 'success');
      closeModal('postCreation');
      // Refresh the feed to show the new post
      setFeedRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error creating post:', error);
      addToast('Failed to create post', 'error');
    }
  };

  // Handle feed refresh
  const handleRefreshFeed = () => {
    setHasNewPosts(false);
    setFeedRefreshKey(prev => prev + 1);
  };

  // If not connected, show enhanced landing page
  if (!mounted || !isConnected) {
    const scrollToFeatures = () => {
      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
      <>
        <Head>
          {/* Primary Meta Tags */}
          <title>LinkDAO - The Web3 Social Network | Decentralized Social Platform</title>
          <meta name="title" content="LinkDAO - The Web3 Social Network | Decentralized Social Platform" />
          <meta name="description" content="Join LinkDAO, the decentralized Web3 social network where you own your identity, data, and content. Connect, trade, govern, and earn in a censorship-resistant platform built on Ethereum." />
          <meta name="keywords" content="Web3 social network, decentralized social media, blockchain social platform, DAO governance, crypto marketplace, NFT social, Ethereum social network, DeFi social, Web3 community, decentralized identity" />
          <meta name="author" content="LinkDAO" />
          <meta name="robots" content="index, follow" />
          <meta name="language" content="English" />
          <meta name="revisit-after" content="7 days" />
          <link rel="canonical" href="https://linkdao.io" />

          {/* Open Graph / Facebook */}
          <meta property="og:type" content="website" />
          <meta property="og:url" content="https://linkdao.io/" />
          <meta property="og:title" content="LinkDAO - The Web3 Social Network | Own Your Digital Life" />
          <meta property="og:description" content="Experience true digital ownership with LinkDAO. Post, trade, govern, and earn on the decentralized social platform built for Web3. No ads, no censorship, just community." />
          <meta property="og:image" content="https://linkdao.io/og-image.png" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:site_name" content="LinkDAO" />
          <meta property="og:locale" content="en_US" />

          {/* Twitter */}
          <meta property="twitter:card" content="summary_large_image" />
          <meta property="twitter:url" content="https://linkdao.io/" />
          <meta property="twitter:title" content="LinkDAO - The Web3 Social Network" />
          <meta property="twitter:description" content="Join the decentralized social revolution. Own your identity, earn from your content, and shape the platform through DAO governance." />
          <meta property="twitter:image" content="https://linkdao.io/twitter-image.png" />
          <meta property="twitter:creator" content="@linkdao" />
          <meta property="twitter:site" content="@linkdao" />

          {/* Additional SEO Tags */}
          <meta name="theme-color" content="#3B82F6" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="LinkDAO" />
          <meta name="application-name" content="LinkDAO" />
          <meta name="msapplication-TileColor" content="#3B82F6" />
          <meta name="msapplication-config" content="/browserconfig.xml" />

          {/* Structured Data - Organization */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": "LinkDAO",
                "url": "https://linkdao.io",
                "logo": "https://linkdao.io/logo.png",
                "description": "Decentralized Web3 social network with marketplace, governance, and wallet features",
                "sameAs": [
                  "https://twitter.com/linkdao",
                  "https://discord.gg/linkdao",
                  "https://t.me/linkdao_web3",
                  "https://github.com/linkdao"
                ],
                "contactPoint": {
                  "@type": "ContactPoint",
                  "email": "support@linkdao.io",
                  "contactType": "Customer Support",
                  "availableLanguage": ["English"]
                }
              })
            }}
          />

          {/* Structured Data - WebSite */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": "LinkDAO",
                "url": "https://linkdao.io",
                "description": "The Web3 Social Network where Identity, Money, and Governance are Yours",
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": "https://linkdao.io/search?q={search_term_string}",
                  "query-input": "required name=search_term_string"
                }
              })
            }}
          />

          {/* Structured Data - SoftwareApplication */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": "LinkDAO",
                "applicationCategory": "SocialNetworkingApplication",
                "operatingSystem": "Web Browser",
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "USD"
                },
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": "4.8",
                  "ratingCount": "1200"
                },
                "description": "Decentralized social network built on Ethereum with marketplace, governance, and wallet features"
              })
            }}
          />
        </Head>
        <Layout title="LinkDAO - The Web3 Social Network" fullWidth={true}>
        {/* Skip to content link for accessibility */}
        <a 
          ref={skipToContentRef}
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-white dark:bg-gray-800 px-4 py-2 rounded-md shadow-lg"
        >
          Skip to main content
        </a>
        
        {/* Hero Section */}
        <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden">
          {/* Background with glassmorphism shapes */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
            <div className="absolute inset-0 bg-black/20"></div>
            {/* Floating glassmorphism shapes */}
            <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 backdrop-blur-lg rounded-full animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 backdrop-blur-lg rounded-full animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/15 backdrop-blur-lg rounded-full animate-pulse delay-500"></div>
          </div>
          
          <div className="relative z-10 text-center py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
              LinkDAO — The Web3 Social Network where Identity, Money, and Governance are Yours.
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto">
              Join the future of social networking. Own your data, earn from your content, and shape the platform through decentralized governance.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <ConnectButton.Custom>
                {({ openConnectModal, authenticationStatus, mounted: rainbowMounted }) => {
                  const ready = rainbowMounted && authenticationStatus !== 'loading';
                  return (
                    <button
                      onClick={openConnectModal}
                      disabled={!ready}
                      className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl text-white bg-white/20 backdrop-blur-lg border border-white/30 hover:bg-white/30 transition-all duration-300 disabled:opacity-50"
                    >
                      🚀 Get Started
                    </button>
                  );
                }}
              </ConnectButton.Custom>
              
              <button
                onClick={scrollToFeatures}
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl text-white bg-transparent border-2 border-white/50 hover:bg-white/10 transition-all duration-300"
              >
                📖 Learn More
              </button>
            </div>
          </div>
        </div>

        {/* Key Features Grid */}
        <div id="features" className="py-16 md:py-24 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Why Choose LinkDAO?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Experience the next generation of social networking with true ownership and decentralized governance.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="group p-8 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl hover:shadow-xl transition-all duration-300">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Social</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Post, follow, and build your own Web3-native community without ads or censorship. Your content, your rules.
                </p>
              </div>
              
              <div className="group p-8 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl hover:shadow-xl transition-all duration-300">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Send className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Wallet</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Send and receive payments in ETH and stablecoins directly inside the platform. Seamless crypto transactions.
                </p>
              </div>
              
              <div className="group p-8 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl hover:shadow-xl transition-all duration-300">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Vote className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Governance</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Create and vote on proposals that shape the community and treasury. True democratic participation.
                </p>
              </div>
              
              <div className="group p-8 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-2xl hover:shadow-xl transition-all duration-300">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Marketplace</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Buy & sell digital + physical goods with crypto and NFT-based trust certificates. Secure transactions.
                </p>
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
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-2xl font-bold text-white">1</span>
                  </div>
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Connect Wallet</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Use MetaMask, WalletConnect, or any Web3 wallet to get started instantly.
                </p>
              </div>
              
              <div className="text-center">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-2xl font-bold text-white">2</span>
                  </div>
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-purple-500 to-pink-600"></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Create Profile</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Set up your decentralized profile with ENS domains and IPFS storage.
                </p>
              </div>
              
              <div className="text-center">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-pink-500 to-orange-600"></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Join Communities</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Discover DAOs, list products, and connect with like-minded individuals.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
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
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">NFT Receipts</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Every purchase generates an NFT receipt for digital ownership and proof of authenticity.
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
      <Head>
        <title>Home Feed - LinkDAO</title>
        <meta name="description" content="Your personalized Web3 social feed. Connect with communities, share content, and participate in decentralized governance." />
        <meta name="robots" content="noindex, follow" />
      </Head>
      <Layout title="LinkDAO - Home">
      {/* Skip to content link for accessibility */}
      <a 
        href="#main-feed-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-white dark:bg-gray-800 px-4 py-2 rounded-md shadow-lg"
      >
        Skip to feed content
      </a>
      
      <div className="flex bg-gray-50 dark:bg-gray-900">
        {/* Left Sidebar - Navigation - hidden on mobile for home page since we have the burger menu */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex flex-col w-64">
            <Suspense fallback={<SidebarSkeleton />}>
              <NavigationSidebar className="h-full" />
            </Suspense>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Main Feed Content */}
          <div className="flex-1 flex">
            {/* Center Feed */}
            <div 
              id="main-feed-content"
              ref={mainContentRef}
              tabIndex={-1}
              className="flex-1 overflow-y-auto pb-24 md:pb-6 focus:outline-none"
            >
              <div className="max-w-2xl mx-auto py-6 px-4">
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
                  <div className="mb-4">
                    <button
                      onClick={handleRefreshFeed}
                      className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      aria-label="Refresh feed to see new posts"
                    >
                      <RefreshCw className="w-4 h-4" />
                      New posts available - Click to refresh
                    </button>
                  </div>
                )}

                {/* Enhanced Feed View with Advanced Features */}
                <Suspense fallback={<FeedSkeleton />}>
                  {navigationState.activeView === 'community' && navigationState.activeCommunity ? (
                    <CommunityView communitySlug={navigationState.activeCommunity} />
                  ) : (
                    <EnhancedFeedView
                      key={feedRefreshKey}
                      communityId={navigationState.activeCommunity}
                      showCommunityMetrics={false}
                      className=""
                    />
                  )}
                </Suspense>
              </div>
            </div>

            {/* Right Sidebar - Activity & Notifications */}
            <div className="hidden xl:flex xl:flex-shrink-0">
              <div className="flex flex-col w-80">
                <Suspense fallback={<SidebarSkeleton />}>
                  <SmartRightSidebar context="feed" />
                </Suspense>
              </div>
            </div>
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