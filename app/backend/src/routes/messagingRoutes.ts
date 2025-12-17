import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { messagingController } from '../controllers/messagingController';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';

const router = express.Router();

// Apply authentication middleware to all messaging routes
router.use(authMiddleware);

// Apply rate limiting
router.use(rateLimitingMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs for messaging
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
      content: { type: 'string', required: true, minLength: 1, maxLength: 2000 },
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
      userAddress: { type: 'string', required: true }
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

export default router;
