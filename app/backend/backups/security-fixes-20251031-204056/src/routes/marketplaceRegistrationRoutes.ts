import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { authMiddleware } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { MarketplaceRegistrationController } from '../controllers/marketplaceRegistrationController';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();
const marketplaceRegistrationController = new MarketplaceRegistrationController();

// Register as a seller
router.post('/register/seller', csrfProtection,  authMiddleware, marketplaceRegistrationController.registerSeller);

// Register as a buyer
router.post('/register/buyer', csrfProtection,  authMiddleware, marketplaceRegistrationController.registerBuyer);

// Get marketplace profile
router.get('/profile/:walletAddress', marketplaceRegistrationController.getMarketplaceProfile);

// Update marketplace profile
router.put('/profile/:walletAddress', csrfProtection,  authMiddleware, marketplaceRegistrationController.updateMarketplaceProfile);

// Check if user is a seller
router.get('/is-seller/:walletAddress', marketplaceRegistrationController.isSeller);

// Check if user is a buyer
router.get('/is-buyer/:walletAddress', marketplaceRegistrationController.isBuyer);

export default router;