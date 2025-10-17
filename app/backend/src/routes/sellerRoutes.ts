import { Router } from 'express';
import { sellerController } from '../controllers/sellerController';

const router = Router();

// Seller Applications Routes
router.get('/applications', sellerController.getSellerApplications.bind(sellerController));
router.get('/applications/:applicationId', sellerController.getSellerApplication.bind(sellerController));
router.post('/applications/:applicationId/review', sellerController.reviewSellerApplication.bind(sellerController));

export default router;
