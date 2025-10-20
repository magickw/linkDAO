import express from 'express';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';
import { marketplaceMessagingController } from '../controllers/marketplaceMessagingController';

const router = express.Router();

// Apply authentication middleware to all messaging routes
router.use(authMiddleware);

// Apply rate limiting
router.use(rateLimitingMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs for messaging
  message: 'Too many messaging requests from this IP'
}));

// Order-based conversations
router.post('/conversations/order/:orderId', 
  validateRequest({
    params: {
      orderId: { type: 'number', required: true }
    }
  }),
  marketplaceMessagingController.createOrderConversation
);

router.post('/conversations/product/:productId',
  validateRequest({
    params: {
      productId: { type: 'string', required: true }
    }
  }),
  marketplaceMessagingController.createProductInquiry
);

router.get('/conversations/my-orders',
  validateRequest({
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 50 }
    }
  }),
  marketplaceMessagingController.getMyOrderConversations
);

router.get('/conversations/:id/order-timeline',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  marketplaceMessagingController.getOrderTimeline
);

// Templates & Quick Replies
router.get('/templates',
  marketplaceMessagingController.getTemplates
);

router.post('/templates',
  validateRequest({
    body: {
      name: { type: 'string', required: true, maxLength: 255 },
      content: { type: 'string', required: true },
      category: { type: 'string', optional: true, maxLength: 64 },
      tags: { type: 'array', optional: true }
    }
  }),
  marketplaceMessagingController.createTemplate
);

router.put('/templates/:id',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      name: { type: 'string', optional: true, maxLength: 255 },
      content: { type: 'string', optional: true },
      category: { type: 'string', optional: true, maxLength: 64 },
      tags: { type: 'array', optional: true },
      isActive: { type: 'boolean', optional: true }
    }
  }),
  marketplaceMessagingController.updateTemplate
);

router.delete('/templates/:id',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  marketplaceMessagingController.deleteTemplate
);

router.post('/quick-replies',
  validateRequest({
    body: {
      triggerKeywords: { type: 'array', required: true },
      responseText: { type: 'string', required: true },
      category: { type: 'string', optional: true, maxLength: 64 },
      isActive: { type: 'boolean', optional: true }
    }
  }),
  marketplaceMessagingController.createQuickReply
);

router.get('/quick-replies/suggest',
  validateRequest({
    query: {
      message: { type: 'string', required: true }
    }
  }),
  marketplaceMessagingController.suggestQuickReplies
);

// Analytics
router.get('/conversations/:id/analytics',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  marketplaceMessagingController.getConversationAnalytics
);

router.get('/seller/analytics/messaging',
  marketplaceMessagingController.getSellerMessagingAnalytics
);

// Automation
router.post('/conversations/:id/auto-notify',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      eventType: { type: 'string', required: true },
      data: { type: 'object', required: true }
    }
  }),
  marketplaceMessagingController.sendAutomatedNotification
);

// Dispute integration
router.post('/conversations/:id/escalate',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  marketplaceMessagingController.escalateToDispute
);

export default router;