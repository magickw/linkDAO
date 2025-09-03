import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { MarketplaceRegistrationController } from '../controllers/marketplaceRegistrationController';

const router = Router();
const marketplaceRegistrationController = new MarketplaceRegistrationController();

// Register as a seller
router.post('/register/seller', authenticateToken, marketplaceRegistrationController.registerSeller);

// Register as a buyer
router.post('/register/buyer', authenticateToken, marketplaceRegistrationController.registerBuyer);

// Get marketplace profile
router.get('/profile/:walletAddress', marketplaceRegistrationController.getMarketplaceProfile);

// Update marketplace profile
router.put('/profile/:walletAddress', authenticateToken, marketplaceRegistrationController.updateMarketplaceProfile);

// Check if user is a seller
router.get('/is-seller/:walletAddress', marketplaceRegistrationController.isSeller);

// Check if user is a buyer
router.get('/is-buyer/:walletAddress', marketplaceRegistrationController.isBuyer);

export default router;