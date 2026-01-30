# Chat Messaging & Notification System - Migration Guide

## Overview
This document outlines the migration from the fragmented notification system to the new unified approach with consolidated WebSocket connections.

## Changes Implemented

### 1. Consolidated WebSocket Connection (`useConsolidatedWebSocket.ts`)
- **Purpose**: Eliminates duplicate WebSocket connections across the application
- **Features**:
  - Single shared WebSocket instance using reference counting
  - Automatic connection management with proper cleanup
  - Event listener consolidation
  - Reconnection handling with exponential backoff
  - Connection state monitoring

### 2. Unified Notification Manager (`unifiedNotificationManager.ts`)
- **Purpose**: Single point of control for all notification types
- **Features**:
  - Supports chat, system, order, and support notifications
  - Per-conversation notification settings
  - Global notification preferences
  - Do Not Disturb scheduling
  - Browser notification integration
  - Sound and vibration controls
  - Priority-based notification handling

### 3. Notification Preferences UI (`NotificationPreferencesDialog.tsx`)
- **Purpose**: User-friendly interface for notification customization
- **Features**:
  - Per-conversation mute/do-not-disturb settings
  - Global notification preferences
  - Quick DND presets (30min, 1hr, 2hr, 24hr)
  - Category-based muting
  - Real-time preference updates

### 4. Backward Compatibility Layer (`ChatNotificationContext.tsx`)
- **Purpose**: Maintains existing API while migrating to new system
- **Features**:
  - Wraps unified notification system
  - Provides same interface as original context
  - Seamless migration path for existing components

## Migration Steps

### Step 1: Update WebSocket Usage
Replace direct `socket.io-client` imports with the consolidated hook:

```typescript
// OLD WAY (creates duplicate connections)
import { io } from 'socket.io-client';
const socket = io(WS_URL);

// NEW WAY (uses consolidated connection)
import { useConsolidatedWebSocket } from '@/hooks/useConsolidatedWebSocket';
const { socket, isConnected, addEventListener } = useConsolidatedWebSocket();
```

### Step 2: Update Notification Usage
Replace direct notification management with unified system:

```typescript
// OLD WAY
import { useChatNotifications } from '@/contexts/ChatNotificationContext';
const { notifications, addNotification } = useChatNotifications();

// NEW WAY
import { useNotifications } from '@/services/unifiedNotificationManager';
const { notifications, addNotification } = useNotifications();
```

### Step 3: Add Notification Preferences
Integrate the preferences dialog in conversation headers:

```typescript
import { NotificationPreferencesDialog } from '@/components/NotificationPreferencesDialog';

// In your conversation component
<NotificationPreferencesDialog 
  conversationId={conversationId}
  conversationName={conversationName}
>
  <Button variant="ghost" size="sm">
    <Settings className="w-4 h-4" />
  </Button>
</NotificationPreferencesDialog>
```

## Benefits of Migration

### Performance Improvements
- **Reduced Connections**: Single WebSocket instead of multiple duplicate connections
- **Memory Efficiency**: Shared event listeners and connection state
- **Bandwidth Savings**: Eliminates redundant authentication and subscription requests

### User Experience Enhancements
- **Granular Control**: Per-conversation notification settings
- **Consistent Behavior**: Unified notification handling across all app areas
- **Better Organization**: Centralized notification management

### Developer Experience
- **Simplified API**: Single hook for all WebSocket and notification needs
- **Type Safety**: Strong TypeScript support with comprehensive interfaces
- **Maintainability**: Reduced code duplication and clearer architecture

## Testing Checklist

- [ ] WebSocket connects only once across multiple components
- [ ] Chat notifications still appear correctly
- [ ] Notification preferences persist between sessions
- [ ] Per-conversation settings work as expected
- [ ] Do Not Disturb functionality operates correctly
- [ ] Browser notifications show with proper icons and sounds
- [ ] Existing components using old API continue to work
- [ ] No console errors or warnings about duplicate connections

## Rollback Plan

If issues arise, you can rollback by:
1. Temporarily re-enable the original `webSocketService.ts`
2. Revert to the original `ChatNotificationContext.tsx`
3. Remove imports of new consolidated components
4. Restore original notification handling logic

The backward compatibility layer ensures a smooth transition period.