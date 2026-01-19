# Chat System Technical Documentation

## Overview

The LinkDAO chat system is a comprehensive real-time messaging platform with support for direct messages, group conversations, and live customer support. The system is built on a unified architecture that consolidates all messaging functionality into a single, coherent service.

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                           │
├─────────────────────────────────────────────────────────────┤
│  Components          Hooks              Services            │
│  - MessagingInterface - useUnifiedMessaging - unifiedMessagingService │
│  - ConversationView   - useLiveChat        - liveChatService       │
│  - MessageItem        - useChatHistory     - messageEncryptionService │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Communication Layer                        │
├─────────────────────────────────────────────────────────────┤
│  REST API           WebSocket/Socket.io    IndexedDB Cache  │
│  - CRUD operations  - Real-time updates    - Offline-first  │
│  - Pagination       - Presence tracking    - Sync management│
│  - Search           - Typing indicators    - Message queue  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Backend Layer                            │
├─────────────────────────────────────────────────────────────┤
│  Services                Routes              Database        │
│  - messagingService      - compatibilityChat - PostgreSQL   │
│  - liveChatSocketService - messagingRoutes   - Drizzle ORM  │
│  - webSocketService      - conversationRoutes│              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Message Send Flow**
   ```
   User Input → Component → Hook → unifiedMessagingService
        ↓
   Optimistic Update (immediate UI feedback)
        ↓
   POST /api/messaging/conversations/{id}/messages
        ↓
   Backend Processing → Database Insert
        ↓
   WebSocket Broadcast → Real-time Update
        ↓
   Replace Optimistic Message with Real Message
   ```

2. **Message Receive Flow**
   ```
   WebSocket Event → unifiedMessagingService.handleWebSocketMessage()
        ↓
   Update In-Memory Cache
        ↓
   Persist to IndexedDB
        ↓
   Emit 'message_received' Event
        ↓
   Hook Listeners → Component Re-render
   ```

## Core Services

### UnifiedMessagingService

**Location:** `/app/frontend/src/services/unifiedMessagingService.ts`

**Purpose:** Single source of truth for all messaging operations. Consolidates functionality from deprecated services (chatHistoryService, conversationService, conversationManagementService).

**Key Features:**
- Backend API as source of truth
- IndexedDB for caching
- WebSocket for real-time updates
- Offline support with queue management
- Event-driven architecture

**API Methods:**

#### Conversations
- `getConversations(options)` - List user conversations with pagination
- `getConversation(conversationId)` - Get single conversation details
- `getOrCreateDMConversation(participantAddress)` - Create/fetch 1:1 chat
- `createGroupConversation(params)` - Create group chat
- `searchConversations(query, filter)` - Search conversations
- `archiveConversation(conversationId)` - Archive conversation
- `unarchiveConversation(conversationId)` - Unarchive conversation
- `deleteConversation(conversationId, deleteForEveryone)` - Delete conversation
- `toggleConversationPin(conversationId, isPinned)` - Pin/unpin conversation
- `toggleConversationMute(conversationId, isMuted, muteUntil)` - Mute/unmute
- `updateConversationSettings(conversationId, settings)` - Update settings
- `getConversationSettings(conversationId)` - Get settings
- `setConversationTitle(conversationId, title)` - Set custom title
- `clearConversationHistory(conversationId)` - Clear messages
- `exportConversation(conversationId, format)` - Export to JSON/TXT/PDF

#### Messages
- `getMessages(conversationId, options)` - Fetch messages with pagination
- `sendMessage(params)` - Send new message
- `editMessage(messageId, conversationId, newContent)` - Edit message
- `deleteMessage(messageId, conversationId)` - Delete message
- `markAsRead(conversationId, messageIds)` - Mark as read
- `searchMessages(searchQuery)` - Search messages across conversations

#### Reactions
- `addReaction(messageId, emoji)` - Add emoji reaction
- `removeReaction(messageId, emoji)` - Remove reaction
- `getReactions(messageId)` - Get all reactions

#### Message Threading
- `pinMessage(messageId)` - Pin message to conversation
- `unpinMessage(messageId)` - Unpin message
- `getPinnedMessages(conversationId)` - Get pinned messages
- `getMessageThread(messageId)` - Get message thread (replies)
- `replyToMessage(params)` - Reply to specific message

#### User Management
- `blockUser(userAddress, reason)` - Block user
- `unblockUser(userAddress)` - Unblock user
- `getBlockedUsers()` - Get blocked users list
- `addParticipant(conversationId, userAddress)` - Add to group
- `removeParticipant(conversationId, userAddress)` - Remove from group
- `leaveConversation(conversationId)` - Leave group

#### Attachments
- `uploadAttachment(file)` - Upload file/image

#### Events
- `on(event, callback)` - Subscribe to events
- `off(event, callback)` - Unsubscribe from events

**Event Types:**
- `message_received` - New message from another user
- `message_sent` - Message successfully sent
- `message_deleted` - Message deleted
- `message_edited` - Message edited
- `conversation_created` - New conversation
- `conversation_updated` - Conversation metadata changed
- `typing_start` - User started typing
- `typing_stop` - User stopped typing
- `read_receipt` - Message marked as read
- `presence_update` - User online/offline status
- `reaction_added` - Reaction added to message
- `reaction_removed` - Reaction removed
- `sync_complete` - Cache sync completed
- `connection_change` - Connection status changed

### LiveChatService

**Location:** `/app/frontend/src/services/liveChatService.ts`

**Purpose:** Customer support live chat functionality with queue management.

**Features:**
- Socket.io connection to `/chat/user` namespace
- Session management
- Agent queue system
- Typing indicators
- Connection status tracking

**Methods:**
- `connect()` - Establish WebSocket connection
- `disconnect()` - Close connection
- `initiateChat()` - Start new support session
- `sendMessage(message)` - Send message to agent
- `on(event, handler)` - Subscribe to events

### MessageEncryptionService

**Location:** `/app/frontend/src/services/messageEncryptionService.ts`

**Purpose:** End-to-end encryption for messages.

**Features:**
- RSA-OAEP 2048-bit encryption
- Key generation and storage in IndexedDB
- Public key exchange
- Message encryption/decryption

**Methods:**
- `generateKeyPair()` - Generate RSA key pair
- `exportPublicKey()` - Export public key as base64
- `importPublicKey(publicKey)` - Import recipient's public key
- `encryptMessage(message, recipientPublicKey)` - Encrypt message
- `decryptMessage(encryptedMessage)` - Decrypt message

## Database Schema

### PostgreSQL Tables

#### conversations
- `id` (UUID, PK) - Conversation identifier
- `participants` (JSONB) - Array of wallet addresses
- `lastMessageId` (UUID) - Reference to last message
- `lastActivity` (timestamp) - Last message time
- `unreadCount` (integer) - Unread message count
- `conversationType` (string) - 'general', 'marketplace', 'group', etc.
- `status` (string) - 'active', 'archived', 'closed'
- `channelName` (string) - For group/channel conversations
- `isChannel` (boolean) - Is this a channel?
- `orderId`, `productId`, `listingId` - Marketplace context

**Indexes:**
- `idx_conversations_participants` on participants (GIN index)
- `idx_conversations_last_activity` on lastActivity
- `idx_conversations_status` on status

#### chatMessages
- `id` (UUID, PK) - Message identifier
- `conversationId` (UUID, FK) - Parent conversation
- `senderAddress` (string) - Sender wallet address
- `content` (text) - Message content
- `messageType` (string) - 'text', 'image', 'file', 'post_share', 'voice'
- `encryptionMetadata` (JSONB) - Encryption info
- `replyToId` (UUID, FK) - Parent message for threading
- `attachments` (JSONB) - File attachments
- `isPinned` (boolean) - Is message pinned?
- `pinnedBy` (string) - Who pinned it
- `pinnedAt` (timestamp) - When pinned
- `sentAt` (timestamp) - Send time
- `editedAt` (timestamp) - Last edit time
- `deletedAt` (timestamp) - Soft delete time
- `hiddenBy` (JSONB) - Users who hid message
- `deliveryStatus` (string) - 'sent', 'delivered', 'read'

**Indexes:**
- `idx_messages_conversation` on conversationId
- `idx_messages_sender` on senderAddress
- `idx_messages_sent_at` on sentAt
- `idx_messages_reply_to` on replyToId

#### messageReactions
- `id` (UUID, PK)
- `messageId` (UUID, FK)
- `userAddress` (string) - Who reacted
- `emoji` (string) - Emoji character
- Unique: (messageId, userAddress, emoji)

#### messageReadStatus
- `messageId` (UUID, FK)
- `userAddress` (string)
- `readAt` (timestamp)
- PK: (messageId, userAddress)

#### blockedUsers
- `blockerAddress` (string)
- `blockedAddress` (string)
- `reason` (text)
- PK: (blockerAddress, blockedAddress)

#### typingIndicators
- `conversationId` (UUID, FK)
- `userAddress` (string)
- `startedAt` (timestamp)
- PK: (conversationId, userAddress)

#### userPresence
- `userAddress` (string, PK)
- `status` (string) - 'online', 'away', 'busy', 'offline'
- `lastSeen` (timestamp)
- `currentConversationId` (UUID, FK)
- `deviceInfo` (JSONB)

#### conversationParticipants
- `id` (UUID, PK)
- `conversationId` (UUID, FK)
- `walletAddress` (string)
- `role` (string) - 'member', 'moderator', 'admin'
- `joinedAt` (timestamp)
- `leftAt` (timestamp)
- `lastReadAt` (timestamp)
- `isMuted` (boolean)
- `notificationsEnabled` (boolean)

### IndexedDB Schema

**Database:** `linkdao_messaging_cache` (v2)

**Stores:**
1. **conversations** - Cached conversation list
2. **messages** - Cached messages by conversation
3. **settings** - User preferences
4. **sync_status** - Sync metadata per conversation

**Cache Strategy:**
- TTL: 5 minutes
- Stale-while-revalidate: 30 seconds
- Max messages per conversation: 100

## Frontend Components

### MessagingInterface
**Path:** `/app/frontend/src/components/Messaging/MessagingInterface.tsx`

Main messaging UI container with conversation list and message view.

### ConversationView
**Path:** `/app/frontend/src/components/Messaging/ConversationView.tsx`

Message thread display with infinite scroll, typing indicators, and real-time updates.

### MessageItem
**Path:** `/app/frontend/src/components/Messaging/MessageItem.tsx`

Individual message display with reactions, editing, deletion, threading.

### ConversationSettingsModal
**Path:** `/app/frontend/src/components/Messaging/ConversationSettingsModal.tsx`

Settings panel for muting, archiving, pinning, deleting conversations.

### ConversationSearchModal
**Path:** `/app/frontend/src/components/Messaging/ConversationSearchModal.tsx`

Search UI for finding conversations and messages.

### GroupCreationWizard
**Path:** `/app/frontend/src/components/Messaging/GroupCreationWizard.tsx`

Multi-step form for creating group conversations.

## Hooks

### useUnifiedMessaging
**Path:** `/app/frontend/src/hooks/useUnifiedMessaging.ts`

Primary hook for accessing messaging functionality.

**Returns:**
- `conversations` - List of conversations
- `selectedConversation` - Currently active conversation
- `messages` - Messages for selected conversation
- `loading` - Loading states
- `sendMessage()` - Send message function
- `loadMore()` - Load more messages
- `searchConversations()` - Search function
- Event subscriptions

**Sub-hooks:**
- `useConversationMessages(conversationId)` - Messages for specific conversation
- `useTypingIndicator(conversationId)` - Typing indicator management

### useLiveChat
**Path:** `/app/frontend/src/hooks/useLiveChat.ts`

Hook for customer support chat.

**Returns:**
- `messages` - Chat messages
- `status` - Connection status
- `isConnected` - Boolean connection state
- `queuePosition` - Position in agent queue
- `agentName` - Connected agent name
- `sendMessage()` - Send message to agent

## Performance Optimizations

### Caching Strategy
1. **In-Memory Cache:** Map-based caches for conversations and messages
2. **IndexedDB Cache:** Persistent cache with TTL
3. **Stale-While-Revalidate:** Serve cached data while fetching fresh data
4. **Background Sync:** Periodic sync without blocking UI

### Pagination
- Cursor-based pagination for messages
- Virtual scrolling for long conversation lists
- Lazy loading of attachments
- Incremental search results

### Optimistic Updates
- Immediate UI feedback for user actions
- Temporary IDs for pending messages
- Automatic replacement when backend confirms
- Rollback on error

### Connection Management
- Automatic reconnection with exponential backoff
- WebSocket heartbeat (30s interval)
- Fallback to polling if WebSocket fails
- Offline queue for failed operations

## Security Features

### Encryption
- End-to-end encryption option for sensitive conversations
- RSA-OAEP 2048-bit encryption
- Keys stored securely in IndexedDB
- Public key exchange mechanism

### Authentication
- JWT token-based auth
- Token refresh handling
- Session validation
- Role-based access control

### Input Sanitization
- XSS protection via input sanitization
- SQL injection prevention (Drizzle ORM)
- File upload validation
- Content-Security-Policy headers

### Privacy
- Signed URLs for attachments (15min expiration)
- Access count limits
- Per-user message hiding (soft delete)
- Block/unblock functionality

## Error Handling

### Network Errors
- Automatic retry with exponential backoff
- Fallback to cached data
- User-friendly error messages
- Connection status indicators

### Offline Support
- OfflineManager queues failed operations
- Automatic retry when connection restored
- Priority-based queue (high/medium/low)
- Max 5 retries per operation

### Validation
- Client-side validation before API calls
- Backend validation and error responses
- Type checking via TypeScript
- Schema validation for database operations

## Testing

### Unit Tests
**Location:** `/app/frontend/src/services/__tests__/`

- `unifiedMessagingService.test.ts` - Comprehensive service tests
- `messageEncryptionService.test.ts` - Encryption tests
- `messageAttachmentHandler.test.ts` - Attachment handling tests

### Integration Tests
- Component integration tests
- Hook integration tests
- End-to-end messaging flow tests

### Test Coverage Goals
- Services: 80%+
- Components: 70%+
- Hooks: 75%+
- Critical paths: 100%

## Deployment Considerations

### Environment Variables
```
NEXT_PUBLIC_BACKEND_URL - Backend API URL
NEXT_PUBLIC_WS_URL - WebSocket server URL
```

### Backend Configuration
- Socket.io max connections: 1000
- Memory threshold: 400MB
- Message queue limit: 50 per user
- Connection timeout: 60s
- Heartbeat interval: 30s

### Database Optimization
- Appropriate indexes on frequently queried columns
- Regular VACUUM and ANALYZE
- Connection pooling
- Query result caching

## Migration Guide

### From Deprecated Services

**Old (chatHistoryService):**
```typescript
import { chatHistoryService } from '@/services/chatHistoryService';
const messages = await chatHistoryService.getChatHistory({ conversationId });
```

**New (unifiedMessagingService):**
```typescript
import { unifiedMessagingService } from '@/services/unifiedMessagingService';
const { messages } = await unifiedMessagingService.getMessages(conversationId);
```

**Old (ConversationManagementService):**
```typescript
import { ConversationManagementService } from '@/services/conversationManagementService';
const service = ConversationManagementService.getInstance();
await service.searchConversations(query);
```

**New (unifiedMessagingService):**
```typescript
import { unifiedMessagingService } from '@/services/unifiedMessagingService';
await unifiedMessagingService.searchConversations(query);
```

## Future Enhancements

### Planned Features
1. Voice/video calling integration
2. Message translation
3. Rich text formatting (markdown)
4. Scheduled messages
5. Message templates
6. Advanced search filters
7. Analytics and insights
8. Message retention policies
9. Conversation export automation
10. Multi-device sync improvements

### Technical Debt
1. ~~Remove deprecated services~~ (Completed)
2. ~~Consolidate to unified architecture~~ (Completed)
3. Add comprehensive E2E tests
4. Improve error boundary coverage
5. Enhance accessibility (WCAG 2.1 AA)
6. Performance profiling and optimization
7. Bundle size optimization

## Support and Troubleshooting

### Common Issues

**Messages not loading:**
- Check network connectivity
- Verify authentication token
- Check browser console for errors
- Clear IndexedDB cache

**WebSocket connection fails:**
- Verify WebSocket URL in environment variables
- Check firewall/proxy settings
- Falls back to polling automatically

**Search not working:**
- Verify backend search endpoints are deployed
- Check for sufficient database indexes
- Review search query syntax

### Debug Mode
Enable debug logging:
```typescript
localStorage.setItem('DEBUG_MESSAGING', 'true');
```

### Performance Monitoring
- Monitor bundle size with webpack-bundle-analyzer
- Track API response times
- Monitor WebSocket connection stability
- Track cache hit/miss rates

## API Reference

See individual service files for detailed API documentation:
- `/app/frontend/src/services/unifiedMessagingService.ts`
- `/app/backend/src/services/messagingService.ts`
- `/app/backend/src/routes/compatibilityChat.ts`

## Contributing

When adding new features:
1. Update this documentation
2. Add comprehensive tests
3. Follow existing patterns
4. Use TypeScript strictly
5. Handle errors gracefully
6. Support offline mode
7. Emit appropriate events
8. Update cache appropriately
