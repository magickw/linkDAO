import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { messagingController } from '../controllers/messagingController';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';
import { uploadMessageAttachment, uploadVoiceMessage, handleMulterError } from '../middleware/uploadMiddleware';

const router = express.Router();

// Apply authentication middleware to all messaging routes
router.use(authMiddleware);

// Apply rate limiting
router.use(rateLimitingMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 300, // limit each IP to 300 requests per windowMs for messaging
  message: 'Too many messaging requests from this IP'
}));

// Get user's conversations
router.get('/conversations',
  validateRequest({
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 50 },
      search: { type: 'string', optional: true }
    }
  }),
  messagingController.getConversations
);

// Start new conversation
router.post('/conversations', csrfProtection,
  validateRequest({
    body: {
      participantAddress: { type: 'string', required: true },
      initialMessage: { type: 'string', optional: true, maxLength: 2000 },
      conversationType: { type: 'string', optional: true, enum: ['direct', 'group', 'announcement'] },
      communityId: { type: 'string', optional: true }
    }
  }),
  messagingController.startConversation
);

// Get conversation details
router.get('/conversations/:id',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  messagingController.getConversationDetails
);

// Get conversation messages
router.get('/conversations/:id/messages',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 100 },
      before: { type: 'string', optional: true }, // message ID for pagination
      after: { type: 'string', optional: true }   // message ID for pagination
    }
  }),
  messagingController.getConversationMessages
);

// Send message
router.post('/conversations/:id/messages', csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      content: { type: 'string', optional: true, maxLength: 2000 },
      contentType: { type: 'string', optional: true, enum: ['text', 'image', 'file', 'post_share'] },
      replyToId: { type: 'string', optional: true },
      attachments: { type: 'array', optional: true },
      encryptionMetadata: { type: 'object', optional: true }
    }
  }),
  messagingController.sendMessage
);

// Mark conversation as read
router.put('/conversations/:id/read', csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  messagingController.markConversationAsRead
);

// Delete conversation
router.delete('/conversations/:id', csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  messagingController.deleteConversation
);

// Archive conversation
router.put('/conversations/:id/archive', csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  messagingController.archiveConversation
);

// Unarchive conversation
router.put('/conversations/:id/unarchive', csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  messagingController.unarchiveConversation
);

// Encrypt message content
router.post('/messages/:id/encrypt', csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      content: { type: 'string', required: true },
      recipientPublicKey: { type: 'string', required: true }
    }
  }),
  messagingController.encryptMessage
);

// Decrypt message content
router.post('/messages/:id/decrypt', csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      encryptedContent: { type: 'string', required: true },
      encryptionMetadata: { type: 'object', required: true }
    }
  }),
  messagingController.decryptMessage
);

// Update message delivery status
router.put('/messages/:id/status', csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      status: { type: 'string', required: true, enum: ['sent', 'delivered', 'read'] }
    }
  }),
  messagingController.updateMessageStatus
);

// Delete message
router.delete('/messages/:id', csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  messagingController.deleteMessage
);

// Search messages
router.get('/search',
  validateRequest({
    query: {
      q: { type: 'string', required: true, minLength: 2 },
      conversationId: { type: 'string', optional: true },
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 50 }
    }
  }),
  messagingController.searchMessages
);

// Get message thread (replies)
router.get('/messages/:id/thread',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  messagingController.getMessageThread
);

// Block user
router.post('/block', csrfProtection,
  validateRequest({
    body: {
      userAddress: { type: 'string', required: true },
      reason: { type: 'string', optional: true, maxLength: 500 }
    }
  }),
  messagingController.blockUser
);

// Unblock user
router.delete('/block/:userAddress', csrfProtection,
  validateRequest({
    params: {
      userAddress: { type: 'string', required: true }
    }
  }),
  messagingController.unblockUser
);

// Get blocked users
router.get('/blocked',
  messagingController.getBlockedUsers
);

// Report conversation or message
router.post('/report', csrfProtection,
  validateRequest({
    body: {
      targetType: { type: 'string', required: true, enum: ['conversation', 'message'] },
      targetId: { type: 'string', required: true },
      reason: { type: 'string', required: true, enum: ['spam', 'harassment', 'inappropriate_content', 'scam', 'other'] },
      description: { type: 'string', optional: true, maxLength: 1000 }
    }
  }),
  messagingController.reportContent
);

// Get conversation participants
router.get('/conversations/:id/participants',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  messagingController.getConversationParticipants
);

// Add participant to group conversation
router.post('/conversations/:id/participants', csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      userAddress: { type: 'string', required: true },
      role: { type: 'string', optional: true, enum: ['admin', 'moderator', 'member'] }
    }
  }),
  messagingController.addParticipant
);

// Remove participant from group conversation
router.delete('/conversations/:id/participants/:userAddress', csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true },
      userAddress: { type: 'string', required: true }
    }
  }),
  messagingController.removeParticipant
);

// Update participant role
router.put('/conversations/:id/participants/:userAddress/role', csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true },
      userAddress: { type: 'string', required: true }
    },
    body: {
      role: { type: 'string', required: true, enum: ['admin', 'moderator', 'member'] }
    }
  }),
  messagingController.updateParticipantRole
);

// Create group conversation
router.post('/groups', csrfProtection,
  validateRequest({
    body: {
      participants: { type: 'array', required: true },
      name: { type: 'string', optional: true, maxLength: 100 },
      description: { type: 'string', optional: true, maxLength: 500 },
      isPublic: { type: 'boolean', optional: true }
    }
  }),
  messagingController.createGroupConversation
);

// Update group settings
router.put('/conversations/:id/settings', csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      name: { type: 'string', optional: true, maxLength: 100 },
      description: { type: 'string', optional: true, maxLength: 500 },
      avatar: { type: 'string', optional: true, maxLength: 500 },
      isPublic: { type: 'boolean', optional: true }
    }
  }),
  messagingController.updateGroupSettings
);

// Upload message attachment (images, documents, etc.)
router.post('/attachments',
  csrfProtection,
  uploadMessageAttachment,
  handleMulterError,
  messagingController.uploadAttachment
);

// Upload voice message
router.post('/voice-messages',
  csrfProtection,
  uploadVoiceMessage,
  handleMulterError,
  messagingController.uploadVoiceMessage
);

// Get link preview
router.post('/link-preview', csrfProtection,
  validateRequest({
    body: {
      url: { type: 'string', required: true }
    }
  }),
  messagingController.getLinkPreview
);

// =====================================================
// PHASE 5: Advanced Features (Reactions, Pinning, Editing, Threading)
// =====================================================

// Add reaction to message
router.post('/messages/:id/reactions', csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      emoji: { type: 'string', required: true, maxLength: 32 }
    }
  }),
  messagingController.addReaction
);

// Remove reaction from message
router.delete('/messages/:id/reactions/:emoji', csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true },
      emoji: { type: 'string', required: true }
    }
  }),
  messagingController.removeReaction
);

// Get reactions for a message
router.get('/messages/:id/reactions',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  messagingController.getReactions
);

// Pin message
router.post('/messages/:id/pin', csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  messagingController.pinMessage
);

// Unpin message
router.delete('/messages/:id/pin', csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  messagingController.unpinMessage
);

// Get pinned messages for a conversation
router.get('/conversations/:id/pinned',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  messagingController.getPinnedMessages
);

// Edit message
router.put('/messages/:id', csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      content: { type: 'string', required: true, minLength: 1, maxLength: 10240 }
    }
  }),
  messagingController.editMessage
);

// Get full message thread (parent + all replies)
router.get('/messages/:id/full-thread',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  messagingController.getFullMessageThread
);

export default router;
