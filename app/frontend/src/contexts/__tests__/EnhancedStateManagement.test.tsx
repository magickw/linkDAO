import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { 
  EnhancedStateProvider,
  useEnhancedState,
  ConfigurableEnhancedStateProvider,
  withEnhancedState,
  stateManager
} from '../EnhancedStateProvider';
import { 
  useContentCreation,
  ContentCreationProvider 
} from '../ContentCreationContext';
import { 
  useEngagement,
  EngagementProvider 
} from '../EngagementContext';
import { 
  useReputation,
  ReputationProvider 
} from '../ReputationContext';
import { 
  usePerformance,
  PerformanceProvider 
} from '../PerformanceContext';
import { 
  useOfflineSync,
  OfflineSyncProvider 
} from '../OfflineSyncContext';
import { 
  useRealTimeUpdate,
  RealTimeUpdateProvider 
} from '../RealTimeUpdateContext';
import { ContentType, ReactionType, AchievementCategory, ActionType } from '../types';

// Mock WebSocket for real-time updates
global.WebSocket = jest.fn().mockImplementation(() => ({
  readyState: 1,
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('Enhanced State Management System', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('EnhancedStateProvider', () => {
    it('should provide all context hooks', () => {
      const TestComponent = () => {
        const state = useEnhancedState();
        
        expect(state.contentCreation).toBeDefined();
        expect(state.engagement).toBeDefined();
        expect(state.reputation).toBeDefined();
        expect(state.performance).toBeDefined();
        expect(state.offlineSync).toBeDefined();
        expect(state.realTimeUpdate).toBeDefined();
        
        return <div>Test Component</div>;
      };

      render(
        <EnhancedStateProvider>
          <TestComponent />
        </EnhancedStateProvider>
      );
    });

    it('should work with HOC wrapper', () => {
      const TestComponent = () => <div>Wrapped Component</div>;
      const WrappedComponent = withEnhancedState(TestComponent);

      render(<WrappedComponent />);
      expect(screen.getByText('Wrapped Component')).toBeInTheDocument();
    });
  });

  describe('ContentCreationContext', () => {
    it('should create and manage drafts', () => {
      const { result } = renderHook(() => useContentCreation(), {
        wrapper: ContentCreationProvider,
      });

      act(() => {
        const draftId = result.current.createDraft(ContentType.TEXT);
        expect(result.current.state.drafts.size).toBe(1);
        
        result.current.updateDraft(draftId, { content: 'Test content' });
        const draft = result.current.getDraft(draftId);
        expect(draft?.content).toBe('Test content');
      });
    });

    it('should handle media uploads', () => {
      const { result } = renderHook(() => useContentCreation(), {
        wrapper: ContentCreationProvider,
      });

      act(() => {
        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const uploadId = result.current.startMediaUpload(file);
        
        expect(result.current.state.mediaUploads.size).toBe(1);
        
        const upload = result.current.getMediaUpload(uploadId);
        expect(upload?.file).toBe(file);
        expect(upload?.status).toBe('pending');
      });
    });

    it('should validate content', async () => {
      const { result } = renderHook(() => useContentCreation(), {
        wrapper: ContentCreationProvider,
      });

      await act(async () => {
        const draftId = result.current.createDraft(ContentType.TEXT);
        
        // Empty content should fail validation
        const isValid = await result.current.validateContent(draftId);
        expect(isValid).toBe(false);
        expect(result.current.state.validationErrors.length).toBeGreaterThan(0);
        
        // Valid content should pass
        result.current.updateDraft(draftId, { content: 'Valid content' });
        const isValidNow = await result.current.validateContent(draftId);
        expect(isValidNow).toBe(true);
      });
    });
  });

  describe('EngagementContext', () => {
    it('should handle token reactions', async () => {
      const { result } = renderHook(() => useEngagement(), {
        wrapper: EngagementProvider,
      });

      const mockUser = {
        id: 'user1',
        username: 'testuser',
        avatar: 'avatar.jpg',
        reputation: 100,
      };

      await act(async () => {
        await result.current.addReaction('post1', ReactionType.FIRE, 5, mockUser);
        
        const reactions = result.current.getPostReactions('post1');
        expect(reactions?.reactions.length).toBe(1);
        expect(reactions?.totalValue).toBe(5);
        expect(reactions?.userReaction?.type).toBe(ReactionType.FIRE);
      });
    });

    it('should track user engagement', async () => {
      const { result } = renderHook(() => useEngagement(), {
        wrapper: EngagementProvider,
      });

      const mockUser = {
        id: 'user1',
        username: 'testuser',
        avatar: 'avatar.jpg',
        reputation: 100,
      };

      await act(async () => {
        await result.current.addReaction('post1', ReactionType.ROCKET, 10, mockUser);
        await result.current.addTip('post1', 25, 'LDAO', 'Great post!');
        
        const engagement = result.current.getUserEngagement();
        expect(engagement.totalReactionsGiven).toBe(1);
        expect(engagement.totalTipsGiven).toBe(1);
        expect(engagement.engagementScore).toBe(35); // 10 + 25
      });
    });
  });

  describe('ReputationContext', () => {
    it('should update reputation scores', () => {
      const { result } = renderHook(() => useReputation(), {
        wrapper: ReputationProvider,
      });

      act(() => {
        result.current.updateReputationScore(50, AchievementCategory.POSTING, 'Created a post');
        
        const level = result.current.getUserLevel();
        expect(level.level).toBe(1); // Still at level 1 with 50 points
        
        result.current.updateReputationScore(75, AchievementCategory.COMMUNITY, 'Joined community');
        
        const newLevel = result.current.getUserLevel();
        expect(newLevel.level).toBe(2); // Should be level 2 with 125 points
      });
    });

    it('should manage badges and achievements', () => {
      const { result } = renderHook(() => useReputation(), {
        wrapper: ReputationProvider,
      });

      const mockBadge = {
        id: 'badge1',
        name: 'Early Adopter',
        description: 'One of the first users',
        icon: '🌟',
        rarity: 'rare' as const,
        earnedAt: new Date(),
        requirements: [],
      };

      act(() => {
        result.current.addBadge(mockBadge);
        
        expect(result.current.state.badges.length).toBe(1);
        expect(result.current.state.notifications.length).toBe(1);
        
        const rareBadges = result.current.getBadgesByRarity('rare');
        expect(rareBadges.length).toBe(1);
      });
    });
  });

  describe('PerformanceContext', () => {
    it('should manage virtual scrolling', () => {
      const { result } = renderHook(() => usePerformance(), {
        wrapper: PerformanceProvider,
      });

      act(() => {
        result.current.updateVirtualScroll({
          totalItems: 1000,
          itemHeight: 150,
        });
        
        result.current.setScrollPosition(1500, true);
        
        const [start, end] = result.current.getVisibleItems();
        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeLessThan(1000);
        expect(result.current.isItemVisible(start)).toBe(true);
      });
    });

    it('should cache data efficiently', () => {
      const { result } = renderHook(() => usePerformance(), {
        wrapper: PerformanceProvider,
      });

      const mockPost = { id: 'post1', title: 'Test Post', content: 'Content' };

      act(() => {
        result.current.cachePost('post1', mockPost);
        
        const cachedPost = result.current.getCachedPost('post1');
        expect(cachedPost).toEqual(mockPost);
        
        const stats = result.current.getCacheStats();
        expect(stats.itemCount).toBe(1);
      });
    });
  });

  describe('OfflineSyncContext', () => {
    it('should queue actions when offline', () => {
      const { result } = renderHook(() => useOfflineSync(), {
        wrapper: OfflineSyncProvider,
      });

      act(() => {
        // Simulate going offline
        Object.defineProperty(navigator, 'onLine', { value: false });
        window.dispatchEvent(new Event('offline'));
        
        const actionId = result.current.queueAction(
          ActionType.CREATE_POST,
          { title: 'Offline Post', content: 'Created while offline' },
          'high'
        );
        
        expect(result.current.getQueuedActionsCount()).toBe(1);
        expect(result.current.isActionQueued(ActionType.CREATE_POST, { 
          title: 'Offline Post', 
          content: 'Created while offline' 
        })).toBe(true);
      });
    });

    it('should sync actions when coming back online', async () => {
      const { result } = renderHook(() => useOfflineSync(), {
        wrapper: OfflineSyncProvider,
      });

      await act(async () => {
        // Queue an action while offline
        Object.defineProperty(navigator, 'onLine', { value: false });
        result.current.queueAction(ActionType.REACT_TO_POST, { postId: 'post1', reaction: 'fire' });
        
        expect(result.current.getQueuedActionsCount()).toBe(1);
        
        // Come back online and sync
        Object.defineProperty(navigator, 'onLine', { value: true });
        window.dispatchEvent(new Event('online'));
        
        await result.current.syncActions();
        
        // Action should be processed (mocked to succeed)
        expect(result.current.getQueuedActionsCount()).toBe(0);
      });
    });
  });

  describe('RealTimeUpdateContext', () => {
    it('should manage WebSocket connections', async () => {
      const { result } = renderHook(() => useRealTimeUpdate(), {
        wrapper: RealTimeUpdateProvider,
      });

      await act(async () => {
        const connectionId = await result.current.connect('ws://localhost:8080', ['posts', 'reactions']);
        
        expect(result.current.isConnected(connectionId)).toBe(true);
        
        const status = result.current.getConnectionStatus(connectionId);
        expect(status?.url).toBe('ws://localhost:8080');
      });
    });

    it('should handle subscriptions and updates', () => {
      const { result } = renderHook(() => useRealTimeUpdate(), {
        wrapper: RealTimeUpdateProvider,
      });

      const mockCallback = jest.fn();

      act(() => {
        const subscriptionId = result.current.subscribe('posts', [], mockCallback);
        
        expect(result.current.state.subscriptions.size).toBe(1);
        
        result.current.unsubscribe(subscriptionId);
        
        expect(result.current.state.subscriptions.size).toBe(0);
      });
    });
  });

  describe('ConfigurableEnhancedStateProvider', () => {
    it('should selectively enable features', () => {
      const config = {
        enableContentCreation: true,
        enableEngagement: false,
        enableReputation: true,
        enablePerformance: false,
        enableOfflineSync: false,
        enableRealTimeUpdates: false,
      };

      const TestComponent = () => {
        try {
          const { contentCreation } = useEnhancedState();
          return <div>Content Creation Available</div>;
        } catch {
          return <div>Content Creation Not Available</div>;
        }
      };

      render(
        <ConfigurableEnhancedStateProvider config={config}>
          <TestComponent />
        </ConfigurableEnhancedStateProvider>
      );

      expect(screen.getByText('Content Creation Available')).toBeInTheDocument();
    });
  });

  describe('StateManager', () => {
    it('should provide utility methods', () => {
      expect(stateManager).toBeDefined();
      expect(typeof stateManager.logAllStates).toBe('function');
      expect(typeof stateManager.getPerformanceMetrics).toBe('function');
      expect(typeof stateManager.getSyncStatus).toBe('function');
      expect(typeof stateManager.clearAllCaches).toBe('function');
      expect(typeof stateManager.forceSyncAll).toBe('function');
    });
  });

  describe('Integration Tests', () => {
    it('should work with all contexts together', async () => {
      const TestComponent = () => {
        const {
          contentCreation,
          engagement,
          reputation,
          performance,
          offlineSync,
          realTimeUpdate,
        } = useEnhancedState();

        React.useEffect(() => {
          // Create a draft
          const draftId = contentCreation.createDraft(ContentType.TEXT);
          contentCreation.updateDraft(draftId, { content: 'Integration test post' });

          // Add reputation points
          reputation.updateReputationScore(25, AchievementCategory.POSTING, 'Created post');

          // Cache some data
          performance.cachePost('post1', { id: 'post1', content: 'Cached post' });

          // Queue an offline action
          offlineSync.queueAction(ActionType.CREATE_POST, { content: 'Queued post' });

          // Subscribe to real-time updates
          realTimeUpdate.subscribe('posts');
        }, []);

        return (
          <div>
            <div>Drafts: {contentCreation.state.drafts.size}</div>
            <div>Reputation: {reputation.state.userReputation.totalScore}</div>
            <div>Cache Items: {performance.getCacheStats().itemCount}</div>
            <div>Queued Actions: {offlineSync.getQueuedActionsCount()}</div>
            <div>Subscriptions: {realTimeUpdate.state.subscriptions.size}</div>
          </div>
        );
      };

      render(
        <EnhancedStateProvider>
          <TestComponent />
        </EnhancedStateProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Drafts: 1')).toBeInTheDocument();
        expect(screen.getByText('Reputation: 25')).toBeInTheDocument();
        expect(screen.getByText('Cache Items: 1')).toBeInTheDocument();
        expect(screen.getByText('Queued Actions: 1')).toBeInTheDocument();
        expect(screen.getByText('Subscriptions: 1')).toBeInTheDocument();
      });
    });

    it('should persist and restore state correctly', () => {
      const { result: result1 } = renderHook(() => useContentCreation(), {
        wrapper: ContentCreationProvider,
      });

      // Create a draft
      act(() => {
        const draftId = result1.current.createDraft(ContentType.TEXT);
        result1.current.updateDraft(draftId, { content: 'Persistent draft' });
      });

      expect(result1.current.state.drafts.size).toBe(1);

      // Simulate app restart by creating new hook instance
      const { result: result2 } = renderHook(() => useContentCreation(), {
        wrapper: ContentCreationProvider,
      });

      // Should restore from localStorage
      waitFor(() => {
        expect(result2.current.state.drafts.size).toBe(1);
        const drafts = result2.current.getAllDrafts();
        expect(drafts[0].content).toBe('Persistent draft');
      });
    });
  });
});