import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';
import DashboardRightSidebar from '@/components/DashboardRightSidebar';
import CommunityView from '@/components/CommunityView';
import { useWeb3 } from '@/context/Web3Context';
import { useNavigation } from '@/context/NavigationContext';

export default function CommunityPage() {
  const router = useRouter();
  const { communityId, post } = router.query;
  const { isConnected } = useWeb3();
  const { navigationState, navigateToCommunity, navigateToPost } = useNavigation();

  // Update navigation state when URL changes
  useEffect(() => {
    if (typeof communityId === 'string') {
      if (typeof post === 'string') {
        navigateToPost(post, communityId);
      } else {
        navigateToCommunity(communityId);
      }
    }
  }, [communityId, post, navigateToCommunity, navigateToPost]);

  // Redirect to login if not connected
  if (!isConnected) {
    return (
      <DashboardLayout title="Community - LinkDAO" activeView="community">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Community</h1>
          <p className="text-gray-600 dark:text-gray-300">Please connect your wallet to view this community.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (typeof communityId !== 'string') {
    return (
      <DashboardLayout title="Community - LinkDAO" activeView="community">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Community Not Found</h1>
          <p className="text-gray-600 dark:text-gray-300">The requested community could not be found.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Community - LinkDAO"
      activeView={navigationState.activeView}
      rightSidebar={<DashboardRightSidebar />}
    >
      <CommunityView 
        communityId={communityId}
        highlightedPostId={navigationState.activePost}
      />
    </DashboardLayout>
  );
}