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
router.get('/escrows/:id', (req, res) => marketplaceController.getEscrowById(req, res));
router.get('/escrows/user/:userAddress', (req, res) => marketplaceController.getEscrowsByUser(req, res));
router.get('/reputation/:address', (req, res) => marketplaceController.getUserReputation(req, res));
router.get('/vendors/dao-approved', (req, res) => marketplaceController.getDAOApprovedVendors(req, res));

// Protected routes (require authentication)
router.post('/listings', authenticateToken, (req, res) => marketplaceController.createListing(req, res));
router.put('/listings/:id', authenticateToken, (req, res) => marketplaceController.updateListing(req, res));
router.delete('/listings/:id', authenticateToken, (req, res) => marketplaceController.cancelListing(req, res));
router.post('/bids/listing/:listingId', authenticateToken, (req, res) => marketplaceController.placeBid(req, res));
router.post('/escrows/listing/:listingId', authenticateToken, (req, res) => marketplaceController.createEscrow(req, res));
router.post('/escrows/:escrowId/approve', authenticateToken, (req, res) => marketplaceController.approveEscrow(req, res));
router.post('/escrows/:escrowId/dispute', authenticateToken, (req, res) => marketplaceController.openDispute(req, res));
router.put('/reputation/:address', authenticateToken, (req, res) => marketplaceController.updateUserReputation(req, res));

export default router;