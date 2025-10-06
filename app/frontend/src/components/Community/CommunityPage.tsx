/**
 * CommunityPage Component
 * Main community page with header, posts, sidebar, and member management
 * Implements requirements 2.1, 2.2, 2.7 from the interconnected social platform spec
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Community } from '../../models/Community';
import { CommunityService } from '../../services/communityService';
import { CommunityHeader } from './CommunityHeader';
import { CommunityPostList } from './CommunityPostList';
import { CommunitySidebar } from './CommunitySidebar';
import { CommunityRules } from './CommunityRules';
import { CommunityMembers } from './CommunityMembers';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorBoundary } from '../ErrorHandling/ErrorBoundary';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuth } from '../../hooks/useAuth';

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
  const [activeTab, setActiveTab] = useState<'posts' | 'rules' | 'members'>('posts');
  const [postSort, setPostSort] = useState<'hot' | 'new' | 'top'>('hot');
  const [postFilter, setPostFilter] = useState<string>('all');

  // WebSocket connection for real-time updates
  const { isConnected, send, on, off } = useWebSocket({
    walletAddress: user?.address || '',
    autoConnect: true
  });

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
        {/* Community Header */}
        <CommunityHeader
          community={community}
          stats={stats}
          membershipStatus={membershipStatus}
          onJoinLeave={handleJoinLeave}
          canModerate={canUserModerate}
          isConnected={isConnected}
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
              <CommunityPostList
                communityId={community.id}
                canPost={canUserPost}
                canModerate={canUserModerate}
                sort={postSort}
                filter={postFilter}
                onSortChange={handlePostSortChange}
                onFilterChange={handlePostFilterChange}
              />
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
          </main>
        </div>

        <style jsx>{`
          .community-page {
            min-height: 100vh;
            background: var(--bg-primary);
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
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
};

export default CommunityPage;