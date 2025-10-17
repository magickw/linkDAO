import { Router } from 'express';
import { sellerController } from '../controllers/sellerController';

const router = Router();

// Seller Applications Routes
router.get('/applications', sellerController.getSellerApplications.bind(sellerController));
router.get('/applications/:applicationId', sellerController.getSellerApplication.bind(sellerController));
router.post('/applications/:applicationId/review', sellerController.reviewSellerApplication.bind(sellerController));
router.get('/applications/:applicationId/risk-assessment', sellerController.getSellerRiskAssessment.bind(sellerController));

// Seller Performance Routes
router.get('/performance', sellerController.getSellerPerformance.bind(sellerController));
router.get('/performance/export', sellerController.exportSellerPerformance.bind(sellerController));

export default router;
