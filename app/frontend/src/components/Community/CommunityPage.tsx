/**
 * CommunityPage Component
 * Main community page with header, posts, sidebar, and member management
 * Implements requirements 2.1, 2.2, 2.7 from the interconnected social platform spec
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Community } from '../../models/Community';
import { CommunityService } from '../../services/communityService';
import CommunityHeader from '../CommunityManagement/CommunityHeader';
import { CommunityPostList } from './CommunityPostList';
import CommunitySidebar from './CommunitySidebar';
import { CommunityRules } from './CommunityRules';
import { CommunityMembers } from './CommunityMembers';
import CommunityJoinButton from './CommunityJoinButton';
import CommunityPostCreator from './CommunityPostCreator';
import CommunityModerationDashboard from './CommunityModerationDashboard';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorBoundary } from '../ErrorHandling/ErrorBoundary';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuth } from '../../hooks/useAuth';
import { CommunityOfflineCacheService } from '../../services/communityOfflineCacheService';
import { communityPerformanceService } from '../../services/communityPerformanceService';
import { CommunityPerformanceDashboard } from './CommunityPerformanceDashboard';

interface CommunityPageProps {
  communityId: string;
  initialData?: Community;
}

interface CommunityStats {
  memberCount: number;
  postCount: number;
  activeMembers: number;
  postsThisWeek: number;
  growthRate: number;
}

interface MembershipStatus {
  isMember: boolean;
  role?: 'member' | 'moderator' | 'admin';
  joinedAt?: Date;
  canPost: boolean;
  canModerate: boolean;
}

export const CommunityPage: React.FC<CommunityPageProps> = ({
  communityId,
  initialData
}) => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [community, setCommunity] = useState<Community | null>(initialData || null);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>({
    isMember: false,
    canPost: false,
    canModerate: false
  });
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'rules' | 'members' | 'moderation' | 'performance'>('posts');
  const [postSort, setPostSort] = useState<'hot' | 'new' | 'top'>('hot');
  const [postFilter, setPostFilter] = useState<string>('all');
  const [showPostCreator, setShowPostCreator] = useState(false);
  const [showModerationDashboard, setShowModerationDashboard] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingActions, setPendingActions] = useState(0);

  // Initialize offline cache service
  const offlineCacheService = useMemo(() => CommunityOfflineCacheService.getInstance(), []);

  // WebSocket connection for real-time updates
  const { isConnected, send, on, off } = useWebSocket({
    walletAddress: user?.address || '',
    autoConnect: true
  });

  // Check network status
  useEffect(() => {
    const updateNetworkStatus = () => {
      const onlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setIsOnline(onlineStatus);
      
      // Get pending actions count
      offlineCacheService.getCacheStats().then(stats => {
        setPendingActions(stats.pendingActions);
      });
    };

    // Check if we're in a browser environment
    const isBrowser = typeof window !== 'undefined';
    
    if (isBrowser) {
      window.addEventListener('online', updateNetworkStatus);
      window.addEventListener('offline', updateNetworkStatus);
    }

    updateNetworkStatus();

    return () => {
      if (isBrowser) {
        window.removeEventListener('online', updateNetworkStatus);
        window.removeEventListener('offline', updateNetworkStatus);
      }
    };
  }, [offlineCacheService]);

  // Load community data
  const loadCommunityData = useCallback(async () => {
    if (!communityId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch community details
      const [communityData, communityStats] = await Promise.all([
        CommunityService.getCommunityById(communityId),
        fetchCommunityStats(communityId)
      ]);

      if (!communityData) {
        setError('Community not found');
        return;
      }

      setCommunity(communityData);
      setStats(communityStats);
      
      // Track community performance metrics
      if (communityData) {
        communityPerformanceService.getCurrentMetrics(communityData.id)
          .catch(error => console.warn('Failed to get community metrics:', error));
      }

      // Check membership status if user is authenticated
      if (isAuthenticated && user) {
        const membership = await checkMembershipStatus(communityId, user.address);
        setMembershipStatus(membership);
      }
    } catch (err) {
      console.error('Error loading community:', err);
      setError(err instanceof Error ? err.message : 'Failed to load community');
    } finally {
      setLoading(false);
    }
  }, [communityId, isAuthenticated, user]);

  // Fetch community statistics
  const fetchCommunityStats = async (id: string): Promise<CommunityStats> => {
    try {
      const response = await fetch(`/api/communities/${id}/stats`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return await response.json();
    } catch (error) {
      console.error('Error fetching community stats:', error);
      return {
        memberCount: 0,
        postCount: 0,
        activeMembers: 0,
        postsThisWeek: 0,
        growthRate: 0
      };
    }
  };

  // Check user's membership status
  const checkMembershipStatus = async (
    communityId: string, 
    userAddress: string
  ): Promise<MembershipStatus> => {
    try {
      const response = await fetch(`/api/communities/${communityId}/membership/${userAddress}`);
      if (!response.ok) {
        return { isMember: false, canPost: false, canModerate: false };
      }
      return await response.json();
    } catch (error) {
      console.error('Error checking membership:', error);
      return { isMember: false, canPost: false, canModerate: false };
    }
  };

  // Handle join/leave community
  const handleJoinLeave = async () => {
    if (!isAuthenticated || !user || !community) return;

    try {
      const endpoint = membershipStatus.isMember 
        ? `/api/communities/${community.id}/leave`
        : `/api/communities/${community.id}/join`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to update membership');

      // Update membership status
      const newMembership = await checkMembershipStatus(community.id, user.address);
      setMembershipStatus(newMembership);

      // Update member count
      if (stats) {
        setStats({
          ...stats,
          memberCount: membershipStatus.isMember 
            ? stats.memberCount - 1 
            : stats.memberCount + 1
        });
      }

      // Emit real-time update
      if (isConnected) {
        send('community:membership_changed', {
          communityId: community.id,
          userAddress: user.address,
          action: membershipStatus.isMember ? 'leave' : 'join'
        });
      }
    } catch (error) {
      console.error('Error updating membership:', error);
      setError('Failed to update membership');
    }
  };

  // Handle post filtering and sorting
  const handlePostSortChange = (sort: 'hot' | 'new' | 'top') => {
    setPostSort(sort);
  };

  const handlePostFilterChange = (filter: string) => {
    setPostFilter(filter);
  };

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!isConnected || !community) return;

    const handleMembershipUpdate = (data: any) => {
      if (data.communityId === community.id) {
        // Update member count
        if (stats) {
          setStats(prev => prev ? {
            ...prev,
            memberCount: data.action === 'join' 
              ? prev.memberCount + 1 
              : prev.memberCount - 1
          } : null);
        }
      }
    };

    const handleCommunityUpdate = (data: any) => {
      if (data.communityId === community.id) {
        setCommunity(prev => prev ? { ...prev, ...data.updates } : null);
      }
    };

    on('community:membership_changed', handleMembershipUpdate);
    on('community:updated', handleCommunityUpdate);

    return () => {
      off('community:membership_changed', handleMembershipUpdate);
      off('community:updated', handleCommunityUpdate);
    };
  }, [isConnected, community, stats, on, off]);

  // Load data on mount and when communityId changes
  useEffect(() => {
    loadCommunityData();
  }, [loadCommunityData]);

  // Memoized computed values
  const canUserPost = useMemo(() => {
    return membershipStatus.canPost && isAuthenticated;
  }, [membershipStatus.canPost, isAuthenticated]);

  const canUserModerate = useMemo(() => {
    return membershipStatus.canModerate && isAuthenticated;
  }, [membershipStatus.canModerate, isAuthenticated]);

  if (loading) {
    return (
      <div className="community-page-loading">
        <LoadingSpinner size="large" />
        <p>Loading community...</p>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="community-page-error">
        <h2>Community Not Found</h2>
        <p>{error || 'The requested community could not be found.'}</p>
        <button 
          onClick={() => router.push('/communities')}
          className="btn btn-primary"
        >
          Browse Communities
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="community-page">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="offline-banner">
            <div className="offline-banner-content">
              <span className="offline-icon">⚠️</span>
              <span>You are currently offline. Some features may be limited.</span>
              {pendingActions > 0 && (
                <span className="pending-actions">
                  {pendingActions} action{pendingActions !== 1 ? 's' : ''} queued for sync
                </span>
              )}
            </div>
          </div>
        )}

        {/* Community Header */}
        <CommunityHeader
          community={{
            ...community,
            onlineCount: stats?.activeMembers || 0,
            isJoined: membershipStatus.isMember,
            canModerate: canUserModerate
          } as any}
          isJoined={membershipStatus.isMember}
          onJoinToggle={handleJoinLeave}
          canModerate={canUserModerate}
        />

        {/* Main Content Area */}
        <div className="community-content">
          {/* Left Sidebar */}
          <aside className="community-sidebar-left">
            <CommunitySidebar
              community={community}
              stats={stats}
              membershipStatus={membershipStatus}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </aside>

          {/* Main Content */}
          <main className="community-main">
            {activeTab === 'posts' && (
              <div className="space-y-6">
                {/* Post Creator */}
                {canUserPost && (
                  <div className="mb-6">
                    {showPostCreator ? (
                      <CommunityPostCreator
                        communityId={community.id}
                        communityName={community.displayName}
                        allowedPostTypes={community.settings?.allowedPostTypes}
                        onPostCreated={() => {
                          setShowPostCreator(false);
                          // Refresh posts list
                        }}
                        onCancel={() => setShowPostCreator(false)}
                      />
                    ) : (
                      <button
                        onClick={() => setShowPostCreator(true)}
                        className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 transition-colors"
                        disabled={!isOnline}
                      >
                        {isOnline ? (
                          <>Create a new post in {community.displayName}</>
                        ) : (
                          <>Offline - Post creation unavailable</>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Posts List */}
                <CommunityPostList
                  communityId={community.id}
                  communitySlug={community.slug}
                  canPost={canUserPost}
                  canModerate={canUserModerate}
                  sort={postSort}
                  filter={postFilter}
                  onSortChange={handlePostSortChange}
                  onFilterChange={handlePostFilterChange}
                />
              </div>
            )}

            {activeTab === 'rules' && (
              <CommunityRules
                communityId={community.id}
                rules={community.rules}
                canEdit={canUserModerate}
                onRulesUpdate={(rules) => setCommunity(prev => 
                  prev ? { ...prev, rules } : null
                )}
              />
            )}

            {activeTab === 'members' && (
              <CommunityMembers
                communityId={community.id}
                canModerate={canUserModerate}
                memberCount={stats?.memberCount || 0}
              />
            )}

            {activeTab === 'moderation' && canUserModerate && (
              <CommunityModerationDashboard
                communityId={community.id}
                onClose={() => setActiveTab('posts')}
              />
            )}
            
            {activeTab === 'performance' && canUserModerate && (
              <CommunityPerformanceDashboard
                communityId={community.id}
              />
            )}
          </main>
        </div>

        <style jsx>{`
          .community-page {
            min-height: 100vh;
            background: var(--bg-primary);
          }

          .offline-banner {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 0.75rem 1rem;
            text-align: center;
          }

          .offline-banner-content {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            flex-wrap: wrap;
          }

          .offline-icon {
            font-size: 1.2rem;
          }

          .pending-actions {
            background: #fff;
            padding: 0.25rem 0.5rem;
            border-radius: 1rem;
            font-size: 0.8rem;
            font-weight: 500;
          }

          .community-page-loading,
          .community-page-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 50vh;
            text-align: center;
            padding: 2rem;
          }

          .community-page-loading p {
            margin-top: 1rem;
            color: var(--text-secondary);
          }

          .community-page-error h2 {
            color: var(--text-primary);
            margin-bottom: 1rem;
          }

          .community-page-error p {
            color: var(--text-secondary);
            margin-bottom: 2rem;
          }

          .community-content {
            display: grid;
            grid-template-columns: 280px 1fr;
            gap: 2rem;
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
          }

          .community-sidebar-left {
            position: sticky;
            top: 2rem;
            height: fit-content;
            max-height: calc(100vh - 4rem);
            overflow-y: auto;
          }

          .community-main {
            min-height: 600px;
          }

          .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 0.5rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .btn-primary {
            background: var(--primary-color);
            color: white;
          }

          .btn-primary:hover {
            background: var(--primary-color-dark);
            transform: translateY(-1px);
          }

          /* Responsive Design */
          @media (max-width: 1024px) {
            .community-content {
              grid-template-columns: 240px 1fr;
              gap: 1.5rem;
              padding: 1.5rem;
            }
          }

          @media (max-width: 768px) {
            .community-content {
              grid-template-columns: 1fr;
              gap: 1rem;
              padding: 1rem;
            }

            .community-sidebar-left {
              position: static;
              max-height: none;
              order: 2;
            }

            .community-main {
              order: 1;
            }
            
            .offline-banner-content {
              flex-direction: column;
              gap: 0.25rem;
            }
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
};

export default CommunityPage;