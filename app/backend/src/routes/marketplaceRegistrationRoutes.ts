import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { MarketplaceRegistrationController } from '../controllers/marketplaceRegistrationController';

const router = Router();
const marketplaceRegistrationController = new MarketplaceRegistrationController();

// Register as a seller
router.post('/register/seller', authMiddleware, marketplaceRegistrationController.registerSeller);

// Register as a buyer
router.post('/register/buyer', authMiddleware, marketplaceRegistrationController.registerBuyer);

// Get marketplace profile
router.get('/profile/:walletAddress', marketplaceRegistrationController.getMarketplaceProfile);

// Update marketplace profile
router.put('/profile/:walletAddress', authMiddleware, marketplaceRegistrationController.updateMarketplaceProfile);

// Check if user is a seller
router.get('/is-seller/:walletAddress', marketplaceRegistrationController.isSeller);

// Check if user is a buyer
router.get('/is-buyer/:walletAddress', marketplaceRegistrationController.isBuyer);

export default router;