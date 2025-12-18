import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { supportTicketingController } from '../controllers/supportTicketingController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateAdminRole, requirePermission } from '../middleware/adminAuthMiddleware';

const router = Router();

// Public routes (no authentication required)
router.post('/tickets', csrfProtection, supportTicketingController.createTicket.bind(supportTicketingController));
router.post('/interactions', csrfProtection, supportTicketingController.recordDocumentationInteraction.bind(supportTicketingController));

// User routes (authentication required)
router.get('/tickets/user/:userEmail', authMiddleware, supportTicketingController.getUserTickets.bind(supportTicketingController));
router.get('/tickets/:ticketId', authMiddleware, supportTicketingController.getTicket.bind(supportTicketingController));

// Support staff routes (requires support.tickets permission)
router.put('/tickets/:ticketId', csrfProtection, authMiddleware, requirePermission('support.tickets'), supportTicketingController.updateTicket.bind(supportTicketingController));
router.get('/tickets', authMiddleware, requirePermission('support.tickets'), supportTicketingController.searchTickets.bind(supportTicketingController));

// Analytics routes (requires system.analytics permission)
router.get('/analytics', authMiddleware, requirePermission('system.analytics'), supportTicketingController.getSupportAnalytics.bind(supportTicketingController));
router.get('/analytics/statistics', authMiddleware, requirePermission('system.analytics'), supportTicketingController.getTicketStatistics.bind(supportTicketingController));
router.get('/analytics/documentation-effectiveness', authMiddleware, requirePermission('system.analytics'), supportTicketingController.getDocumentationEffectiveness.bind(supportTicketingController));

// Admin-only routes
router.post('/integrations/configure', csrfProtection, validateAdminRole, supportTicketingController.configureIntegrations.bind(supportTicketingController));

export { router as supportTicketingRoutes };