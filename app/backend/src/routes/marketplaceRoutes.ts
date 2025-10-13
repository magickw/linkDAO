import express from 'express';
import { MarketplaceController } from '../controllers/marketplaceController';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();
const marketplaceController = new MarketplaceController();

// Listings
router.get('/listings', asyncHandler(marketplaceController.getAllListings));
router.get('/listings/active', asyncHandler(marketplaceController.getActiveListings));
router.get('/listings/seller/:sellerAddress', asyncHandler(marketplaceController.getListingsBySeller));
router.get('/listings/:id', asyncHandler(marketplaceController.getListingById));
router.post('/listings', authenticateToken, asyncHandler(marketplaceController.createListing));
router.put('/listings/:id', authenticateToken, asyncHandler(marketplaceController.updateListing));
router.delete('/listings/:id', authenticateToken, asyncHandler(marketplaceController.cancelListing));

// Bids
router.get('/bids/listing/:listingId', asyncHandler(marketplaceController.getBidsByListing));
router.get('/bids/bidder/:bidderAddress', asyncHandler(marketplaceController.getBidsByBidder));
router.post('/bids/:listingId', authenticateToken, asyncHandler(marketplaceController.placeBid));

// Offers
router.get('/offers/listing/:listingId', asyncHandler(marketplaceController.getOffersByListing));
router.get('/offers/buyer/:buyerAddress', asyncHandler(marketplaceController.getOffersByBuyer));
router.post('/offers/:listingId', authenticateToken, asyncHandler(marketplaceController.makeOffer));
router.put('/offers/:offerId/accept', authenticateToken, asyncHandler(marketplaceController.acceptOffer));

// Escrows
router.get('/escrows/user/:userAddress', asyncHandler(marketplaceController.getEscrowsByUser));
router.get('/escrows/:id', asyncHandler(marketplaceController.getEscrowById));
router.post('/escrows/:listingId', authenticateToken, asyncHandler(marketplaceController.createEscrow));
router.put('/escrows/:escrowId/approve', authenticateToken, asyncHandler(marketplaceController.approveEscrow));
router.put('/escrows/:escrowId/dispute', authenticateToken, asyncHandler(marketplaceController.openDispute));
router.put('/escrows/:escrowId/delivery', authenticateToken, asyncHandler(marketplaceController.confirmDelivery));

// Orders
router.get('/orders/user/:userAddress', asyncHandler(marketplaceController.getOrdersByUser));
router.get('/orders/:id', asyncHandler(marketplaceController.getOrderById));
router.post('/orders', authenticateToken, asyncHandler(marketplaceController.createOrder));
router.put('/orders/:orderId/status', authenticateToken, asyncHandler(marketplaceController.updateOrderStatus));

// Disputes
router.get('/disputes/user/:userAddress', asyncHandler(marketplaceController.getDisputesByUser));
router.get('/disputes/:id', asyncHandler(marketplaceController.getDisputeById));
router.post('/disputes', authenticateToken, asyncHandler(marketplaceController.createDispute));
router.put('/disputes/:disputeId/status', authenticateToken, asyncHandler(marketplaceController.updateDisputeStatus));

// AI Moderation
router.get('/ai-moderation/object/:objectType/:objectId', asyncHandler(marketplaceController.getAIModerationByObject));
router.get('/ai-moderation/pending', asyncHandler(marketplaceController.getPendingAIModeration));
router.post('/ai-moderation', authenticateToken, asyncHandler(marketplaceController.createAIModeration));
router.put('/ai-moderation/:id/status', authenticateToken, asyncHandler(marketplaceController.updateAIModerationStatus));

// Enhanced Escrow
router.post('/enhanced-escrow', authenticateToken, asyncHandler(marketplaceController.createEnhancedEscrow));
router.put('/enhanced-escrow/:escrowId/funds', authenticateToken, asyncHandler(marketplaceController.lockFunds));
router.put('/enhanced-escrow/:escrowId/delivery', authenticateToken, asyncHandler(marketplaceController.confirmDeliveryEnhanced));
router.put('/enhanced-escrow/:escrowId/approve', authenticateToken, asyncHandler(marketplaceController.approveEnhancedEscrow));
router.put('/enhanced-escrow/:escrowId/dispute', authenticateToken, asyncHandler(marketplaceController.openEnhancedDispute));
router.put('/enhanced-escrow/:escrowId/evidence', authenticateToken, asyncHandler(marketplaceController.submitEvidence));
router.put('/enhanced-escrow/:escrowId/vote', authenticateToken, asyncHandler(marketplaceController.castVote));

// Reputation
router.get('/reputations/:address', asyncHandler(marketplaceController.getUserReputation));
router.post('/reputations/:address', authenticateToken, asyncHandler(marketplaceController.updateUserReputation));
router.get('/vendors/approved', asyncHandler(marketplaceController.getDAOApprovedVendors));

export default router;