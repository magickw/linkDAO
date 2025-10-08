import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Pin, 
  Lock, 
  Ban, 
  MessageSquare,
  User,
  FileText,
  Settings,
  BarChart3,
  Clock,
  Eye
} from 'lucide-react';
import { useCommunityInteractions } from '../../hooks/useCommunityInteractions';

interface ModerationItem {
  id: string;
  type: 'post' | 'comment' | 'user';
  targetId: string;
  content: string;
  author: string;
  reportReason: string;
  reportedAt: Date;
  status: 'pending' | 'approved' | 'removed';
  priority: 'low' | 'medium' | 'high';
}

interface CommunityModerationDashboardProps {
  communityId: string;
  onClose?: () => void;
}

export default function CommunityModerationDashboard({ 
  communityId, 
  onClose 
}: CommunityModerationDashboardProps) {
  const {
    loading,
    error,
    moderateContent,
    updateSettings,
    checkPermissions,
    getModerationQueue,
    getAnalytics,
    clearError
  } = useCommunityInteractions();

  const [activeTab, setActiveTab] = useState<'queue' | 'settings' | 'analytics'>('queue');
  const [moderationQueue, setModerationQueue] = useState<ModerationItem[]>([]);
  const [permissions, setPermissions] = useState<{
    isModerator: boolean;
    isAdmin: boolean;
    permissions: string[];
  } | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [communitySettings, setCommunitySettings] = useState({
    requireApproval: false,
    minimumReputation: 0,
    autoModeration: false,
    allowedPostTypes: ['discussion', 'news', 'question']
  });

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      // Check permissions
      const perms = await checkPermissions(communityId);
      setPermissions(perms);

      if (perms?.isModerator) {
        // Load moderation queue
        const queue = await getModerationQueue(communityId);
        if (queue) {
          setModerationQueue(queue);
        }

        // Load analytics if admin
        if (perms.isAdmin) {
          const analyticsData = await getAnalytics(communityId);
          if (analyticsData) {
            setAnalytics(analyticsData);
          }
        }
      }
    };

    loadData();
  }, [communityId, checkPermissions, getModerationQueue, getAnalytics]);

  const handleModerationAction = async (
    itemId: string,
    action: 'approve' | 'remove' | 'pin' | 'lock' | 'ban' | 'warn',
    reason?: string
  ) => {
    const item = moderationQueue.find(i => i.id === itemId);
    if (!item) return;

    const success = await moderateContent({
      communityId,
      targetType: item.type,
      targetId: item.targetId,
      action,
      reason
    });

    if (success) {
      // Update local state
      setModerationQueue(prev => 
        prev.map(i => 
          i.id === itemId 
            ? { ...i, status: action === 'approve' ? 'approved' : 'removed' }
            : i
        )
      );
    }
  };

  const handleSettingsUpdate = async () => {
    const success = await updateSettings({
      communityId,
      settings: communitySettings
    });

    if (success) {
      // Settings updated successfully
      console.log('Settings updated');
    }
  };

  if (!permissions?.isModerator) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
        <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Access Denied
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          You need moderator permissions to access this dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Moderation Dashboard
          </h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XCircle className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 dark:text-red-200">{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'queue'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Moderation Queue</span>
            {moderationQueue.filter(i => i.status === 'pending').length > 0 && (
              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                {moderationQueue.filter(i => i.status === 'pending').length}
              </span>
            )}
          </div>
        </button>
        
        {permissions?.isAdmin && (
          <>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'analytics'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </div>
            </button>
          </>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'queue' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Reported Content
            </h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Loading moderation queue...</p>
              </div>
            ) : moderationQueue.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No items in moderation queue
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {moderationQueue.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {item.type === 'post' && <FileText className="w-4 h-4 text-blue-600" />}
                          {item.type === 'comment' && <MessageSquare className="w-4 h-4 text-green-600" />}
                          {item.type === 'user' && <User className="w-4 h-4 text-purple-600" />}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.type.charAt(0).toUpperCase() + item.type.slice(1)} by {item.author}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            item.priority === 'high' 
                              ? 'bg-red-100 text-red-800' 
                              : item.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.priority} priority
                          </span>
                        </div>
                        
                        <p className="text-gray-700 dark:text-gray-300 mb-2">
                          {item.content}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Reason: {item.reportReason}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{item.reportedAt.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      {item.status === 'pending' && (
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleModerationAction(item.id, 'approve')}
                            className="px-3 py-1 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
                            disabled={loading}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleModerationAction(item.id, 'remove', 'Violates community guidelines')}
                            className="px-3 py-1 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
                            disabled={loading}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                          {item.type === 'post' && (
                            <>
                              <button
                                onClick={() => handleModerationAction(item.id, 'pin')}
                                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                                disabled={loading}
                              >
                                <Pin className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleModerationAction(item.id, 'lock')}
                                className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors"
                                disabled={loading}
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && permissions?.isAdmin && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Community Settings
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white">
                    Require Approval for Posts
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    All posts must be approved by moderators before being visible
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={communitySettings.requireApproval}
                  onChange={(e) => setCommunitySettings(prev => ({
                    ...prev,
                    requireApproval: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Minimum Reputation to Post
                </label>
                <input
                  type="number"
                  value={communitySettings.minimumReputation}
                  onChange={(e) => setCommunitySettings(prev => ({
                    ...prev,
                    minimumReputation: parseInt(e.target.value) || 0
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white">
                    Auto-Moderation
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Automatically moderate content using AI
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={communitySettings.autoModeration}
                  onChange={(e) => setCommunitySettings(prev => ({
                    ...prev,
                    autoModeration: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              
              <button
                onClick={handleSettingsUpdate}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Updating...' : 'Update Settings'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && permissions?.isAdmin && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Community Analytics
            </h3>
            
            {analytics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Engagement Metrics
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Active Members:</span>
                      <span className="font-medium">{analytics.engagementMetrics?.activeMembers || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Avg Posts/Day:</span>
                      <span className="font-medium">{analytics.engagementMetrics?.averagePostsPerDay || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Retention Rate:</span>
                      <span className="font-medium">{analytics.engagementMetrics?.retentionRate || 0}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Growth Trends
                  </h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Analytics charts would be displayed here
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Loading analytics data...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}