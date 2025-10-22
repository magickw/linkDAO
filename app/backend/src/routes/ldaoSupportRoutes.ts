import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware';
import { ldaoSupportService } from '../services/ldaoSupportService';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';

const router = Router();

// Validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Support Ticket Routes

// Create a new support ticket
router.post('/tickets',
  authMiddleware,
  rateLimitingMiddleware({ windowMs: 15 * 60 * 1000, max: 5 }), // 5 tickets per 15 minutes
  [
    body('subject')
      .isLength({ min: 5, max: 200 })
      .withMessage('Subject must be between 5 and 200 characters'),
    body('description')
      .isLength({ min: 20, max: 5000 })
      .withMessage('Description must be between 20 and 5000 characters'),
    body('category')
      .isIn(['direct-purchase', 'dex-trading', 'staking', 'earn-to-own', 'cross-chain', 'technical', 'account', 'other'])
      .withMessage('Invalid category'),
    body('priority')
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority'),
    body('attachments')
      .optional()
      .isArray()
      .withMessage('Attachments must be an array')
  ],
  validateRequest,
  async (req: any, res: any) => {
    try {
      const { subject, description, category, priority, attachments } = req.body;
      const userId = req.user.id;

      const ticket = await ldaoSupportService.createTicket({
        userId,
        subject,
        description,
        category,
        priority,
        status: 'open',
        attachments
      });

      res.status(201).json({
        success: true,
        message: 'Support ticket created successfully',
        data: ticket
      });
    } catch (error) {
      console.error('Error creating support ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create support ticket'
      });
    }
  }
);

// Get user's support tickets
router.get('/tickets',
  authMiddleware,
  async (req: any, res: any) => {
    try {
      const userId = req.user.id;
      const tickets = await ldaoSupportService.getTicketsByUser(userId);

      res.json({
        success: true,
        data: tickets
      });
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch support tickets'
      });
    }
  }
);

// Get specific support ticket
router.get('/tickets/:ticketId',
  authMiddleware,
  [
    param('ticketId')
      .matches(/^LDAO-\d+-[a-z0-9]+$/)
      .withMessage('Invalid ticket ID format')
  ],
  validateRequest,
  async (req: any, res: any) => {
    try {
      const { ticketId } = req.params;
      const userId = req.user.id;

      const ticket = await ldaoSupportService.getTicketById(ticketId);
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Support ticket not found'
        });
      }

      // Ensure user can only access their own tickets
      if (ticket.userId !== userId && !req.user.isStaff) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: ticket
      });
    } catch (error) {
      console.error('Error fetching support ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch support ticket'
      });
    }
  }
);

// Add response to support ticket
router.post('/tickets/:ticketId/responses',
  authMiddleware,
  rateLimitingMiddleware({ windowMs: 5 * 60 * 1000, max: 10 }), // 10 responses per 5 minutes
  [
    param('ticketId')
      .matches(/^LDAO-\d+-[a-z0-9]+$/)
      .withMessage('Invalid ticket ID format'),
    body('response')
      .isLength({ min: 10, max: 2000 })
      .withMessage('Response must be between 10 and 2000 characters'),
    body('attachments')
      .optional()
      .isArray()
      .withMessage('Attachments must be an array')
  ],
  validateRequest,
  async (req: any, res: any) => {
    try {
      const { ticketId } = req.params;
      const { response, attachments } = req.body;
      const userId = req.user.id;
      const isStaffResponse = req.user.isStaff || false;

      // Verify ticket ownership for non-staff users
      if (!isStaffResponse) {
        const ticket = await ldaoSupportService.getTicketById(ticketId);
        if (!ticket || ticket.userId !== userId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }
      }

      await ldaoSupportService.addTicketResponse(
        ticketId,
        response,
        isStaffResponse,
        attachments
      );

      res.json({
        success: true,
        message: 'Response added successfully'
      });
    } catch (error) {
      console.error('Error adding ticket response:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add response'
      });
    }
  }
);

// FAQ Routes

// Get FAQ items by category
router.get('/faq',
  [
    query('category')
      .optional()
      .isIn(['ldao', 'general', 'technical', 'trading', 'staking'])
      .withMessage('Invalid category'),
    query('search')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Search query must be between 2 and 100 characters')
  ],
  validateRequest,
  async (req: any, res: any) => {
    try {
      const { category = 'ldao', search } = req.query;

      let faqs;
      if (search) {
        faqs = await ldaoSupportService.searchFAQ(search, category);
      } else {
        faqs = await ldaoSupportService.getFAQByCategory(category);
      }

      res.json({
        success: true,
        data: faqs
      });
    } catch (error) {
      console.error('Error fetching FAQ items:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch FAQ items'
      });
    }
  }
);

// Mark FAQ as helpful/not helpful
router.post('/faq/:faqId/feedback',
  rateLimitingMiddleware({ windowMs: 60 * 1000, max: 5 }), // 5 feedback per minute
  [
    param('faqId')
      .matches(/^faq-\d+$/)
      .withMessage('Invalid FAQ ID format'),
    body('helpful')
      .isBoolean()
      .withMessage('Helpful must be a boolean value')
  ],
  validateRequest,
  async (req: any, res: any) => {
    try {
      const { faqId } = req.params;
      const { helpful } = req.body;

      await ldaoSupportService.markFAQHelpful(faqId, helpful);

      res.json({
        success: true,
        message: 'Feedback recorded successfully'
      });
    } catch (error) {
      console.error('Error recording FAQ feedback:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record feedback'
      });
    }
  }
);

// Increment FAQ views
router.post('/faq/:faqId/view',
  [
    param('faqId')
      .matches(/^faq-\d+$/)
      .withMessage('Invalid FAQ ID format')
  ],
  validateRequest,
  async (req: any, res: any) => {
    try {
      const { faqId } = req.params;
      await ldaoSupportService.incrementFAQViews(faqId);

      res.json({
        success: true,
        message: 'View recorded'
      });
    } catch (error) {
      console.error('Error recording FAQ view:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record view'
      });
    }
  }
);

// Live Chat Routes

// Initiate live chat session
router.post('/chat/initiate',
  authMiddleware,
  rateLimitingMiddleware({ windowMs: 60 * 1000, max: 3 }), // 3 chat initiations per minute
  [
    body('initialMessage')
      .optional()
      .isLength({ min: 1, max: 500 })
      .withMessage('Initial message must be between 1 and 500 characters')
  ],
  validateRequest,
  async (req: any, res: any) => {
    try {
      const userId = req.user.id;
      const { initialMessage } = req.body;

      const chatSessionId = await ldaoSupportService.initiateLiveChat(userId, initialMessage);

      res.json({
        success: true,
        message: 'Live chat session initiated',
        data: {
          sessionId: chatSessionId,
          estimatedWaitTime: '2-5 minutes'
        }
      });
    } catch (error) {
      console.error('Error initiating live chat:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate live chat'
      });
    }
  }
);

// Support Metrics (Staff only)
router.get('/metrics',
  authMiddleware,
  async (req: any, res: any) => {
    try {
      // Check if user is staff
      if (!req.user.isStaff) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - Staff only'
        });
      }

      const { timeframe = 'week' } = req.query;
      const metrics = await ldaoSupportService.getSupportMetrics(timeframe);

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error fetching support metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch support metrics'
      });
    }
  }
);

// Staff Routes (Admin/Staff only)

// Update ticket status (Staff only)
router.patch('/tickets/:ticketId/status',
  authMiddleware,
  [
    param('ticketId')
      .matches(/^LDAO-\d+-[a-z0-9]+$/)
      .withMessage('Invalid ticket ID format'),
    body('status')
      .isIn(['open', 'in-progress', 'resolved', 'closed'])
      .withMessage('Invalid status'),
    body('assignedTo')
      .optional()
      .isString()
      .withMessage('AssignedTo must be a string')
  ],
  validateRequest,
  async (req: any, res: any) => {
    try {
      // Check if user is staff
      if (!req.user.isStaff) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - Staff only'
        });
      }

      const { ticketId } = req.params;
      const { status, assignedTo } = req.body;

      const updatedTicket = await ldaoSupportService.updateTicketStatus(
        ticketId,
        status,
        assignedTo
      );

      res.json({
        success: true,
        message: 'Ticket status updated successfully',
        data: updatedTicket
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update ticket status'
      });
    }
  }
);

// Create FAQ item (Staff only)
router.post('/faq',
  authMiddleware,
  [
    body('question')
      .isLength({ min: 10, max: 500 })
      .withMessage('Question must be between 10 and 500 characters'),
    body('answer')
      .isLength({ min: 20, max: 5000 })
      .withMessage('Answer must be between 20 and 5000 characters'),
    body('category')
      .isIn(['ldao', 'general', 'technical', 'trading', 'staking'])
      .withMessage('Invalid category'),
    body('tags')
      .isArray()
      .withMessage('Tags must be an array'),
    body('isPublished')
      .isBoolean()
      .withMessage('IsPublished must be a boolean')
  ],
  validateRequest,
  async (req: any, res: any) => {
    try {
      // Check if user is staff
      if (!req.user.isStaff) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - Staff only'
        });
      }

      const faqData = {
        ...req.body,
        helpful: 0,
        notHelpful: 0,
        views: 0
      };

      const faq = await ldaoSupportService.createFAQItem(faqData);

      res.status(201).json({
        success: true,
        message: 'FAQ item created successfully',
        data: faq
      });
    } catch (error) {
      console.error('Error creating FAQ item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create FAQ item'
      });
    }
  }
);

// Health check endpoint
router.get('/health',
  async (req: any, res: any) => {
    res.json({
      success: true,
      message: 'LDAO Support Service is healthy',
      timestamp: new Date().toISOString()
    });
  }
);

export default router;