import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { motion } from 'framer-motion';
import {
  MobileEnhancedFeed,
  MobileEnhancedPostComposer,
  MobileTokenReactionSystem,
  MobileModal,
  MobileNavigationSidebar,
  CreatePostFAB
} from '@/components/Mobile';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';
import { EnhancedPost, RichPostInput } from '@/types/enhancedPost';
import { ReactionType } from '@/types/tokenReaction';

// Mock data
const mockPosts: EnhancedPost[] = [
  {
    id: '1',
    author: 'alice_crypto',
    content: {
      type: 'text',
      title: 'The Future of DeFi',
      body: 'Just discovered this amazing new protocol that could revolutionize how we think about decentralized finance. The tokenomics are incredible and the team has a proven track record. What do you all think about the current state of DeFi? Are we heading towards mass adoption or still too early?',
      formatting: {}
    },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    reactions: [
      {
        id: 'reaction1',
        type: '🔥',
        postId: '1',
        userId: 'user1',
        user: { id: 'user1', walletAddress: 'user1' },
        amount: 2,
        rewardsEarned: 0,
        createdAt: new Date()
      },
      {
        id: 'reaction2',
        type: '🚀',
        postId: '1',
        userId: 'user2',
        user: { id: 'user2', walletAddress: 'user2' },
        amount: 5,
        rewardsEarned: 0,
        createdAt: new Date()
      }
    ],
    tips: [],
    comments: [],
    shares: [],
    views: 156,
    engagementScore: 85,
    previews: [],
    hashtags: ['defi', 'crypto', 'blockchain'],
    mentions: [],
    media: [],
    socialProof: {
      followedUsersWhoEngaged: [],
      totalEngagementFromFollowed: 0,
      communityLeadersWhoEngaged: [],
      verifiedUsersWhoEngaged: []
    },
    trendingStatus: 'hot'
  },
  {
    id: '2',
    author: 'bob_nft',
    content: {
      type: 'media',
      body: 'Check out my latest NFT creation! Spent weeks perfecting this digital art piece. The community feedback has been amazing so far.',
      formatting: {}
    },
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    reactions: [
      {
        id: 'reaction3',
        type: '💎',
        postId: '2',
        userId: 'user3',
        user: { id: 'user3', walletAddress: 'user3' },
        amount: 10,
        rewardsEarned: 0,
        createdAt: new Date()
      }
    ],
    tips: [],
    comments: [],
    shares: [],
    views: 89,
    engagementScore: 72,
    previews: [],
    hashtags: ['nft', 'art', 'digital'],
    mentions: [],
    media: [
      { url: '/api/placeholder/400/300', type: 'image', alt: 'NFT artwork' }
    ],
    socialProof: {
      followedUsersWhoEngaged: [],
      totalEngagementFromFollowed: 0,
      communityLeadersWhoEngaged: [],
      verifiedUsersWhoEngaged: []
    }
  }
];

const mockUser = {
  id: 'current-user',
  username: 'you',
  displayName: 'Your Name',
  avatar: '/api/placeholder/40/40',
  reputation: { level: 'Beginner', totalScore: 150 }
};

const mockCommunities = [
  { id: 'defi', name: 'DeFi Hub', icon: '🏦', unreadCount: 3 },
  { id: 'nft', name: 'NFT Creators', icon: '🎨', unreadCount: 0 },
  { id: 'dao', name: 'DAO Governance', icon: '🗳️', unreadCount: 1 }
];

const TestMobileOptimizations: NextPage = () => {
  const {
    isMobile,
    isTouch,
    screenSize,
    orientation,
    safeAreaInsets,
    isKeyboardVisible,
    triggerHapticFeedback,
    mobileOptimizedClasses
  } = useMobileOptimization();

  const {
    announceToScreenReader,
    isScreenReaderActive,
    prefersReducedMotion,
    prefersHighContrast,
    accessibilityClasses
  } = useMobileAccessibility();

  const [posts, setPosts] = useState<EnhancedPost[]>(mockPosts);
  const [showComposer, setShowComposer] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top' | 'rising'>('hot');

  const handlePostCreate = async (post: RichPostInput) => {
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newPost: EnhancedPost = {
      id: Date.now().toString(),
      author: mockUser.username,
      content: post,
      createdAt: new Date(),
      updatedAt: new Date(),
      reactions: [],
      tips: [],
      comments: [],
      shares: [],
      views: 0,
      engagementScore: 0,
      previews: [],
      hashtags: post.hashtags,
      mentions: post.mentions,
      media: post.media || [],
      socialProof: {
        followedUsersWhoEngaged: [],
        totalEngagementFromFollowed: 0,
        communityLeadersWhoEngaged: [],
        verifiedUsersWhoEngaged: []
      }
    };

    setPosts(prev => [newPost, ...prev]);
    setLoading(false);
  };

  const handlePostReact = async (postId: string, type: ReactionType, amount: number) => {
    triggerHapticFeedback('medium');
    
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const existingReaction = post.reactions.find(r => r.type === type.emoji);
        if (existingReaction) {
          existingReaction.amount += amount;
        } else {
          post.reactions.push({
            id: `reaction-${Date.now()}`,
            type: type.emoji,
            postId: postId,
            userId: 'current-user',
            user: { id: 'current-user', walletAddress: 'current-user' },
            amount,
            rewardsEarned: 0,
            createdAt: new Date()
          });
        }
      }
      return post;
    }));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
    announceToScreenReader('Feed refreshed');
  };

  const handleLoadMore = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  return (
    <>
      <Head>
        <title>Mobile Optimizations Test - Social Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#3b82f6" />
        <link rel="stylesheet" href="/styles/mobile-optimizations.css" />
      </Head>

      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${mobileOptimizedClasses}`}>
        {/* Header */}
        <div 
          className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700"
          style={{ paddingTop: safeAreaInsets.top }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setShowNavigation(true)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              aria-label="Open navigation"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Mobile Test
            </h1>

            <button
              onClick={() => setShowModal(true)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              aria-label="Open settings"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Device Info Panel (for testing) */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <div className="grid grid-cols-2 gap-2">
              <div>Mobile: {isMobile ? '✅' : '❌'}</div>
              <div>Touch: {isTouch ? '✅' : '❌'}</div>
              <div>Screen: {screenSize}</div>
              <div>Orientation: {orientation}</div>
              <div>Keyboard: {isKeyboardVisible ? '✅' : '❌'}</div>
              <div>Screen Reader: {isScreenReaderActive ? '✅' : '❌'}</div>
              <div>Reduced Motion: {prefersReducedMotion ? '✅' : '❌'}</div>
              <div>High Contrast: {prefersHighContrast ? '✅' : '❌'}</div>
            </div>
            <div className="mt-2 text-xs">
              Safe Areas: T:{safeAreaInsets.top} B:{safeAreaInsets.bottom} L:{safeAreaInsets.left} R:{safeAreaInsets.right}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <MobileEnhancedFeed
            posts={posts}
            loading={loading}
            refreshing={refreshing}
            hasMore={true}
            sortBy={sortBy}
            onLoadMore={handleLoadMore}
            onRefresh={handleRefresh}
            onPostCreate={handlePostCreate}
            onPostReact={handlePostReact}
            onPostComment={(postId) => console.log('Comment on:', postId)}
            onPostShare={(postId) => console.log('Share:', postId)}
            onPostBookmark={(postId) => console.log('Bookmark:', postId)}
            onViewReactors={(postId, type) => console.log('View reactors:', postId, type)}
            onUserPress={(userId) => console.log('User pressed:', userId)}
            onSortChange={setSortBy}
          />
        </div>

        {/* Floating Action Button */}
        <CreatePostFAB
          onCreatePost={() => setShowComposer(true)}
          onCreatePoll={() => {
            setShowComposer(true);
            announceToScreenReader('Opening poll creator');
          }}
          onCreateProposal={() => {
            setShowComposer(true);
            announceToScreenReader('Opening proposal creator');
          }}
          onUploadMedia={() => {
            setShowComposer(true);
            announceToScreenReader('Opening media uploader');
          }}
        />

        {/* Navigation Sidebar */}
        <MobileNavigationSidebar
          isOpen={showNavigation}
          onClose={() => setShowNavigation(false)}
          user={mockUser}
          communities={mockCommunities}
          activeFilters={[]}
          onFilterChange={(filters) => console.log('Filters:', filters)}
          onCommunitySelect={(id) => console.log('Community:', id)}
          onUserProfileClick={() => console.log('Profile clicked')}
        />

        {/* Post Composer */}
        <MobileEnhancedPostComposer
          isOpen={showComposer}
          onClose={() => setShowComposer(false)}
          onSubmit={handlePostCreate}
        />

        {/* Settings Modal */}
        <MobileModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Mobile Optimization Settings"
          size="lg"
        >
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Test Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    triggerHapticFeedback('light');
                    announceToScreenReader('Light haptic feedback triggered');
                  }}
                  className="w-full p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg"
                >
                  Test Light Haptic
                </button>
                
                <button
                  onClick={() => {
                    triggerHapticFeedback('medium');
                    announceToScreenReader('Medium haptic feedback triggered');
                  }}
                  className="w-full p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg"
                >
                  Test Medium Haptic
                </button>
                
                <button
                  onClick={() => {
                    triggerHapticFeedback('heavy');
                    announceToScreenReader('Heavy haptic feedback triggered');
                  }}
                  className="w-full p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg"
                >
                  Test Heavy Haptic
                </button>

                <button
                  onClick={() => {
                    announceToScreenReader('This is a test announcement for screen readers');
                  }}
                  className="w-full p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg"
                >
                  Test Screen Reader
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Device Information
              </h3>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm">
                <div className="space-y-2">
                  <div>User Agent: {typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 50) + '...' : 'N/A'}</div>
                  <div>Screen Size: {typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'N/A'}</div>
                  <div>Viewport: {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A'}</div>
                  <div>Device Pixel Ratio: {typeof window !== 'undefined' ? window.devicePixelRatio : 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>
        </MobileModal>
      </div>
    </>
  );
};

export default TestMobileOptimizations;