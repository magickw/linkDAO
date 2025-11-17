import React, { Suspense, lazy } from 'react';
import { ErrorBoundary } from '@/components/ErrorHandling';
import { EnhancedStateProvider } from '@/contexts/EnhancedStateProvider';
import { PerformanceProvider } from '@/components/Performance/PerformanceProvider';
import { SecurityProvider } from '@/components/Security/SecurityProvider';
import { LoadingSkeleton } from '@/design-system/components/LoadingSkeleton';
import { useAuth } from '@/hooks/useAuth';
import { AuthUser } from '@/types/auth';

// Lazy load major components for better performance
const EnhancedPostComposer = lazy(() => import('@/components/EnhancedPostComposer/EnhancedPostComposer'));
const EnhancedFeedView = lazy(() => import('@/components/Feed/EnhancedFeedView'));
const AdvancedNavigationSidebar = lazy(() => import('@/components/Navigation/AdvancedNavigationSidebar'));
const SmartRightSidebar = lazy(() => import('@/components/SmartRightSidebar/SmartRightSidebar'));
const RealTimeNotificationSystem = lazy(() => import('@/components/RealTimeNotifications/RealTimeNotificationSystem'));
const VisualPolishIntegration = lazy(() => import('@/components/VisualPolish/VisualPolishIntegration'));

interface UserData {
  user?: AuthUser;
  communities?: Array<{
    id: string;
    name: string;
    description?: string;
    memberCount?: number;
  }>;
  posts?: Array<{
    id: string;
    content: string;
    author: string;
    createdAt: string;
  }>;
}

interface EnhancedSocialDashboardProps {
  initialData?: UserData;
  featureFlags?: {
    enableTokenReactions?: boolean;
    enableRealTimeNotifications?: boolean;
    enableAdvancedSearch?: boolean;
    enablePerformanceOptimizations?: boolean;
  };
}

const EnhancedSocialDashboard: React.FC<EnhancedSocialDashboardProps> = ({
  initialData,
  featureFlags = {
    enableTokenReactions: true,
    enableRealTimeNotifications: true,
    enableAdvancedSearch: true,
    enablePerformanceOptimizations: true,
  }
}) => {
  const { user, isAuthenticated, accessToken } = useAuth();
  return (
    <ErrorBoundary>
      <EnhancedStateProvider>
        <PerformanceProvider>
          <SecurityProvider>
            <VisualPolishIntegration>
              <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                {/* Real-time Notification System */}
                {featureFlags.enableRealTimeNotifications && isAuthenticated && user && (
                  <Suspense fallback={null}>
                    <RealTimeNotificationSystem
                      userId={user.id}
                      token={accessToken || undefined}
                    />
                  </Suspense>
                )}

                {/* Main Dashboard Layout */}
                <div className="flex h-screen overflow-hidden">
                  {/* Left Sidebar - Navigation */}
                  <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-80 md:w-96 lg:w-96 xl:w-[28rem] 2xl:w-[32rem]">
                    <Suspense fallback={<LoadingSkeleton className="h-full w-full" />}>
                      <AdvancedNavigationSidebar />
                    </Suspense>
                  </div>

                  {/* Main Content Area */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Post Composer */}
                    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                      <Suspense fallback={<LoadingSkeleton className="h-32 w-full" />}>
                        <EnhancedPostComposer
                          context="feed"
                          onSubmit={async (post) => {
                            console.log('Post submitted:', post);
                            // TODO: Implement post submission
                          }}
                          onDraftSave={async (draft) => {
                            console.log('Draft saved:', draft);
                            // TODO: Implement draft saving
                          }}
                          onDraftLoad={(draftId) => {
                            console.log('Draft loaded:', draftId);
                            // TODO: Implement draft loading
                            return null;
                          }}
                        />
                      </Suspense>
                    </div>

                    {/* Feed View */}
                    <div className="flex-1 overflow-hidden">
                      <Suspense fallback={<LoadingSkeleton className="h-full w-full" />}>
                        <EnhancedFeedView />
                      </Suspense>
                    </div>
                  </div>

                  {/* Right Sidebar - Smart Features */}
                  <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 w-72 md:w-80 lg:w-80 xl:w-96 2xl:w-[28rem]">
                    <Suspense fallback={<LoadingSkeleton className="h-full w-full" />}>
                      <SmartRightSidebar context="feed" />
                    </Suspense>
                  </div>
                </div>
              </div>
            </VisualPolishIntegration>
          </SecurityProvider>
        </PerformanceProvider>
      </EnhancedStateProvider>
    </ErrorBoundary>
  );
};

export default EnhancedSocialDashboard;