import { Router } from 'express';
import { aiInsightsController } from '../controllers/aiInsightsController';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = Router();

// Apply admin authentication to all routes
router.use(adminAuthMiddleware);

// Main AI Insights Engine routes
router.get('/report', aiInsightsController.getInsightsReport);
router.get('/status', aiInsightsController.getEngineStatus);
router.post('/start', aiInsightsController.startEngine);
router.post('/stop', aiInsightsController.stopEngine);
router.put('/config', aiInsightsController.updateEngineConfig);
router.get('/insights', aiInsightsController.getInsights);
router.get('/performance', aiInsightsController.getPerformanceAnalytics);

// Predictive Analytics routes
router.get('/predictions', aiInsightsController.getPredictiveAnalytics);
router.post('/predictions/evaluate', aiInsightsController.evaluatePredictionAccuracy);

// Anomaly Detection routes
router.get('/anomalies', aiInsightsController.getAnomalies);
router.get('/anomalies/statistics', aiInsightsController.getAnomalyStatistics);
router.post('/anomalies/thresholds', aiInsightsController.configureAnomalyThresholds);
router.get('/anomalies/:anomalyId/investigate', aiInsightsController.investigateAnomaly);

// Trend Analysis routes
router.get('/trends', aiInsightsController.getTrendAnalysis);
router.get('/trends/seasonal', aiInsightsController.getSeasonalPatterns);
router.post('/trends/alerts', aiInsightsController.generateTrendAlerts);
router.get('/trends/visualization', aiInsightsController.createTrendVisualization);
router.get('/trends/forecast', aiInsightsController.forecastMetric);
router.get('/trends/statistics', aiInsightsController.getTrendStatistics);

// Automated Insights routes
router.get('/insights/analytics', aiInsightsController.getInsightAnalytics);
router.post('/insights/natural-language', aiInsightsController.generateNaturalLanguageInsight);
router.post('/insights/track-outcome', aiInsightsController.trackInsightOutcome);

export default router;