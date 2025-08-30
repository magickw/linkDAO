import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import DashboardRightSidebar from '@/components/DashboardRightSidebar';
import FeedView from '@/components/FeedView';
import CommunityView from '@/components/CommunityView';
import MigrationNotice from '@/components/MigrationNotice';
import DashboardTour from '@/components/DashboardTour';
import LegacyFunctionalityPreserver from '@/components/LegacyFunctionalityPreserver';
import { AnimatedButton } from '@/components/MicroInteractions';
import { LoadingOverlay } from '@/components/LoadingAnimations';
import { useWeb3 } from '@/context/Web3Context';
import { useNavigation } from '@/context/NavigationContext';
import { useFeed, useCreatePost } from '@/hooks/usePosts';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/context/ToastContext';
import { CreatePostInput } from '@/models/Post';
import PostCreationModal from '@/components/PostCreationModal';
import BottomSheet from '@/components/BottomSheet';
import { useRouter } from 'next/router';
import { 
  fadeInUp, 
  staggerContainer, 
  staggerItem, 
  scaleIn,
  pageTransition 
} from '@/lib/animations';





export default function Dashboard() {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const router = useRouter();
  const { navigationState, openModal, closeModal } = useNavigation();
  const { createPost, isLoading: isCreatingPost, error: createPostError, success: createPostSuccess } = useCreatePost();
  const { profile: userProfile } = useProfile(address);
  const [isPostSheetOpen, setIsPostSheetOpen] = useState(false);
  const [showMigrationNotice, setShowMigrationNotice] = useState(false);
  const [notifications] = useState([
    { id: '1', type: 'vote', message: '3 pending governance votes', time: '2 hours ago' },
    { id: '2', type: 'bid', message: 'Auction ending soon: Rare CryptoPunk', time: '5 hours ago' },
    { id: '3', type: 'mention', message: '@alexj mentioned you in a post', time: '1 day ago' },
  ]);

  // Check if this is the first time visiting the updated dashboard
  useEffect(() => {
    const hasSeenMigration = localStorage.getItem('dashboard-migration-seen');
    if (!hasSeenMigration) {
      setShowMigrationNotice(true);
      localStorage.setItem('dashboard-migration-seen', 'true');
    }
  }, []);

  // Show success toast when post is created
  useEffect(() => {
    if (createPostSuccess) {
      addToast('Post created successfully!', 'success');
    }
  }, [createPostSuccess, addToast]);

  // Show error toast when post creation fails
  useEffect(() => {
    if (createPostError) {
      addToast(`Error creating post: ${createPostError}`, 'error');
    }
  }, [createPostError, addToast]);

  const handlePostSubmit = async (data: CreatePostInput) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to post', 'error');
      return;
    }

    try {
      // Add the author address to the post data
      const postData: CreatePostInput = {
        ...data,
        author: address,
      };

      await createPost(postData);
      closeModal('postCreation');
    } catch (error) {
      console.error('Error creating post:', error);
      addToast('Failed to create post. Please try again.', 'error');
    }
  };



  // Handle post action
  const handlePostAction = (action: string) => {
    setIsPostSheetOpen(false);
    if (action === 'standard' || action === 'proposal' || action === 'defi' || action === 'nft' || action === 'question') {
      openModal('postCreation');
    } else {
      addToast(`Post action: ${action}`, 'info');
    }
  };

  // Format numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format time remaining
  const formatTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();

    if (diff <= 0) {
      return 'Ended';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Get user's wallet balance
  const getWalletBalance = () => {
    return {
      eth: 2.45,
      usdc: 1250,
      nfts: 8
    };
  };

  // Get user's reputation
  const getUserReputation = () => {
    return {
      score: 750,
      tier: 'Expert'
    };
  };

  if (!isConnected) {
    return (
      <DashboardLayout title="Dashboard - LinkDAO" activeView="feed">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Personalized Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300">Please connect your wallet to access your personalized dashboard.</p>
        </div>
      </DashboardLayout>
    );
  }

  const walletBalance = getWalletBalance();
  const userReputation = getUserReputation();

  const handleCreatePost = () => {
    openModal('postCreation');
  };

  return (
    <>
      {/* Legacy Functionality Preserver */}
      <LegacyFunctionalityPreserver />
      
      {/* Migration Notice */}
      {showMigrationNotice && (
        <MigrationNotice 
          type="dashboard" 
          onDismiss={() => setShowMigrationNotice(false)}
        />
      )}
      
      {/* Dashboard Tour */}
      <DashboardTour />
      
      <DashboardLayout
        title="Dashboard - LinkDAO"
        activeView={navigationState.activeView}
        rightSidebar={<DashboardRightSidebar />}
        onCreatePost={handleCreatePost}
      >
      <div className="space-y-6">
        {/* Top Section (User Snapshot) */}
        <motion.div 
          className="mb-8"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
        >
          <motion.div 
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden"
            whileHover={{ y: -2, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
            transition={{ duration: 0.2 }}
          >
            <motion.div 
              className="p-6"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <motion.div 
                  className="flex items-center space-x-4 mb-4 md:mb-0"
                  variants={staggerItem}
                >
                  <div className="relative">
                    <motion.div 
                      className="bg-gradient-to-br from-primary-400 to-secondary-500 border-2 border-white dark:border-gray-800 rounded-xl w-16 h-16 flex items-center justify-center shadow-md"
                      whileHover={{ scale: 1.05, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <span className="text-white font-bold text-xl">
                        {userProfile?.handle?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </motion.div>
                    <motion.div 
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-sm"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <span className="text-xs">🏆</span>
                    </motion.div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <motion.h2 
                        className="text-xl font-bold text-gray-900 dark:text-white"
                        whileHover={{ x: 2 }}
                      >
                        {userProfile?.handle || 'User'}
                      </motion.h2>
                      <AnimatePresence>
                        {userProfile?.ens && (
                          <motion.span 
                            className="text-gray-500 dark:text-gray-400 text-sm"
                            variants={scaleIn}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                          >
                            ({userProfile.ens})
                          </motion.span>
                        )}
                      </AnimatePresence>
                      <motion.span 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-200"
                        whileHover={{ scale: 1.05 }}
                      >
                        {userReputation.tier}
                      </motion.span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Reputation Score: {userReputation.score}
                    </p>
                  </div>
                </motion.div>

                <motion.div 
                  className="grid grid-cols-3 gap-4 mb-4 md:mb-0"
                  variants={staggerItem}
                >
                  {[
                    { value: walletBalance.eth, unit: 'ETH', subtext: `≈ $${formatNumber(walletBalance.eth * 1700)}` },
                    { value: walletBalance.usdc, unit: 'USDC', subtext: 'Stablecoins' },
                    { value: walletBalance.nfts, unit: '', subtext: 'NFTs' }
                  ].map((item, index) => (
                    <motion.div 
                      key={index}
                      className="text-center"
                      whileHover={{ scale: 1.05, y: -2 }}
                      transition={{ duration: 0.1 }}
                    >
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {item.value} <span className="text-sm font-normal">{item.unit}</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.subtext}</p>
                    </motion.div>
                  ))}
                </motion.div>

                <motion.div 
                  className="flex space-x-2"
                  variants={staggerItem}
                >
                  <AnimatedButton
                    onClick={() => openModal('postCreation')}
                    variant="primary"
                    className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Post
                  </AnimatedButton>
                  <AnimatedButton
                    onClick={() => router.push('/wallet')}
                    variant="secondary"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Tokens
                  </AnimatedButton>
                  <AnimatedButton
                    onClick={() => router.push('/governance')}
                    variant="secondary"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    DAO Proposal
                  </AnimatedButton>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          {/* Notifications / Tasks Widget */}
          <motion.div 
            className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {[
              {
                title: 'Governance Votes',
                subtitle: '3 pending votes',
                icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
                color: 'red'
              },
              {
                title: 'Auction Bids',
                subtitle: '2 expiring soon',
                icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
                color: 'yellow'
              },
              {
                title: 'Social Mentions',
                subtitle: '5 new mentions',
                icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
                color: 'blue'
              }
            ].map((item, index) => (
              <motion.div
                key={item.title}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 p-4"
                variants={staggerItem}
                whileHover={{ y: -2, scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <motion.div 
                      className={`flex items-center justify-center h-8 w-8 rounded-md bg-${item.color}-100 dark:bg-${item.color}-900/30 text-${item.color}-600 dark:text-${item.color}-400`}
                      whileHover={{ rotate: 5, scale: 1.1 }}
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                      </svg>
                    </motion.div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.subtitle}</p>
                  </div>
                  <AnimatedButton
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-primary-600 dark:text-primary-400"
                  >
                    View
                  </AnimatedButton>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Main Content - Conditional Rendering Based on Active View */}
        <motion.div 
          className="w-full"
          variants={pageTransition}
          initial="initial"
          animate="animate"
        >
          <AnimatePresence mode="wait">
            {navigationState.activeView === 'feed' ? (
              <motion.div
                key="feed"
                variants={pageTransition}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <FeedView />
              </motion.div>
            ) : navigationState.activeView === 'community' && navigationState.activeCommunity ? (
              <motion.div
                key={`community-${navigationState.activeCommunity}`}
                variants={pageTransition}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <CommunityView communityId={navigationState.activeCommunity} />
              </motion.div>
            ) : (
              /* Default to feed view if no specific view is set */
              <motion.div
                key="default-feed"
                variants={pageTransition}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <FeedView />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>



        {/* Bottom Section (Quick Wallet & Governance) - Mobile Only */}
        <div className="md:hidden mt-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
            <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <h3 className="font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-3">
                <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                  <div className="text-2xl mb-1">📤</div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Send</span>
                </button>
                <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                  <div className="text-2xl mb-1">📥</div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Receive</span>
                </button>
                <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                  <div className="text-2xl mb-1">🔄</div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Swap</span>
                </button>
                <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                  <div className="text-2xl mb-1">🗳️</div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Vote</span>
                </button>
                <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                  <div className="text-2xl mb-1">🏪</div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Sell</span>
                </button>
                <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                  <div className="text-2xl mb-1">👀</div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Bids</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Post Creation Modal - Only show when not in feed view (FeedView handles its own modal) */}
      {navigationState.activeView !== 'feed' && (
        <PostCreationModal
          isOpen={navigationState.modalState.postCreation}
          onClose={() => closeModal('postCreation')}
          onSubmit={handlePostSubmit}
          isLoading={isCreatingPost}
        />
      )}

      {/* Post Creation Bottom Sheet */}
      <BottomSheet
        isOpen={isPostSheetOpen}
        onClose={() => setIsPostSheetOpen(false)}
        title="Create Post"
      >
        <div className="p-4">
          <AnimatedButton
            onClick={() => handlePostAction('standard')}
            variant="primary"
            className="w-full"
            loading={isCreatingPost}
          >
            Create Post
          </AnimatedButton>
        </div>
      </BottomSheet>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isCreatingPost && (
          <LoadingOverlay message="Creating your post..." />
        )}
      </AnimatePresence>
    </DashboardLayout>
    </>
  );
}
      {navigationState.activeView !== 'feed' && (
        <PostCreationModal
          isOpen={navigationState.modalState.postCreation}
          onClose={() => closeModal('postCreation')}
          onSubmit={handlePostSubmit}
          isLoading={isCreatingPost}
        />
      )}

      {/* Post Creation Bottom Sheet */}
      <BottomSheet
        isOpen={isPostSheetOpen}
        onClose={() => setIsPostSheetOpen(false)}
        title="Create Post"
      >
        <div className="p-4">
          <AnimatedButton
            onClick={() => handlePostAction('standard')}
            variant="primary"
            className="w-full"
            loading={isCreatingPost}
          >
            Create Post
          </AnimatedButton>
        </div>
      </BottomSheet>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isCreatingPost && (
          <LoadingOverlay message="Creating your post..." />
        )}
      </AnimatePresence>
    </DashboardLayout>
    </>
  );
}