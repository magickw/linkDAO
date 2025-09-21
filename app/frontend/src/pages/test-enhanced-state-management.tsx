import React, { useEffect, useState } from 'react';
import { 
  EnhancedStateProvider, 
  useEnhancedState,
  ContentType,
  ReactionType,
  AchievementCategory,
  stateManager
} from '../contexts';
import type { ActionType } from '../contexts';

/**
 * Test page for Enhanced State Management System
 * 
 * This page demonstrates all the features of the enhanced state management system
 * and serves as a comprehensive example of how to use the various contexts.
 */

function TestEnhancedStateManagement() {
  return (
    <EnhancedStateProvider>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Enhanced State Management System Test
          </h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ContentCreationDemo />
            <EngagementDemo />
            <ReputationDemo />
            <PerformanceDemo />
            <OfflineSyncDemo />
            <RealTimeDemo />
          </div>
          
          <StateManagerDemo />
        </div>
      </div>
    </EnhancedStateProvider>
  );
}

function ContentCreationDemo() {
  const { contentCreation } = useEnhancedState();
  const [draftId, setDraftId] = useState<string>('');

  const handleCreateDraft = () => {
    const id = contentCreation.createDraft(ContentType.TEXT);
    setDraftId(id);
  };

  const handleUpdateDraft = (content: string) => {
    if (draftId) {
      contentCreation.updateDraft(draftId, { content });
    }
  };

  const handleSubmitPost = async () => {
    if (draftId) {
      try {
        await contentCreation.submitPost(draftId);
        setDraftId('');
      } catch (error) {
        console.error('Failed to submit post:', error);
      }
    }
  };

  const draft = draftId ? contentCreation.getDraft(draftId) : null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Content Creation</h2>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Drafts: {contentCreation.state.drafts.size}
          </p>
          <button
            onClick={handleCreateDraft}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Create Draft
          </button>
        </div>

        {draft && (
          <div>
            <textarea
              value={draft.content}
              onChange={(e) => handleUpdateDraft(e.target.value)}
              placeholder="Write your post content..."
              className="w-full p-3 border rounded-lg"
              rows={4}
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleSubmitPost}
                disabled={contentCreation.state.isSubmitting}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
              >
                {contentCreation.state.isSubmitting ? 'Submitting...' : 'Submit Post'}
              </button>
            </div>
          </div>
        )}

        {contentCreation.state.validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <h4 className="text-red-800 font-medium">Validation Errors:</h4>
            <ul className="text-red-700 text-sm mt-1">
              {contentCreation.state.validationErrors.map((error: any, index: number) => (
                <li key={index}>• {error.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function EngagementDemo() {
  const { engagement } = useEnhancedState();
  const [selectedPost, setSelectedPost] = useState('demo-post-1');

  const mockUser = {
    id: 'current-user',
    username: 'testuser',
    avatar: '👤',
    reputation: 150,
  };

  const handleReaction = async (type: ReactionType, amount: number) => {
    try {
      await engagement.addReaction(selectedPost, type, amount, mockUser);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleTip = async () => {
    try {
      await engagement.addTip(selectedPost, 10, 'LDAO', 'Great post!');
    } catch (error) {
      console.error('Failed to add tip:', error);
    }
  };

  const postReactions = engagement.getPostReactions(selectedPost);
  const userEngagement = engagement.getUserEngagement();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Engagement</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-medium mb-2">React to Post</h3>
          <div className="flex gap-2">
            <button
              onClick={() => handleReaction(ReactionType.FIRE, 1)}
              className="bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600"
            >
              🔥 Fire (1 token)
            </button>
            <button
              onClick={() => handleReaction(ReactionType.ROCKET, 2)}
              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
            >
              🚀 Rocket (2 tokens)
            </button>
            <button
              onClick={() => handleReaction(ReactionType.DIAMOND, 5)}
              className="bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600"
            >
              💎 Diamond (5 tokens)
            </button>
          </div>
        </div>

        <div>
          <button
            onClick={handleTip}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Tip 10 LDAO
          </button>
        </div>

        {postReactions && (
          <div className="bg-gray-50 p-3 rounded">
            <h4 className="font-medium">Post Reactions:</h4>
            <p className="text-sm">Total Value: {postReactions.totalValue} tokens</p>
            <p className="text-sm">Reactions: {postReactions.reactions.length}</p>
          </div>
        )}

        <div className="bg-gray-50 p-3 rounded">
          <h4 className="font-medium">Your Engagement:</h4>
          <p className="text-sm">Reactions Given: {userEngagement.totalReactionsGiven}</p>
          <p className="text-sm">Tips Given: {userEngagement.totalTipsGiven}</p>
          <p className="text-sm">Engagement Score: {userEngagement.engagementScore}</p>
          <p className="text-sm">Streak: {userEngagement.streakDays} days</p>
        </div>
      </div>
    </div>
  );
}

function ReputationDemo() {
  const { reputation } = useEnhancedState();

  const handleAddReputation = (category: AchievementCategory, points: number) => {
    reputation.updateReputationScore(points, category, `Earned ${points} points in ${category}`);
  };

  const handleAddBadge = () => {
    const badge = {
      id: `badge-${Date.now()}`,
      name: 'Test Badge',
      description: 'A badge for testing',
      icon: '🏆',
      rarity: 'rare' as const,
      earnedAt: new Date(),
      requirements: [],
    };
    reputation.addBadge(badge);
  };

  const level = reputation.getUserLevel();
  const progress = reputation.getProgressToNextLevel();
  const notifications = reputation.getUnseenNotifications();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Reputation System</h2>
      
      <div className="space-y-4">
        <div className="bg-gray-50 p-3 rounded">
          <h4 className="font-medium">Current Level: {level.name}</h4>
          <p className="text-sm">Total Score: {reputation.state.userReputation.totalScore}</p>
          <p className="text-sm">Progress to Next: {Math.round(progress * 100)}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${progress * 100}%` }}
            ></div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Add Reputation Points:</h4>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleAddReputation(AchievementCategory.POSTING, 10)}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
            >
              +10 Posting
            </button>
            <button
              onClick={() => handleAddReputation(AchievementCategory.COMMUNITY, 15)}
              className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
            >
              +15 Community
            </button>
            <button
              onClick={() => handleAddReputation(AchievementCategory.GOVERNANCE, 20)}
              className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600"
            >
              +20 Governance
            </button>
          </div>
        </div>

        <div>
          <button
            onClick={handleAddBadge}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          >
            Add Test Badge
          </button>
        </div>

        <div className="bg-gray-50 p-3 rounded">
          <h4 className="font-medium">Stats:</h4>
          <p className="text-sm">Badges: {reputation.state.badges.length}</p>
          <p className="text-sm">Achievements: {reputation.state.achievements.length}</p>
          <p className="text-sm">Unseen Notifications: {notifications.length}</p>
        </div>
      </div>
    </div>
  );
}

function PerformanceDemo() {
  const { performance } = useEnhancedState();
  const [itemCount, setItemCount] = useState(1000);

  const handleUpdateVirtualScroll = () => {
    performance.updateVirtualScroll({
      totalItems: itemCount,
      itemHeight: 100,
    });
  };

  const handleCacheData = () => {
    const mockData = { id: `item-${Date.now()}`, title: 'Cached Item', content: 'Test content' };
    performance.cachePost(`item-${Date.now()}`, mockData);
  };

  const handleClearCache = () => {
    performance.clearCache();
  };

  const cacheStats = performance.getCacheStats();
  const [visibleStart, visibleEnd] = performance.getVisibleItems();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Performance</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Virtual Scroll Items:</label>
          <input
            type="number"
            value={itemCount}
            onChange={(e) => setItemCount(parseInt(e.target.value) || 0)}
            className="border rounded px-3 py-1 w-32"
          />
          <button
            onClick={handleUpdateVirtualScroll}
            className="ml-2 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          >
            Update
          </button>
        </div>

        <div className="bg-gray-50 p-3 rounded">
          <h4 className="font-medium">Virtual Scroll Status:</h4>
          <p className="text-sm">Total Items: {performance.state.virtualScrolling.totalItems}</p>
          <p className="text-sm">Visible Range: {visibleStart} - {visibleEnd}</p>
          <p className="text-sm">Item Height: {performance.state.virtualScrolling.itemHeight}px</p>
        </div>

        <div>
          <div className="flex gap-2">
            <button
              onClick={handleCacheData}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Cache Test Data
            </button>
            <button
              onClick={handleClearCache}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Clear Cache
            </button>
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded">
          <h4 className="font-medium">Cache Stats:</h4>
          <p className="text-sm">Items: {cacheStats.itemCount}</p>
          <p className="text-sm">Hit Rate: {Math.round(cacheStats.hitRate * 100)}%</p>
          <p className="text-sm">Size: {Math.round(cacheStats.size / 1024)} KB</p>
        </div>
      </div>
    </div>
  );
}

function OfflineSyncDemo() {
  const { offlineSync } = useEnhancedState();
  const [isOnline, setIsOnline] = useState(true); // Default to true for SSR
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set client-side flag and initial online status
    setIsClient(true);
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleQueueAction = (priority: 'low' | 'medium' | 'high') => {
    offlineSync.queueAction(
      'CREATE_POST' as ActionType,
      { title: 'Offline Post', content: 'Created while testing' },
      priority
    );
  };

  const handleSyncActions = async () => {
    try {
      await offlineSync.syncActions();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handleClearQueue = () => {
    offlineSync.clearQueue();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Offline Sync</h2>
      
      <div className="space-y-4">
        <div className={`p-3 rounded ${isOnline ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={`font-medium ${isOnline ? 'text-green-800' : 'text-red-800'}`}>
            Status: {!isClient ? 'Loading...' : (isOnline ? 'Online' : 'Offline')}
          </p>
        </div>

        <div>
          <h4 className="font-medium mb-2">Queue Actions:</h4>
          <div className="flex gap-2">
            <button
              onClick={() => handleQueueAction('low')}
              className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
            >
              Low Priority
            </button>
            <button
              onClick={() => handleQueueAction('medium')}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
            >
              Medium Priority
            </button>
            <button
              onClick={() => handleQueueAction('high')}
              className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
            >
              High Priority
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSyncActions}
            disabled={offlineSync.state.syncStatus.isActive}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            {offlineSync.state.syncStatus.isActive ? 'Syncing...' : 'Sync Now'}
          </button>
          <button
            onClick={handleClearQueue}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Clear Queue
          </button>
        </div>

        <div className="bg-gray-50 p-3 rounded">
          <h4 className="font-medium">Queue Status:</h4>
          <p className="text-sm">Queued Actions: {offlineSync.getQueuedActionsCount()}</p>
          <p className="text-sm">Failed Actions: {offlineSync.getFailedActionsCount()}</p>
          <p className="text-sm">Sync Progress: {Math.round(offlineSync.state.syncStatus.progress)}%</p>
          <p className="text-sm">Estimated Time: {Math.round(offlineSync.estimateSyncTime() / 1000)}s</p>
        </div>
      </div>
    </div>
  );
}

function RealTimeDemo() {
  const { realTimeUpdate } = useEnhancedState();
  const [connectionId, setConnectionId] = useState<string>('');

  const handleConnect = async () => {
    try {
      // Mock WebSocket URL for demo
      const id = await realTimeUpdate.connect('ws://localhost:8080', ['posts', 'reactions']);
      setConnectionId(id);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleDisconnect = () => {
    if (connectionId) {
      realTimeUpdate.disconnect(connectionId);
      setConnectionId('');
    }
  };

  const handleSubscribe = () => {
    realTimeUpdate.subscribe('posts', [
      { field: 'type', operator: 'equals', value: 'NEW_POST' }
    ]);
  };

  const handleAddNotification = () => {
    realTimeUpdate.addNotification({
      type: 'mention' as any,
      title: 'Test Notification',
      message: 'This is a test notification',
      data: {},
      read: false,
      priority: 'medium' as any,
    });
  };

  const isConnected = realTimeUpdate.isConnected(connectionId);
  const unreadNotifications = realTimeUpdate.getUnreadNotifications();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Real-time Updates</h2>
      
      <div className="space-y-4">
        <div className={`p-3 rounded ${isConnected ? 'bg-green-50' : 'bg-gray-50'}`}>
          <p className={`font-medium ${isConnected ? 'text-green-800' : 'text-gray-800'}`}>
            Connection: {isConnected ? 'Connected' : 'Disconnected'}
          </p>
        </div>

        <div className="flex gap-2">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Connect
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Disconnect
            </button>
          )}
          <button
            onClick={handleSubscribe}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Subscribe to Posts
          </button>
        </div>

        <div>
          <button
            onClick={handleAddNotification}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Add Test Notification
          </button>
        </div>

        <div className="bg-gray-50 p-3 rounded">
          <h4 className="font-medium">Status:</h4>
          <p className="text-sm">Connections: {realTimeUpdate.state.connections.size}</p>
          <p className="text-sm">Subscriptions: {realTimeUpdate.state.subscriptions.size}</p>
          <p className="text-sm">Unread Notifications: {unreadNotifications.length}</p>
          <p className="text-sm">Total Notifications: {realTimeUpdate.state.notifications.length}</p>
        </div>
      </div>
    </div>
  );
}

function StateManagerDemo() {
  const [metrics, setMetrics] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);

  const handleGetMetrics = () => {
    const performanceMetrics = stateManager.getPerformanceMetrics();
    setMetrics(performanceMetrics);
  };

  const handleGetSyncStatus = () => {
    const status = stateManager.getSyncStatus();
    setSyncStatus(status);
  };

  const handleLogStates = () => {
    stateManager.logAllStates();
  };

  const handleClearCaches = () => {
    stateManager.clearAllCaches();
  };

  const handleForceSyncAll = async () => {
    try {
      await stateManager.forceSyncAll();
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-8">
      <h2 className="text-xl font-semibold mb-4">State Manager Utilities</h2>
      
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleGetMetrics}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Get Performance Metrics
          </button>
          <button
            onClick={handleGetSyncStatus}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Get Sync Status
          </button>
          <button
            onClick={handleLogStates}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Log All States
          </button>
          <button
            onClick={handleClearCaches}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
          >
            Clear All Caches
          </button>
          <button
            onClick={handleForceSyncAll}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Force Sync All
          </button>
        </div>

        {metrics && (
          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-medium mb-2">Performance Metrics:</h4>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(metrics, null, 2)}
            </pre>
          </div>
        )}

        {syncStatus && (
          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-medium mb-2">Sync Status:</h4>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(syncStatus, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default TestEnhancedStateManagement;