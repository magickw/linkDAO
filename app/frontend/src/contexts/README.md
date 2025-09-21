# Enhanced State Management System

This directory contains the advanced state management system for the social dashboard enhancements. It provides a comprehensive, scalable, and performant state management solution that supports all the advanced features required for the enhanced social platform.

## Overview

The Enhanced State Management System consists of six specialized contexts that work together to provide:

- **Content Creation**: Draft management, media uploads, validation, and auto-save
- **Engagement**: Token reactions, tips, social proof tracking, and animations
- **Reputation**: Badge system, achievements, progress tracking, and leaderboards
- **Performance**: Virtual scrolling, intelligent caching, and optimization
- **Offline Sync**: Action queuing, conflict resolution, and automatic synchronization
- **Real-time Updates**: WebSocket connections, live notifications, and subscriptions

## Architecture

```
EnhancedStateProvider
├── PerformanceProvider (outermost - provides caching and optimization)
├── OfflineSyncProvider (handles offline scenarios)
├── RealTimeUpdateProvider (manages live connections)
├── ReputationProvider (gamification and user progression)
├── EngagementProvider (social interactions)
└── ContentCreationProvider (innermost - content management)
```

## Quick Start

### Basic Usage

```tsx
import React from 'react';
import { EnhancedStateProvider, useEnhancedState } from './contexts';

function App() {
  return (
    <EnhancedStateProvider>
      <Dashboard />
    </EnhancedStateProvider>
  );
}

function Dashboard() {
  const {
    contentCreation,
    engagement,
    reputation,
    performance,
    offlineSync,
    realTimeUpdate
  } = useEnhancedState();

  // Use any of the context hooks
  const handleCreatePost = () => {
    const draftId = contentCreation.createDraft(ContentType.TEXT);
    contentCreation.updateDraft(draftId, { content: 'Hello World!' });
  };

  return (
    <div>
      <button onClick={handleCreatePost}>Create Post</button>
      {/* Your dashboard components */}
    </div>
  );
}
```

### Individual Context Usage

```tsx
import { ContentCreationProvider, useContentCreation } from './contexts';

function PostComposer() {
  const {
    state,
    createDraft,
    updateDraft,
    submitPost,
    validateContent
  } = useContentCreation();

  const handleSubmit = async () => {
    const draftId = createDraft(ContentType.TEXT);
    updateDraft(draftId, { content: 'My post content' });
    
    if (await validateContent(draftId)) {
      await submitPost(draftId);
    }
  };

  return (
    <div>
      <textarea onChange={(e) => updateDraft(draftId, { content: e.target.value })} />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
```

## Context Details

### 1. Content Creation Context

Manages draft creation, media uploads, and content validation.

**Key Features:**
- Auto-save drafts to localStorage
- Media upload with progress tracking
- Content validation and sanitization
- Support for multiple content types (text, media, polls, proposals)

**Usage:**
```tsx
const {
  createDraft,
  updateDraft,
  startMediaUpload,
  validateContent,
  submitPost
} = useContentCreation();
```

### 2. Engagement Context

Handles token-based reactions, tips, and social proof tracking.

**Key Features:**
- Token-weighted reactions (🔥🚀💎)
- Tip tracking and social proof
- Reaction animations
- Engagement score calculation

**Usage:**
```tsx
const {
  addReaction,
  addTip,
  getPostReactions,
  getUserEngagement
} = useEngagement();

// Add a fire reaction with 5 tokens
await addReaction('post123', ReactionType.FIRE, 5, currentUser);
```

### 3. Reputation Context

Manages user reputation, badges, achievements, and progress tracking.

**Key Features:**
- Multi-category reputation system
- Badge collection with rarity levels
- Achievement notifications
- Progress milestones and leaderboards

**Usage:**
```tsx
const {
  updateReputationScore,
  addBadge,
  unlockAchievement,
  getUserLevel
} = useReputation();

// Award reputation points
updateReputationScore(25, AchievementCategory.POSTING, 'Created a post');
```

### 4. Performance Context

Provides virtual scrolling, caching, and performance optimization.

**Key Features:**
- Virtual scrolling for large lists
- Intelligent caching with TTL
- Performance metrics tracking
- Memory optimization

**Usage:**
```tsx
const {
  updateVirtualScroll,
  cachePost,
  getCachedPost,
  getCacheStats
} = usePerformance();

// Cache a post for 5 minutes
cachePost('post123', postData, 300000);
```

### 5. Offline Sync Context

Manages offline scenarios with action queuing and synchronization.

**Key Features:**
- Automatic action queuing when offline
- Priority-based sync ordering
- Conflict resolution
- Retry mechanisms with exponential backoff

**Usage:**
```tsx
const {
  queueAction,
  syncActions,
  getQueuedActionsCount
} = useOfflineSync();

// Queue an action for later sync
queueAction(ActionType.CREATE_POST, postData, 'high');
```

### 6. Real-time Update Context

Handles WebSocket connections, subscriptions, and live notifications.

**Key Features:**
- WebSocket connection management
- Channel subscriptions with filters
- Real-time notifications
- Automatic reconnection

**Usage:**
```tsx
const {
  connect,
  subscribe,
  addNotification,
  getUnreadNotifications
} = useRealTimeUpdate();

// Connect and subscribe to updates
const connectionId = await connect('ws://localhost:8080');
subscribe('posts', [{ field: 'userId', operator: 'equals', value: currentUserId }]);
```

## Advanced Usage

### Configurable Provider

Use the configurable provider for selective feature enabling:

```tsx
import { ConfigurableEnhancedStateProvider } from './contexts';

const config = {
  enableContentCreation: true,
  enableEngagement: true,
  enableReputation: false, // Disable reputation system
  enablePerformance: true,
  enableOfflineSync: false, // Disable offline sync
  enableRealTimeUpdates: true,
};

function App() {
  return (
    <ConfigurableEnhancedStateProvider config={config}>
      <Dashboard />
    </ConfigurableEnhancedStateProvider>
  );
}
```

### Higher-Order Component

Use the HOC for easy integration:

```tsx
import { withEnhancedState } from './contexts';

const EnhancedDashboard = withEnhancedState(Dashboard);
```

### State Manager Utilities

Use the state manager for debugging and monitoring:

```tsx
import { stateManager } from './contexts';

// Debug current state
stateManager.logAllStates();

// Get performance metrics
const metrics = stateManager.getPerformanceMetrics();

// Force sync all queued actions
await stateManager.forceSyncAll();
```

## Performance Considerations

### Memory Management

The system includes several memory optimization features:

- **Cache Size Limits**: Automatic cache eviction when limits are reached
- **TTL-based Expiration**: Automatic cleanup of expired cache entries
- **LRU Eviction**: Least recently used items are removed first
- **Batch Processing**: Updates are batched to reduce re-renders

### Network Optimization

- **Request Deduplication**: Identical requests are deduplicated
- **Intelligent Preloading**: Content is preloaded based on user behavior
- **Offline-first**: Actions work offline and sync when connection returns
- **WebSocket Pooling**: Efficient connection management

### Rendering Performance

- **Virtual Scrolling**: Only visible items are rendered
- **Selective Updates**: Only changed components re-render
- **Animation Optimization**: 60fps animations with hardware acceleration
- **Lazy Loading**: Components load on demand

## Testing

The system includes comprehensive tests covering:

- Unit tests for each context
- Integration tests for cross-context interactions
- Performance tests for optimization features
- Offline scenario testing
- Real-time update testing

Run tests with:
```bash
npm test contexts/__tests__/EnhancedStateManagement.test.tsx
```

## Migration Guide

### From Basic State Management

1. Wrap your app with `EnhancedStateProvider`
2. Replace existing state hooks with enhanced context hooks
3. Update components to use new state structure
4. Add error boundaries for graceful degradation

### Gradual Adoption

Use the configurable provider to enable features incrementally:

```tsx
// Week 1: Enable content creation only
const config = { enableContentCreation: true };

// Week 2: Add engagement features
const config = { enableContentCreation: true, enableEngagement: true };

// Week 3: Add performance optimizations
const config = { 
  enableContentCreation: true, 
  enableEngagement: true, 
  enablePerformance: true 
};
```

## Troubleshooting

### Common Issues

1. **Context Not Available Error**
   - Ensure component is wrapped with appropriate provider
   - Check provider hierarchy order

2. **Performance Issues**
   - Enable virtual scrolling for large lists
   - Check cache hit rates with `getCacheStats()`
   - Monitor memory usage with performance metrics

3. **Offline Sync Problems**
   - Check network status with `state.isOnline`
   - Review queued actions with `getQueuedActionsCount()`
   - Force sync with `syncActions()`

4. **Real-time Connection Issues**
   - Verify WebSocket URL and connectivity
   - Check connection status with `getConnectionStatus()`
   - Review subscription filters

### Debug Mode

Enable debug logging in development:

```tsx
// In development environment
if (process.env.NODE_ENV === 'development') {
  stateManager.logAllStates();
}
```

## Contributing

When adding new features to the state management system:

1. Follow the existing context pattern
2. Add comprehensive TypeScript types
3. Include unit and integration tests
4. Update documentation
5. Consider performance implications
6. Add error handling and fallbacks

## API Reference

See individual context files for detailed API documentation:

- [ContentCreationContext.tsx](./ContentCreationContext.tsx)
- [EngagementContext.tsx](./EngagementContext.tsx)
- [ReputationContext.tsx](./ReputationContext.tsx)
- [PerformanceContext.tsx](./PerformanceContext.tsx)
- [OfflineSyncContext.tsx](./OfflineSyncContext.tsx)
- [RealTimeUpdateContext.tsx](./RealTimeUpdateContext.tsx)
- [types.ts](./types.ts) - Complete type definitions