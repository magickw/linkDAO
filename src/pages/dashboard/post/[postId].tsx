import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';
import DashboardRightSidebar from '@/components/DashboardRightSidebar';
import FeedView from '@/components/FeedView';
import CommunityView from '@/components/CommunityView';
import { useWeb3 } from '@/context/Web3Context';
import { useNavigation } from '@/context/NavigationContext';
import { useToast } from '@/context/ToastContext';

export default function PostPage() {
  const router = useRouter();
  const { postId, community } = router.query;
  const { isConnected } = useWeb3();
  const { navigationState, navigateToPost } = useNavigation();
  const { addToast } = useToast();

  // Update navigation state when URL changes
  useEffect(() => {
    if (typeof postId === 'string') {
      navigateToPost(postId, typeof community === 'string' ? community : undefined);
    }
  }, [postId, community, navigateToPost]);

  // Redirect to login if not connected
  if (!isConnected) {
    return (
      <DashboardLayout title="Post - LinkDAO" activeView="feed">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Post Details</h1>
          <p className="text-gray-600 dark:text-gray-300">Please connect your wallet to view this post.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Post - LinkDAO"
      activeView={navigationState.activeView}
      rightSidebar={<DashboardRightSidebar />}
    >
      <div className="space-y-6">
        {/* Post Content */}
        {navigationState.activeView === 'community' && navigationState.activeCommunity ? (
          <CommunityView 
            communityId={navigationState.activeCommunity} 
            highlightedPostId={navigationState.activePost}
          />
        ) : (
          <FeedView highlightedPostId={navigationState.activePost} />
        )}
      </div>
    </DashboardLayout>
  );
}