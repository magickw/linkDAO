import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { supportTicketingController } from '../controllers/supportTicketingController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateAdminRole } from '../middleware/adminAuthMiddleware';

const router = Router();

// Public routes (no authentication required)
router.post('/tickets', csrfProtection, supportTicketingController.createTicket.bind(supportTicketingController));
router.post('/interactions', csrfProtection, supportTicketingController.recordDocumentationInteraction.bind(supportTicketingController));

// User routes (authentication required)
router.get('/tickets/user/:userEmail', authMiddleware, supportTicketingController.getUserTickets.bind(supportTicketingController));
router.get('/tickets/:ticketId', authMiddleware, supportTicketingController.getTicket.bind(supportTicketingController));

// Admin routes (admin authentication required)
router.put('/tickets/:ticketId', csrfProtection, validateAdminRole, supportTicketingController.updateTicket.bind(supportTicketingController));
router.get('/tickets', validateAdminRole, supportTicketingController.searchTickets.bind(supportTicketingController));
router.get('/analytics', validateAdminRole, supportTicketingController.getSupportAnalytics.bind(supportTicketingController));
router.get('/analytics/statistics', validateAdminRole, supportTicketingController.getTicketStatistics.bind(supportTicketingController));
router.get('/analytics/documentation-effectiveness', validateAdminRole, supportTicketingController.getDocumentationEffectiveness.bind(supportTicketingController));
router.post('/integrations/configure', csrfProtection, validateAdminRole, supportTicketingController.configureIntegrations.bind(supportTicketingController));

export { router as supportTicketingRoutes };