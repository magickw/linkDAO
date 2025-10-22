import { Router } from 'express';
import { supportTicketingController } from '../controllers/supportTicketingController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = Router();

// Public routes (no authentication required)
router.post('/tickets', supportTicketingController.createTicket);
router.post('/interactions', supportTicketingController.recordDocumentationInteraction);

// User routes (authentication required)
router.get('/tickets/user/:userEmail', authMiddleware, supportTicketingController.getUserTickets);
router.get('/tickets/:ticketId', authMiddleware, supportTicketingController.getTicket);

// Admin routes (admin authentication required)
router.put('/tickets/:ticketId', adminAuthMiddleware, supportTicketingController.updateTicket);
router.get('/tickets', adminAuthMiddleware, supportTicketingController.searchTickets);
router.get('/analytics', adminAuthMiddleware, supportTicketingController.getSupportAnalytics);
router.get('/analytics/statistics', adminAuthMiddleware, supportTicketingController.getTicketStatistics);
router.get('/analytics/documentation-effectiveness', adminAuthMiddleware, supportTicketingController.getDocumentationEffectiveness);
router.post('/integrations/configure', adminAuthMiddleware, supportTicketingController.configureIntegrations);

export { router as supportTicketingRoutes };