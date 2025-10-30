import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import CommunityView from '@/components/CommunityView';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';

export default function CommunityPage() {
  const router = useRouter();
  const { isMobile } = useMobileOptimization();
  const { community, post } = router.query;

  // If we don't have the community ID yet, show loading state
  if (!community) {
    return (
      <Layout title="Community - LinkDAO" fullWidth={isMobile}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`r/${community} - LinkDAO`} fullWidth={isMobile}>
      <div className="px-4 py-6 sm:px-0">
        <CommunityView 
          communityId={community as string} 
          highlightedPostId={post as string}
        />
      </div>
    </Layout>
  );
}
