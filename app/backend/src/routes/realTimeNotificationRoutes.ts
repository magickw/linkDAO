import { Router } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { body, param, query, validationResult } from 'express-validator';
import RealTimeNotificationService from '../services/realTimeNotificationService';

const router = Router();

// Initialize the notification service (in production, this would be a singleton)
let notificationService: RealTimeNotificationService | null = null;

// Middleware to ensure notification service is initialized
const ensureNotificationService = (req: any, res: any, next: any) => {
  if (!notificationService) {
    notificationService = new RealTimeNotificationService(
      parseInt(process.env.WS_PORT || '3001')
    );
  }
  req.notificationService = notificationService;
  next();
};

// Validation middleware
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// Get notification service stats
router.get('/stats', ensureNotificationService, (req: any, res) => {
  try {
    const stats = req.notificationService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    safeLogger.error('Error getting notification stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification stats'
    });
  }
});

// Send mention notification
router.post('/mention', csrfProtection, 
  ensureNotificationService,
  [
    body('userId').isString().notEmpty(),
    body('postId').isString().notEmpty(),
    body('mentionedBy').isString().notEmpty(),
    body('mentionedByUsername').isString().notEmpty(),
    body('context').isString().notEmpty(),
    body('commentId').optional().isString(),
    body('mentionedByAvatar').optional().isString()
  ],
  handleValidationErrors,
  (req: any, res) => {
    try {
      const { userId, ...data } = req.body;
      req.notificationService.createMentionNotification(userId, data);
      
      res.json({
        success: true,
        message: 'Mention notification sent'
      });
    } catch (error) {
      safeLogger.error('Error sending mention notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send mention notification'
      });
    }
  }
);

// Send tip notification
router.post('/tip', csrfProtection, 
  ensureNotificationService,
  [
    body('userId').isString().notEmpty(),
    body('postId').isString().notEmpty(),
    body('tipAmount').isNumeric(),
    body('tokenSymbol').isString().notEmpty(),
    body('tipperAddress').isString().notEmpty(),
    body('tipperUsername').isString().notEmpty(),
    body('tipperAvatar').optional().isString(),
    body('message').optional().isString()
  ],
  handleValidationErrors,
  (req: any, res) => {
    try {
      const { userId, ...data } = req.body;
      req.notificationService.createTipNotification(userId, data);
      
      res.json({
        success: true,
        message: 'Tip notification sent'
      });
    } catch (error) {
      safeLogger.error('Error sending tip notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send tip notification'
      });
    }
  }
);

// Send governance notification
router.post('/governance', csrfProtection, 
  ensureNotificationService,
  [
    body('userId').isString().notEmpty(),
    body('proposalId').isString().notEmpty(),
    body('proposalTitle').isString().notEmpty(),
    body('action').isIn(['created', 'voting_started', 'voting_ending', 'executed', 'rejected']),
    body('votingDeadline').optional().isISO8601(),
    body('timeRemaining').optional().isNumeric(),
    body('quorumStatus').optional().isIn(['met', 'not_met', 'approaching']),
    body('userVoteStatus').optional().isIn(['voted', 'not_voted'])
  ],
  handleValidationErrors,
  (req: any, res) => {
    try {
      const { userId, votingDeadline, ...data } = req.body;
      const processedData = {
        ...data,
        votingDeadline: votingDeadline ? new Date(votingDeadline) : undefined
      };
      
      req.notificationService.createGovernanceNotification(userId, processedData);
      
      res.json({
        success: true,
        message: 'Governance notification sent'
      });
    } catch (error) {
      safeLogger.error('Error sending governance notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send governance notification'
      });
    }
  }
);

// Send community notification
router.post('/community', csrfProtection, 
  ensureNotificationService,
  [
    body('userId').isString().notEmpty(),
    body('communityId').isString().notEmpty(),
    body('communityName').isString().notEmpty(),
    body('eventType').isIn(['new_member', 'new_post', 'announcement', 'event', 'milestone']),
    body('communityIcon').optional().isString(),
    body('eventData').optional().isObject()
  ],
  handleValidationErrors,
  (req: any, res) => {
    try {
      const { userId, ...data } = req.body;
      req.notificationService.createCommunityNotification(userId, data);
      
      res.json({
        success: true,
        message: 'Community notification sent'
      });
    } catch (error) {
      safeLogger.error('Error sending community notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send community notification'
      });
    }
  }
);

// Send reaction notification
router.post('/reaction', csrfProtection, 
  ensureNotificationService,
  [
    body('userId').isString().notEmpty(),
    body('postId').isString().notEmpty(),
    body('reactionType').isString().notEmpty(),
    body('reactionEmoji').isString().notEmpty(),
    body('reactorAddress').isString().notEmpty(),
    body('reactorUsername').isString().notEmpty(),
    body('reactorAvatar').optional().isString(),
    body('tokenAmount').optional().isNumeric()
  ],
  handleValidationErrors,
  (req: any, res) => {
    try {
      const { userId, ...data } = req.body;
      req.notificationService.createReactionNotification(userId, data);
      
      res.json({
        success: true,
        message: 'Reaction notification sent'
      });
    } catch (error) {
      safeLogger.error('Error sending reaction notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send reaction notification'
      });
    }
  }
);

// Notify new comment
router.post('/comment', csrfProtection, 
  ensureNotificationService,
  [
    body('postId').isString().notEmpty(),
    body('commentId').isString().notEmpty(),
    body('authorId').isString().notEmpty(),
    body('authorUsername').isString().notEmpty(),
    body('content').isString().notEmpty(),
    body('authorAvatar').optional().isString()
  ],
  handleValidationErrors,
  (req: any, res) => {
    try {
      const { postId, ...data } = req.body;
      req.notificationService.notifyNewComment(postId, data);
      
      res.json({
        success: true,
        message: 'Comment notification sent'
      });
    } catch (error) {
      safeLogger.error('Error sending comment notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send comment notification'
      });
    }
  }
);

// Notify reaction update
router.post('/reaction-update', csrfProtection, 
  ensureNotificationService,
  [
    body('postId').isString().notEmpty(),
    body('reactionType').isString().notEmpty(),
    body('reactionEmoji').isString().notEmpty(),
    body('count').isNumeric(),
    body('userReacted').isBoolean(),
    body('commentId').optional().isString(),
    body('tokenAmount').optional().isNumeric()
  ],
  handleValidationErrors,
  (req: any, res) => {
    try {
      const { postId, ...data } = req.body;
      req.notificationService.notifyReactionUpdate(postId, data);
      
      res.json({
        success: true,
        message: 'Reaction update sent'
      });
    } catch (error) {
      safeLogger.error('Error sending reaction update:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send reaction update'
      });
    }
  }
);

// Send batch notifications
router.post('/batch', csrfProtection, 
  ensureNotificationService,
  [
    body('userId').isString().notEmpty(),
    body('notifications').isArray().notEmpty(),
    body('notifications.*.category').isString().notEmpty(),
    body('notifications.*.priority').isString().notEmpty(),
    body('notifications.*.title').isString().notEmpty(),
    body('notifications.*.message').isString().notEmpty()
  ],
  handleValidationErrors,
  (req: any, res) => {
    try {
      const { userId, notifications } = req.body;
      req.notificationService.sendBatchNotificationsToUser(userId, notifications);
      
      res.json({
        success: true,
        message: `Sent ${notifications.length} notifications`
      });
    } catch (error) {
      safeLogger.error('Error sending batch notifications:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send batch notifications'
      });
    }
  }
);

// Broadcast to all users
router.post('/broadcast', csrfProtection, 
  ensureNotificationService,
  [
    body('type').isString().notEmpty(),
    body('payload').optional().isObject()
  ],
  handleValidationErrors,
  (req: any, res) => {
    try {
      const { type, payload } = req.body;
      req.notificationService.broadcastToAllUsers({ type, payload });
      
      res.json({
        success: true,
        message: 'Broadcast sent to all users'
      });
    } catch (error) {
      safeLogger.error('Error broadcasting message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to broadcast message'
      });
    }
  }
);

// Test endpoint to generate sample notifications
router.post('/test/:type', csrfProtection, 
  ensureNotificationService,
  [
    param('type').isIn(['mention', 'tip', 'governance', 'community', 'reaction']),
    body('userId').isString().notEmpty()
  ],
  handleValidationErrors,
  (req: any, res) => {
    try {
      const { type } = req.params;
      const { userId } = req.body;

      const testData = {
        mention: {
          postId: 'test-post-123',
          commentId: 'test-comment-456',
          mentionedBy: 'test-user-789',
          mentionedByUsername: 'TestUser',
          mentionedByAvatar: '/avatars/test.png',
          context: 'This is a test mention @' + userId
        },
        tip: {
          postId: 'test-post-123',
          tipAmount: 5,
          tokenSymbol: 'USDC',
          tipperAddress: 'test-tipper-address',
          tipperUsername: 'TestTipper',
          tipperAvatar: '/avatars/tipper.png',
          message: 'Great post!'
        },
        governance: {
          proposalId: 'test-proposal-123',
          proposalTitle: 'Test Governance Proposal',
          action: 'voting_ending' as const,
          votingDeadline: new Date(Date.now() + 3600000), // 1 hour from now
          quorumStatus: 'approaching' as const,
          userVoteStatus: 'not_voted' as const
        },
        community: {
          communityId: 'test-community-123',
          communityName: 'Test Community',
          communityIcon: '/communities/test.png',
          eventType: 'event' as const,
          eventData: {
            canJoin: true,
            eventDate: new Date(Date.now() + 86400000) // Tomorrow
          }
        },
        reaction: {
          postId: 'test-post-123',
          reactionType: 'fire',
          reactionEmoji: '🔥',
          reactorAddress: 'test-reactor-address',
          reactorUsername: 'TestReactor',
          reactorAvatar: '/avatars/reactor.png',
          tokenAmount: 2
        }
      };

      const data = testData[type as keyof typeof testData];
      
      switch (type) {
        case 'mention':
          req.notificationService.createMentionNotification(userId, data);
          break;
        case 'tip':
          req.notificationService.createTipNotification(userId, data);
          break;
        case 'governance':
          req.notificationService.createGovernanceNotification(userId, data);
          break;
        case 'community':
          req.notificationService.createCommunityNotification(userId, data);
          break;
        case 'reaction':
          req.notificationService.createReactionNotification(userId, data);
          break;
      }

      res.json({
        success: true,
        message: `Test ${type} notification sent to user ${userId}`
      });
    } catch (error) {
      safeLogger.error('Error sending test notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send test notification'
      });
    }
  }
);

export default router;
