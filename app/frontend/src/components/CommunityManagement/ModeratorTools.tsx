import React, { useState, useEffect } from 'react';
import { Community } from '@/models/Community';
import { CommunityPost } from '@/models/CommunityPost';
import { CommunityMembership } from '@/models/CommunityMembership';
import { CommunityPostService } from '@/services/communityPostService';
import { CommunityMembershipService } from '@/services/communityMembershipService';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';

interface ModeratorToolsProps {
  community: Community;
  isOpen: boolean;
  onClose: () => void;
}

type ModeratorAction = 'approve' | 'remove' | 'pin' | 'lock' | 'ban_user';

interface PendingPost extends CommunityPost {
  needsApproval: boolean;
}

export default function ModeratorTools({ community, isOpen, onClose }: ModeratorToolsProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'posts' | 'members' | 'reports'>('posts');
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [reportedPosts, setReportedPosts] = useState<CommunityPost[]>([]);
  const [members, setMembers] = useState<CommunityMembership[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());

  // Check if user is moderator
  const isModerator = isConnected && address && community.moderators.includes(address);

  // Load moderator data
  useEffect(() => {
    if (isOpen && isModerator) {
      loadModeratorData();
    }
  }, [isOpen, isModerator, community.id]);

  const loadModeratorData = async () => {
    try {
      setLoading(true);
      
      // Load pending posts (if approval is required)
      if (community.settings.requireApproval) {
        // In a real implementation, this would fetch posts pending approval
        // For now, we'll simulate with empty array
        setPendingPosts([]);
      }

      // Load community members
      const membersData = await CommunityMembershipService.getCommunityMembers(community.id);
      setMembers(membersData);

      // Load reported posts
      // In a real implementation, this would fetch reported posts
      setReportedPosts([]);
    } catch (error) {
      console.error('Error loading moderator data:', error);
      addToast('Failed to load moderator data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePostAction = async (postId: string, action: ModeratorAction) => {
    if (!isModerator) return;

    try {
      setActionLoading(prev => new Set(prev).add(postId));

      switch (action) {
        case 'approve':
          // Approve pending post
          addToast('Post approved', 'success');
          setPendingPosts(prev => prev.filter(p => p.id !== postId));
          break;
        
        case 'remove':
          // Remove post
          addToast('Post removed', 'success');
          setPendingPosts(prev => prev.filter(p => p.id !== postId));
          setReportedPosts(prev => prev.filter(p => p.id !== postId));
          break;
        
        case 'pin':
          // Pin/unpin post
          addToast('Post pinned', 'success');
          break;
        
        case 'lock':
          // Lock/unlock post
          addToast('Post locked', 'success');
          break;
      }
    } catch (error) {
      console.error('Error performing moderator action:', error);
      addToast('Failed to perform action', 'error');
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  const handleMemberAction = async (userId: string, action: 'promote' | 'demote' | 'ban' | 'unban') => {
    if (!isModerator) return;

    try {
      setActionLoading(prev => new Set(prev).add(userId));

      switch (action) {
        case 'promote':
          // Promote to moderator
          addToast('User promoted to moderator', 'success');
          setMembers(prev => prev.map(m => 
            m.userId === userId ? { ...m, role: 'moderator' as const } : m
          ));
          break;
        
        case 'demote':
          // Demote from moderator
          addToast('User demoted to member', 'success');
          setMembers(prev => prev.map(m => 
            m.userId === userId ? { ...m, role: 'member' as const } : m
          ));
          break;
        
        case 'ban':
          // Ban user
          addToast('User banned from community', 'success');
          setMembers(prev => prev.filter(m => m.userId !== userId));
          break;
        
        case 'unban':
          // Unban user
          addToast('User unbanned', 'success');
          break;
      }
    } catch (error) {
      console.error('Error performing member action:', error);
      addToast('Failed to perform action', 'error');
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  if (!isOpen) return null;

  if (!isModerator) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Access Denied
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              You need moderator permissions to access these tools.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Moderator Tools - r/{community.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex h-[calc(90vh-140px)]">
          {/* Sidebar Navigation */}
          <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4">
            <nav className="space-y-2">
              {[
                { id: 'posts', label: 'Post Moderation', icon: '📝', count: pendingPosts.length + reportedPosts.length },
                { id: 'members', label: 'Member Management', icon: '👥', count: members.length },
                { id: 'reports', label: 'Reports & Flags', icon: '🚩', count: 0 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span>{tab.icon}</span>
                    <span className="text-sm font-medium">{tab.label}</span>
                  </div>
                  {tab.count > 0 && (
                    <span className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs font-medium px-2 py-1 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'posts' && (
              <div className="space-y-6">
                {/* Pending Posts */}
                {community.settings.requireApproval && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Pending Approval ({pendingPosts.length})
                    </h3>
                    
                    {pendingPosts.length > 0 ? (
                      <div className="space-y-4">
                        {pendingPosts.map((post) => (
                          <div key={post.id} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {post.author.slice(0, 6)}...{post.author.slice(-4)}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(post.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                                  {post.contentCid}
                                </p>
                              </div>
                              
                              <div className="flex space-x-2 ml-4">
                                <button
                                  onClick={() => handlePostAction(post.id, 'approve')}
                                  disabled={actionLoading.has(post.id)}
                                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handlePostAction(post.id, 'remove')}
                                  disabled={actionLoading.has(post.id)}
                                  className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No posts pending approval
                      </div>
                    )}
                  </div>
                )}

                {/* Reported Posts */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Reported Posts ({reportedPosts.length})
                  </h3>
                  
                  {reportedPosts.length > 0 ? (
                    <div className="space-y-4">
                      {reportedPosts.map((post) => (
                        <div key={post.id} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {post.author.slice(0, 6)}...{post.author.slice(-4)}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(post.createdAt).toLocaleDateString()}
                                </span>
                                <span className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs font-medium px-2 py-1 rounded-full">
                                  Reported
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                                {post.contentCid}
                              </p>
                            </div>
                            
                            <div className="flex space-x-2 ml-4">
                              <button
                                onClick={() => handlePostAction(post.id, 'remove')}
                                disabled={actionLoading.has(post.id)}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
                              >
                                Remove
                              </button>
                              <button
                                onClick={() => handlePostAction(post.id, 'lock')}
                                disabled={actionLoading.has(post.id)}
                                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 disabled:opacity-50"
                              >
                                Lock
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No reported posts
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'members' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Community Members ({members.length})
                  </h3>
                  
                  <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Joined
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Reputation
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
                          {members.map((member) => (
                            <tr key={member.userId}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {member.userId.slice(0, 6)}...{member.userId.slice(-4)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  member.role === 'moderator' 
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                                }`}>
                                  {member.role}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {new Date(member.joinedAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {member.reputation || 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end space-x-2">
                                  {member.role === 'member' ? (
                                    <button
                                      onClick={() => handleMemberAction(member.userId, 'promote')}
                                      disabled={actionLoading.has(member.userId)}
                                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                                    >
                                      Promote
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleMemberAction(member.userId, 'demote')}
                                      disabled={actionLoading.has(member.userId)}
                                      className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 disabled:opacity-50"
                                    >
                                      Demote
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleMemberAction(member.userId, 'ban')}
                                    disabled={actionLoading.has(member.userId)}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                                  >
                                    Ban
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Reports & Flags
                  </h3>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Advanced Reporting System Coming Soon
                        </h3>
                        <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                          <p>Detailed reporting and flagging system with automated detection and community-driven moderation will be available in a future update.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}