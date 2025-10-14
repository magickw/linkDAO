import { Router } from 'express';
import { MarketplaceController } from '../controllers/marketplaceController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
const marketplaceController = new MarketplaceController();

// Public routes
router.get('/listings', (req, res) => marketplaceController.getActiveListings(req, res));
router.get('/listings/all', (req, res) => marketplaceController.getAllListings(req, res));
router.get('/listings/:id', (req, res) => marketplaceController.getListingById(req, res));
router.get('/listings/seller/:sellerAddress', (req, res) => marketplaceController.getListingsBySeller(req, res));
router.get('/bids/listing/:listingId', (req, res) => marketplaceController.getBidsByListing(req, res));
router.get('/bids/bidder/:bidderAddress', (req, res) => marketplaceController.getBidsByBidder(req, res));
router.get('/offers/listing/:listingId', (req, res) => marketplaceController.getOffersByListing(req, res));
router.get('/offers/buyer/:buyerAddress', (req, res) => marketplaceController.getOffersByBuyer(req, res));
router.get('/escrows/:id', (req, res) => marketplaceController.getEscrowById(req, res));
router.get('/escrows/user/:userAddress', (req, res) => marketplaceController.getEscrowsByUser(req, res));
router.get('/orders/:id', (req, res) => marketplaceController.getOrderById(req, res));
router.get('/orders/user/:userAddress', (req, res) => marketplaceController.getOrdersByUser(req, res));
router.get('/disputes/:id', (req, res) => marketplaceController.getDisputeById(req, res));
router.get('/disputes/user/:userAddress', (req, res) => marketplaceController.getDisputesByUser(req, res));
router.get('/reputation/:address', (req, res) => marketplaceController.getUserReputation(req, res));
router.get('/vendors/dao-approved', (req, res) => marketplaceController.getDAOApprovedVendors(req, res));

// AI Moderation routes
router.get('/ai-moderation/pending', (req, res) => marketplaceController.getPendingAIModeration(req, res));
router.get('/ai-moderation/:objectType/:objectId', (req, res) => marketplaceController.getAIModerationByObject(req, res));

// Protected routes (require authentication)
router.post('/listings', authenticateToken, (req, res) => marketplaceController.createListing(req, res));
router.put('/listings/:id', authenticateToken, (req, res) => marketplaceController.updateListing(req, res));
router.delete('/listings/:id', authenticateToken, (req, res) => marketplaceController.cancelListing(req, res));
router.post('/bids/listing/:listingId', authenticateToken, (req, res) => marketplaceController.placeBid(req, res));
router.post('/offers/listing/:listingId', authenticateToken, (req, res) => marketplaceController.makeOffer(req, res));
router.post('/offers/:offerId/accept', authenticateToken, (req, res) => marketplaceController.acceptOffer(req, res));
router.post('/escrows/listing/:listingId', authenticateToken, (req, res) => marketplaceController.createEscrow(req, res));
router.post('/escrows/:escrowId/approve', authenticateToken, (req, res) => marketplaceController.approveEscrow(req, res));
router.post('/escrows/:escrowId/dispute', authenticateToken, (req, res) => marketplaceController.openDispute(req, res));
router.post('/escrows/:escrowId/confirm-delivery', authenticateToken, (req, res) => marketplaceController.confirmDelivery(req, res));
router.post('/orders', authenticateToken, (req, res) => marketplaceController.createOrder(req, res));
router.put('/orders/:orderId/status', authenticateToken, (req, res) => marketplaceController.updateOrderStatus(req, res));
router.post('/disputes', authenticateToken, (req, res) => marketplaceController.createDispute(req, res));
router.put('/disputes/:disputeId/status', authenticateToken, (req, res) => marketplaceController.updateDisputeStatus(req, res));

// AI Moderation routes (protected)
router.post('/ai-moderation', authenticateToken, (req, res) => marketplaceController.createAIModeration(req, res));
router.put('/ai-moderation/:id/status', authenticateToken, (req, res) => marketplaceController.updateAIModerationStatus(req, res));

// Enhanced Escrow routes
router.post('/enhanced-escrows', authenticateToken, (req, res) => marketplaceController.createEnhancedEscrow(req, res));
router.post('/enhanced-escrows/:escrowId/lock-funds', authenticateToken, (req, res) => marketplaceController.lockFunds(req, res));
router.post('/enhanced-escrows/:escrowId/confirm-delivery', authenticateToken, (req, res) => marketplaceController.confirmDeliveryEnhanced(req, res));
router.post('/enhanced-escrows/:escrowId/approve', authenticateToken, (req, res) => marketplaceController.approveEnhancedEscrow(req, res));
router.post('/enhanced-escrows/:escrowId/dispute', authenticateToken, (req, res) => marketplaceController.openEnhancedDispute(req, res));
router.post('/enhanced-escrows/:escrowId/evidence', authenticateToken, (req, res) => marketplaceController.submitEvidence(req, res));
router.post('/enhanced-escrows/:escrowId/vote', authenticateToken, (req, res) => marketplaceController.castVote(req, res));

router.put('/reputation/:address', authenticateToken, (req, res) => marketplaceController.updateUserReputation(req, res));

export default router;