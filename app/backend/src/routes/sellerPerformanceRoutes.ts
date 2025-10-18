import { Router } from 'express';
import { sellerPerformanceController } from '../controllers/sellerPerformanceController';

const router = Router();

// Seller Scorecard routes
router.get('/scorecard/:walletAddress', sellerPerformanceController.getSellerScorecard);
router.post('/scorecard/:walletAddress/calculate', sellerPerformanceController.calculateSellerScorecard);
router.get('/alerts/:walletAddress', sellerPerformanceController.getSellerPerformanceAlerts);

// Seller Risk Assessment routes
router.get('/risk/:walletAddress', sellerPerformanceController.getSellerRiskAssessment);
router.post('/risk/:walletAddress/assess', sellerPerformanceController.assessSellerRisk);
router.get('/risk/:walletAddress/trend', sellerPerformanceController.getSellerRiskTrend);

// Marketplace Health routes
router.get('/marketplace/health', sellerPerformanceController.getMarketplaceHealthDashboard);
router.post('/marketplace/health/metric', sellerPerformanceController.recordHealthMetric);

// Seller Growth Projection routes
router.get('/projections/:walletAddress', sellerPerformanceController.getSellerGrowthProjections);
router.post('/projections/:walletAddress/generate', sellerPerformanceController.generateSellerGrowthProjections);

// Combined dashboard routes
router.get('/dashboard/:walletAddress', sellerPerformanceController.getSellerPerformanceDashboard);

// Bulk operations routes
router.post('/bulk/performance', sellerPerformanceController.getBulkSellerPerformance);
router.post('/compare', sellerPerformanceController.compareSellerPerformance);

export default router;